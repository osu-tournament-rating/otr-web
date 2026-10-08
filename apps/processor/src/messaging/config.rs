use serde::{Deserialize, Serialize};
use std::{env, time::Duration};

/// Configuration for RabbitMQ connection and messaging
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RabbitMqConfig {
    /// RabbitMQ host address
    pub host: String,
    /// RabbitMQ username for authentication
    pub username: String,
    /// RabbitMQ password for authentication
    pub password: String,
    /// Virtual host to use (default: "/")
    pub vhost: String,
    /// Port number (default: 5672)
    pub port: u16,
    /// Exchange name for tournament processing events
    pub exchange: String,
    /// Queue name for tournament processed messages
    pub routing_key: String,
    /// Optional queue max priority configuration
    pub queue_max_priority: Option<u8>,
    /// Whether RabbitMQ publishing is enabled
    pub enabled: bool,
    /// Connection retry attempts
    pub retry_attempts: u32,
    /// Initial retry delay
    pub retry_delay: Duration,
    /// Maximum retry delay
    pub max_retry_delay: Duration
}

impl RabbitMqConfig {
    /// Creates a new RabbitMQ configuration from environment variables
    pub fn from_env() -> Result<Self, env::VarError> {
        // Try RABBITMQ_URL first for backward compatibility
        if let Ok(url) = env::var("RABBITMQ_URL") {
            return Self::from_url(&url);
        }

        let routing_key =
            env::var("RABBITMQ_ROUTING_KEY").unwrap_or_else(|_| "processing.stats.tournaments".to_string());

        let queue_max_priority = env::var("RABBITMQ_QUEUE_MAX_PRIORITY")
            .ok()
            .and_then(|v| v.parse().ok())
            .or(Some(10));

        Ok(Self {
            host: env::var("RABBITMQ_HOST").unwrap_or_else(|_| "localhost".to_string()),
            username: env::var("RABBITMQ_USERNAME").unwrap_or_else(|_| "guest".to_string()),
            password: env::var("RABBITMQ_PASSWORD").unwrap_or_else(|_| "guest".to_string()),
            vhost: env::var("RABBITMQ_VHOST").unwrap_or_else(|_| "/".to_string()),
            port: env::var("RABBITMQ_PORT")
                .unwrap_or_else(|_| "5672".to_string())
                .parse()
                .unwrap_or(5672),
            exchange: routing_key.clone(),
            routing_key,
            queue_max_priority,
            enabled: env::var("RABBITMQ_ENABLED")
                .unwrap_or_else(|_| "true".to_string())
                .parse()
                .unwrap_or(true),
            retry_attempts: env::var("RABBITMQ_RETRY_ATTEMPTS")
                .unwrap_or_else(|_| "5".to_string())
                .parse()
                .unwrap_or(5),
            retry_delay: Duration::from_millis(
                env::var("RABBITMQ_RETRY_DELAY_MS")
                    .unwrap_or_else(|_| "100".to_string())
                    .parse()
                    .unwrap_or(100)
            ),
            max_retry_delay: Duration::from_secs(
                env::var("RABBITMQ_MAX_RETRY_DELAY_SECS")
                    .unwrap_or_else(|_| "30".to_string())
                    .parse()
                    .unwrap_or(30)
            )
        })
    }

    /// Creates configuration from a connection URL
    pub fn from_url(url: &str) -> Result<Self, env::VarError> {
        // Parse amqp://user:pass@host:port/vhost format
        let url = url.trim_start_matches("amqp://");
        let (auth_host, vhost) = url.split_once('/').unwrap_or((url, ""));
        let (auth, host_port) = auth_host.split_once('@').unwrap_or(("", auth_host));
        let (username, password) = auth.split_once(':').unwrap_or(("admin", "admin"));
        let (host, port_str) = host_port.split_once(':').unwrap_or((host_port, "5672"));
        let port = port_str.parse().unwrap_or(5672);

        let routing_key =
            env::var("RABBITMQ_ROUTING_KEY").unwrap_or_else(|_| "processing.stats.tournaments".to_string());

        let queue_max_priority = env::var("RABBITMQ_QUEUE_MAX_PRIORITY")
            .ok()
            .and_then(|v| v.parse().ok())
            .or(Some(10));

        Ok(Self {
            host: host.to_string(),
            username: username.to_string(),
            password: password.to_string(),
            vhost: if vhost.is_empty() {
                "/".to_string()
            } else {
                format!("/{}", vhost)
            },
            port,
            exchange: routing_key.clone(),
            routing_key,
            queue_max_priority,
            enabled: env::var("RABBITMQ_ENABLED")
                .unwrap_or_else(|_| "true".to_string())
                .parse()
                .unwrap_or(true),
            retry_attempts: 5,
            retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(30)
        })
    }

    /// Builds the AMQP connection URL from the configuration
    pub fn connection_url(&self) -> String {
        format!(
            "amqp://{}:{}@{}:{}/{}",
            self.username,
            self.password,
            self.host,
            self.port,
            self.vhost.replace('/', "%2F")
        )
    }

    /// Returns a sanitized connection URL suitable for logging (without credentials)
    pub fn connection_url_safe(&self) -> String {
        format!(
            "amqp://***:***@{}:{}/{}",
            self.host,
            self.port,
            self.vhost.replace('/', "%2F")
        )
    }

    /// Returns the full broker address for message envelope
    pub fn broker_address(&self) -> String {
        format!("rabbitmq://{}", self.host)
    }
}

impl Default for RabbitMqConfig {
    fn default() -> Self {
        let routing_key = "processing.stats.tournaments".to_string();
        Self {
            host: "localhost".to_string(),
            username: "admin".to_string(),
            password: "admin".to_string(),
            vhost: "/".to_string(),
            port: 5672,
            exchange: routing_key.clone(),
            routing_key,
            queue_max_priority: Some(10),
            enabled: true,
            retry_attempts: 5,
            retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(30)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_connection_url() {
        let config = RabbitMqConfig {
            host: "rabbitmq.example.com".to_string(),
            username: "user".to_string(),
            password: "pass".to_string(),
            vhost: "/".to_string(),
            port: 5672,
            exchange: "test.exchange".to_string(),
            routing_key: "test.key".to_string(),
            queue_max_priority: Some(10),
            enabled: true,
            retry_attempts: 5,
            retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(30)
        };

        assert_eq!(
            config.connection_url(),
            "amqp://user:pass@rabbitmq.example.com:5672/%2F"
        );
    }

    #[test]
    fn test_connection_url_with_custom_vhost() {
        let config = RabbitMqConfig {
            host: "localhost".to_string(),
            username: "admin".to_string(),
            password: "secret".to_string(),
            vhost: "/myapp".to_string(),
            port: 5673,
            exchange: "events".to_string(),
            routing_key: "app.events".to_string(),
            queue_max_priority: Some(10),
            enabled: true,
            retry_attempts: 5,
            retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(30)
        };

        assert_eq!(config.connection_url(), "amqp://admin:secret@localhost:5673/%2Fmyapp");
    }

    #[test]
    fn test_connection_url_safe() {
        let config = RabbitMqConfig {
            host: "rabbitmq.example.com".to_string(),
            username: "user".to_string(),
            password: "supersecretpassword".to_string(),
            vhost: "/".to_string(),
            port: 5672,
            exchange: "test.exchange".to_string(),
            routing_key: "test.key".to_string(),
            queue_max_priority: Some(10),
            enabled: true,
            retry_attempts: 5,
            retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(30)
        };

        assert_eq!(
            config.connection_url_safe(),
            "amqp://***:***@rabbitmq.example.com:5672/%2F"
        );
        // Ensure the actual URL still contains credentials
        assert!(config.connection_url().contains("supersecretpassword"));
    }

    #[test]
    fn test_broker_address() {
        let config = RabbitMqConfig {
            host: "rabbitmq.example.com".to_string(),
            username: "user".to_string(),
            password: "pass".to_string(),
            vhost: "/".to_string(),
            port: 5672,
            exchange: "test.exchange".to_string(),
            routing_key: "test.key".to_string(),
            queue_max_priority: Some(10),
            enabled: true,
            retry_attempts: 5,
            retry_delay: Duration::from_millis(100),
            max_retry_delay: Duration::from_secs(30)
        };

        assert_eq!(config.broker_address(), "rabbitmq://rabbitmq.example.com");
    }

    #[test]
    fn test_from_url() {
        let config = RabbitMqConfig::from_url("amqp://myuser:mypass@myhost:5673/myvhost").unwrap();

        assert_eq!(config.host, "myhost");
        assert_eq!(config.username, "myuser");
        assert_eq!(config.password, "mypass");
        assert_eq!(config.port, 5673);
        assert_eq!(config.vhost, "/myvhost");
    }

    #[test]
    fn test_from_url_defaults() {
        let config = RabbitMqConfig::from_url("amqp://localhost").unwrap();

        assert_eq!(config.host, "localhost");
        assert_eq!(config.username, "admin");
        assert_eq!(config.password, "admin");
        assert_eq!(config.port, 5672);
        assert_eq!(config.vhost, "/");
    }

    #[test]
    fn test_default_config() {
        let config = RabbitMqConfig::default();

        assert_eq!(config.host, "localhost");
        assert_eq!(config.username, "admin");
        assert_eq!(config.password, "admin");
        assert_eq!(config.vhost, "/");
        assert_eq!(config.port, 5672);
        assert_eq!(config.exchange, "processing.stats.tournaments");
        assert_eq!(config.routing_key, "processing.stats.tournaments");
        assert_eq!(config.queue_max_priority, Some(10));
        assert!(config.enabled);
        assert_eq!(config.retry_attempts, 5);
        assert_eq!(config.retry_delay, Duration::from_millis(100));
        assert_eq!(config.max_retry_delay, Duration::from_secs(30));
    }
}
