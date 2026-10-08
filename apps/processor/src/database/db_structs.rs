use crate::model::structures::{rating_adjustment_type::RatingAdjustmentType, ruleset::Ruleset};
use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlayerPlacement {
    pub player_id: i32,
    pub placement: i32
}

#[derive(Debug, Clone, Serialize)]
pub struct Player {
    pub id: i32,
    pub username: Option<String>,
    pub country: Option<String>,
    pub ruleset_data: Option<Vec<RulesetData>>
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RulesetData {
    pub ruleset: Ruleset,
    pub global_rank: Option<i32>,
    pub earliest_global_rank: Option<i32>
}

#[derive(Debug, Clone, Serialize)]
pub struct Match {
    pub id: i32,
    pub name: String,
    pub start_time: DateTime<FixedOffset>,
    pub end_time: Option<DateTime<FixedOffset>>,
    // Populated in the db query (uses the tournament's ruleset)
    pub ruleset: Ruleset,
    pub games: Vec<Game>
}

impl Match {
    /// The point in time at which this match affects ratings.
    ///
    /// Match results are applied when the match ends. Some legacy matches do not
    /// have an end time, so their start time remains the compatibility fallback.
    pub fn rating_timestamp(&self) -> DateTime<FixedOffset> {
        self.end_time.unwrap_or(self.start_time)
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Game {
    pub id: i32,
    pub ruleset: Ruleset,
    pub start_time: DateTime<FixedOffset>,
    pub end_time: DateTime<FixedOffset>,
    pub scores: Vec<GameScore>
}

#[derive(Debug, Clone, Serialize)]
pub struct GameScore {
    pub id: i32,
    pub player_id: i32,
    pub game_id: i32,
    pub score: i32,
    pub placement: i32
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct PlayerRating {
    /// Unknown until insertion
    pub id: i32,
    pub player_id: i32,
    pub ruleset: Ruleset,
    pub rating: f64,
    pub volatility: f64,
    /// Updated once at the very end of processing
    pub percentile: f64,
    /// Updated once at the very end of processing
    pub global_rank: i32,
    /// Updated once at the very end of processing
    pub country_rank: i32,
    /// The adjustments that led to this rating object
    pub adjustments: Vec<RatingAdjustment>
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct RatingAdjustment {
    pub player_id: i32,
    pub ruleset: Ruleset,
    pub match_id: Option<i32>,
    pub rating_before: f64,
    pub rating_after: f64,
    pub volatility_before: f64,
    pub volatility_after: f64,
    pub timestamp: DateTime<FixedOffset>,
    pub adjustment_type: RatingAdjustmentType
}

#[derive(Serialize)]
pub struct PlayerHighestRank {
    pub id: i32,
    pub ruleset: Ruleset,
    pub global_rank: i32,
    pub global_rank_date: DateTime<FixedOffset>,
    pub country_rank: i32,
    pub country_rank_date: DateTime<FixedOffset>,
    pub player_id: i32
}

pub enum ReplicationRole {
    Replica,
    Origin
}

#[derive(Debug, Clone)]
pub struct TournamentInfo {
    pub id: i32,
    pub name: String,
    pub match_count: i32,
    pub player_count: i32
}
