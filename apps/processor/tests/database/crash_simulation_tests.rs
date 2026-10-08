use serial_test::serial;
use std::process::Command;

use super::test_helpers::TestDatabase;
use crate::common::init_test_env;

/// Helper to simulate a processor crash by running it in a subprocess and killing it
async fn simulate_crash_during_processing(test_db: &TestDatabase, crash_after_ms: u64) -> std::process::Output {
    // Build the processor binary if needed
    let build_output = Command::new("cargo")
        .args(["build", "--bin", "otr-processor"])
        .output()
        .expect("Failed to execute cargo build");

    if !build_output.status.success() {
        panic!(
            "Failed to build processor: {}\n{}",
            String::from_utf8_lossy(&build_output.stdout),
            String::from_utf8_lossy(&build_output.stderr)
        );
    }

    // Determine the correct binary path based on profile
    let binary_path = if cfg!(debug_assertions) {
        "target/debug/otr-processor"
    } else {
        "target/release/otr-processor"
    };

    // Start the processor in a subprocess
    let mut child = Command::new(binary_path)
        .env("CONNECTION_STRING", &test_db.connection_string)
        .env("RUST_LOG", "warn")
        .spawn()
        .expect("Failed to start processor");

    // Wait for specified time to simulate work being done
    tokio::time::sleep(tokio::time::Duration::from_millis(crash_after_ms)).await;

    // Kill the process to simulate a crash
    child.kill().expect("Failed to kill process");

    // Wait for it to finish and get output
    child.wait_with_output().expect("Failed to get output")
}

#[tokio::test]
#[serial]
async fn test_crash_leaves_database_consistent() {
    init_test_env();
    let test_db = TestDatabase::new().await.expect("Failed to create test database");
    test_db.seed_test_data().await.expect("Failed to seed test data");

    // Record initial state
    let check_client = test_db.get_client().await.expect("Failed to get client");

    let initial_rating_count: i64 = check_client
        .query_one("SELECT COUNT(*) FROM player_ratings", &[])
        .await
        .expect("Failed to query")
        .get(0);

    assert_eq!(initial_rating_count, 0, "Should start with no ratings");

    // Simulate crash after 30ms (enough time to start processing but not commit)
    simulate_crash_during_processing(&test_db, 30).await;

    // Wait a bit for any cleanup
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Verify database is still in initial state (transaction was rolled back)
    let post_crash_rating_count: i64 = check_client
        .query_one("SELECT COUNT(*) FROM player_ratings", &[])
        .await
        .expect("Failed to query")
        .get(0);

    assert_eq!(post_crash_rating_count, 0, "Ratings should be rolled back after crash");

    // Verify no lingering transactions
    let active_transactions: i64 = check_client
        .query_one(
            "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle in transaction' AND datname = current_database()",
            &[]
        )
        .await
        .expect("Failed to query")
        .get(0);

    assert_eq!(active_transactions, 0, "No lingering transactions should exist");
}
