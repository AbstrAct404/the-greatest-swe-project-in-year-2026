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

## Dependency security audit

Run `make audit` to audit the Python requirements and frontend dependencies. 
The command installs runs `pip-audit -r requirements-dev.txt` 
and `npm audit --audit-level=low`.

Latest local audit result (November 14, 2026):

# npm audit report

undici  
Severity: high
undici vulnerable to Denial of Service via unbounded memory in the EventSource parser - 
https://github.com/advisories/GHSA-4qv8-2p9j-2685
undici vulnerable to Subresource Integrity bypass via non-lowercase algorithm tokens - 
https://github.com/advisories/GHSA-f72v-6w45-q472
undici vulnerable to Denial of Service via unhandled error on excessive content-encodings - 
https://github.com/advisories/GHSA-xjj6-f33q-929c
undici vulnerable to cache poisoning and cross-user disclosure via cross-origin redirects - 
https://github.com/advisories/GHSA-4w7w-5xrc-9h26
undici vulnerable to TLS certificate validation bypass via dropped tls options in Agent - 
https://github.com/advisories/GHSA-2m5v-pch6-74hx
undici vulnerable to Denial of Service via TLS 1.2 certificate-changing renegotiation - 
https://github.com/advisories/GHSA-qrxm-fqhp-jwvm
undici WebSocket client vulnerable to Denial of Service via unbounded automatic PONG buffering - 
https://github.com/advisories/GHSA-9fm3-97px-rjf6
undici vulnerable to Denial of Service via unhandled exception in the decompress interceptor - 
https://github.com/advisories/GHSA-55wc-3pg8-jfw6
No fix available
node_modules/undici
  jsdom  
  Depends on vulnerable versions of undici
  node_modules/jsdom
    vitest  
    Depends on vulnerable versions of @vitest/mocker
    Depends on vulnerable versions of jsdom
    Depends on vulnerable versions of vite
    node_modules/vitest
      @testing-library/jest-dom  
      Depends on vulnerable versions of vitest
      node_modules/@testing-library/jest-dom

vite  
Severity: high
launch-editor: escapeCmdArgs() omits % escaping on Windows - 
https://github.com/advisories/GHSA-698v-4r3x-3vcv
launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors - 
https://github.com/advisories/GHSA-r825-w8mm-5pxw
launch-editor: `fs.existsSync()` existence check can be bypassed on Windows - 
https://github.com/advisories/GHSA-587h-7wmj-h5pm
Vite: Cross origin script execution through Vite custom middleware - 
https://github.com/advisories/GHSA-9jrq-w75r-8gcw
Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine - 
https://github.com/advisories/GHSA-rq7h-c2jc-7f22
Vite: First 4 bytes of files outside of `server.fs` setting is exposed by `?vite-wasm-instance` - 
https://github.com/advisories/GHSA-vfpm-58rq-9qcg
