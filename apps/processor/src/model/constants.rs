/// The absolute minimum rating any player can have, regardless of performance or decay
pub const ABSOLUTE_RATING_FLOOR: f64 = 100.0;

/// Beta parameter for the PlackettLuce rating model
/// Controls how quickly ratings change based on expected vs actual performance
pub const BETA: f64 = DEFAULT_VOLATILITY / 2.0;

/// Number of days a player can be inactive before their rating begins to decay
pub const DECAY_DAYS: u64 = 184; // Approximately 6 months

/// Minimum rating that any player can decay to, based on their peak rating
pub const DECAY_MINIMUM: f64 = 1000.0;

/// Amount of rating lost per decay cycle
pub const DECAY_RATE: f64 = 3.0;

/// Initial volatility, higher values indicate more uncertainty in the rating
pub const DEFAULT_VOLATILITY: f64 = 400.0;

/// Maximum volatility that weekly volatility decay can increase to
pub const VOLATILITY_DECAY_CAP: f64 = DEFAULT_VOLATILITY;

/// Fallback default rating used when rating cannot be identified from osu! rank information
pub const FALLBACK_RATING: f64 = 1000.0;

/// Arbitrary regularization parameter
pub const KAPPA: f64 = 0.0001;

/// Maximum possible initial rating
pub const INITIAL_RATING_CEILING: f64 = 2000.0;

/// Minimum possible initial rating
pub const INITIAL_RATING_FLOOR: f64 = 500.0;

/// Tau parameter for the PlackettLuce rating model
/// Not currently used; volatility is increased via decay instead
pub const TAU: f64 = DEFAULT_VOLATILITY / 100.0;

/// Amount that squared volatility increases by on a weekly basis
pub const DECAY_VOLATILITY_GROWTH_RATE: f64 = 500.0;

/// Weight applied to Method A in the final rating calculation
/// Method A: Applies zero rating change for unplayed games
pub const WEIGHT_A: f64 = 0.9;

/// Weight applied to Method B in the final rating calculation
/// Method B: Assumes last place for unplayed games
/// Always equals 1 - WEIGHT_A to ensure weights sum to 1
pub const WEIGHT_B: f64 = 1.0 - WEIGHT_A;

/// Constant used for applying weights to matches based on match length.
/// Increasing this value will increase the magnitude of rating changes
/// for longer matches.
pub const GAME_CORRECTION_CONSTANT: f64 = 0.5;

/// Constant representing a typical match length (in games), used for
/// game correction weighting
pub const STANDARD_MATCH_LENGTH: f64 = 8.0;

/// Returns the earliest date at which decay (rating or volatility) is allowed to occur.
///
/// Due to limited accessible tournament data before ~May 2018 (only official World Cups),
/// players active in community tournaments before then appear inactive and accumulate
/// unfair decay. No decay should occur before this date.
pub fn decay_start_date() -> chrono::DateTime<chrono::FixedOffset> {
    use chrono::{TimeZone, Utc};
    Utc.with_ymd_and_hms(2019, 1, 1, 0, 0, 0).unwrap().fixed_offset()
}
