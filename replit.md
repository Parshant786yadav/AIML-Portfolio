# Workspace

## Overview

pnpm workspace monorepo. Parshant Yadav's AI/ML portfolio site with a multi-tenant portfolio builder — visitors can create their own copy at `/p/:slug`.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **Frontend**: Vite + React (SPA mode, `appType: 'spa'`)
- **Backend**: Python Flask (`artifacts/api-server/app.py`)

## Artifacts

- **`artifacts/portfolio`** — Vite SPA at `/`. Parshant's portfolio + user portfolio viewer/editor at `/p/:slug`.
- **`artifacts/api-server`** — Python Flask API at `/api`. Port 8080.

## Backend (app.py)

- Admin credentials: `parshant` / `Admin@2026`
- Admin content stored in `artifacts/api-server/data/content.json`
- User accounts + content stored in `artifacts/api-server/data/users.db` (SQLite)
- Passwords hashed with SHA-256
- `init_db()` runs at startup to create tables if missing

## API Routes

### Admin
- `POST /api/admin/login` — returns token (stored in sessionStorage)
- `GET  /api/admin/content` — returns saved content JSON (public)
- `POST /api/admin/content` — saves content (requires Bearer token)
- `POST /api/admin/logout`

### Users (multi-tenant portfolio builder)
- `POST /api/users/register` — `{email, password}` → `{token, slug, email}`
- `POST /api/users/login`    — `{email, password}` → `{token, slug, email}`
- `POST /api/users/logout`
- `GET  /api/users/me`       — requires Bearer token
- `GET  /api/users/content/:slug` — public; falls back to admin content.json if no user content saved yet
- `POST /api/users/content`  — `{...content}` → saves, returns `{ok, slug}`

### Chat
- `POST /api/chat` — proxies to DocuMind API (requires `DOCUMIND_API_KEY` secret)

## Frontend Architecture

### Route detection
`const USER_SLUG = (window.location.pathname.match(/^\/p\/([a-z0-9_-]+)/i) || [])[1]?.toLowerCase() || null;`

- If `USER_SLUG` is null → main portfolio route (`/`): loads from `/api/admin/content`, admin CMS active
- If `USER_SLUG` is set → user portfolio route (`/p/:slug`): loads from `/api/users/content/:slug`, admin CMS skipped

### SPA routing
`appType: 'spa'` in `vite.config.ts` makes Vite serve `index.html` for all unmatched paths, enabling `/p/:slug` to work client-side.

### Admin CMS
- Login button in footer → opens admin modal → token stored in `sessionStorage`
- Edit mode: all `[data-editable]` fields become contenteditable; list controls injected
- Save: POST to `/api/admin/content`; changes Parshant's live site

### User CMS (multi-tenant)
- Footer "Create your portfolio →" button (hidden on user routes) → opens login/register modal
- On `/p/:slug`: token from `localStorage` (`user-token`, `user-slug`, `user-email`) verified via `/api/users/me`
- If owner: blue edit toolbar slides in at top, all `[data-editable]` become editable
- "Save & Get Link" → POST to `/api/users/content` → shows link reveal with copy button
- User edits are isolated — they NEVER affect Parshant's `content.json`

## Key Files

- `artifacts/api-server/app.py` — full Flask backend
- `artifacts/portfolio/index.html` — HTML structure (user toolbar, user modal, user link reveal, footer)
- `artifacts/portfolio/public/script.js` — all JS (theme toggle, admin CMS IIFE, user CMS IIFE)
- `artifacts/portfolio/public/styles.css` — all styles including user modal/toolbar/footer
- `artifacts/portfolio/vite.config.ts` — `appType: 'spa'` for SPA fallback

## Workflow Commands

- **API Server**: `pip install flask flask-cors requests -q && python /home/runner/workspace/artifacts/api-server/app.py`
- **Portfolio**: `pnpm --filter @workspace/portfolio run dev`
