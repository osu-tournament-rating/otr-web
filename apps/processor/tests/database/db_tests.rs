use chrono::{DateTime, Duration, FixedOffset, Utc};
use otr_processor::{
    database::{db::DbClient, db_structs::*},
    model::structures::{rating_adjustment_type::RatingAdjustmentType, ruleset::Ruleset}
};
use serial_test::serial;

use super::test_helpers::TestDatabase;
use crate::common::init_test_env;

#[tokio::test]
#[serial]
async fn test_get_players() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    test_db.seed_test_data().await.expect("Failed to seed test data");

    let db_client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");

    let players = db_client.get_players().await;

    assert_eq!(players.len(), 4);
    assert_eq!(players[0].username, Some("TestPlayer1".to_string()));
    assert_eq!(players[1].username, Some("TestPlayer2".to_string()));
    assert_eq!(players[2].username, Some("TestPlayer3".to_string()));
    assert_eq!(players[3].username, Some("TestPlayer4".to_string()));

    // Check player ruleset data
    assert!(players[0].ruleset_data.is_some());
    let ruleset_data = players[0].ruleset_data.as_ref().unwrap();
    assert_eq!(ruleset_data.len(), 1);
    assert_eq!(ruleset_data[0].ruleset, Ruleset::Osu);
    assert_eq!(ruleset_data[0].global_rank, Some(1000));
}

#[tokio::test]
#[serial]
async fn test_get_players_keeps_all_rulesets_at_batch_boundary() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    let admin_client = test_db.get_client().await.expect("Failed to get client");

    admin_client
        .batch_execute(
            "
            INSERT INTO players (username, osu_id, country)
            SELECT 'BatchPlayer' || player_number, 100000 + player_number, 'US'
            FROM generate_series(1, 5000) AS player_number;

            INSERT INTO player_osu_ruleset_data (player_id, ruleset, pp, global_rank)
            SELECT id, 0, 1000.0, id
            FROM players;

            INSERT INTO player_osu_ruleset_data (player_id, ruleset, pp, global_rank)
            SELECT id, 1, 1000.0, id
            FROM players
            ORDER BY id DESC
            LIMIT 1;
            "
        )
        .await
        .expect("Failed to seed players at the batch boundary");

    let db_client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");
    let players = db_client.get_players().await;

    assert_eq!(players.len(), 5000);
    let boundary_rulesets = players
        .last()
        .and_then(|player| player.ruleset_data.as_ref())
        .expect("Boundary player should have ruleset data");
    assert_eq!(boundary_rulesets.len(), 2);
    assert_eq!(boundary_rulesets[0].ruleset, Ruleset::Osu);
    assert_eq!(boundary_rulesets[1].ruleset, Ruleset::Taiko);
}

#[tokio::test]
#[serial]
async fn test_get_players_keeps_earliest_rank_when_current_rank_is_null() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    let admin_client = test_db.get_client().await.expect("Failed to get client");

    let player_id: i32 = admin_client
        .query_one(
            "
            INSERT INTO players (username, osu_id, country)
            VALUES ('FormerlyRankedPlayer', 123456, 'US')
            RETURNING id
            ",
            &[]
        )
        .await
        .expect("Failed to insert player")
        .get("id");
    admin_client
        .execute(
            "
            INSERT INTO player_osu_ruleset_data
                (player_id, ruleset, pp, global_rank, earliest_global_rank)
            VALUES ($1, 0, 0.0, NULL, 1234)
            ",
            &[&player_id]
        )
        .await
        .expect("Failed to insert nullable current rank");

    let db_client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");
    let players = db_client.get_players().await;

    assert_eq!(players.len(), 1);
    let ruleset_data = players[0]
        .ruleset_data
        .as_ref()
        .expect("Player should have ruleset data");
    assert_eq!(ruleset_data.len(), 1);
    assert_eq!(ruleset_data[0].global_rank, None);
    assert_eq!(ruleset_data[0].earliest_global_rank, Some(1234));
}

#[tokio::test]
#[serial]
async fn test_get_matches() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    test_db.seed_test_data().await.expect("Failed to seed test data");

    let db_client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");

    let matches = db_client.get_matches().await;

    assert_eq!(matches.len(), 2);
    assert_eq!(matches[0].id, 1);
    assert_eq!(matches[1].id, 2);

    // Check games
    assert_eq!(matches[0].games.len(), 2);
    assert_eq!(matches[1].games.len(), 1);

    // Check scores
    assert_eq!(matches[0].games[0].scores.len(), 4);
    assert_eq!(matches[0].games[1].scores.len(), 4);
    assert_eq!(matches[1].games[0].scores.len(), 2);
}

#[tokio::test]
#[serial]
async fn test_save_results() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    test_db.seed_test_data().await.expect("Failed to seed test data");

    let db_client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");

    // Create test data with proper timestamp
    let timestamp = Utc::now().with_timezone(&FixedOffset::east_opt(0).unwrap());

    let player_ratings = vec![
        PlayerRating {
            id: 1,
            player_id: 1,
            ruleset: Ruleset::Osu,
            rating: 1500.0,
            volatility: 200.0,
            percentile: 0.75,
            global_rank: 100,
            country_rank: 10,
            adjustments: vec![RatingAdjustment {
                player_id: 1,
                adjustment_type: RatingAdjustmentType::Match,
                ruleset: Ruleset::Osu,
                rating_before: 1200.0,
                volatility_before: 300.0,
                rating_after: 1500.0,
                volatility_after: 200.0,
                timestamp,
                match_id: Some(1)
            }]
        },
        PlayerRating {
            id: 2,
            player_id: 2,
            ruleset: Ruleset::Osu,
            rating: 1400.0,
            volatility: 250.0,
            percentile: 0.65,
            global_rank: 200,
            country_rank: 20,
            adjustments: vec![RatingAdjustment {
                player_id: 2,
                adjustment_type: RatingAdjustmentType::Initial,
                ruleset: Ruleset::Osu,
                rating_before: 1200.0,
                volatility_before: 300.0,
                rating_after: 1400.0,
                volatility_after: 250.0,
                timestamp,
                match_id: None
            }]
        },
    ];

    // Save results
    db_client.save_results(&player_ratings).await;

    // Verify data was saved
    let check_client = test_db.get_client().await.expect("Failed to get client");

    let rating_count: i64 = check_client
        .query_one("SELECT COUNT(*) FROM player_ratings", &[])
        .await
        .expect("Failed to query")
        .get(0);

    let adjustment_count: i64 = check_client
        .query_one("SELECT COUNT(*) FROM rating_adjustments", &[])
        .await
        .expect("Failed to query")
        .get(0);

    assert_eq!(rating_count, 2);
    assert_eq!(adjustment_count, 2); // We have 2 adjustments, one for each player rating
}

#[tokio::test]
#[serial]
async fn test_save_results_updates_global_and_country_highest_ranks_independently() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    test_db.seed_test_data().await.expect("Failed to seed test data");

    let admin_client = test_db.get_client().await.expect("Failed to get client");
    admin_client
        .execute(
            "UPDATE player_highest_ranks SET country_rank = 0 WHERE player_id = 3 AND ruleset = 0",
            &[]
        )
        .await
        .expect("Failed to seed an unknown country rank");

    let timestamp = DateTime::parse_from_rfc3339("2025-02-03T04:05:06+00:00").unwrap();
    let player_ratings = vec![
        player_rating_with_ranks(1, 0, 50, timestamp),
        player_rating_with_ranks(2, 1500, 250, timestamp),
        player_rating_with_ranks(3, 3000, 30, timestamp),
    ];

    let db_client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");
    db_client.save_results(&player_ratings).await;

    let rows = admin_client
        .query(
            "
            SELECT player_id, global_rank, global_rank_date, country_rank, country_rank_date
            FROM player_highest_ranks
            WHERE player_id = ANY($1)
            ORDER BY player_id
            ",
            &[&vec![1_i32, 2, 3]]
        )
        .await
        .expect("Failed to fetch highest ranks");
    let original_timestamp = DateTime::parse_from_rfc3339("2024-01-01T00:00:00+00:00").unwrap();

    assert_eq!(rows.len(), 3);

    // An unknown global rank does not replace the peak, while an improved country rank does.
    assert_eq!(rows[0].get::<_, i32>("global_rank"), 1000);
    assert_eq!(
        rows[0].get::<_, DateTime<FixedOffset>>("global_rank_date"),
        original_timestamp
    );
    assert_eq!(rows[0].get::<_, i32>("country_rank"), 50);
    assert_eq!(rows[0].get::<_, DateTime<FixedOffset>>("country_rank_date"), timestamp);

    // A global improvement does not overwrite a better stored country peak.
    assert_eq!(rows[1].get::<_, i32>("global_rank"), 1500);
    assert_eq!(rows[1].get::<_, DateTime<FixedOffset>>("global_rank_date"), timestamp);
    assert_eq!(rows[1].get::<_, i32>("country_rank"), 200);
    assert_eq!(
        rows[1].get::<_, DateTime<FixedOffset>>("country_rank_date"),
        original_timestamp
    );

    // A real country rank replaces a stored zero without changing the equal global peak.
    assert_eq!(rows[2].get::<_, i32>("global_rank"), 3000);
    assert_eq!(
        rows[2].get::<_, DateTime<FixedOffset>>("global_rank_date"),
        original_timestamp
    );
    assert_eq!(rows[2].get::<_, i32>("country_rank"), 30);
    assert_eq!(rows[2].get::<_, DateTime<FixedOffset>>("country_rank_date"), timestamp);
}

fn player_rating_with_ranks(
    player_id: i32,
    global_rank: i32,
    country_rank: i32,
    timestamp: DateTime<FixedOffset>
) -> PlayerRating {
    PlayerRating {
        id: 0,
        player_id,
        ruleset: Ruleset::Osu,
        rating: 1500.0,
        volatility: 200.0,
        percentile: 0.5,
        global_rank,
        country_rank,
        adjustments: vec![RatingAdjustment {
            player_id,
            adjustment_type: RatingAdjustmentType::Initial,
            ruleset: Ruleset::Osu,
            rating_before: 1500.0,
            volatility_before: 200.0,
            rating_after: 1500.0,
            volatility_after: 200.0,
            timestamp,
            match_id: None
        }]
    }
}

#[tokio::test]
#[serial]
async fn test_detects_tournaments_with_changed_match_rating_adjustments() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    test_db.seed_test_data().await.expect("Failed to seed test data");

    let admin_client = test_db.get_client().await.expect("Failed to get client");
    let identifiers = admin_client
        .query_one(
            "
            SELECT m.id AS match_id, m.tournament_id
            FROM matches m
            ORDER BY m.id
            LIMIT 1
            ",
            &[]
        )
        .await
        .expect("Failed to fetch tournament identifiers");
    let match_id: i32 = identifiers.get("match_id");
    let tournament_id: i32 = identifiers.get("tournament_id");
    let timestamp = DateTime::parse_from_rfc3339("2025-02-03T04:05:06+00:00").unwrap();
    let previous_ratings = vec![player_rating_with_match_adjustment(1, match_id, 1500.0, timestamp)];

    let db_client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");

    let mut initial_transaction = db_client
        .begin_transaction()
        .await
        .expect("Failed to begin transaction");
    db_client.save_results(&previous_ratings).await;
    initial_transaction
        .commit()
        .await
        .expect("Failed to commit initial ratings");

    // Rewriting identical adjustment values should not invalidate the tournament.
    let mut unchanged_transaction = db_client
        .begin_transaction()
        .await
        .expect("Failed to begin transaction");
    db_client.snapshot_match_rating_adjustments().await;
    db_client.save_results(&previous_ratings).await;
    assert!(db_client
        .get_tournaments_with_changed_rating_adjustments()
        .await
        .is_empty());
    unchanged_transaction
        .rollback()
        .await
        .expect("Failed to rollback unchanged case");

    // A changed numeric rating output should invalidate its tournament.
    let mut changed_ratings = previous_ratings.clone();
    changed_ratings[0].rating = 1510.0;
    changed_ratings[0].adjustments.last_mut().unwrap().rating_after = 1510.0;
    let mut changed_transaction = db_client
        .begin_transaction()
        .await
        .expect("Failed to begin transaction");
    db_client.snapshot_match_rating_adjustments().await;
    db_client.save_results(&changed_ratings).await;
    assert_eq!(
        db_client.get_tournaments_with_changed_rating_adjustments().await,
        vec![tournament_id]
    );
    changed_transaction
        .rollback()
        .await
        .expect("Failed to rollback changed case");

    // Adding a new player's match adjustment should also invalidate the tournament.
    let mut added_ratings = previous_ratings.clone();
    added_ratings.push(player_rating_with_match_adjustment(2, match_id, 1400.0, timestamp));
    let mut added_transaction = db_client
        .begin_transaction()
        .await
        .expect("Failed to begin transaction");
    db_client.snapshot_match_rating_adjustments().await;
    db_client.save_results(&added_ratings).await;
    assert_eq!(
        db_client.get_tournaments_with_changed_rating_adjustments().await,
        vec![tournament_id]
    );
    added_transaction
        .rollback()
        .await
        .expect("Failed to rollback added case");

    // Removing an existing match adjustment should invalidate the tournament.
    let mut removed_transaction = db_client
        .begin_transaction()
        .await
        .expect("Failed to begin transaction");
    db_client.snapshot_match_rating_adjustments().await;
    db_client
        .client()
        .execute("DELETE FROM rating_adjustments WHERE match_id = $1", &[&match_id])
        .await
        .expect("Failed to remove match adjustment");
    assert_eq!(
        db_client.get_tournaments_with_changed_rating_adjustments().await,
        vec![tournament_id]
    );
    removed_transaction
        .rollback()
        .await
        .expect("Failed to rollback removed case");

    // Initial and decay adjustments are not inputs to per-match tournament statistics.
    let mut non_match_transaction = db_client
        .begin_transaction()
        .await
        .expect("Failed to begin transaction");
    db_client.snapshot_match_rating_adjustments().await;
    db_client
        .client()
        .execute(
            "UPDATE rating_adjustments SET rating_after = rating_after + 10 WHERE match_id IS NULL",
            &[]
        )
        .await
        .expect("Failed to change non-match adjustment");
    assert!(db_client
        .get_tournaments_with_changed_rating_adjustments()
        .await
        .is_empty());
    non_match_transaction
        .rollback()
        .await
        .expect("Failed to rollback non-match case");

    // Rejected tournaments are not eligible for downstream stats processing.
    let mut rejected_transaction = db_client
        .begin_transaction()
        .await
        .expect("Failed to begin transaction");
    db_client.snapshot_match_rating_adjustments().await;
    db_client
        .client()
        .execute(
            "UPDATE rating_adjustments SET rating_after = rating_after + 10 WHERE match_id = $1",
            &[&match_id]
        )
        .await
        .expect("Failed to change match adjustment");
    db_client
        .client()
        .execute(
            "UPDATE tournaments SET verification_status = 3 WHERE id = $1",
            &[&tournament_id]
        )
        .await
        .expect("Failed to reject tournament");
    assert!(db_client
        .get_tournaments_with_changed_rating_adjustments()
        .await
        .is_empty());
    rejected_transaction
        .rollback()
        .await
        .expect("Failed to rollback rejected case");
}

fn player_rating_with_match_adjustment(
    player_id: i32,
    match_id: i32,
    rating_after: f64,
    timestamp: DateTime<FixedOffset>
) -> PlayerRating {
    PlayerRating {
        id: 0,
        player_id,
        ruleset: Ruleset::Osu,
        rating: rating_after,
        volatility: 200.0,
        percentile: 0.5,
        global_rank: player_id * 100,
        country_rank: player_id * 10,
        adjustments: vec![
            RatingAdjustment {
                player_id,
                adjustment_type: RatingAdjustmentType::Initial,
                ruleset: Ruleset::Osu,
                rating_before: 0.0,
                volatility_before: 0.0,
                rating_after: 1200.0,
                volatility_after: 400.0,
                timestamp: timestamp - Duration::seconds(1),
                match_id: None
            },
            RatingAdjustment {
                player_id,
                adjustment_type: RatingAdjustmentType::Match,
                ruleset: Ruleset::Osu,
                rating_before: 1200.0,
                volatility_before: 400.0,
                rating_after,
                volatility_after: 200.0,
                timestamp,
                match_id: Some(match_id)
            },
        ]
    }
}

#[tokio::test]
#[serial]
async fn test_empty_database() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    // Don't seed data

    let db_client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");

    let players = db_client.get_players().await;
    let matches = db_client.get_matches().await;

    assert_eq!(players.len(), 0);
    assert_eq!(matches.len(), 0);
}

#[tokio::test]
#[serial]
async fn test_calculate_and_update_game_score_placements() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    test_db.seed_test_data().await.expect("Failed to seed test data");

    // Scramble existing placements and mark one score as unverified to exercise both paths.
    let admin_client = test_db.get_client().await.expect("Failed to get client");
    admin_client
        .execute(
            "
            UPDATE game_scores
            SET placement = 99
            WHERE game_id = (SELECT game_id FROM game_scores ORDER BY game_id LIMIT 1)
        ",
            &[]
        )
        .await
        .expect("Failed to scramble placements");
    admin_client
        .execute(
            "
            UPDATE game_scores
            SET verification_status = 3
            WHERE id = (SELECT id FROM game_scores ORDER BY id LIMIT 1)
        ",
            &[]
        )
        .await
        .expect("Failed to mark a score as unverified");
    // Force a tied score pair within one game to exercise shared placements
    admin_client
        .execute(
            "
            UPDATE game_scores
            SET score = tied.max_score
            FROM (
                SELECT game_id, MAX(score) AS max_score
                FROM game_scores
                WHERE verification_status = 4
                GROUP BY game_id
                HAVING COUNT(*) >= 2
                ORDER BY game_id
                LIMIT 1
            ) AS tied
            WHERE game_scores.game_id = tied.game_id
                AND game_scores.verification_status = 4
        ",
            &[]
        )
        .await
        .expect("Failed to create tied scores");

    let db_client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");

    db_client.calculate_and_update_game_score_placements().await;

    let rows = admin_client
        .query(
            "
            SELECT game_id, score, verification_status, placement
            FROM game_scores
            ORDER BY game_id, score DESC, id
        ",
            &[]
        )
        .await
        .expect("Failed to fetch placements");

    // Collect (game_id, score, verification_status, placement) tuples
    let scores: Vec<(i32, i32, i32, i32)> = rows
        .iter()
        .map(|row| {
            (
                row.get("game_id"),
                row.get("score"),
                row.get("verification_status"),
                row.get("placement")
            )
        })
        .collect();

    let mut saw_shared_placement = false;
    for &(game_id, score, verification_status, placement) in &scores {
        if verification_status != 4 {
            assert_eq!(
                placement, 0,
                "Unverified score in game {} should have placement 0",
                game_id
            );
            continue;
        }

        // Tie-aware rank: 1 + number of verified scores in the same game
        // with a strictly higher score. Tied scores share a placement and
        // the following placement is skipped.
        let expected_placement = 1 + scores
            .iter()
            .filter(|&&(g, s, vs, _)| g == game_id && vs == 4 && s > score)
            .count() as i32;

        assert_eq!(
            placement, expected_placement,
            "Verified score in game {} should have tie-aware placement",
            game_id
        );

        let sharing = scores
            .iter()
            .filter(|&&(g, _, vs, p)| g == game_id && vs == 4 && p == placement)
            .count();
        if sharing > 1 {
            saw_shared_placement = true;
        }
    }

    assert!(
        saw_shared_placement,
        "Fixture should include at least one tied pair sharing a placement"
    );
}
