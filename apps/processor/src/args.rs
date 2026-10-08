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

/// Database URL variables, preferred first. `DATABASE_URL` is the name otr-web
/// shares; the production cron still passes `CONNECTION_STRING`.
pub const DATABASE_URL_VARS: [&str; 2] = ["DATABASE_URL", "CONNECTION_STRING"];

/// RabbitMQ URL variables, preferred first. `RABBITMQ_AMQP_URL` is the name
/// otr-web shares; the production cron still passes `RABBITMQ_URL`.
pub const RABBITMQ_URL_VARS: [&str; 2] = ["RABBITMQ_AMQP_URL", "RABBITMQ_URL"];

/// The value of the first variable in `names` that is set and not empty.
pub fn first_env(names: &[&str]) -> Option<String> {
    first_set(names, |name| std::env::var(name).ok())
}

fn first_set(names: &[&str], lookup: impl Fn(&str) -> Option<String>) -> Option<String> {
    names
        .iter()
        .filter_map(|name| lookup(name))
        .find(|value| !value.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lookup<'a>(vars: &'a [(&'a str, &'a str)]) -> impl Fn(&str) -> Option<String> + 'a {
        move |name| {
            vars.iter()
                .find(|(key, _)| *key == name)
                .map(|(_, value)| value.to_string())
        }
    }

    #[test]
    fn test_first_set_prefers_the_shared_name() {
        let vars = [("DATABASE_URL", "shared"), ("CONNECTION_STRING", "legacy")];
        assert_eq!(first_set(&DATABASE_URL_VARS, lookup(&vars)), Some("shared".to_string()));
    }

    #[test]
    fn test_first_set_falls_back_to_the_legacy_name() {
        let vars = [("CONNECTION_STRING", "legacy")];
        assert_eq!(first_set(&DATABASE_URL_VARS, lookup(&vars)), Some("legacy".to_string()));

        let vars = [("RABBITMQ_URL", "legacy")];
        assert_eq!(first_set(&RABBITMQ_URL_VARS, lookup(&vars)), Some("legacy".to_string()));
    }

    #[test]
    fn test_first_set_skips_empty_values() {
        let vars = [("DATABASE_URL", ""), ("CONNECTION_STRING", "legacy")];
        assert_eq!(first_set(&DATABASE_URL_VARS, lookup(&vars)), Some("legacy".to_string()));

        let vars = [("DATABASE_URL", ""), ("CONNECTION_STRING", "")];
        assert_eq!(first_set(&DATABASE_URL_VARS, lookup(&vars)), None);
        assert_eq!(first_set(&DATABASE_URL_VARS, lookup(&[])), None);
    }
}
