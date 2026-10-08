use crate::messaging::config::RabbitMqConfig;
use chrono::{DateTime, Utc};
use lapin::{
    options::{BasicPublishOptions, ExchangeDeclareOptions, QueueBindOptions, QueueDeclareOptions},
    types::{AMQPValue, FieldTable},
    BasicProperties, Channel, Connection, ConnectionProperties, ExchangeKind
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use thiserror::Error;
use tokio::time::sleep;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum PublisherError {
    #[error("Failed to connect to RabbitMQ: {0}")]
    ConnectionError(#[from] lapin::Error),

    #[error("Failed to serialize message: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Publisher not initialized")]
    NotInitialized
}

/// Message sent to trigger tournament statistics processing
/// This format matches what the DWS TournamentStatsConsumer expects
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessTournamentStatsMessage {
    #[serde(flatten)]
    pub metadata: MessageMetadata,
    pub tournament_id: i32
}

/// Shared metadata for queue messages
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageMetadata {
    pub requested_at: DateTime<Utc>,
    pub correlation_id: String,
    pub priority: u8
}

const DEFAULT_PRIORITY: u8 = 5;

/// RabbitMQ publisher for sending tournament processing events
pub struct RabbitMqPublisher {
    connection: Option<Arc<Connection>>,
    channel: Option<Channel>,
    config: RabbitMqConfig,
    connection_url: String
}

impl RabbitMqPublisher {
    /// Creates a new RabbitMQ publisher instance
    pub fn new(exchange: String, routing_key: String) -> Self {
        let config = RabbitMqConfig {
            exchange,
            routing_key,
            ..Default::default()
        };
        let connection_url = config.connection_url();

        Self {
            connection: None,
            channel: None,
            config,
            connection_url
        }
    }

    /// Creates a new RabbitMQ publisher from configuration
    pub fn from_config(config: &RabbitMqConfig) -> Self {
        Self {
            connection: None,
            channel: None,
            config: config.clone(),
            connection_url: config.connection_url()
        }
    }

    /// Creates and connects a publisher from configuration
    pub async fn connect_from_config(config: &RabbitMqConfig) -> Result<Self, PublisherError> {
        let mut publisher = Self::from_config(config);
        publisher.connect_with_retry().await?;
        Ok(publisher)
    }

    /// Connects to RabbitMQ and initializes the publisher
    pub async fn connect(&mut self, rabbitmq_url: &str) -> Result<(), PublisherError> {
        let connection = Connection::connect(rabbitmq_url, ConnectionProperties::default()).await?;
        let connection = Arc::new(connection);

        let channel = connection.create_channel().await?;

        let mut arguments = FieldTable::default();
        if let Some(priority) = self.config.queue_max_priority {
            arguments.insert("x-max-priority".into(), AMQPValue::ShortShortUInt(priority));
        }

        channel
            .queue_declare(
                self.config.routing_key.as_str().into(),
                QueueDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                arguments
            )
            .await?;

        channel
            .exchange_declare(
                self.config.exchange.as_str().into(),
                ExchangeKind::Fanout,
                ExchangeDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default()
            )
            .await?;

        channel
            .queue_bind(
                self.config.routing_key.as_str().into(),
                self.config.exchange.as_str().into(),
                self.config.routing_key.as_str().into(),
                QueueBindOptions::default(),
                FieldTable::default()
            )
            .await?;

        self.connection = Some(connection);
        self.channel = Some(channel);

        info!(url = %self.config.connection_url_safe(), "Connected to RabbitMQ");
        info!(
            queue = %self.config.routing_key,
            exchange = %self.config.exchange,
            "Queue declared and bound to exchange"
        );

        Ok(())
    }

    /// Connects to RabbitMQ with exponential backoff retry logic
    pub async fn connect_with_retry(&mut self) -> Result<(), PublisherError> {
        let mut attempt = 0;
        let mut delay = self.config.retry_delay;
        let connection_url = self.connection_url.clone();

        loop {
            attempt += 1;

            match self.connect(&connection_url).await {
                Ok(_) => return Ok(()),
                Err(e) => {
                    if attempt >= self.config.retry_attempts {
                        error!(attempts = attempt, "Failed to connect to RabbitMQ: {}", e);
                        return Err(e);
                    }

                    warn!(
                        attempt,
                        max_attempts = self.config.retry_attempts,
                        delay_ms = delay.as_millis() as u64,
                        "Failed to connect to RabbitMQ: {}. Retrying...",
                        e
                    );

                    sleep(delay).await;

                    // Exponential backoff with max delay
                    delay = std::cmp::min(delay * 2, self.config.max_retry_delay);
                }
            }
        }
    }

    /// Checks if the connection is healthy and attempts to reconnect if not
    pub async fn ensure_connected(&mut self) -> Result<(), PublisherError> {
        if !self.is_connected() {
            info!("Connection lost, attempting to reconnect...");
            self.connect_with_retry().await?;
        }

        // Check if the channel is still healthy
        if let Some(ref channel) = self.channel {
            if channel.status().connected() {
                return Ok(());
            }
        }

        // Channel is not healthy, reconnect
        info!("Channel not healthy, reconnecting...");
        self.connection = None;
        self.channel = None;
        self.connect_with_retry().await
    }

    /// Publishes a tournament stats processing message
    pub async fn publish_tournament_stats(
        &self,
        tournament_id: i32,
        correlation_id: Option<String>
    ) -> Result<(), PublisherError> {
        let channel = self.channel.as_ref().ok_or(PublisherError::NotInitialized)?;

        let message_id = Uuid::new_v4().to_string();
        let correlation_id = correlation_id.unwrap_or_else(|| Uuid::new_v4().to_string());

        let message = ProcessTournamentStatsMessage {
            metadata: MessageMetadata {
                requested_at: Utc::now(),
                correlation_id: correlation_id.clone(),
                priority: DEFAULT_PRIORITY
            },
            tournament_id
        };

        let payload = serde_json::to_vec(&message)?;

        channel
            .basic_publish(
                self.config.exchange.as_str().into(),
                self.config.routing_key.as_str().into(),
                BasicPublishOptions::default(),
                &payload,
                BasicProperties::default()
                    .with_content_type("application/json".into())
                    .with_message_id(message_id.into())
                    .with_correlation_id(correlation_id.into())
                    .with_priority(message.metadata.priority)
                    .with_delivery_mode(2)
                    .with_timestamp(Utc::now().timestamp() as u64)
            )
            .await?;

        debug!(
            tournament_id,
            exchange = %self.config.exchange,
            routing_key = %self.config.routing_key,
            "Published tournament stats message"
        );

        Ok(())
    }

    /// Checks if the publisher is connected
    pub fn is_connected(&self) -> bool {
        self.connection.is_some() && self.channel.is_some()
    }

    /// Performs a health check on the connection
    pub async fn health_check(&self) -> Result<bool, PublisherError> {
        if !self.is_connected() {
            return Ok(false);
        }

        if let Some(ref channel) = self.channel {
            Ok(channel.status().connected())
        } else {
            Ok(false)
        }
    }

    /// Closes the connection to RabbitMQ
    pub async fn close(&mut self) -> Result<(), PublisherError> {
        if let Some(channel) = self.channel.take() {
            channel.close(200, "Normal shutdown".into()).await?;
        }

        if let Some(connection) = self.connection.take() {
            if let Ok(conn) = Arc::try_unwrap(connection) {
                conn.close(200, "Normal shutdown".into()).await?;
            }
        }

        info!("RabbitMQ connection closed");
        Ok(())
    }
}

impl Drop for RabbitMqPublisher {
    fn drop(&mut self) {
        if self.is_connected() {
            warn!("RabbitMQ publisher dropped without proper closure");
        }
    }
}
