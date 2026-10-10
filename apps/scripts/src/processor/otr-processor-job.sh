#!/bin/bash

# Source environment variables
# shellcheck source=/dev/null
source "${HOME}/otr-scripts/src/load-env.sh"

TAG=$ENVIRONMENT
# If the environment is equal to "production", use "latest" as the tag instead of ${ENVIRONMENT}
if [[ $ENVIRONMENT == "production" ]]; then
    TAG=latest
fi

echo "Running otr-processor:${TAG} via docker"

docker pull "stagecodes/otr-processor:${TAG}"
# Images 2026.10.09 and newer read DATABASE_URL and RABBITMQ_AMQP_URL; RABBITMQ_URL is the host's setting.
docker run --network host -e DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@localhost:${DATABASE_PORT:-5432}/${DATABASE_NAME}" -e "RABBITMQ_AMQP_URL=${RABBITMQ_URL}" -e RUST_LOG=info "stagecodes/otr-processor:${TAG}"

echo 'Finished'