use otr_processor::{
    database::db::DbClient,
    model::{otr_model::OtrModel, rating_utils::create_initial_ratings},
    utils::test_utils::generate_country_mapping_players
};
use serial_test::serial;
use std::collections::HashMap;

use super::test_helpers::TestDatabase;
use crate::common::init_test_env;

#[tokio::test]
#[serial]
async fn test_begin_transaction_uses_repeatable_read() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    let client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");

    let mut transaction = client.begin_transaction().await.expect("Failed to begin transaction");
    let isolation_level: String = client
        .client()
        .query_one("SHOW transaction_isolation", &[])
        .await
        .expect("Failed to inspect transaction isolation")
        .get(0);

    assert_eq!(isolation_level, "repeatable read");
    transaction.rollback().await.expect("Failed to rollback transaction");
}

#[tokio::test]
#[serial]
async fn test_transaction_rollback_on_processing_failure() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    test_db.seed_test_data().await.expect("Failed to seed test data");

    let client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");

    // Begin transaction
    client
        .client()
        .execute("BEGIN", &[])
        .await
        .expect("Failed to begin transaction");

    // Perform some operations (fetch matches to test transaction)
    let matches = client.get_matches().await;

    // Verify we have matches
    assert!(!matches.is_empty(), "Should have matches in test data");

    // Now simulate a failure by rolling back
    client
        .client()
        .execute("ROLLBACK", &[])
        .await
        .expect("Failed to rollback");

    // Verify that transaction was rolled back (check that no ratings were saved)
    let check_client = test_db.get_client().await.expect("Failed to get client");
    let rating_count: i64 = check_client
        .query_one("SELECT COUNT(*) FROM player_ratings", &[])
        .await
        .expect("Failed to query")
        .get(0);

    assert_eq!(rating_count, 0, "No ratings should exist after rollback");
}

#[tokio::test]
#[serial]
async fn test_full_processing_transaction_commit() {
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    test_db.seed_test_data().await.expect("Failed to seed test data");

    let client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");

    // Begin transaction
    client
        .client()
        .execute("BEGIN", &[])
        .await
        .expect("Failed to begin transaction");

    // Run the full processing pipeline
    let matches = client.get_matches().await;
    let players = client.get_players().await;

    let initial_ratings = create_initial_ratings(&players, &matches);
    let country_mapping: HashMap<i32, String> = generate_country_mapping_players(&players);
    let mut model = OtrModel::new(&initial_ratings, &country_mapping);
    let results = model.process(&matches);

    client.save_results(&results).await;

    // Commit transaction
    client.client().execute("COMMIT", &[]).await.expect("Failed to commit");

    // Verify data was saved
    let check_client = test_db.get_client().await.expect("Failed to get client");

    let rating_count: i64 = check_client
        .query_one("SELECT COUNT(*) FROM player_ratings", &[])
        .await
        .expect("Failed to query")
        .get(0);

    assert!(rating_count > 0, "Ratings should have been saved");
}

#[tokio::test]
#[serial]
async fn test_partial_processing_rollback() {
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    test_db.seed_test_data().await.expect("Failed to seed test data");

    let client = DbClient::connect(&test_db.connection_string, false)
        .await
        .expect("Failed to connect");

    // Begin transaction
    client
        .client()
        .execute("BEGIN", &[])
        .await
        .expect("Failed to begin transaction");

    // Perform partial operations
    let matches = client.get_matches().await;
    let players = client.get_players().await;

    // Create initial ratings but don't save
    let initial_ratings = create_initial_ratings(&players, &matches);
    let country_mapping: HashMap<i32, String> = generate_country_mapping_players(&players);
    let mut model = OtrModel::new(&initial_ratings, &country_mapping);
    let results = model.process(&matches);

    // Save results (this would normally commit data)
    client.save_results(&results).await;

    // Check that data exists within transaction
    let tx_rating_count: i64 = client
        .client()
        .query_one("SELECT COUNT(*) FROM player_ratings", &[])
        .await
        .expect("Failed to query")
        .get(0);

    assert!(tx_rating_count > 0, "Ratings should exist within transaction");

    // Rollback instead of commit
    client
        .client()
        .execute("ROLLBACK", &[])
        .await
        .expect("Failed to rollback");

    // Verify data was NOT saved
    let check_client = test_db.get_client().await.expect("Failed to get client");

    let rating_count: i64 = check_client
        .query_one("SELECT COUNT(*) FROM player_ratings", &[])
        .await
        .expect("Failed to query")
        .get(0);

    assert_eq!(rating_count, 0, "No ratings should exist after rollback");
}
