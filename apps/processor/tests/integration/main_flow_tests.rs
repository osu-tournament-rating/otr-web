use crate::common::init_test_env;
use serial_test::serial;
use std::process::Command;

/// Test that the application exits with error code when database connection fails
#[test]
#[serial]
fn test_application_exits_on_connection_failure() {
    init_test_env();
    // Build the processor binary
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

    // Run with invalid connection string. DATABASE_URL is set because it outranks
    // CONNECTION_STRING, and dotenvy would otherwise load it from otr's root .env.
    let output = Command::new(binary_path)
        .env(
            "DATABASE_URL",
            "host=invalid_host port=5432 user=postgres password=wrong dbname=nonexistent"
        )
        .env("RUST_LOG", "warn")
        .output()
        .expect("Failed to execute processor");

    // Should exit with error code
    assert!(!output.status.success(), "Process should fail with invalid connection");

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("Failed to connect to database") || stderr.contains("connection error"),
        "Should log connection error"
    );
    assert!(
        stderr.contains("Application cannot start without a valid database connection"),
        "Should log clear message about needing database connection"
    );
}

/// Test that the application handles missing DATABASE_URL and CONNECTION_STRING environment variables
#[test]
#[serial]
fn test_application_exits_on_missing_connection_string() {
    init_test_env();
    // Build the processor binary
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
        std::env::current_dir().unwrap().join("target/debug/otr-processor")
    } else {
        std::env::current_dir().unwrap().join("target/release/otr-processor")
    };

    // Create a temporary directory without .env file
    let temp_dir = std::env::temp_dir().join("otr_processor_test");
    std::fs::create_dir_all(&temp_dir).ok();

    // Run without DATABASE_URL or CONNECTION_STRING and from a directory without .env
    let output = Command::new(&binary_path)
        .current_dir(&temp_dir)
        .env_clear() // Clear all environment variables
        .env("RUST_LOG", "warn")
        .env("PATH", std::env::var("PATH").unwrap_or_default()) // Keep PATH for system
        .output()
        .expect("Failed to execute processor");

    // Clean up
    std::fs::remove_dir_all(&temp_dir).ok();

    // Should exit with error code
    assert!(
        !output.status.success(),
        "Process should fail without DATABASE_URL or CONNECTION_STRING"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("DATABASE_URL or CONNECTION_STRING environment variable must be set"),
        "Should report missing DATABASE_URL and CONNECTION_STRING. Got: {}",
        stderr
    );
}
