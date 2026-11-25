# Changelog — ReraRentAE

## [0.5.0] - 2026-11-25
### Added
- Prepared public open-source MIT release: `LICENSE`, `.github/workflows/ci.yml` (`Node 22` typecheck, Vitest unit/server tests, and Vite build), and 6 verified `AR RTL` / `EN LTR` desktop & mobile screenshot showcases in `docs/screenshots/` embedded in `README.md`.

## [0.4.0] - 2026-11-25
### Added
- Headless Chrome Playwright end-to-end verification (`playwright.config.ts`, `tests/e2e/rerarentae.spec.ts`) covering desktop `1280x800` & mobile `390x844`, `AR RTL Alabaster DLD` & `EN LTR Slate Night`, preference persistence, Preset 1/2/3 evaluation, Preset 3 remediation to `100/100`, sealed `RNT-2026-0001`, wire `UTF-8 BOM` CSV download, and persistent public `/r/:code` view counts (`1` to `2`).
- Zero-dollar (`$0`) self-hosting & static deploy bundle: Cloudflare Workers Assets (`wrangler.jsonc`), `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `deploy/{.env.example,Caddyfile,rerarentae.service,backup-sqlite.sh}`, `launch/DEPLOY-AND-SHARE.md`, and `README.md`.

## [0.3.0] - 2026-11-25
### Added
- Bilingual Arabic/English React 19 + Tailwind CSS v4 + Vite web studio (`AR RTL Alabaster DLD` & `EN LTR Slate Night` themes, no sticky floating header, A4 PDF print stylesheet) proxied on `:4240` to `:4239`.
- Interactive UAE telemetry & audit panels: SVG Decree 43/2013 five-bracket scale & 90d notice / 12m Notary eviction dashboard (`RentBracketAndNoticeSvg.tsx`), UAE multi-emirate tenancy calculator (`RentAndEvictionPanel.tsx`), 6-control readiness & statutory findings matrix (`ControlsAndFindingsPanel.tsx`), multi-unit CSV auditor/sanitizer (`UnitCsvAuditPanel.tsx`), and dual-mode `SQLite WAL` / `$0 localStorage` dossier vault + public `/r/:slugOrCode` report viewer (`DossierVaultAndPrint.tsx`, `src/lib/{basePath,i18n,api}.ts`).
- Switched `src/core/dossierDigest.ts` to pure WebCrypto (`globalThis.crypto.subtle`) so Node 22 and browser Vite bundles execute identically without Node polyfills.

## [0.2.0] - 2026-11-25
### Added
- Zero-dependency `node:sqlite WAL` storage layer (`server/db.mjs`) with atomic yearly `RNT-YYYY-0001` dossier allocation, `rnt-<hex>` public share slugs, profiles store, and public report view tracking.
- Zero-dependency Node 22 HTTP/API server (`server/app.mjs`, `server/index.mjs`, `server/app.d.mts`) listening on `:4239` with `BASE_PATH=/rerarentae`, `window.__RERARENTAE_BASE__` injection, `/health`, `/readyz`, `/api/presets`, `/api/evaluate-rent`, `/api/evaluate-eviction`, `/api/audit-csv`, `/api/export/unit-csv`, `/api/assess`, CRUD `/api/profiles`, CRUD `/api/(assessments|dossiers)`, `/duplicate`, `/finalize|lock` (`409` seal immutability), `/brief.md`, `/export.csv` (`UTF-8 BOM` + `CRLF` + `CWE-1236`), `/summary`, `/api/public/reports/:slugOrCode`, and `413`/`429` guards.
- Bilingual `AR / EN` Markdown dossier brief builder (`src/core/briefBuilder.ts`) and 5 server integration test suites (`tests/unit/reraRentServer.test.ts`).

## [0.1.0] - 2026-11-25
### Added
- Initial zero-dependency (`dependencies: {}`) UAE Rental Cap, Notice SLA & Eviction readiness core (`src/core/*`) covering Dubai (`Decree No. 43 of 2013` RERA Smart Rental Index 0%/5%/10%/15%/20% brackets, `Law No. 33 of 2008` Art. 14 `90-day` notice rule, Art. 25(2) `12-month` notary/registered-mail eviction notice, Art. 25(3) `2yr/3yr` re-rent ban, `Ejari` & `RDC 3.5%` fee model), Abu Dhabi (`ADREC 0%` freeze / `Tawtheeq` & Law 20/2006 `60d/90d` notice), and Sharjah (`Law No. 5 of 2024` `3yr/5yr` rent lock & municipality attestation).
- Portfolio unit CSV auditor/exporter with `CWE-1236` neutralization and `UTF-8 BOM` + `CRLF`, 3 UAE tenancy presets, deterministic `SHA-256` digest, and explicit Non-DLD/Non-RERA/Non-RDC/Non-ADREC disclaimers.
