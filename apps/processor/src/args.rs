use clap::Parser;

#[derive(Parser, Clone)]
#[command(
    display_name = "o!TR Processor",
    author = "osu! Tournament Rating",
    long_about = "Generates ratings for the osu! Tournament Rating platform"
)]
pub struct Args {
    /// Ignores database constraints when processing.
    /// Allows those without access to the users table
    /// to modify the tournaments table
    #[arg(short, long, env = "IGNORE_CONSTRAINTS", action = clap::ArgAction::SetTrue)]
    pub ignore_constraints: bool,

    /// Log level (trace, debug, info, warn, error)
    #[arg(
        short,
        long,
        env = "RUST_LOG", 
        default_value = "info", 
        value_parser = ["trace", "debug", "info", "warn", "error"],
        help = "Sets the logging verbosity"
    )]
    pub log_level: String,

    /// RabbitMQ connection URL
    #[arg(
        long,
        env = "RABBITMQ_URL",
        default_value = "amqp://guest:guest@localhost:5672",
        help = "RabbitMQ connection URL"
    )]
    pub rabbitmq_url: String,

    /// RabbitMQ routing key for tournament stats events
    #[arg(
        long,
        env = "RABBITMQ_ROUTING_KEY",
        default_value = "processing.stats.tournaments",
        help = "RabbitMQ routing key for tournament stats events"
    )]
    pub rabbitmq_routing_key: String
}
