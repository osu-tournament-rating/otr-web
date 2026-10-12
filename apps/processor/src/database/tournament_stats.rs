//! Finds the tournaments whose statistics a rebuild makes stale, and removes
//! statistics that no longer count.

use super::{
    db::DbClient,
    db_structs::{Match, TournamentInfo},
    error::DbResult
};
use std::collections::HashMap;
use tracing::info;

/// The match-linked rating adjustments, with each match's tournament.
/// Rating-dependent tournament statistics are computed from these values.
const MATCH_RATING_ADJUSTMENTS: &str = "
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
    WHERE ra.match_id IS NOT NULL";

impl DbClient {
    /// Snapshots the match-linked rating adjustments that exist before a
    /// recomputation replaces them. The temporary table is scoped to the
    /// current transaction and is used to invalidate rating-dependent
    /// tournament statistics after the new adjustments are written.
    pub async fn snapshot_match_rating_adjustments(&self) -> DbResult<()> {
        self.client
            .batch_execute(&format!(
                "
                CREATE TEMPORARY TABLE previous_match_rating_adjustments
                ON COMMIT DROP
                AS {MATCH_RATING_ADJUSTMENTS};

                CREATE INDEX previous_match_rating_adjustments_identity_idx
                    ON previous_match_rating_adjustments (match_id, player_id);
                "
            ))
            .await?;

        Ok(())
    }

    /// Returns verified tournaments whose match-linked rating adjustments
    /// differ from the snapshot created by `snapshot_match_rating_adjustments`.
    /// Regenerated database IDs, creation timestamps, and non-match adjustments
    /// are intentionally excluded from the comparison.
    pub async fn get_tournaments_with_changed_rating_adjustments(&self) -> DbResult<Vec<i32>> {
        let rows = self
            .client
            .query(
                &format!(
                    "
                    WITH current_match_rating_adjustments AS ({MATCH_RATING_ADJUSTMENTS}),
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
                    "
                ),
                &[]
            )
            .await?;

        rows.iter().map(|row| Ok(row.try_get("tournament_id")?)).collect()
    }

    /// The tournaments of `matches`, by id. A tournament counts only if one of
    /// those matches has a game with a score, of any verification status;
    /// without one it has no statistics to refresh.
    pub async fn get_tournament_info_for_matches(&self, matches: &[Match]) -> DbResult<HashMap<i32, TournamentInfo>> {
        let match_ids: Vec<i32> = matches.iter().map(|match_| match_.id).collect();
        let rows = self
            .client
            .query(
                "
                SELECT t.id, t.name
                FROM tournaments t
                WHERE t.id IN (
                    SELECT m.tournament_id
                    FROM matches m
                    WHERE m.id = ANY($1)
                      AND EXISTS (
                          SELECT 1
                          FROM games g
                          JOIN game_scores gs ON gs.game_id = g.id
                          WHERE g.match_id = m.id
                      )
                )
                ",
                &[&match_ids]
            )
            .await?;

        let mut tournaments = HashMap::with_capacity(rows.len());
        for row in rows {
            let id: i32 = row.try_get("id")?;
            tournaments.insert(
                id,
                TournamentInfo {
                    id,
                    name: row.try_get("name")?
                }
            );
        }

        Ok(tournaments)
    }

    /// Removes lingering player stats for tournaments and matches
    /// which have been rejected since the last run.
    pub async fn delete_rejected_player_stats(&self) -> DbResult<()> {
        let tournament_stats_deleted = self
            .client
            .execute(
                "
                DELETE FROM player_tournament_stats
                WHERE tournament_id IN (
                    SELECT id FROM tournaments WHERE verification_status != 4
                )
                ",
                &[]
            )
            .await?;

        info!(
            "Deleted {} lingering player_tournament_stats rows from rejected tournaments",
            tournament_stats_deleted
        );

        let match_stats_deleted = self
            .client
            .execute(
                "
                DELETE FROM player_match_stats
                WHERE match_id IN (
                    SELECT m.id FROM matches m
                    WHERE m.verification_status != 4
                    OR m.tournament_id IN (
                        SELECT t.id FROM tournaments t WHERE t.verification_status != 4
                    )
                )
                ",
                &[]
            )
            .await?;

        info!(
            "Deleted {} lingering player_match_stats rows from rejected matches/tournaments",
            match_stats_deleted
        );

        Ok(())
    }

    /// Returns the tournaments of `tournament_ids` whose stats need a refresh:
    /// those with no player_tournament_stats yet, and those with a match,
    /// game, or score updated after their stats were created.
    pub async fn get_tournaments_needing_stats_refresh(&self, tournament_ids: &[i32]) -> DbResult<Vec<i32>> {
        let rows = self
            .client
            .query(
                "
                WITH tournament_data_timestamps AS (
                    SELECT
                        t.id AS tournament_id,
                        GREATEST(MAX(m.updated), MAX(g.updated), MAX(gs.updated)) AS latest_data_update
                    FROM tournaments t
                    JOIN matches m ON t.id = m.tournament_id
                    JOIN games g ON m.id = g.match_id
                    JOIN game_scores gs ON g.id = gs.game_id
                    WHERE t.id = ANY($1)
                      AND t.verification_status = 4
                    GROUP BY t.id
                ),
                tournament_stats_timestamps AS (
                    SELECT
                        tournament_id,
                        MAX(created) AS latest_stats_created
                    FROM player_tournament_stats
                    WHERE tournament_id = ANY($1)
                    GROUP BY tournament_id
                )
                SELECT tdt.tournament_id
                FROM tournament_data_timestamps tdt
                LEFT JOIN tournament_stats_timestamps tst
                    ON tdt.tournament_id = tst.tournament_id
                WHERE tst.latest_stats_created IS NULL
                   OR tdt.latest_data_update > tst.latest_stats_created
                ",
                &[&tournament_ids]
            )
            .await?;

        rows.iter().map(|row| Ok(row.try_get("tournament_id")?)).collect()
    }
}
