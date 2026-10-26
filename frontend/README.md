# NYC Parks – Frontend

React + Vite app for the NYC Parks API.

## Run locally
1. In the first terminal, start MongoDB and the backend (from the repo root) on port 5050:
   ```bash
   docker run --name geodata-mongo -d -p 27017:27017 mongo
   export PYTHONPATH="$(pwd)" CLOUD_MONGO=0
   python3 -m flask --app server.endpoints run --debug --host=127.0.0.1 --port=5050
   ```
   On later runs, start the existing MongoDB container with `docker start geodata-mongo` instead.
2. In a second terminal, start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. Open the frontend at http://127.0.0.1:5173 (Vite's dev-server port). The Flask API runs at http://127.0.0.1:5050.

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
backend's `{ parks, total, page, per_page }` response.
Borough filters use the backend codes: B, M, Q, R, X.
The initial request uses the backend's default first page (up to 50 parks).
Previous and Next controls navigate the list and show the current and total
pages. Navigation is disabled while loading and at the first/last page.
Changing the borough or search resets the list to page 1. Returning from park
details preserves the current page. Name search keeps the search endpoint's
existing result limit and does not show pagination controls.
The backend must be running, and its MongoDB `parks` collection must contain data
for cards to appear. An empty collection shows "No parks available yet."
An HTTP or connection failure shows the list's error message.
