# Fluxus Backend

Backend REST API (Express + Prisma + Firebase Auth) for personal finance. This README includes deployment notes for Render.

## Local development

- Copy `.env.example` to `.env` and fill values.
- Install dependencies: `npm install`
- Generate Prisma client: `npx prisma generate`
- Start dev server: `npm run dev`

## Deploy to Render

Two options:

1) Render Dashboard
- New > Web Service (from your Git repo)
- Language: Node
- Build Command: `npm ci && npx prisma generate`
- Start Command: `npm start`
- Health check path: `/healthz`
- Set env vars:
  - `DATABASE_URL` (Supabase Postgres connection string)
  - One of Firebase credential methods:
    - `FIREBASE_SERVICE_ACCOUNT_JSON` (single-line JSON)
    - or `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64 of the JSON), then set `FIREBASE_SERVICE_ACCOUNT_JSON` at runtime by decoding (see below)
    - For local dev you can use `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json`

2) render.yaml (Blueprint)
- This repo includes `render.yaml` for one-click deploy. Update env vars in the Render Dashboard after first deploy.

### Firebase credentials

We recommend using `FIREBASE_SERVICE_ACCOUNT_JSON` with the JSON content on a single line. If using base64, create an env var with base64 of the service account JSON and decode to JSON before boot (e.g., in a start script). Current code supports `FIREBASE_SERVICE_ACCOUNT_JSON` directly.

### Prisma

- Prisma Client is imported from `@prisma/client` and generated during build via `npx prisma generate`.
- Ensure your `DATABASE_URL` is reachable from Render (Supabase is fine).

### Ports

- Server binds to `process.env.PORT` (Render provides one). Health endpoint at `/healthz`.

### Troubleshooting

- If deploy fails with Prisma errors, verify `DATABASE_URL` and that `npx prisma generate` ran in build logs.
- If Firebase fails, verify that `FIREBASE_SERVICE_ACCOUNT_JSON` is set and properly escaped. Replace `\\n` with real newlines is handled by the code.

***

MIT