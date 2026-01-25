#!/bin/bash

set -e
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "${SCRIPT_DIR}/../.env" ]; then
    set -a
    source "${SCRIPT_DIR}/../.env"
    set +a
fi

USER="${DATABASE_USER:-postgres}"
DB="${DATABASE_NAME:-postgres}"
CONTAINER="${DATABASE_CONTAINER:-db}"
TEMP_DIR="${TEMP_DIR:-/tmp/otr-e2e-dumps}"

if [ -z "${GCS_BUCKET}" ]; then
    echo "Error: GCS_BUCKET environment variable not defined"
    echo "Set it in .env or export it before running this script"
    exit 1
fi

echo "Starting e2e database setup..."
echo "Fetching latest dump from GCS bucket ${GCS_BUCKET}..."

MAX_RETRIES=3
RETRY_DELAY=5
TIMEOUT_SECONDS=30

for ((i=1; i<=MAX_RETRIES; i++)); do
    LATEST_ENTRY=$(timeout ${TIMEOUT_SECONDS} gcloud storage ls -l "gs://${GCS_BUCKET}" 2>&1 \
        | awk 'NF >= 3 && $NF ~ /^gs:\/\/.*\.gz$/ {print $(NF-1) " " $NF}' \
        | sort -k1,1r \
        | head -n1) && break

    if [ $i -lt $MAX_RETRIES ]; then
        echo "Warning: GCS listing attempt $i failed or timed out. Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
        RETRY_DELAY=$((RETRY_DELAY * 2))
    else
        echo "Error: Failed to list GCS bucket after $MAX_RETRIES attempts"
        echo "Check: gcloud auth list, network connectivity, and bucket permissions"
        exit 1
    fi
done

LATEST_FILE=$(awk '{print $2}' <<<"${LATEST_ENTRY}")

if [ -z "${LATEST_FILE}" ]; then
    echo "Error: No files found in bucket ${GCS_BUCKET}"
    exit 1
fi

FILENAME=$(basename "${LATEST_FILE}")
echo "Latest dump: ${FILENAME}"

mkdir -p "${TEMP_DIR}"

echo "Downloading dump from GCS..."
gcloud storage cp "${LATEST_FILE}" "${TEMP_DIR}"

if [ ! -f "${TEMP_DIR}/${FILENAME}" ]; then
    echo "Error: File download failed"
    exit 1
fi

echo "Restoring database..."
docker exec -i "${CONTAINER}" dropdb -f --if-exists -U "${USER}" "${DB}"
docker exec -i "${CONTAINER}" createdb -U "${USER}" "${DB}"

echo "Importing database dump..."
gunzip -c "${TEMP_DIR}/${FILENAME}" | docker exec -i "${CONTAINER}" psql -U "${USER}" -d "${DB}"

echo "Running database migrations..."
cd "${SCRIPT_DIR}/.."
bunx drizzle-kit migrate

echo "Cleaning up..."
rm -rf "${TEMP_DIR}"

echo "E2E database setup completed successfully."
