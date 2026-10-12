# NYC Parks – Frontend

React + Vite app for the NYC Parks API.

## Run locally
1. Start the backend (from the repo root) on port 5050:
   ```bash
   docker start geodata-mongo
   export PYTHONPATH=$(pwd) CLOUD_MONGO=0
   venv/Scripts/flask.exe --app server.endpoints run --debug --port=5050
   ```
2. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open http://127.0.0.1:5173

The API URL is set in `.env.development` (`VITE_API_URL`).

## Checks (same as CI)
```bash
npm run lint
npm test
npm run build
```

## Structure
- `src/api.js` – all backend calls go through here
- `src/App.jsx` – main page
- `src/*.test.jsx` – tests (Vitest + React Testing Library)
- `src/components/ParkCard.jsx` – displays a park's name, borough, type, and acres

## Parks list
The homepage loads parks independently of the backend health check.
`listParks({ borough, type, minAcres, page })` requests the real `/parks` endpoint.
It maps `type` to `park_type` and `minAcres` to `min_acres`, and returns the
`parks` array from the backend's `{ parks, total, page, per_page }` response.
Borough filters use the backend codes: B, M, Q, R, X.
The initial request uses the backend's default first page (up to 50 parks).
Pagination controls are not implemented yet.
The backend must be running, and its MongoDB `parks` collection must contain data
for cards to appear. An empty collection shows "No parks available yet."
An HTTP or connection failure shows the list's error message.
