//! Writes a rebuild's ratings.

use super::{
    db::DbClient,
    db_structs::PlayerRating,
    error::{DbError, DbResult}
};
use crate::utils::progress_utils::progress_span;
use chrono::{DateTime, FixedOffset};
use futures::pin_mut;
use std::collections::HashMap;
use tokio_postgres::{
    binary_copy::BinaryCopyInWriter,
    types::{ToSql, Type}
};
use tracing::info;
use tracing_indicatif::span_ext::IndicatifSpanExt;

/// A player id and a persisted ruleset, which identify one rating.
type RatingKey = (i32, i32);

impl DbClient {
    /// Replaces every player rating and rating adjustment with
    /// `player_ratings`, then records the highest ranks they reach.
    pub async fn save_results(&self, player_ratings: &[PlayerRating]) -> DbResult<()> {
        if player_ratings.is_empty() {
            return Err(DbError::NoRatings);
        }

        // rating_adjustments references player_ratings, so both empty together.
        self.client
            .batch_execute("TRUNCATE TABLE rating_adjustments, player_ratings RESTART IDENTITY")
            .await?;
        info!("Truncated player_ratings and rating_adjustments");

        let rating_ids = self.copy_player_ratings(player_ratings).await?;
        self.copy_rating_adjustments(player_ratings, &rating_ids).await?;
        self.save_highest_ranks(player_ratings).await
    }

    /// Writes `player_ratings` and returns the id each one was given.
    async fn copy_player_ratings(&self, player_ratings: &[PlayerRating]) -> DbResult<HashMap<RatingKey, i32>> {
        info!(count = player_ratings.len(), "Saving player ratings");

        let sink = self
            .client
            .copy_in(
                "COPY player_ratings (player_id, ruleset, rating, volatility, percentile, global_rank, country_rank) \
                 FROM STDIN (FORMAT binary)"
            )
            .await?;
        let writer = BinaryCopyInWriter::new(
            sink,
            &[
                Type::INT4,
                Type::INT4,
                Type::FLOAT8,
                Type::FLOAT8,
                Type::FLOAT8,
                Type::INT4,
                Type::INT4
            ]
        );
        pin_mut!(writer);

        for rating in player_ratings {
            writer
                .as_mut()
                .write(&[
                    &rating.player_id,
                    &(rating.ruleset as i32),
                    &rating.rating,
                    &rating.volatility,
                    &rating.percentile,
                    &rating.global_rank,
                    &rating.country_rank
                ])
                .await?;
        }
        writer.finish().await?;

        let mut ids = HashMap::with_capacity(player_ratings.len());
        for row in self
            .client
            .query("SELECT id, player_id, ruleset FROM player_ratings", &[])
            .await?
        {
            ids.insert((row.try_get("player_id")?, row.try_get("ruleset")?), row.try_get("id")?);
        }

        Ok(ids)
    }

    /// Writes the adjustments of every rating, linked to the rating's id.
    async fn copy_rating_adjustments(
        &self,
        player_ratings: &[PlayerRating],
        rating_ids: &HashMap<RatingKey, i32>
    ) -> DbResult<()> {
        let span = progress_span(player_ratings.len() as u64, "Saving rating adjustments");
        let _guard = span.enter();

        let sink = self
            .client
            .copy_in(
                "COPY rating_adjustments (player_id, ruleset, player_rating_id, match_id, rating_before, \
                 rating_after, volatility_before, volatility_after, timestamp, adjustment_type) \
                 FROM STDIN (FORMAT binary)"
            )
            .await?;
        let writer = BinaryCopyInWriter::new(
            sink,
            &[
                Type::INT4,
                Type::INT4,
                Type::INT4,
                Type::INT4,
                Type::FLOAT8,
                Type::FLOAT8,
                Type::FLOAT8,
                Type::FLOAT8,
                Type::TIMESTAMPTZ,
                Type::INT4
            ]
        );
        pin_mut!(writer);

        for rating in player_ratings {
            let player_rating_id = rating_ids[&(rating.player_id, rating.ruleset as i32)];

            for adjustment in &rating.adjustments {
                writer
                    .as_mut()
                    .write(&[
                        &adjustment.player_id,
                        &(adjustment.ruleset as i32),
                        &player_rating_id,
                        &adjustment.match_id,
                        &adjustment.rating_before,
                        &adjustment.rating_after,
                        &adjustment.volatility_before,
                        &adjustment.volatility_after,
                        &adjustment.timestamp,
                        &(adjustment.adjustment_type as i32)
                    ])
                    .await?;
            }
            span.pb_inc(1);
        }

        let count = writer.finish().await?;
        info!(count, "Saved rating adjustments");
        Ok(())
    }

    /// Raises each player's stored global and country peaks, independently, to
    /// the ranks of `player_ratings` that beat them. A raised peak is dated at
    /// the rating's last adjustment. A rating with no stored peaks stores its
    /// ranks as the first ones.
    async fn save_highest_ranks(&self, player_ratings: &[PlayerRating]) -> DbResult<()> {
        let stored = self.fetch_highest_ranks().await?;
        let mut inserts = HighestRankColumns::default();
        let mut updates = HighestRankColumns::default();

        for rating in player_ratings {
            let reached_at = rating
                .adjustments
                .last()
                .ok_or(DbError::RatingWithoutAdjustments {
                    player_id: rating.player_id,
                    ruleset: rating.ruleset
                })?
                .timestamp;
            let key = (rating.player_id, rating.ruleset as i32);
            let global = Peak::new(rating.global_rank, reached_at);
            let country = Peak::new(rating.country_rank, reached_at);

            match stored.get(&key) {
                None => inserts.push(key, global, country),
                Some(&(stored_global, stored_country)) => {
                    let raised_global = stored_global.raised_to(global);
                    let raised_country = stored_country.raised_to(country);
                    if raised_global != stored_global || raised_country != stored_country {
                        updates.push(key, raised_global, raised_country);
                    }
                }
            }
        }

        let inserted = self
            .client
            .execute(
                "
                INSERT INTO player_highest_ranks
                    (player_id, ruleset, global_rank, global_rank_date, country_rank, country_rank_date)
                SELECT *
                FROM UNNEST($1::int4[], $2::int4[], $3::int4[], $4::timestamptz[], $5::int4[], $6::timestamptz[])
                ",
                &inserts.params()
            )
            .await?;
        let updated = self
            .client
            .execute(
                "
                UPDATE player_highest_ranks AS phr
                SET global_rank = peak.global_rank,
                    global_rank_date = peak.global_rank_date,
                    country_rank = peak.country_rank,
                    country_rank_date = peak.country_rank_date
                FROM UNNEST($1::int4[], $2::int4[], $3::int4[], $4::timestamptz[], $5::int4[], $6::timestamptz[])
                    AS peak (player_id, ruleset, global_rank, global_rank_date, country_rank, country_rank_date)
                WHERE phr.player_id = peak.player_id AND phr.ruleset = peak.ruleset
                ",
                &updates.params()
            )
            .await?;

        info!(inserted, updated, "Saved highest ranks");
        Ok(())
    }

    /// The stored global and country peaks of every rating.
    async fn fetch_highest_ranks(&self) -> DbResult<HashMap<RatingKey, (Peak, Peak)>> {
        let mut peaks = HashMap::new();

        for row in self
            .client
            .query(
                "
                SELECT player_id, ruleset, global_rank, global_rank_date, country_rank, country_rank_date
                FROM player_highest_ranks
                ",
                &[]
            )
            .await?
        {
            peaks.insert(
                (row.try_get("player_id")?, row.try_get("ruleset")?),
                (
                    Peak::new(row.try_get("global_rank")?, row.try_get("global_rank_date")?),
                    Peak::new(row.try_get("country_rank")?, row.try_get("country_rank_date")?)
                )
            );
        }

        Ok(peaks)
    }
}

/// A rank and when it was reached. Rank 0 means the rank is unknown.
#[derive(Clone, Copy, Debug, PartialEq)]
struct Peak {
    rank: i32,
    reached_at: DateTime<FixedOffset>
}

impl Peak {
    fn new(rank: i32, reached_at: DateTime<FixedOffset>) -> Self {
        Self { rank, reached_at }
    }

    /// `candidate` if it is a better rank than this peak, otherwise this peak.
    /// An unknown rank never becomes a peak, and any known rank beats an
    /// unknown peak.
    fn raised_to(self, candidate: Peak) -> Peak {
        if candidate.rank > 0 && (self.rank == 0 || candidate.rank < self.rank) {
            candidate
        } else {
            self
        }
    }
}

/// `player_highest_ranks` rows as one array per column, for `UNNEST`.
#[derive(Default)]
struct HighestRankColumns {
    player_ids: Vec<i32>,
    rulesets: Vec<i32>,
    global_ranks: Vec<i32>,
    global_rank_dates: Vec<DateTime<FixedOffset>>,
    country_ranks: Vec<i32>,
    country_rank_dates: Vec<DateTime<FixedOffset>>
}

impl HighestRankColumns {
    fn push(&mut self, (player_id, ruleset): RatingKey, global: Peak, country: Peak) {
        self.player_ids.push(player_id);
        self.rulesets.push(ruleset);
        self.global_ranks.push(global.rank);
        self.global_rank_dates.push(global.reached_at);
        self.country_ranks.push(country.rank);
        self.country_rank_dates.push(country.reached_at);
    }

    /// The columns in the order of the `UNNEST` in the statements above.
    fn params(&self) -> [&(dyn ToSql + Sync); 6] {
        [
            &self.player_ids,
            &self.rulesets,
            &self.global_ranks,
            &self.global_rank_dates,
            &self.country_ranks,
            &self.country_rank_dates
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::Peak;
    use chrono::DateTime;

    fn peak(rank: i32, day: u32) -> Peak {
        let reached_at = DateTime::parse_from_rfc3339(&format!("2025-01-{day:02}T00:00:00+00:00")).unwrap();
        Peak::new(rank, reached_at)
    }

    #[test]
    fn test_better_rank_raises_peak() {
        assert_eq!(peak(100, 1).raised_to(peak(50, 2)), peak(50, 2));
    }

    #[test]
    fn test_equal_or_worse_rank_keeps_peak() {
        assert_eq!(peak(100, 1).raised_to(peak(100, 2)), peak(100, 1));
        assert_eq!(peak(100, 1).raised_to(peak(150, 2)), peak(100, 1));
    }

    #[test]
    fn test_unknown_rank_never_becomes_peak() {
        assert_eq!(peak(100, 1).raised_to(peak(0, 2)), peak(100, 1));
        assert_eq!(peak(0, 1).raised_to(peak(0, 2)), peak(0, 1));
    }

    #[test]
    fn test_known_rank_replaces_unknown_peak() {
        assert_eq!(peak(0, 1).raised_to(peak(5000, 2)), peak(5000, 2));
    }
}
