use super::{db::DbClient, error::DbResult};
use std::time::Instant;
use tracing::info;

impl DbClient {
    /// Recalculates every game score's placement from the scores themselves.
    /// The model reads placements, so this runs before the data is fetched.
    ///
    /// Verified scores are ranked within their game, highest first. Tied
    /// scores share a placement and the next one is skipped (1, 1, 3), which
    /// tells the model a tie exists. Every other score gets placement 0 and is
    /// never rated. Only scores whose placement changes are written.
    pub async fn calculate_and_update_game_score_placements(&self) -> DbResult<()> {
        info!("Calculating game score placements...");
        let started = Instant::now();

        let updated = self
            .client
            .execute(
                "
                WITH ranked AS (
                    SELECT
                        id,
                        placement AS current_placement,
                        CASE
                            WHEN verification_status = 4 THEN
                                RANK() OVER (
                                    PARTITION BY game_id, verification_status
                                    ORDER BY score DESC
                                )
                            ELSE 0
                        END AS placement
                    FROM game_scores
                )
                UPDATE game_scores AS gs
                SET placement = ranked.placement,
                    updated = NOW() AT TIME ZONE 'UTC'
                FROM ranked
                WHERE gs.id = ranked.id
                    AND ranked.current_placement IS DISTINCT FROM ranked.placement
                ",
                &[]
            )
            .await?;

        info!(updated, elapsed = ?started.elapsed(), "Updated game score placements");
        Ok(())
    }
}
