# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Parshant Yadav's AI/ML portfolio site + "Create Your Portfolio" platform.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Build**: esbuild (CJS bundle)

## Artifacts

- **`artifacts/portfolio`** — Vite static site at `/` (Parshant's portfolio + Create Your Portfolio wizard)
- **`artifacts/api-server`** — Express API at `/api` and `/p` (portfolio serving + builder API)

## Portfolio Builder Platform

### Auth (JSON file-based)
- Users stored in `artifacts/api-server/data/builder-users.json`
- Fields: `{ username, displayName, passwordHash, adminPassword, token, created }`
- `adminPassword` is human-readable (e.g. "Sky-Bear-742"), shown once after registration
- API: `POST /api/builder/register`, `POST /api/builder/login`

### Portfolio Data Format
- Stored per-user in `artifacts/api-server/data/portfolios/:username.json`
- Links: **array format** `[{ platform, url }]` (old format: object `{ github, linkedin, website }` — both supported)
- New sections: `education`, `certifications`, `leetcode`, `contacts`
- `education`: `[{ institution, degree, field, period, cgpa, description }]`
- `certifications`: `[{ name, issuer, date, url }]`
- `leetcode`: `{ username, solved, hard, medium, easy, rating }`
- `contacts`: `[{ name, email, message, date }]` — contact form submissions

### API Routes (`/api/builder/*`)
- `POST /api/builder/register` — create account, returns `adminPassword`
- `POST /api/builder/login` — sign in, returns `adminPassword`
- `POST /api/builder/chat` — AI wizard chat (Anthropic)
- `POST /api/builder/create` — save/create portfolio
- `GET /api/builder/my-portfolio` — fetch own portfolio data
- `POST /api/builder/my-portfolio` — update own portfolio data
- `GET /api/builder/contacts` — fetch contact form submissions

### Portfolio Routes (`/p/*`)
- `GET /p/:username` — serve generated portfolio (query `?t=1..15` for template)
- `POST /p/:username/contact` — save contact form submission
- `GET /p/:username/admin` — serve standalone admin panel (login → edit portfolio + view contacts)

### Templates
- 15 templates (1-15), rendered server-side as full HTML pages
- Template 1: Dark Minimal | 2: Light Professional | 3: Creative Bold | 4-15: themed variants via `factoryTemplate()`
- All templates include: Experience, Projects, Skills, **Education, Certifications, LeetCode, Contact Form**

### Wizard Flow (`/` — Create Your Portfolio FAB)
1. Auth (login/register)
2. Choose path: AI Guided (chat) or Manual Editor
3. Manual editor: dynamic links, experience, projects, skills, education, certifications, LeetCode
4. Preview step: 15 template thumbnails + share URL + **admin credentials card**

### Key Files
- `artifacts/api-server/src/routes/builder.ts` — all builder logic, templates, admin panel
- `artifacts/portfolio/index.html` — main HTML with wizard markup
- `artifacts/portfolio/public/create.js` — wizard JavaScript
- `artifacts/portfolio/public/create.css` — wizard styles
- `artifacts/portfolio/public/script.js` — Parshant's own portfolio JS
- `artifacts/portfolio/public/styles.css` — Parshant's own portfolio CSS

## Key Commands

- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/portfolio run dev` — run portfolio frontend locally

See the `pnpm-workspace` skill for workspace structure and TypeScript setup.
