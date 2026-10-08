pub mod config;
pub mod publisher;

#[cfg(test)]
mod tests;

pub use config::RabbitMqConfig;
pub use publisher::{MessageMetadata, ProcessTournamentStatsMessage, PublisherError, RabbitMqPublisher};
