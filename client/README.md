# ShopShield Frontend

Responsive React + Vite frontend for the ShopShield backend in `../server`.

## Run locally

1. Start MongoDB and configure `server/.env` using `server/README.md`.
2. In a terminal, start the backend:

   ```powershell
   cd ..\server
   npm install
   npm start
   ```

3. In a second terminal, start the frontend:

   ```powershell
   cd ..\client
   npm install
   Copy-Item .env.example .env
   npm run dev
   ```

Open the Vite URL (normally `http://localhost:5173`). The backend allows that
origin by default. To use a different backend, set
`VITE_API_BASE_URL` in the client `.env` before starting Vite.

Production build:

```powershell
npm run build
npm run preview
```

## Pages

- `/` landing page and URL scan shortcut
- `/dashboard` API reachability, scan/report shortcuts, and an explicit
  explanation that persistent scan history is not available
- `/scan` live website scan
- `/results` actual scan response details (results are in-memory and are not
  persisted across reloads)
- `/report` community submission form
- `/admin` admin-key entry
- `/admin/reports` pending, approved, and rejected report moderation

The admin key is sent only in the backend-required `x-admin-key` header and is
kept in application memory until sign-out/reload. It is not stored in
localStorage or included in frontend environment variables. This frontend
session handling does not replace server-side authentication.

All API requests use the shared Axios client and the existing backend routes.
No sample scan data or fake scan history is included. API errors, unavailable
factor status, and pending VirusTotal analyses are shown explicitly.
