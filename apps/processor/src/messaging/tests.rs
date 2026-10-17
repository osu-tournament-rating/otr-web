use crate::messaging::{Broker, MessageMetadata, ProcessTournamentStatsMessage, RabbitMqConfig, RabbitMqPublisher};
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
    fn test_publisher_reports_the_broker_it_dials() {
        let publisher = RabbitMqPublisher::new(
            "amqp://user:secret@broker.example:5673/",
            "test.exchange".to_string(),
            "test.routing.key".to_string()
        );

        let broker = publisher.broker().unwrap();

        assert_eq!(
            broker,
            Broker {
                host: "broker.example".to_string(),
                port: 5673,
                vhost: "/".to_string()
            }
        );
        assert!(!format!("{broker:?}").contains("secret"));
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
        env::remove_var("RABBITMQ_AMQP_URL");
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
    use crate::{args::first_env, messaging::config::parse_amqp_uri};
    use lapin::{
        options::{BasicGetOptions, ExchangeDeleteOptions, QueueDeleteOptions},
        Channel, Connection, ConnectionProperties
    };
    use uuid::Uuid;

    // These tests need a disposable RabbitMQ broker, so they are ignored by default.
    // Run them with: OTR_TEST_RABBITMQ_URL=<broker URL> cargo test -- --ignored

    /// A queue and exchange that one test owns on the broker named by `OTR_TEST_RABBITMQ_URL`.
    /// The name is unique, so no test message reaches the data worker's queue.
    struct TestQueue {
        url: String,
        name: String
    }

    impl TestQueue {
        /// There is no default broker, because the default local broker is the developer's own.
        fn new() -> Self {
            let url = first_env(&["OTR_TEST_RABBITMQ_URL"]).expect(
                "Set OTR_TEST_RABBITMQ_URL to a disposable RabbitMQ broker, such as the RABBITMQ_AMQP_URL \
                 that `apps/scripts/otr up rabbitmq --no-web` writes to the worktree's .env"
            );

            Self {
                url,
                name: format!("otr.processor.test.{}", Uuid::new_v4())
            }
        }

        fn publisher(&self) -> RabbitMqPublisher {
            RabbitMqPublisher::new(&self.url, self.name.clone(), self.name.clone())
        }

        /// A connection of the test's own, to inspect the queue
        async fn channel(&self) -> (Connection, Channel) {
            let uri = parse_amqp_uri(&self.url).expect("parse OTR_TEST_RABBITMQ_URL");
            let connection = Connection::connect_uri(uri, ConnectionProperties::default())
                .await
                .expect("connect to the test broker");
            let channel = connection.create_channel().await.expect("open a channel");
            (connection, channel)
        }

        /// The next message on the queue, read from the test broker. The broker
        /// routes a message asynchronously, so this gives it a moment to arrive.
        async fn next_message(&self) -> serde_json::Value {
            let (connection, channel) = self.channel().await;
            let mut message = None;
            for _ in 0..20 {
                message = channel
                    .basic_get(self.name.as_str().into(), BasicGetOptions { no_ack: true })
                    .await
                    .expect("read the test queue");
                if message.is_some() {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(50)).await;
            }
            connection
                .close(200, "Test finished".into())
                .await
                .expect("close the connection");

            let message = message.expect("a message reaches the test queue");
            serde_json::from_slice(&message.delivery.data).expect("the message is JSON")
        }

        async fn remove(self) {
            let (connection, channel) = self.channel().await;
            channel
                .queue_delete(self.name.as_str().into(), QueueDeleteOptions::default())
                .await
                .expect("delete the test queue");
            channel
                .exchange_delete(self.name.as_str().into(), ExchangeDeleteOptions::default())
                .await
                .expect("delete the test exchange");
            connection
                .close(200, "Test finished".into())
                .await
                .expect("close the connection");
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_real_connection() {
        let queue = TestQueue::new();
        let mut publisher = queue.publisher();

        publisher
            .connect_with_retry()
            .await
            .expect("connect to the test broker");
        assert!(publisher.is_connected());
        assert!(publisher.health_check().await.unwrap());

        let uri = parse_amqp_uri(&queue.url).unwrap();
        assert_eq!(publisher.broker().unwrap(), Broker::from(&uri));

        publisher.close().await.expect("close the connection");
        assert!(!publisher.is_connected());

        queue.remove().await;
    }

    #[tokio::test]
    #[ignore]
    async fn test_publish_message() {
        let queue = TestQueue::new();
        let mut publisher = queue.publisher();

        publisher
            .connect_with_retry()
            .await
            .expect("connect to the test broker");
        publisher
            .publish_tournament_stats(123, Some("test-correlation-id".to_string()))
            .await
            .expect("publish the message");
        publisher.close().await.expect("close the connection");

        let body = queue.next_message().await;
        assert_eq!(body["tournamentId"], 123);
        assert_eq!(body["correlationId"], "test-correlation-id");

        queue.remove().await;
    }

    #[tokio::test]
    #[ignore]
    async fn test_reconnection() {
        let queue = TestQueue::new();
        let mut publisher = queue.publisher();

        publisher
            .connect_with_retry()
            .await
            .expect("connect to the test broker");
        assert!(publisher.is_connected());

        // Simulate connection loss by closing
        publisher.close().await.expect("close the connection");
        assert!(!publisher.is_connected());

        publisher
            .ensure_connected()
            .await
            .expect("reconnect to the test broker");
        assert!(publisher.is_connected());

        // The message reaching the test broker shows the reconnect dialed it, not a default broker.
        publisher
            .publish_tournament_stats(456, None)
            .await
            .expect("publish after reconnecting");
        publisher.close().await.expect("close the connection");
        assert_eq!(queue.next_message().await["tournamentId"], 456);

        queue.remove().await;
    }
}
