# Inspectly: Migration off Replit → Vercel + Neon

> Status: **in progress — Phase 1 complete.** This document is the result of a deep read of the repo (July 2026) plus current Vercel/Neon platform research. Read the Executive Summary and the "Pivotal decision" section first, then the detail sections.
>
> **Decisions locked (2026-07-07):**
> 1. Architecture → **Option A: all-in on Vercel** (Express-as-single-function + Vercel Blob uploads + Neon).
> 2. Sessions → **stateless JWT cookies** (replacing `connect-pg-simple`), done in the auth phase.
> 3. **Phase 1 (de-Replit cleanup) is done** — see §8; the app is now Replit-code-free and `tsc`/`build` clean, still runnable anywhere.

---

## Executive summary

The good news, and the honest bad news:

- **The Replit coupling is small and mostly dormant.** The only *active* Replit dependency is the OpenAI API proxy (two env vars). The Replit OIDC auth, chat, and image code all live under `server/replit_integrations/` and are **not wired into the running app** — the app uses local email/password auth in `server/auth.ts`. The database is **already Neon-backed** (`DATABASE_URL`), so "migrate the DB" is largely "re-point a connection string."
- **The real work is architectural, not Replit-removal.** `server/index.ts` is a persistent, long-running Express server (`httpServer.listen(...)`). The upload path accepts **50 MB PDFs via Multer memory storage** and runs a **synchronous GPT-4o call (up to 80k input / 16k output tokens, ~30–120s)** inside the request. Vercel's serverless model imposes a **4.5 MB request body limit** and function duration limits. Those two facts — not anything Replit — dictate the migration shape.
- **A latent product gap forces our hand in a good way.** Uploaded PDF buffers are never persisted (tech-debt item #4). The "marketplace" lets users spend credits to "download" a report, but there is no stored file to download — only the AI analysis. Fixing uploads to write to blob storage (required to get past Vercel's 4.5 MB limit) **also fixes this missing feature.** One change, two wins.
- **Neon is the right database. Do not switch.** It's already in use, has a first-class Vercel integration, and its per-branch database feature gives us exactly the staging/preview isolation this migration needs.
- **Staging/prod segregation is solved by Vercel natively.** Unlike Replit, Vercel scopes environment variables by **Production / Preview / Development** (plus custom environments on Pro). Combined with Neon branching, each environment gets its own isolated database and its own secrets.

---

## 1. Current-state coupling inventory (verified against the code)

### 1a. Active Replit couplings (in the running app)

| Coupling | Where | Severity | Notes |
|---|---|---|---|
| OpenAI via Replit AI proxy | `server/routes.ts:26-29` — `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL` | **Must change** | Trivial: swap to a direct `OPENAI_API_KEY` and drop the custom `baseURL`. Active model is `gpt-4o`. |
| Postgres provisioning | `DATABASE_URL` in `server/db.ts:13`, `server/auth.ts:32`, `drizzle.config.ts:12` | Low | Already Neon. Re-point the connection string; see §4 for the serverless-driver nuance. |
| Persistent server / port | `server/index.ts:87` — `httpServer.listen({ port, host, reusePort })` | **Architectural** | Serverless has no long-lived listener. Needs a handler-export adapter (§3). |
| Prod static file serving | `server/static.ts` (`express.static` + SPA fallback) | Medium | On Vercel the CDN serves the SPA; Express should not. |

### 1b. Dormant Replit couplings (present but NOT executed)

These are imported nowhere in the active path (`server/routes.ts` wires only `./auth`, not `./replit_integrations/*`). They can be **deleted** as part of the migration.

| Code | Purpose | Replit env it needs |
|---|---|---|
| `server/replit_integrations/auth/` | Replit OIDC (passport + openid-client) | `REPL_ID`, `ISSUER_URL` |
| `server/replit_integrations/chat/` | Streaming `gpt-5.1` chat | `AI_INTEGRATIONS_OPENAI_*` |
| `server/replit_integrations/image/` | `gpt-image-1` generation | `AI_INTEGRATIONS_OPENAI_*` |
| `server/replit_integrations/batch/` | Rate-limited batch helper (p-retry/p-limit) | — |

> Note: `server/replit_integrations/` currently holds the 8 pre-existing `tsc` errors flagged earlier this session. Deleting the directory resolves them for free.

### 1c. Build / tooling couplings

| Coupling | Where | Action |
|---|---|---|
| `@replit/vite-plugin-runtime-error-modal` | `vite.config.ts:4` (imported unconditionally) | Remove import + dep. |
| `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` | `vite.config.ts:12-18` (gated on `REPL_ID`) | Remove; they no-op off Replit anyway. |
| `.replit` | deployment target `autoscale`, port map `5000→80`, nix modules, `[agent] integrations` | Delete; replaced by `vercel.json` + Vercel project settings. |
| `@replit/*` in `package.json` devDeps | `package.json:93-95` | Remove. |

### 1d. Security gaps to fix during migration (not Replit-specific, but in scope)

- **`SESSION_SECRET` has a hardcoded fallback** (`server/auth.ts:42` → `"inspectswap-secret-key"`). On a public deployment this must be a required, unset-fails env var.
- **`.env*` is not gitignored** (`.gitignore` lists only `node_modules`, `dist`, etc.). Add `.env*` before we start creating env files locally.

---

## 2. Pivotal decision: how much of the app runs on Vercel?

The upload+AI flow is the fork in the road. Two viable target architectures:

### Option A — All-in on Vercel (recommended)

- **Frontend:** Vite build served by Vercel's static CDN.
- **API:** the existing Express app wrapped as a **single catch-all Vercel Function** (`api/index.ts` exports the Express `app`). Minimal restructure — the routes, storage layer, and auth are reused as-is. Enable **Fluid Compute** so the AI call gets up to 300s (Hobby) / 800s (Pro).
- **Uploads:** client uploads the PDF **directly to Vercel Blob** (bypassing the 4.5 MB function limit); the function receives only the blob URL, fetches it, parses, analyzes. **This also persists the PDF, fixing the marketplace's missing-file gap.**
- **DB:** Neon via the native Vercel integration, pooled endpoint (§4). Per-preview Neon branches.

**Why recommended:** single vendor; best-in-class preview environments (each PR gets its own DB branch); the blob refactor is something we need anyway; the Express code is largely reused rather than rewritten.

**Cost of it:** requires the upload-to-blob refactor (client + server), the serverless DB-driver nuance, and realistically a **Vercel Pro** plan (for 800s duration headroom and custom environments). Duration on Hobby (300s) is *probably* enough but tight for very large multifamily reports.

### Option B — Hybrid (frontend Vercel, backend on a container host)

- Frontend on Vercel; the Express monolith runs **unchanged** on Render / Railway / Fly.io; Neon as the DB.

**Why you might pick it:** near-zero backend code change, no 4.5 MB / duration limits, persistent DB connections.

**Why it's the fallback, not the pick:** it's not really "on Vercel"; it's two platforms and two billing surfaces; the per-PR database-branch preview story is weaker; **you still need blob storage for PDF persistence anyway**, so you don't actually avoid that work.

> **Recommendation: Option A**, Express-as-a-single-function. It reuses the existing server, gives the cleanest staging story, and the one refactor it forces (blob uploads) is a feature we're missing regardless. Option B is the escape hatch if we need to ship in days and defer the upload refactor.

---

## 3. The architectural blockers and how each is solved (Option A)

| Blocker | Why it breaks on Vercel | Solution |
|---|---|---|
| **50 MB uploads** (`multer.memoryStorage`, `routes.ts`) | Vercel functions cap request body at **4.5 MB** (`413 FUNCTION_PAYLOAD_TOO_LARGE`) | Client → **Vercel Blob** direct upload (presigned/client token). Function receives the blob URL, `fetch`es it server-side, then runs the existing `PDFParse` + `analyzeReport`. Persist the blob URL on the `reports` row. |
| **Long AI call** (30–120s synchronous) | Hobby standard functions cap at 60s | **Fluid Compute** (default-on since Apr 2025): 300s Hobby, up to 800s Pro. Set `maxDuration` on the function. Longer-term: make analysis async (enqueue → poll), but not required for v1. |
| **Persistent listener** (`index.ts:87` `listen()`, `reusePort`) | Serverless exports a handler; nothing listens | Split `index.ts` into (a) an app factory that builds the Express `app`, (b) `api/index.ts` that `export default app` for Vercel, (c) an optional local `listen()` guarded by `if (!process.env.VERCEL)` for local dev. Drop `reusePort` (Linux-only, irrelevant). |
| **Express static serving** (`static.ts`) | CDN should serve the SPA, not a function | Remove `serveStatic` from the prod path; configure Vercel to serve `dist/public` and SPA-fallback via `vercel.json` rewrites. |
| **DB connections per invocation** | Serverless cold starts open new `pg` pools; Neon can exhaust connections | Use Neon's **pooled endpoint** (`-pooler` host) for `connect-pg-simple`, and the Neon serverless driver for Drizzle. Keep `pool.max` small. See §4. |
| **Sessions** (`connect-pg-simple`) | Works on serverless (DB-backed, not in-memory) but adds a DB round-trip per request | Keep it via the pooled endpoint for a minimal-change v1. **Optional upgrade:** stateless signed-JWT cookies remove the per-request session lookup — a better serverless fit, but an auth refactor. Flagged, not mandated. |

---

## 4. Database plan (Neon)

### Why Neon (and not a switch)
Already in use; native Vercel integration; **database branching** = instant isolated copies for preview/staging, billed only on unique data, scale-to-zero. Alternatives considered: Vercel Postgres *is* Neon under the hood; Supabase is fine but adds a redundant auth/stack surface; PlanetScale is MySQL (would require rewriting the Drizzle Postgres schema). **Keep Neon.**

### Connection strategy on serverless
- `server/db.ts` currently uses node-postgres `Pool` from `pg`. On serverless, point `DATABASE_URL` at Neon's **pooled** connection string and consider the `@neondatabase/serverless` driver for Drizzle (HTTP/WebSocket, designed for functions).
- `connect-pg-simple` needs a node-postgres-compatible pool → give it the **pooled** endpoint too. (If we move sessions to JWT, this dependency goes away entirely.)

### Migrations — an important gap
The repo currently uses **`drizzle-kit push`** (`package.json` `db:push`) — schema push, **no versioned migration files exist** (`drizzle.config.ts` points `out: ./migrations` but the folder isn't populated). Push-on-deploy is risky for staging/prod discipline.

**Recommendation:** switch to versioned migrations:
1. `drizzle-kit generate` to produce SQL migration files (commit them).
2. Run `drizzle-kit migrate` (or `migrate()` on boot / in the Vercel build step) against each environment's branch.
3. Per-preview branches get migrations applied automatically in the build step, so each PR tests real schema changes in isolation.

The schema itself (`shared/schema.ts` + `shared/models/auth.ts`, `chat.ts`) is clean Drizzle and needs no structural change to migrate.

---

## 5. Environment variables: Replit → Vercel mapping

Vercel scopes every variable to **Production**, **Preview**, and **Development** (and custom environments like a dedicated `staging` on Pro). Set the same name to different values per scope. This is the direct answer to the staging/prod concern — **Vercel segregates by environment where Replit does not.**

| Variable | Active today? | Migration action | Prod | Staging | Preview (per-PR) |
|---|---|---|---|---|---|
| `DATABASE_URL` | Yes | Keep name; value per env | Neon `main` branch (pooled) | Neon `staging` branch | Auto-set by Neon integration to the PR's branch |
| `SESSION_SECRET` | Yes (with unsafe fallback) | **Remove hardcoded fallback**; require it | unique secret | unique secret | unique secret |
| `OPENAI_API_KEY` | — (new) | **Replaces** `AI_INTEGRATIONS_OPENAI_API_KEY` | prod key | prod or test key | test key |
| ~~`AI_INTEGRATIONS_OPENAI_BASE_URL`~~ | Yes | **Delete** (use OpenAI default base URL) | — | — | — |
| `BLOB_READ_WRITE_TOKEN` | — (new) | Add for Vercel Blob uploads | prod store | staging store | preview store |
| `NODE_ENV` | Yes | Vercel sets automatically | `production` | `production` | `production` |
| ~~`PORT`~~ | Yes | **Delete** (Vercel manages) | — | — | — |
| ~~`REPL_ID`~~, ~~`ISSUER_URL`~~ | Dormant only | **Delete** with the OIDC code | — | — | — |

Tooling: manage via the Vercel dashboard (Settings → Environment Variables) or `vercel env add <NAME> <scope>`; pull to a local `.env.local` with `vercel env pull`.

---

## 6. Staging strategy (the requirement Replit couldn't meet)

Target topology:

- **Production** = `main` branch → Vercel Production environment → Neon `main` DB branch → production secrets.
- **Staging** = a long-lived `staging` branch → a Vercel **custom environment named "staging"** (or the Preview scope pinned to that branch) → a persistent Neon `staging` DB branch → staging secrets.
- **Per-PR previews** = every other branch → ephemeral Vercel Preview deploy → **ephemeral Neon branch auto-created and destroyed** by the Neon–Vercel integration → preview secrets.

This gives full env-var and data isolation per tier — strictly better than Replit's single shared environment. Custom environments are free on Pro/Enterprise.

---

## 7. Code-change checklist (Option A)

**Delete / clean up** — ✅ DONE (Phase 1)
- [x] Remove `server/replit_integrations/` (dormant OIDC/chat/image/batch). Resolved the 8 pre-existing `tsc` errors.
- [x] Remove `@replit/*` plugins from `vite.config.ts` and `package.json`.
- [ ] Delete `.replit`. (Deferred: keep until cutover so the app can still run on Replit during transition.)
- [x] Add `.env*` to `.gitignore` (also `.vercel`).

**AI proxy → direct OpenAI** — ✅ DONE (Phase 1)
- [x] `server/routes.ts`: OpenAI client now prefers `OPENAI_API_KEY`, falling back to the Replit proxy during transition (fallback removed at cutover).

**Server → serverless**
- [ ] Refactor `server/index.ts`: export an `app` factory; add `api/index.ts` that `export default app`; guard local `listen()` with `if (!process.env.VERCEL)`.
- [ ] Remove prod static serving (`server/static.ts` from the prod path).
- [ ] Add `vercel.json`: static from `dist/public`, rewrite `/api/*` → the function, SPA-fallback everything else to `index.html`; set `functions` `maxDuration` and enable Fluid Compute.

**Uploads → Vercel Blob (also persists PDFs)**
- [ ] Client: upload PDF directly to Vercel Blob, then POST the blob URL to `/api/reports/upload`.
- [ ] Server: fetch the blob, run existing `PDFParse` + `analyzeReport`; store the blob URL on the `reports` row (schema add — this is the one schema change; needs a migration).
- [ ] Wire the "download" action to the stored blob (delivers the actual missing feature).

**Database**
- [ ] `server/db.ts`: Neon serverless driver + pooled endpoint; small `pool.max`.
- [ ] Point `connect-pg-simple` at the pooled endpoint (or migrate sessions to JWT).
- [ ] Switch `drizzle-kit push` → generated versioned migrations; run in the Vercel build step.

**Auth hardening**
- [x] `server/auth.ts`: `SESSION_SECRET` now required — throws instead of using the insecure hardcoded fallback. (Phase 1)

**Verify**
- [ ] `npm run check` clean; local dev via `vercel dev`; preview deploy on a throwaway PR exercises upload + AI end-to-end against a Neon branch.

---

## 8. Suggested sequencing

1. **De-Replit on the current runtime first** (low risk, still runs anywhere): delete dormant integrations, swap the OpenAI env vars, remove `@replit` plugins, fix `.gitignore` and the `SESSION_SECRET` fallback. Confirm the app still builds/runs.
2. **Stand up Neon + Vercel plumbing:** native integration, env vars per scope, versioned migrations, a `staging` branch/environment.
3. **Serverless adapter + `vercel.json`:** get the SPA + API deploying to a preview URL (uploads may still be small-file only at this step).
4. **Blob upload refactor:** the biggest single change; unlocks large files and PDF persistence.
5. **Harden + cut over:** Fluid Compute duration tuning, connection tuning, then point production at `main`.

---

## 9. Decisions

Resolved (2026-07-07):
1. **Architecture:** ✅ Option A — all-in on Vercel (Express-as-single-function).
2. **Sessions:** ✅ stateless JWT cookies (replace `connect-pg-simple`).

Still open (decide before the relevant phase):
3. **Vercel plan:** Hobby (300s duration cap, no custom envs) may suffice short-term, but **Pro** is likely needed for 800s headroom + a first-class `staging` custom environment.
4. **Async analysis:** synchronous-within-Fluid-Compute for v1 (simple) vs an async enqueue+poll design (robust, more work) — recommend deferring to post-migration.
