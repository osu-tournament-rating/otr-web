use crate::model::structures::ruleset::Ruleset;
use thiserror::Error;

/// A failed database operation. Any failure aborts the rebuild, which rolls
/// back its transaction.
#[derive(Debug, Error)]
pub enum DbError {
    #[error(transparent)]
    Postgres(#[from] tokio_postgres::Error),

    #[error("{entity} {id} has unknown ruleset {ruleset}")]
    UnknownRuleset {
        entity: &'static str,
        id: i32,
        ruleset: i32
    },

    /// Saving an empty result would erase every rating.
    #[error("Refusing to save an empty set of player ratings")]
    NoRatings,

    #[error("The {ruleset:?} rating of player {player_id} has no adjustments")]
    RatingWithoutAdjustments { player_id: i32, ruleset: Ruleset }
}

pub type DbResult<T> = Result<T, DbError>;
