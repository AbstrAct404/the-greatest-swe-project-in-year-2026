#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONGO_CONTAINER="geodata-mongo"
MONGO_IMAGE="mongo"

cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required to start the local MongoDB container." >&2
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Start Docker Desktop and try again." >&2
    exit 1
fi

if docker container inspect "$MONGO_CONTAINER" >/dev/null 2>&1; then
    docker start "$MONGO_CONTAINER" >/dev/null
else
    docker run --name "$MONGO_CONTAINER" -d -p 27017:27017 "$MONGO_IMAGE" >/dev/null
fi

for ((attempt = 1; attempt <= 30; attempt++)); do
    if docker exec "$MONGO_CONTAINER" mongosh --quiet \
        --eval 'db.adminCommand({ping: 1}).ok' >/dev/null 2>&1; then
        break
    fi
    if ((attempt == 30)); then
        echo "MongoDB did not become ready in time." >&2
        exit 1
    fi
    sleep 1
done

PYTHON="${PYTHON:-python3}"
if ! command -v "$PYTHON" >/dev/null 2>&1; then
    echo "Python executable not found: $PYTHON" >&2
    exit 1
fi

export CLOUD_MONGO=0
export PYTHONPATH="$ROOT_DIR${PYTHONPATH:+:$PYTHONPATH}"

MONGO_TARGETS="$("$PYTHON" -c 'import json; from data.db_connect import SE_DB; from parks.query import PARKS_COLLECT; print(json.dumps([SE_DB, PARKS_COLLECT]))')"
PARK_COUNT="$(docker exec "$MONGO_CONTAINER" mongosh --quiet \
    --eval "const [databaseName, collectionName] = $MONGO_TARGETS; db.getSiblingDB(databaseName).getCollection(collectionName).countDocuments()")"
if [[ "$PARK_COUNT" == "0" ]]; then
    echo "Loading park data into local MongoDB..."
    "$PYTHON" -m parks.load
else
    echo "Found $PARK_COUNT parks in local MongoDB; skipping data load."
fi

echo "Visit Vite Development Server at http://127.0.1:5173"
echo "Starting Flask API at http://127.0.0.1:5050"
exec "$PYTHON" -m flask --app server.endpoints run --debug \
    --host=127.0.0.1 --port=5050&
