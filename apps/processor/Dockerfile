# Build stage
FROM rust:1.97.1-trixie AS builder

WORKDIR /usr/src/otr-processor

# Build the dependencies against placeholder sources, so this layer stays
# cached until the manifest, lockfile, or toolchain changes
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
RUN mkdir src \
    && echo 'fn main() {}' > src/main.rs \
    && touch src/lib.rs \
    && cargo build --release --locked \
    && rm -rf src

# Build the application. The placeholder build is newer than the copied
# sources, so without the touch cargo would keep the placeholder binary.
COPY src ./src
RUN touch src/main.rs src/lib.rs && cargo build --release --locked

# Runtime stage
FROM debian:trixie-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy the binary from builder
COPY --from=builder /usr/src/otr-processor/target/release/otr-processor /usr/local/bin/otr-processor

ENTRYPOINT ["/usr/local/bin/otr-processor"]
