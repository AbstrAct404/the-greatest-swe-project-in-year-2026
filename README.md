# flask-api
An example flask rest API server.

To build production, type `make prod`.

To create the env for a new developer, run `make dev_env`.

To run demo at the local machine, run `./start.sh`.

The API limits each client IP to 50 requests per hour and 200 requests per
day. Flask-Limiter uses in-memory storage by default for local development.
Set `RATELIMIT_STORAGE_URI` to a shared backend URI (such as a Redis URI) when
deploying multiple application workers.
