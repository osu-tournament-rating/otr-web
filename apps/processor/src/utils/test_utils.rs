use crate::{
    database::db_structs::{
        Game, GameScore, Match, Player, PlayerPlacement, PlayerRating, RatingAdjustment, RulesetData
    },
    model::structures::{rating_adjustment_type::RatingAdjustmentType, ruleset::Ruleset}
};
use chrono::{DateTime, Duration, FixedOffset, Utc};
use rand::{RngExt, SeedableRng};
use rand_chacha::ChaCha8Rng;
use std::{collections::HashMap, ops::Add};

pub fn generate_player_rating(
    player_id: i32,
    ruleset: Ruleset,
    rating: f64,
    volatility: f64,
    n_adjustments: i32,
    timestamp_begin: Option<DateTime<FixedOffset>>,
    timestamp_end: Option<DateTime<FixedOffset>>
) -> PlayerRating {
    if n_adjustments < 1 {
        panic!("Number of adjustments must be at least 1");
    }

    let default_time = Utc::now().fixed_offset();
    let start_time = timestamp_begin.unwrap_or(default_time);
    let end_time = timestamp_end.unwrap_or(default_time);

    // Initialize seeded RNG for reproducible results
    let mut rng = ChaCha8Rng::seed_from_u64(42);

    // Generate initial rating within ±500 of target rating
    let initial_rating = rating + rng.random_range(-500.0..=500.0);

    let mut adjustments = Vec::with_capacity(n_adjustments as usize);

    for i in 0..n_adjustments {
        let adjustment_type = if i == 0 {
            RatingAdjustmentType::Initial
        } else {
            RatingAdjustmentType::Match
        };

        // Calculate timestamps
        let timestamp = if timestamp_begin.is_some() || timestamp_end.is_some() {
            if n_adjustments == 1 {
                start_time
            } else {
                let progress = i as f64 / (n_adjustments - 1) as f64;
                let duration = end_time.signed_duration_since(start_time);
                let seconds = (duration.num_seconds() as f64 * progress) as i64;
                start_time + Duration::seconds(seconds)
            }
        } else {
            default_time
        };

        // Calculate ratings
        let progress = i as f64 / (n_adjustments - 1) as f64;
        let current_rating = initial_rating + (rating - initial_rating) * progress;
        let next_rating = if i == n_adjustments - 1 {
            rating
        } else {
            initial_rating + (rating - initial_rating) * ((i + 1) as f64 / (n_adjustments - 1) as f64)
        };

        adjustments.push(RatingAdjustment {
            player_id,
            ruleset,
            adjustment_type,
            match_id: None,
            rating_before: current_rating,
            rating_after: next_rating,
            volatility_before: volatility,
            volatility_after: volatility,
            timestamp
        });
    }

    PlayerRating {
        id: player_id,
        player_id,
        ruleset,
        rating,
        volatility,
        percentile: 0.0,
        global_rank: 0,
        country_rank: 0,
        adjustments
    }
}

pub fn generate_ruleset_data(ruleset: Ruleset, global_rank: i32, earliest_global_rank: Option<i32>) -> RulesetData {
    RulesetData {
        ruleset,
        global_rank: Some(global_rank),
        earliest_global_rank
    }
}

pub fn generate_placement(player_id: i32, placement: i32) -> PlayerPlacement {
    PlayerPlacement { player_id, placement }
}

pub fn generate_game(id: i32, placements: &[PlayerPlacement]) -> Game {
    let scores = placements
        .iter()
        .map(|p| GameScore {
            id: 0,
            player_id: p.player_id,
            game_id: id,
            score: 0,
            placement: p.placement
        })
        .collect();

    Game {
        id,
        ruleset: Ruleset::Osu,
        start_time: Default::default(),
        end_time: Default::default(),
        scores
    }
}

pub fn generate_country_mapping_player_ratings(player_ratings: &[PlayerRating], country: &str) -> HashMap<i32, String> {
    let mut mapping = HashMap::new();
    for p in player_ratings {
        mapping.insert(p.player_id, country.to_string());
    }

    mapping
}

pub fn generate_country_mapping_players(players: &[Player]) -> HashMap<i32, String> {
    let mut mapping: HashMap<i32, String> = HashMap::new();
    for p in players {
        mapping.insert(p.id, p.country.clone().unwrap_or_default());
    }

    mapping
}

pub fn generate_match(id: i32, ruleset: Ruleset, games: &[Game], start_time: DateTime<FixedOffset>) -> Match {
    Match {
        id,
        name: "Test Match".to_string(),
        ruleset,
        start_time,
        end_time: Some(start_time.add(chrono::Duration::hours(1))),
        games: games.to_vec()
    }
}

pub fn generate_matches(n: i32, player_ids: &[i32]) -> Vec<Match> {
    let mut matches = Vec::new();
    for i in 0..n {
        let game_count = 9;
        matches.push(generate_match(
            i,
            Ruleset::Osu,
            &generate_games(game_count, random_placements(player_ids).as_slice()),
            Utc::now().fixed_offset()
        ));
    }

    matches
}

fn generate_games(n: i32, placements: &[PlayerPlacement]) -> Vec<Game> {
    let mut games = Vec::new();
    for i in 1..=n {
        games.push(generate_game(i, placements));
    }

    games
}

fn random_placements(player_ids: &[i32]) -> Vec<PlayerPlacement> {
    let mut placements = Vec::new();

    // Select random placements for each player (1 to size)
    for (i, id) in player_ids.iter().enumerate() {
        placements.push(generate_placement(*id, i as i32));
    }

    placements
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_single_adjustment() {
        let rating = 1000.0;
        let volatility = 250.0;
        let result = generate_player_rating(1, Ruleset::Osu, rating, volatility, 1, None, None);

        assert_eq!(result.adjustments.len(), 1);
        assert_eq!(result.rating, rating);
        assert_eq!(result.volatility, volatility);
        assert_eq!(result.adjustments[0].adjustment_type, RatingAdjustmentType::Initial);
        assert_eq!(result.adjustments[0].rating_after, rating);
        assert_eq!(result.adjustments[0].volatility_after, volatility);
    }

    #[test]
    fn test_multiple_adjustments() {
        let rating = 1000.0;
        let volatility = 250.0;
        let result = generate_player_rating(1, Ruleset::Osu, rating, volatility, 3, None, None);

        assert_eq!(result.adjustments.len(), 3);
        assert_eq!(result.adjustments[0].adjustment_type, RatingAdjustmentType::Initial);
        assert_eq!(result.adjustments[1].adjustment_type, RatingAdjustmentType::Match);
        assert_eq!(result.adjustments[2].adjustment_type, RatingAdjustmentType::Match);
        assert_eq!(result.adjustments.last().unwrap().rating_after, rating);
        assert_eq!(result.adjustments.last().unwrap().volatility_after, volatility);
    }

    #[test]
    fn test_timestamp_scaling() {
        let start_time = Utc.with_ymd_and_hms(2024, 1, 1, 0, 0, 0).unwrap().fixed_offset();
        let end_time = Utc.with_ymd_and_hms(2024, 1, 2, 0, 0, 0).unwrap().fixed_offset();

        let result = generate_player_rating(1, Ruleset::Osu, 1000.0, 250.0, 3, Some(start_time), Some(end_time));

        assert_eq!(result.adjustments[0].timestamp, start_time);
        assert_eq!(result.adjustments.last().unwrap().timestamp, end_time);

        // Check middle timestamp is halfway between start and end
        let middle_time = result.adjustments[1].timestamp;
        let duration = end_time.signed_duration_since(start_time);
        let expected_middle = start_time + Duration::seconds(duration.num_seconds() / 2);
        assert_eq!(middle_time, expected_middle);
    }

    #[test]
    fn test_rating_progression() {
        let rating = 1000.0;
        let result = generate_player_rating(1, Ruleset::Osu, rating, 250.0, 3, None, None);

        // Check that ratings progress from initial to final
        let initial_rating = result.adjustments[0].rating_before;
        assert!((initial_rating - rating).abs() <= 500.0);

        // Check that final rating matches target
        assert_eq!(result.adjustments.last().unwrap().rating_after, rating);

        // Check that ratings monotonically approach target
        let mut last_diff = f64::INFINITY;
        for adj in &result.adjustments {
            let current_diff = (adj.rating_after - rating).abs();
            assert!(current_diff <= last_diff);
            last_diff = current_diff;
        }
    }

    #[test]
    #[should_panic(expected = "Number of adjustments must be at least 1")]
    fn test_invalid_adjustment_count() {
        generate_player_rating(1, Ruleset::Osu, 1000.0, 250.0, 0, None, None);
    }
}
