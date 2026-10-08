use indicatif::ProgressStyle;
use tracing::{info_span, Span};
use tracing_indicatif::span_ext::IndicatifSpanExt;

pub fn progress_span(len: u64, msg: impl Into<String>) -> Span {
    let msg = msg.into();
    let span = info_span!("progress", %msg);
    span.pb_set_style(
        &ProgressStyle::default_bar()
            .template("[{elapsed_precise} / {eta_precise}] {bar:40.cyan/blue} {pos:>7}/{len:7} {msg}")
            .unwrap()
            .progress_chars("##-")
    );
    span.pb_set_length(len);
    span.pb_set_message(&msg);
    span
}

pub fn spinner_span(len: u64, msg: impl Into<String>) -> Span {
    let msg = msg.into();
    let span = info_span!("spinner", %msg);
    span.pb_set_style(
        &ProgressStyle::default_spinner()
            .template("[{elapsed_precise} / {eta_precise}] {spinner:.green} {msg}")
            .unwrap()
    );
    span.pb_set_length(len);
    span.pb_set_message(&msg);
    span
}

pub fn indeterminate_span(msg: impl Into<String>) -> Span {
    let msg = msg.into();
    let span = info_span!("indeterminate", %msg);
    span.pb_set_style(
        &ProgressStyle::default_spinner()
            .template("[{elapsed_precise}] {spinner:.green} {msg}")
            .unwrap()
    );
    span.pb_set_message(&msg);
    span
}
