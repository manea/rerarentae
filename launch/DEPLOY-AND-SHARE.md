# Deploy & Share Guide (`$0` & Self-Hosted) — ReraRentAE

## 1. Zero-Dollar Static Hosting (`$0/mo` on Cloudflare Workers Assets)

The React 19 + Tailwind CSS v4 studio runs 100% locally in the browser (using client-side `src/core/*`, Web Crypto `SHA-256`, and `localStorage`) with no paid server required:

```bash
npm ci
npm run build
npx wrangler login
npx wrangler deploy
```

Configuration lives in [`wrangler.jsonc`](../wrangler.jsonc) with SPA routing (`single-page-application`).

## 2. Docker & `docker compose` (With SQLite WAL Backend)

To enable server-side `node:sqlite WAL` multi-user persistence, atomic `RNT-YYYY-0001` dossier numbering, and shared `/r/:code` public report view counters:

```bash
docker compose up -d --build
curl -fsS http://127.0.0.1:4239/health
```

Persistent SQLite data is stored in the named volume `rerarentae_data` (`/app/data/rerarentae.sqlite`).

## 3. Native Node 22 + systemd + Reverse Proxy

1. Copy [`deploy/.env.example`](../deploy/.env.example) to `/etc/rerarentae/.env` and configure `PORT=4239`, `BASE_PATH=/rerarentae` (optional), and `RERARENTAE_DATA_DIR`.
2. Build static assets with `npm run build`.
3. Install [`deploy/rerarentae.service`](../deploy/rerarentae.service) under systemd and front with [`deploy/Caddyfile`](../deploy/Caddyfile) or your HTTPS reverse proxy.
4. Schedule daily online SQLite snapshots with [`deploy/backup-sqlite.sh`](../deploy/backup-sqlite.sh) (`VACUUM INTO`, 14-day retention).

## 4. Verification & Privacy Checklist Before Sharing

- `bash -n deploy/*.sh` passes with exit code `0`.
- `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` all pass.
- Explicit Non-DLD / Non-RERA / Non-RDC / Non-ADREC / Non-Tawtheeq / Non-Sharjah-Municipality independence disclaimer remains visible in the web banner, Markdown brief, and printable A4 PDF summary.
