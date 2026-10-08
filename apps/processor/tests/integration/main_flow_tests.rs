use crate::common::init_test_env;
use clap::Parser;
use otr_processor::args::Args;
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

    // Run with invalid connection string
    let output = Command::new(binary_path)
        .env(
            "CONNECTION_STRING",
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

/// Test that the application handles missing CONNECTION_STRING environment variable
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

    // Run without CONNECTION_STRING and from a directory without .env
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
        "Process should fail without CONNECTION_STRING"
    );

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("CONNECTION_STRING environment variable must be set"),
        "Should report missing CONNECTION_STRING. Got: {}",
        stderr
    );
}

/// Test that IGNORE_CONSTRAINTS environment variable works
#[test]
#[serial]
fn test_ignore_constraints_env_var() {
    init_test_env();
    // Test 1: Environment variable set to true should override default
    std::env::set_var("IGNORE_CONSTRAINTS", "true");
    let args = Args::parse_from(["otr-processor"]);
    assert!(
        args.ignore_constraints,
        "IGNORE_CONSTRAINTS=true should set ignore_constraints to true"
    );
    std::env::remove_var("IGNORE_CONSTRAINTS");

    // Test 2: Environment variable set to false
    std::env::set_var("IGNORE_CONSTRAINTS", "false");
    let args = Args::parse_from(["otr-processor"]);
    assert!(
        !args.ignore_constraints,
        "IGNORE_CONSTRAINTS=false should set ignore_constraints to false"
    );
    std::env::remove_var("IGNORE_CONSTRAINTS");

    // Test 3: CLI argument works when no env var is set
    let args = Args::parse_from(["otr-processor", "--ignore-constraints"]);
    assert!(
        args.ignore_constraints,
        "CLI argument should work when no env var is set"
    );

    // Test 4: Default is false when neither env var nor CLI arg is set
    let args = Args::parse_from(["otr-processor"]);
    assert!(!args.ignore_constraints, "Default should be false");
}
