use clap::Parser;

#[derive(Parser, Clone)]
#[command(
    display_name = "o!TR Processor",
    author = "osu! Tournament Rating",
    long_about = "Generates ratings for the osu! Tournament Rating platform"
)]
pub struct Args {
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

/// Database URL variables, preferred first. `DATABASE_URL` is the name otr
/// shares; the production cron still passes `CONNECTION_STRING`.
pub const DATABASE_URL_VARS: [&str; 2] = ["DATABASE_URL", "CONNECTION_STRING"];

/// RabbitMQ URL variables, preferred first. `RABBITMQ_AMQP_URL` is the name
/// otr shares; the production cron still passes `RABBITMQ_URL`.
pub const RABBITMQ_URL_VARS: [&str; 2] = ["RABBITMQ_AMQP_URL", "RABBITMQ_URL"];

/// The value of the first variable in `names` that is set and not blank.
pub fn first_env(names: &[&str]) -> Option<String> {
    first_set(names, |name| std::env::var(name).ok())
}

fn first_set(names: &[&str], lookup: impl Fn(&str) -> Option<String>) -> Option<String> {
    names
        .iter()
        .filter_map(|name| lookup(name))
        .find(|value| !value.trim().is_empty())
}

/// Variables clap reads into [`Args`]. clap rejects a blank one instead of
/// using the default, so [`unset_blank_env`] removes it before parsing.
pub const ARGS_ENV_VARS: [&str; 3] = ["RUST_LOG", "RABBITMQ_URL", "RABBITMQ_ROUTING_KEY"];

/// Removes each variable in `names` that is set but blank, so `KEY=` reads as
/// unset. Call it before [`Args::parse`].
pub fn unset_blank_env(names: &[&str]) {
    for name in blank_vars(names, |name| std::env::var(name).ok()) {
        std::env::remove_var(name);
    }
}

fn blank_vars<'a>(names: &[&'a str], lookup: impl Fn(&str) -> Option<String>) -> Vec<&'a str> {
    names
        .iter()
        .copied()
        .filter(|name| lookup(name).is_some_and(|value| value.trim().is_empty()))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

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

        let vars = [("RABBITMQ_AMQP_URL", "   "), ("RABBITMQ_URL", "legacy")];
        assert_eq!(first_set(&RABBITMQ_URL_VARS, lookup(&vars)), Some("legacy".to_string()));

        let vars = [("DATABASE_URL", ""), ("CONNECTION_STRING", "")];
        assert_eq!(first_set(&DATABASE_URL_VARS, lookup(&vars)), None);
        assert_eq!(first_set(&DATABASE_URL_VARS, lookup(&[])), None);
    }

    #[test]
    fn test_blank_vars_finds_only_blank_values() {
        let vars = [
            ("RUST_LOG", ""),
            ("RABBITMQ_URL", "   "),
            ("RABBITMQ_ROUTING_KEY", "stats")
        ];
        assert_eq!(blank_vars(&ARGS_ENV_VARS, lookup(&vars)), ["RUST_LOG", "RABBITMQ_URL"]);
        assert!(blank_vars(&ARGS_ENV_VARS, lookup(&[])).is_empty());
    }

    #[test]
    #[serial]
    fn test_args_use_defaults_once_blank_env_is_unset() {
        let saved: Vec<_> = ARGS_ENV_VARS
            .iter()
            .map(|name| (*name, std::env::var_os(name)))
            .collect();
        for name in ARGS_ENV_VARS {
            std::env::set_var(name, "");
        }

        assert!(Args::try_parse_from(["otr-processor"]).is_err());

        unset_blank_env(&ARGS_ENV_VARS);
        let args = Args::try_parse_from(["otr-processor"]);

        for (name, value) in saved {
            match value {
                Some(value) => std::env::set_var(name, value),
                None => std::env::remove_var(name)
            }
        }

        let args = args.expect("blank variables should fall back to the defaults");
        assert_eq!(args.log_level, "info");
        assert_eq!(args.rabbitmq_url, "amqp://guest:guest@localhost:5672");
        assert_eq!(args.rabbitmq_routing_key, "processing.stats.tournaments");
    }
}
