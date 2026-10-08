use crate::messaging::{MessageMetadata, ProcessTournamentStatsMessage, RabbitMqConfig, RabbitMqPublisher};
use chrono::Utc;
use std::time::Duration;

#[cfg(test)]
mod publisher_tests {
    use super::*;

    fn test_config() -> RabbitMqConfig {
        RabbitMqConfig {
            host: "localhost".to_string(),
            username: "test".to_string(),
            password: "test".to_string(),
            vhost: "/".to_string(),
            port: 5672,
            exchange: "test.exchange".to_string(),
            routing_key: "test.routing.key".to_string(),
            queue_max_priority: Some(10),
            enabled: true,
            retry_attempts: 3,
            retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(1)
        }
    }

    #[test]
    fn test_publisher_creation() {
        let config = test_config();
        let publisher = RabbitMqPublisher::from_config(&config);

        assert!(!publisher.is_connected());
    }

    #[test]
    fn test_tournament_message_creation() {
        let message = ProcessTournamentStatsMessage {
            metadata: MessageMetadata {
                requested_at: Utc::now(),
                correlation_id: "corr-id".to_string(),
                priority: 5
            },
            tournament_id: 123
        };

        assert_eq!(message.tournament_id, 123);
        assert_eq!(message.metadata.correlation_id, "corr-id");
    }

    #[tokio::test]
    async fn test_publisher_health_check_when_not_connected() {
        let config = test_config();
        let publisher = RabbitMqPublisher::from_config(&config);

        let health = publisher.health_check().await.unwrap();
        assert!(!health);
    }

    #[test]
    fn test_publisher_drop_warning() {
        // This test verifies the Drop implementation doesn't panic
        let config = test_config();
        let _publisher = RabbitMqPublisher::from_config(&config);
        // Publisher should drop without issues when not connected
    }
}

#[cfg(test)]
mod config_tests {
    use super::*;
    use serial_test::serial;
    use std::{env, time::Duration};

    #[test]
    #[serial]
    fn test_from_env_with_url() {
        // Clean environment first
        cleanup_env_vars();

        env::set_var("RABBITMQ_URL", "amqp://testuser:testpass@testhost:5673/testvhost");
        env::set_var("RABBITMQ_ROUTING_KEY", "test.routing.key");

        let config = RabbitMqConfig::from_env().unwrap();

        assert_eq!(config.host, "testhost");
        assert_eq!(config.username, "testuser");
        assert_eq!(config.password, "testpass");
        assert_eq!(config.port, 5673);
        assert_eq!(config.vhost, "/testvhost");
        assert_eq!(config.routing_key, "test.routing.key");
        assert_eq!(config.queue_max_priority, Some(10));

        // Clean up
        cleanup_env_vars();
    }

    // Note: These tests modify environment variables and run serially

    #[test]
    #[serial]
    fn test_from_env_with_individual_vars() {
        // Clean environment first
        cleanup_env_vars();

        env::set_var("RABBITMQ_HOST", "myhost");
        env::set_var("RABBITMQ_USERNAME", "myuser");
        env::set_var("RABBITMQ_PASSWORD", "mypass");
        env::set_var("RABBITMQ_PORT", "5673");
        env::set_var("RABBITMQ_VHOST", "/myvhost");
        env::set_var("RABBITMQ_ROUTING_KEY", "my.routing.key");
        env::set_var("RABBITMQ_ENABLED", "false");
        env::set_var("RABBITMQ_RETRY_ATTEMPTS", "10");
        env::set_var("RABBITMQ_RETRY_DELAY_MS", "500");
        env::set_var("RABBITMQ_MAX_RETRY_DELAY_SECS", "60");
        env::set_var("RABBITMQ_QUEUE_MAX_PRIORITY", "7");

        let config = RabbitMqConfig::from_env().unwrap();

        assert_eq!(config.host, "myhost");
        assert_eq!(config.username, "myuser");
        assert_eq!(config.password, "mypass");
        assert_eq!(config.port, 5673);
        assert_eq!(config.vhost, "/myvhost");
        assert_eq!(config.routing_key, "my.routing.key");
        assert_eq!(config.queue_max_priority, Some(7));
        assert!(!config.enabled);
        assert_eq!(config.retry_attempts, 10);
        assert_eq!(config.retry_delay, Duration::from_millis(500));
        assert_eq!(config.max_retry_delay, Duration::from_secs(60));

        // Clean up
        cleanup_env_vars();
    }

    fn cleanup_env_vars() {
        env::remove_var("RABBITMQ_URL");
        env::remove_var("RABBITMQ_HOST");
        env::remove_var("RABBITMQ_USERNAME");
        env::remove_var("RABBITMQ_PASSWORD");
        env::remove_var("RABBITMQ_PORT");
        env::remove_var("RABBITMQ_VHOST");
        env::remove_var("RABBITMQ_ROUTING_KEY");
        env::remove_var("RABBITMQ_ENABLED");
        env::remove_var("RABBITMQ_RETRY_ATTEMPTS");
        env::remove_var("RABBITMQ_RETRY_DELAY_MS");
        env::remove_var("RABBITMQ_MAX_RETRY_DELAY_SECS");
        env::remove_var("RABBITMQ_QUEUE_MAX_PRIORITY");
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use std::time::Duration;

    // Note: These tests require a running RabbitMQ instance
    // They are marked with ignore and can be run with: cargo test -- --ignored

    #[tokio::test]
    #[ignore]
    async fn test_real_connection() {
        let config = RabbitMqConfig::default();
        let result = RabbitMqPublisher::connect_from_config(&config).await;

        if let Ok(mut publisher) = result {
            assert!(publisher.is_connected());

            let health = publisher.health_check().await.unwrap();
            assert!(health);

            publisher.close().await.expect("Failed to close connection");
            assert!(!publisher.is_connected());
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_publish_message() {
        let config = RabbitMqConfig::default();

        if let Ok(mut publisher) = RabbitMqPublisher::connect_from_config(&config).await {
            let result = publisher
                .publish_tournament_stats(123, Some("test-correlation-id".to_string()))
                .await;

            assert!(result.is_ok());

            publisher.close().await.expect("Failed to close connection");
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_reconnection() {
        let config = RabbitMqConfig {
            retry_attempts: 2,
            retry_delay: Duration::from_millis(100),
            ..Default::default()
        };

        let mut publisher = RabbitMqPublisher::from_config(&config);

        // First connection attempt (might fail if RabbitMQ is not running)
        let _ = publisher.connect_with_retry().await;

        if publisher.is_connected() {
            // Simulate connection loss by closing
            publisher.close().await.expect("Failed to close");
            assert!(!publisher.is_connected());

            // Test reconnection
            let result = publisher.ensure_connected().await;
            if result.is_ok() {
                assert!(publisher.is_connected());
            }

            publisher.close().await.expect("Failed to close");
        }
    }
}
