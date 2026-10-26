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

if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required to start the Vite frontend." >&2
    exit 1
fi

if [[ ! -x "$ROOT_DIR/frontend/node_modules/.bin/vite" ]]; then
    echo "Installing frontend dependencies..."
    (cd "$ROOT_DIR/frontend" && npm install)
fi

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    trap - EXIT INT TERM
    for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
        if [[ -n "$pid" ]]; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
        if [[ -n "$pid" ]]; then
            wait "$pid" 2>/dev/null || true
        fi
    done
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

(cd "$ROOT_DIR/frontend" && ./node_modules/.bin/vite \
    --host 127.0.0.1 --port 5173 --strictPort) &
FRONTEND_PID=$!

"$PYTHON" -m flask --app server.endpoints run --debug --no-reload \
    --host=127.0.0.1 --port=5050 &
BACKEND_PID=$!

echo "Frontend: http://127.0.0.1:5173"
echo "Flask API: http://127.0.0.1:5050"
echo "Press Ctrl-C to stop both servers."

while kill -0 "$FRONTEND_PID" 2>/dev/null \
    && kill -0 "$BACKEND_PID" 2>/dev/null; do
    sleep 1
done

echo "A server process exited; stopping the other server."
exit 1
