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