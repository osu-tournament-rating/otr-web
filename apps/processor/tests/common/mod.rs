use std::sync::Once;

static INIT: Once = Once::new();

/// Initialize test environment with RUST_LOG=WARN
pub fn init_test_env() {
    INIT.call_once(|| {
        std::env::set_var("RUST_LOG", "warn");
        let _ = tracing_subscriber::fmt()
            .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
            .try_init();
    });
}
