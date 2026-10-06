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
`listParks()` currently resolves to an empty array, so it shows "No parks available yet."
When the fixture API is ready, replace the placeholder in `src/api.js` with an
async function returning an array of parks (`_id`, `name`, `borough`, `type`, `acres`).
The card and list can then display those records without changing the page.
