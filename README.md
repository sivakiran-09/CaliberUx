# CaliberUX — Supplier & Proposal Management

A full-stack demo built to match the six supplied Figma screens. It uses HTML, CSS, vanilla JavaScript, Node.js/Express, and a persistent JSON-file database (`data/db.json`) so it runs locally without installing a separate database server.

## Requirements
- Node.js 18 or newer
- VS Code (recommended)

## Run in VS Code
1. Extract `CaliberUX.zip`.
2. Open the extracted `CaliberUX` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

Keep the terminal running while using the application. Do **not** open HTML files directly; use the local server URL.

## Included screens
1. Supplier Review Dashboard
2. AI Approval Recommendation
3. Purchase Request Review
4. High-Risk Proposal Analysis
5. Override AI Recommendation
6. Supplier Management

Use the left sidebar to navigate. Buttons and forms call the Express API; supplier additions, proposal decisions, and overrides persist in `data/db.json`.

## API endpoints
- `GET /api/health`
- `GET /api/suppliers`
- `POST /api/suppliers`
- `GET /api/proposals`
- `GET /api/proposals/:id`
- `PATCH /api/proposals/:id/decision`
- `POST /api/proposals/:id/override`
- `GET /api/audit-logs`

## Database
`data/db.json` is a small, file-based database suitable for a classroom demonstration. It persists changes between server restarts. It is not intended for concurrent production use. For production, replace it with PostgreSQL, MySQL, or MongoDB and add authentication/authorization.

## Notes
- The AI scores and supplier/proposal details are **illustrative demo data**, not real AI output or real supplier assessments.
- The app does not include real authentication. The profile shown is a demo procurement manager.
