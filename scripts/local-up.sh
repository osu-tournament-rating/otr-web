#!/bin/bash
set -e

cd "$(dirname "$0")/.."

docker build -f apps/web/Dockerfile -t otr-web:local .
docker build -f apps/data-worker/Dockerfile -t otr-data-worker:local .

docker compose --profile node-exporter up
