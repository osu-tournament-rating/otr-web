use super::db_structs::{
    Game, GameScore, Match, Player, PlayerHighestRank, PlayerRating, RatingAdjustment, ReplicationRole, RulesetData,
    TournamentInfo
};
use crate::{model::structures::ruleset::Ruleset, utils::progress_utils::progress_span};
use bytes::Bytes;
use chrono::{DateTime, FixedOffset};
use futures::SinkExt;
use itertools::Itertools;
use postgres_types::ToSql;
use std::{collections::HashMap, sync::Arc, time::Instant};
use tokio::runtime::Handle;
use tokio_postgres::{Client, Error, NoTls, Row};
use tracing::{debug, error, info, warn};
use tracing_indicatif::span_ext::IndicatifSpanExt;

const MATCH_BATCH_SIZE: usize = 500;
const PLAYER_BATCH_SIZE: i64 = 5000;

struct MatchMetadata {
    id: i32,
    name: String,
    start_time: DateTime<FixedOffset>,
    end_time: Option<DateTime<FixedOffset>>,
    ruleset: Ruleset
}

enum TransactionState {
    Pending,
    Committed,
    RolledBack
}

pub struct DbTransactionGuard {
    client: Arc<Client>,
    state: TransactionState
}

impl DbTransactionGuard {
    fn new(client: Arc<Client>) -> Self {
        Self {
            client,
            state: TransactionState::Pending
        }
    }

    pub async fn commit(&mut self) -> Result<(), Error> {
        match self.state {
            TransactionState::Pending => {
                self.client.batch_execute("COMMIT").await?;
                self.state = TransactionState::Committed;
                Ok(())
            }
            TransactionState::Committed => {
                warn!("Transaction commit called after it was already committed; ignoring");
                Ok(())
            }
            TransactionState::RolledBack => {
                warn!("Transaction commit called after rollback; ignoring");
                Ok(())
            }
        }
    }

    pub async fn rollback(&mut self) -> Result<(), Error> {
        match self.state {
            TransactionState::Pending => {
                self.client.batch_execute("ROLLBACK").await?;
                self.state = TransactionState::RolledBack;
                Ok(())
            }
            TransactionState::RolledBack => {
                warn!("Transaction rollback called repeatedly; ignoring");
                Ok(())
            }
            TransactionState::Committed => {
                warn!("Transaction rollback requested after commit; ignoring");
                Ok(())
            }
        }
    }
}

impl Drop for DbTransactionGuard {
    fn drop(&mut self) {
        if matches!(self.state, TransactionState::Pending) {
            let client = Arc::clone(&self.client);
            if Handle::try_current().is_ok() {
                tokio::spawn(async move {
                    if let Err(e) = client.batch_execute("ROLLBACK").await {
                        error!("Failed to rollback transaction during drop: {}", e);
                    } else {
                        info!("ROLLBACK TRANSACTION (triggered in Drop)");
                    }
                });
            } else {
                error!("Runtime unavailable to rollback dangling transaction; transaction left pending");
            }
        }
    }
}

#[derive(Clone)]
pub struct DbClient {
    client: Arc<Client>,
    ignore_constraints: bool
}

impl DbClient {
    // Connect to the database and return a DbClient instance
    pub async fn connect(connection_str: &str, ignore_constraints: bool) -> Result<Self, Error> {
        let (client, connection) = tokio_postgres::connect(connection_str, NoTls).await?;

        // Spawn the connection object to run in the background
        tokio::spawn(async move {
            if let Err(e) = connection.await {
                error!("connection error: {}", e);
            }
        });

        Ok(DbClient {
            client: Arc::new(client),
            ignore_constraints
        })
    }

    pub async fn get_matches(&self) -> Vec<Match> {
        info!("Fetching match metadata...");

        let mut match_metadata = self.fetch_match_metadata().await;

        if match_metadata.is_empty() {
            info!("No matches found to process");
            return Vec::new();
        }

        info!(
            "Found {} matches, fetching games and scores in batches...",
            match_metadata.len()
        );

        match_metadata.sort_by_key(|a| a.start_time);

        let matches = self.assemble_matches_batched(&match_metadata).await;

        self.log_match_warnings(&matches);

        info!("Match fetching complete - {} matches will be processed", matches.len());

        matches
    }

    async fn fetch_match_metadata(&self) -> Vec<MatchMetadata> {
        let query = "
            SELECT m.id, m.name, m.start_time, m.end_time, t.ruleset
            FROM matches m
            JOIN tournaments t ON t.id = m.tournament_id
            WHERE t.verification_status = 4 AND m.verification_status = 4
            ORDER BY m.id";

        let rows = self.client.query(query, &[]).await.unwrap();

        rows.iter()
            .map(|row| MatchMetadata {
                id: row.get("id"),
                name: row.get("name"),
                start_time: row.get("start_time"),
                end_time: row.try_get("end_time").ok(),
                ruleset: Ruleset::try_from(row.get::<_, i32>("ruleset")).unwrap()
            })
            .collect()
    }

    async fn assemble_matches_batched(&self, metadata: &[MatchMetadata]) -> Vec<Match> {
        let span = progress_span(metadata.len() as u64, "Fetching match data");
        let _guard = span.enter();

        let mut matches = Vec::with_capacity(metadata.len());

        for batch in metadata.chunks(MATCH_BATCH_SIZE) {
            let match_ids: Vec<i32> = batch.iter().map(|m| m.id).collect();

            let games_by_match = self.fetch_games_for_matches(&match_ids).await;

            let game_ids: Vec<i32> = games_by_match
                .values()
                .flat_map(|games| games.iter().map(|g| g.id))
                .collect();

            let scores_by_game = self.fetch_scores_for_games(&game_ids).await;

            for meta in batch {
                let mut match_games = games_by_match.get(&meta.id).cloned().unwrap_or_default();

                for game in &mut match_games {
                    game.scores = scores_by_game.get(&game.id).cloned().unwrap_or_default();
                }

                let valid_games: Vec<Game> = match_games
                    .into_iter()
                    .filter(|g| {
                        if g.scores.len() < 2 {
                            warn!(
                                game_id = g.id,
                                match_id = meta.id,
                                match_name = %meta.name,
                                score_count = g.scores.len(),
                                "DATA INTEGRITY: Verified game has <2 verified scores - skipping (requires o!TR Admin inspection)"
                            );
                            false
                        } else {
                            true
                        }
                    })
                    .collect();

                matches.push(Match {
                    id: meta.id,
                    name: meta.name.clone(),
                    start_time: meta.start_time,
                    end_time: meta.end_time,
                    ruleset: meta.ruleset,
                    games: valid_games
                });

                span.pb_inc(1);
            }
        }

        matches
    }

    async fn fetch_games_for_matches(&self, match_ids: &[i32]) -> HashMap<i32, Vec<Game>> {
        if match_ids.is_empty() {
            return HashMap::new();
        }

        let id_list = match_ids.iter().map(|id| id.to_string()).join(",");
        let query = format!(
            "SELECT id, ruleset, start_time, end_time, match_id
             FROM games
             WHERE match_id = ANY(ARRAY[{}]) AND verification_status = 4
             ORDER BY id",
            id_list
        );

        let rows = self.client.query(&query, &[]).await.unwrap();

        let mut result: HashMap<i32, Vec<Game>> = HashMap::new();
        for row in rows {
            let match_id: i32 = row.get("match_id");
            let game = Game {
                id: row.get("id"),
                ruleset: Ruleset::try_from(row.get::<_, i32>("ruleset")).unwrap(),
                start_time: row.get("start_time"),
                end_time: row.get("end_time"),
                scores: Vec::new()
            };
            result.entry(match_id).or_default().push(game);
        }

        result
    }

    async fn fetch_scores_for_games(&self, game_ids: &[i32]) -> HashMap<i32, Vec<GameScore>> {
        if game_ids.is_empty() {
            return HashMap::new();
        }

        let id_list = game_ids.iter().map(|id| id.to_string()).join(",");
        let query = format!(
            "SELECT id, player_id, game_id, score, placement
             FROM game_scores
             WHERE game_id = ANY(ARRAY[{}]) AND verification_status = 4
             ORDER BY game_id, id",
            id_list
        );

        let rows = self.client.query(&query, &[]).await.unwrap();

        let mut result: HashMap<i32, Vec<GameScore>> = HashMap::new();
        for row in rows {
            let game_id: i32 = row.get("game_id");
            let score = GameScore {
                id: row.get("id"),
                player_id: row.get("player_id"),
                game_id,
                score: row.get("score"),
                placement: row.get("placement")
            };
            result.entry(game_id).or_default().push(score);
        }

        result
    }

    fn log_match_warnings(&self, matches: &[Match]) {
        for match_ in matches {
            if match_.games.is_empty() {
                warn!(
                    match_id = match_.id,
                    match_name = %match_.name,
                    "DATA INTEGRITY: Match has no valid games after filtering - will be skipped (requires o!TR Admin inspection)"
                );
            }
        }
    }

    /// Fetches all players from the database with their ruleset data.
    /// If a player has no ruleset data, they will not be included.
    /// This is important because a player could be in the system but still
    /// be waiting for the dataworker to process their data.
    pub async fn get_players(&self) -> Vec<Player> {
        info!("Fetching players...");

        let total_count: i64 = self
            .client
            .query_one(
                "SELECT COUNT(DISTINCT p.id) as cnt FROM players p
                 JOIN player_osu_ruleset_data prd ON prd.player_id = p.id",
                &[]
            )
            .await
            .map(|r| r.get("cnt"))
            .unwrap_or(0);

        let span = progress_span(total_count as u64, "Fetching players");
        let _guard = span.enter();

        let mut all_players: Vec<Player> = Vec::new();
        let mut last_id: i32 = 0;

        loop {
            let batch = self.fetch_player_batch(last_id).await;

            if batch.is_empty() {
                break;
            }

            last_id = batch.last().map(|p| p.id).unwrap_or(last_id);
            span.pb_inc(batch.len() as u64);
            all_players.extend(batch);
        }

        info!("Players fetched: {} total", all_players.len());
        all_players
    }

    async fn fetch_player_batch(&self, after_id: i32) -> Vec<Player> {
        let query = "
            WITH player_batch AS (
                SELECT p.id
                FROM players p
                WHERE p.id > $1
                  AND EXISTS (
                      SELECT 1
                      FROM player_osu_ruleset_data prd
                      WHERE prd.player_id = p.id
                  )
                ORDER BY p.id
                LIMIT $2
            )
            SELECT p.id AS player_id, p.username AS username,
                   p.country AS country, prd.ruleset AS ruleset,
                   prd.earliest_global_rank AS earliest_global_rank,
                   prd.global_rank AS global_rank
            FROM player_batch pb
            JOIN players p ON p.id = pb.id
            JOIN player_osu_ruleset_data prd ON prd.player_id = p.id
            ORDER BY p.id, prd.ruleset";

        let rows = self
            .client
            .query(query, &[&after_id, &PLAYER_BATCH_SIZE])
            .await
            .unwrap();

        self.assemble_players_from_rows(&rows)
    }

    fn assemble_players_from_rows(&self, rows: &[Row]) -> Vec<Player> {
        let mut players: Vec<Player> = Vec::new();
        let mut current_player_id = -1;
        let mut current_ruleset_data: Vec<RulesetData> = Vec::new();

        for (i, row) in rows.iter().enumerate() {
            let player_id = row.get::<_, i32>("player_id");

            if player_id != current_player_id {
                if current_player_id != -1 {
                    if let Some(last_player) = players.last_mut() {
                        last_player.ruleset_data = Some(current_ruleset_data.clone());
                    }
                }

                current_player_id = player_id;
                current_ruleset_data.clear();

                players.push(Player {
                    id: row.get("player_id"),
                    username: row.get("username"),
                    country: row.get("country"),
                    ruleset_data: Some(Vec::new())
                });
            }

            if let Some(ruleset_data) = self.ruleset_data_from_row(row) {
                current_ruleset_data.push(ruleset_data);
            }

            if i == rows.len() - 1 {
                if let Some(last_player) = players.last_mut() {
                    last_player.ruleset_data = Some(current_ruleset_data.clone());
                }
            }
        }

        players
    }

    fn ruleset_data_from_row(&self, row: &Row) -> Option<RulesetData> {
        let ruleset = row.try_get::<_, i32>("ruleset");
        let global_rank = row.try_get::<_, Option<i32>>("global_rank");
        let earliest_global_rank = row.try_get::<_, Option<i32>>("earliest_global_rank");

        if let (Ok(ruleset_val), Ok(global_rank_val), Ok(earliest_global_rank_val)) =
            (ruleset, global_rank, earliest_global_rank)
        {
            let parsed_ruleset = Ruleset::try_from(ruleset_val);
            if parsed_ruleset.is_err() {
                // Return nothing
                return None;
            }

            return Some(RulesetData {
                ruleset: parsed_ruleset.unwrap(),
                global_rank: global_rank_val,
                earliest_global_rank: earliest_global_rank_val
            });
        }

        None
    }

    pub async fn save_results(&self, player_ratings: &[PlayerRating]) {
        self.truncate_table("rating_adjustments").await;
        self.truncate_table("player_ratings").await;

        self.save_ratings_and_adjustments_with_mapping(&player_ratings).await;
        self.insert_or_update_highest_ranks(player_ratings).await;
    }

    /// Snapshots the match-linked rating adjustments that exist before a
    /// recomputation replaces them. The temporary table is scoped to the
    /// current transaction and is used to invalidate rating-dependent
    /// tournament statistics after the new adjustments are written.
    pub async fn snapshot_match_rating_adjustments(&self) {
        self.client
            .batch_execute(
                "
                CREATE TEMPORARY TABLE previous_match_rating_adjustments
                ON COMMIT DROP
                AS
                SELECT
                    ra.match_id,
                    ra.player_id,
                    ra.ruleset,
                    ra.rating_before,
                    ra.rating_after,
                    ra.volatility_before,
                    ra.volatility_after,
                    m.tournament_id
                FROM rating_adjustments ra
                JOIN matches m ON m.id = ra.match_id
                WHERE ra.match_id IS NOT NULL;

                CREATE INDEX previous_match_rating_adjustments_identity_idx
                    ON previous_match_rating_adjustments (match_id, player_id);
                "
            )
            .await
            .expect("Failed to snapshot match rating adjustments");
    }

    /// Returns accepted tournaments whose match-linked rating adjustments
    /// differ from the snapshot created by `snapshot_match_rating_adjustments`.
    /// Regenerated database IDs, creation timestamps, and non-match adjustments
    /// are intentionally excluded from the comparison.
    pub async fn get_tournaments_with_changed_rating_adjustments(&self) -> Vec<i32> {
        let rows = self
            .client
            .query(
                "
                WITH current_match_rating_adjustments AS (
                    SELECT
                        ra.match_id,
                        ra.player_id,
                        ra.ruleset,
                        ra.rating_before,
                        ra.rating_after,
                        ra.volatility_before,
                        ra.volatility_after,
                        m.tournament_id
                    FROM rating_adjustments ra
                    JOIN matches m ON m.id = ra.match_id
                    WHERE ra.match_id IS NOT NULL
                ),
                changed_tournaments AS (
                    SELECT
                        previous.tournament_id AS previous_tournament_id,
                        current.tournament_id AS current_tournament_id
                    FROM previous_match_rating_adjustments previous
                    FULL OUTER JOIN current_match_rating_adjustments current
                        ON current.match_id = previous.match_id
                        AND current.player_id = previous.player_id
                    WHERE previous.match_id IS NULL
                        OR current.match_id IS NULL
                        OR previous.tournament_id IS DISTINCT FROM current.tournament_id
                        OR previous.ruleset IS DISTINCT FROM current.ruleset
                        OR previous.rating_before IS DISTINCT FROM current.rating_before
                        OR previous.rating_after IS DISTINCT FROM current.rating_after
                        OR previous.volatility_before IS DISTINCT FROM current.volatility_before
                        OR previous.volatility_after IS DISTINCT FROM current.volatility_after
                ),
                changed_tournament_ids AS (
                    SELECT previous_tournament_id AS tournament_id
                    FROM changed_tournaments
                    WHERE previous_tournament_id IS NOT NULL
                    UNION
                    SELECT current_tournament_id AS tournament_id
                    FROM changed_tournaments
                    WHERE current_tournament_id IS NOT NULL
                )
                SELECT changed.tournament_id
                FROM changed_tournament_ids changed
                JOIN tournaments t ON t.id = changed.tournament_id
                WHERE t.verification_status = 4
                ORDER BY changed.tournament_id
                ",
                &[]
            )
            .await
            .expect("Failed to compare match rating adjustments");

        rows.iter().map(|row| row.get("tournament_id")).collect()
    }

    async fn save_ratings_and_adjustments_with_mapping(&self, player_ratings: &&[PlayerRating]) {
        info!(count = player_ratings.len(), "Saving player ratings with adjustments");

        let mut mapping: HashMap<i32, Vec<RatingAdjustment>> = HashMap::new();
        let parent_ids = self.save_player_ratings(player_ratings).await;

        for (i, rating) in player_ratings.iter().enumerate() {
            let parent_id = parent_ids.get(i).unwrap();
            mapping.insert(*parent_id, rating.adjustments.clone());
        }

        debug!(mapping_count = mapping.len(), "Created adjustment mapping");

        self.save_rating_adjustments(&mapping).await;

        info!("Rating adjustments saved");
    }

    /// Save all rating adjustments in a single batch query using PostgreSQL COPY
    async fn save_rating_adjustments(&self, adjustment_mapping: &HashMap<i32, Vec<RatingAdjustment>>) {
        if adjustment_mapping.is_empty() {
            return;
        }

        let copy_query = "COPY rating_adjustments (player_id, ruleset, player_rating_id, match_id, \
        rating_before, rating_after, volatility_before, volatility_after, timestamp, adjustment_type) \
        FROM STDIN WITH (FORMAT TEXT, DELIMITER E'\\t')";

        let span = progress_span(adjustment_mapping.len() as u64, "Saving rating adjustments");
        let _guard = span.enter();

        let sink = self
            .client
            .copy_in(copy_query)
            .await
            .expect("Failed to initiate COPY IN operation");

        tokio::pin!(sink);

        for (player_rating_id, adjustments) in adjustment_mapping.iter() {
            for adjustment in adjustments {
                let match_id_str = adjustment
                    .match_id
                    .map(|id| id.to_string())
                    .unwrap_or_else(|| "\\N".to_string());

                let row_data = format!(
                    "{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\t{}\n",
                    adjustment.player_id,
                    adjustment.ruleset as i32,
                    player_rating_id,
                    match_id_str,
                    adjustment.rating_before,
                    adjustment.rating_after,
                    adjustment.volatility_before,
                    adjustment.volatility_after,
                    adjustment.timestamp.format("%Y-%m-%d %H:%M:%S"),
                    adjustment.adjustment_type as i32
                );

                let data_bytes = Bytes::from(row_data.into_bytes());
                sink.send(data_bytes)
                    .await
                    .expect("Failed to send data to COPY operation");
            }
            span.pb_inc(1);
        }

        sink.close().await.expect("Failed to finalize COPY operation");
    }

    /// Saves multiple PlayerRatings using COPY for efficiency, returning a vector of primary keys
    async fn save_player_ratings(&self, player_ratings: &[PlayerRating]) -> Vec<i32> {
        if player_ratings.is_empty() {
            error!("No player_rating data to save to database");
            panic!();
        }

        let copy_query = "COPY player_ratings (player_id, ruleset, rating, volatility, \
            percentile, global_rank, country_rank) \
            FROM STDIN WITH (FORMAT TEXT, DELIMITER E'\\t')";

        let sink = self
            .client
            .copy_in(copy_query)
            .await
            .expect("Failed to initiate COPY IN operation for player_ratings");

        tokio::pin!(sink);

        let span = progress_span(player_ratings.len() as u64, "Saving player ratings");
        let _guard = span.enter();

        for rating in player_ratings {
            let row_data = format!(
                "{}\t{}\t{}\t{}\t{}\t{}\t{}\n",
                rating.player_id,
                rating.ruleset as i32,
                rating.rating,
                rating.volatility,
                rating.percentile,
                rating.global_rank,
                rating.country_rank
            );

            let data_bytes = Bytes::from(row_data.into_bytes());
            sink.send(data_bytes)
                .await
                .expect("Failed to send data to COPY operation");

            span.pb_inc(1);
        }

        sink.close()
            .await
            .expect("Failed to finalize COPY operation for player_ratings");

        drop(_guard);

        // Query back the IDs - we need to match on the unique combination of fields
        // Since we just inserted these records, we can order by ID and take the last N records
        let count = player_ratings.len() as i64;
        let rows = self
            .client
            .query("SELECT id FROM player_ratings ORDER BY id DESC LIMIT $1", &[&count])
            .await
            .unwrap();

        // Reverse to get them in insertion order
        let mut ids: Vec<i32> = rows.iter().map(|row| row.get("id")).collect();
        ids.reverse();
        ids
    }

    async fn insert_or_update_highest_ranks(&self, player_ratings: &[PlayerRating]) {
        info!("Fetching all highest ranks");
        let current_highest_ranks = self.get_highest_ranks().await;

        info!(count = current_highest_ranks.len(), "Found highest ranks");

        let span = progress_span(player_ratings.len() as u64, "Processing highest ranks");
        let _guard = span.enter();

        let mut new_ranks = Vec::new();
        let mut updates = Vec::new();

        for rating in player_ratings {
            if let Some(Some(current_rank)) = current_highest_ranks.get(&(rating.player_id, rating.ruleset)) {
                let global_rank_improved = rating.global_rank > 0
                    && (current_rank.global_rank == 0 || rating.global_rank < current_rank.global_rank);
                let country_rank_improved = rating.country_rank > 0
                    && (current_rank.country_rank == 0 || rating.country_rank < current_rank.country_rank);

                if global_rank_improved || country_rank_improved {
                    updates.push(rating);
                }
            } else {
                new_ranks.push(rating);
            }
            span.pb_inc(1);
        }

        drop(_guard);

        // Batch insert new ranks using COPY
        if !new_ranks.is_empty() {
            self.batch_insert_highest_ranks(&new_ranks).await;
        }

        // Update existing ranks
        if !updates.is_empty() {
            let update_span = progress_span(updates.len() as u64, "Updating existing highest ranks");
            let _update_guard = update_span.enter();
            for rating in updates {
                self.update_highest_rank(rating.player_id, rating).await;
                update_span.pb_inc(1);
            }
        }
    }

    async fn batch_insert_highest_ranks(&self, player_ratings: &[&PlayerRating]) {
        let copy_query = "COPY player_highest_ranks (player_id, ruleset, global_rank, global_rank_date, country_rank, country_rank_date) \
            FROM STDIN WITH (FORMAT TEXT, DELIMITER E'\\t')";

        let sink = self
            .client
            .copy_in(copy_query)
            .await
            .expect("Failed to initiate COPY IN operation for player_highest_ranks");

        tokio::pin!(sink);

        let span = progress_span(player_ratings.len() as u64, "Inserting new highest ranks");
        let _guard = span.enter();

        for rating in player_ratings {
            let timestamp = rating.adjustments.last().unwrap().timestamp;
            let row_data = format!(
                "{}\t{}\t{}\t{}\t{}\t{}\n",
                rating.player_id,
                rating.ruleset as i32,
                rating.global_rank,
                timestamp.format("%Y-%m-%d %H:%M:%S"),
                rating.country_rank,
                timestamp.format("%Y-%m-%d %H:%M:%S")
            );

            let data_bytes = Bytes::from(row_data.into_bytes());
            sink.send(data_bytes)
                .await
                .expect("Failed to send data to COPY operation");

            span.pb_inc(1);
        }

        sink.close()
            .await
            .expect("Failed to finalize COPY operation for player_highest_ranks");
    }

    async fn get_highest_ranks(&self) -> HashMap<(i32, Ruleset), Option<PlayerHighestRank>> {
        let query = "SELECT * FROM player_highest_ranks";
        let row = self.client.query(query, &[]).await.ok();

        match row {
            Some(rows) => {
                let mut map: HashMap<(i32, Ruleset), Option<PlayerHighestRank>> = HashMap::new();
                for row in rows {
                    let player_id = row.get::<_, i32>("player_id");
                    let ruleset = Ruleset::try_from(row.get::<_, i32>("ruleset")).unwrap();
                    map.insert(
                        (player_id, ruleset),
                        Some(PlayerHighestRank {
                            id: row.get("id"),
                            player_id,
                            global_rank: row.get("global_rank"),
                            global_rank_date: row.get("global_rank_date"),
                            country_rank: row.get("country_rank"),
                            country_rank_date: row.get("country_rank_date"),
                            ruleset
                        })
                    );
                }

                map
            }
            None => HashMap::new()
        }
    }

    async fn update_highest_rank(&self, player_id: i32, player_rating: &PlayerRating) {
        let timestamp = player_rating.adjustments.last().unwrap().timestamp;
        let query = "
            UPDATE player_highest_ranks
            SET global_rank = CASE
                    WHEN $1 > 0 AND (global_rank = 0 OR $1 < global_rank) THEN $1
                    ELSE global_rank
                END,
                global_rank_date = CASE
                    WHEN $1 > 0 AND (global_rank = 0 OR $1 < global_rank) THEN $2
                    ELSE global_rank_date
                END,
                country_rank = CASE
                    WHEN $3 > 0 AND (country_rank = 0 OR $3 < country_rank) THEN $3
                    ELSE country_rank
                END,
                country_rank_date = CASE
                    WHEN $3 > 0 AND (country_rank = 0 OR $3 < country_rank) THEN $2
                    ELSE country_rank_date
                END
            WHERE player_id = $4 AND ruleset = $5";
        let values: &[&(dyn ToSql + Sync)] = &[
            &player_rating.global_rank,
            &timestamp,
            &player_rating.country_rank,
            &player_id,
            &(player_rating.ruleset as i32)
        ];

        self.client.execute(query, values).await.unwrap();
    }

    pub async fn get_tournament_info_for_matches(&self, matches: &[Match]) -> HashMap<i32, TournamentInfo> {
        let mut tournament_info: HashMap<i32, TournamentInfo> = HashMap::new();

        if matches.is_empty() {
            return tournament_info;
        }

        // Get unique match IDs
        let match_ids: Vec<i32> = matches.iter().map(|m| m.id).collect();
        let match_id_str = match_ids.iter().map(|id| id.to_string()).join(",");

        // Query to get tournament information for the processed matches
        let query = format!(
            "SELECT DISTINCT 
                t.id AS tournament_id,
                t.name AS tournament_name,
                COUNT(DISTINCT m.id) AS match_count,
                COUNT(DISTINCT gs.player_id) AS player_count
            FROM tournaments t
            JOIN matches m ON t.id = m.tournament_id
            JOIN games g ON m.id = g.match_id
            JOIN game_scores gs ON g.id = gs.game_id
            WHERE m.id = ANY(ARRAY[{}])
            GROUP BY t.id, t.name",
            match_id_str
        );

        match self.client.query(&query, &[]).await {
            Ok(rows) => {
                for row in rows {
                    let tournament_id: i32 = row.get("tournament_id");
                    let info = TournamentInfo {
                        id: tournament_id,
                        name: row.get("tournament_name"),
                        match_count: row.get::<_, i64>("match_count") as i32,
                        player_count: row.get::<_, i64>("player_count") as i32
                    };
                    tournament_info.insert(tournament_id, info);
                }
            }
            Err(e) => {
                error!("Failed to fetch tournament information: {}", e);
            }
        }

        tournament_info
    }

    async fn truncate_table(&self, table: &str) {
        self.client
            .execute(format!("TRUNCATE TABLE {table} RESTART IDENTITY CASCADE").as_str(), &[])
            .await
            .unwrap();

        info!("Truncated the {} table!", table);
    }

    async fn set_replication(&self, replication_role: ReplicationRole) {
        let role_str = match replication_role {
            ReplicationRole::Replica => "replica",
            ReplicationRole::Origin => "origin"
        };

        self.client
            .execute(&format!("SET session_replication_role = '{role_str}';"), &[])
            .await
            .unwrap();

        info!("Executed SET session_replication_role = '{role_str}';")
    }

    // Access the underlying Client
    pub fn client(&self) -> Arc<Client> {
        Arc::clone(&self.client)
    }

    pub async fn begin_transaction(&self) -> Result<DbTransactionGuard, Error> {
        self.client
            .batch_execute("BEGIN ISOLATION LEVEL REPEATABLE READ")
            .await?;
        Ok(DbTransactionGuard::new(Arc::clone(&self.client)))
    }

    /// Calculate and update placements for all game scores
    /// Verified scores get placement based on score ranking (1=highest);
    /// tied scores share the same placement and the following placement is
    /// skipped (e.g. 1, 1, 3). This tells the model a tie exists for first.
    /// Non-verified scores receive a fallback placement of 0 but are not considered.
    pub async fn calculate_and_update_game_score_placements(&self) {
        info!("Calculating game score placements...");
        let timer = Instant::now();

        let mut total_scores: Option<i64> = None;
        if tracing::enabled!(tracing::Level::DEBUG) {
            if let Ok(stats_row) = self
                .client
                .query_one(
                    "
                    SELECT
                        COUNT(*) AS total_scores,
                        COUNT(*) FILTER (WHERE verification_status = 4) AS verified_scores
                    FROM game_scores
                ",
                    &[]
                )
                .await
            {
                let total: i64 = stats_row.get("total_scores");
                let verified: i64 = stats_row.get("verified_scores");
                let pending = total - verified;

                debug!(
                    total_scores = total,
                    verified_scores = verified,
                    pending_scores = pending,
                    "Starting placement recalculation"
                );

                total_scores = Some(total);
            }
        }

        if total_scores.is_none() {
            info!("Starting placement recalculation for game scores");
        }

        let updated_count = self
            .client
            .execute(
                "
                UPDATE game_scores AS gs
                SET placement = np.new_placement,
                    updated = NOW() AT TIME ZONE 'UTC'
                FROM (
                    SELECT
                        id,
                        CASE
                            WHEN verification_status = 4 THEN
                                RANK() OVER (
                                    PARTITION BY game_id, verification_status
                                    ORDER BY score DESC
                                )
                            ELSE 0
                        END AS new_placement
                    FROM game_scores
                ) AS np
                WHERE gs.id = np.id
                    AND gs.placement IS DISTINCT FROM np.new_placement
            ",
                &[]
            )
            .await
            .unwrap();

        let elapsed_secs = timer.elapsed().as_secs_f64();

        match (updated_count, total_scores) {
            (0, Some(total)) => info!(
                "Placements already up to date; scanned {} scores in {:.3}s",
                total, elapsed_secs
            ),
            (0, None) => info!("Placements already up to date in {:.3}s", elapsed_secs),
            (_, Some(total)) => info!(
                "Updated placements for {} game scores in {:.3}s (out of {})",
                updated_count, elapsed_secs, total
            ),
            (_, None) => info!(
                "Updated placements for {} game scores in {:.3}s",
                updated_count, elapsed_secs
            )
        }
    }

    /// Removes lingering player stats for tournaments and matches
    /// which have been rejected since the last run.
    pub async fn delete_rejected_player_stats(&self) {
        // Delete player_tournament_stats for rejected tournaments
        let pts_deleted = self
            .client
            .execute(
                "DELETE FROM player_tournament_stats pts
                 WHERE pts.tournament_id IN (
                     SELECT id FROM tournaments WHERE verification_status != 4
                 )",
                &[]
            )
            .await
            .unwrap();

        info!(
            "Deleted {} lingering player_tournament_stats rows from rejected tournaments",
            pts_deleted
        );

        // Delete player_match_stats for rejected matches or matches in rejected tournaments
        let pms_deleted = self
            .client
            .execute(
                "DELETE FROM player_match_stats pms
                 WHERE pms.match_id IN (
                     SELECT m.id FROM matches m
                     WHERE m.verification_status != 4
                     OR m.tournament_id IN (
                         SELECT t.id FROM tournaments t WHERE t.verification_status != 4
                     )
                 )",
                &[]
            )
            .await
            .unwrap();

        info!(
            "Deleted {} lingering player_match_stats rows from rejected matches/tournaments",
            pms_deleted
        );
    }

    /// Returns tournament IDs that need stats refresh based on timestamp comparison.
    /// A tournament needs refresh if:
    /// - No player_tournament_stats exist for it, OR
    /// - Any match/game/game_score has been updated after the stats were created
    pub async fn get_tournaments_needing_stats_refresh(&self, tournament_ids: &[i32]) -> Vec<i32> {
        if tournament_ids.is_empty() {
            return Vec::new();
        }

        let id_list = tournament_ids.iter().map(|id| id.to_string()).join(",");

        let query = format!(
            "WITH tournament_data_timestamps AS (
                SELECT
                    t.id AS tournament_id,
                    GREATEST(
                        COALESCE(MAX(m.updated), '1970-01-01'::timestamptz),
                        COALESCE(MAX(g.updated), '1970-01-01'::timestamptz),
                        COALESCE(MAX(gs.updated), '1970-01-01'::timestamptz)
                    ) AS latest_data_update
                FROM tournaments t
                JOIN matches m ON t.id = m.tournament_id
                JOIN games g ON m.id = g.match_id
                JOIN game_scores gs ON g.id = gs.game_id
                WHERE t.id = ANY(ARRAY[{}])
                  AND t.verification_status = 4
                GROUP BY t.id
            ),
            tournament_stats_timestamps AS (
                SELECT
                    tournament_id,
                    MAX(created) AS latest_stats_created
                FROM player_tournament_stats
                WHERE tournament_id = ANY(ARRAY[{}])
                GROUP BY tournament_id
            )
            SELECT tdt.tournament_id
            FROM tournament_data_timestamps tdt
            LEFT JOIN tournament_stats_timestamps tst
                ON tdt.tournament_id = tst.tournament_id
            WHERE tst.latest_stats_created IS NULL
               OR tdt.latest_data_update > tst.latest_stats_created",
            id_list, id_list
        );

        match self.client.query(&query, &[]).await {
            Ok(rows) => rows.iter().map(|row| row.get::<_, i32>("tournament_id")).collect(),
            Err(e) => {
                error!("Failed to query tournaments needing stats refresh: {}", e);
                tournament_ids.to_vec()
            }
        }
    }
}
