# flask-api
An example flask rest API server.

To build production, type `make prod`.

To create the env for a new developer, run `make dev_env`.

To run demo at the local machine, run `./start.sh`.

To check that the API is up and can reach MongoDB, open `/health` (for
example http://127.0.0.1:5050/health). It answers `200` with
`{"status": "ok", "database": "up"}`, or `503` with
`{"status": "degraded", "database": "down"}` if MongoDB is unreachable.
`/health` is not rate limited, so monitors can poll it.

The backend schedules a parks data refresh every seven days after its first
MongoDB connection. Set `MONGO_UPDATE_INTERVAL_DAYS` to a positive number to
change the interval (for example, `1` for daily refreshes).

The API limits each client IP to 50 requests per hour and 200 requests per
day. Flask-Limiter uses in-memory storage by default for local development.
Set `RATELIMIT_STORAGE_URI` to a shared backend URI (such as a Redis URI) when
deploying multiple application workers.
