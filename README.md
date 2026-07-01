# ⚡ Power-Up Board

A Dragon Ball Z-themed personal Kanban board that **powers up a Super Saiyan fighter as you complete tasks**. Built with Next.js App Router, persisted in Upstash Redis, and deployed on Vercel. Cards, checklists, flags, priorities, due dates, a payments tracker, a calendar view, and a weekly automation that reads your `.docx` summary and syncs tasks to the live board.

Complete enough work and the fighter transforms: Base → Ki Awakened → Super Saiyan → SSJ2 → SSJ3 → Ultra Instinct.

---

## Features

- **Kanban board** — 3 columns: This Week / In Progress / Done
- **Cards** — title, notes, checklist, flags (bms / client / payments / misc), priority (High / Medium / Low), due date, links
- **Drag between columns** — drop a card onto any column to move it
- **Drag to reorder** — drag cards within a column to reprioritise; an orange indicator line shows the drop position
- **Quick reposition buttons** — hover any card to reveal ⇈ ↑ ↓ buttons (move to top / move up / move down); context-aware — top card only shows ↓, bottom card shows ⇈ ↑; hidden automatically when sort-by-priority is active
- **Priority filter + sort** — filter the board to show only High / Medium / Low cards; toggle sort-by-priority within each column
- **Done → Archive** — archive completed cards off the board; restore them any time from the Archive tab or via the Move column selector in the card modal
- **Revert to This Week** — one-click ↩ Week button on done cards to send them back without drag-and-drop
- **Payments tracker** — separate view to track brand/client payment follow-ups with status (pending / chasing / closed)
- **Calendar view** — weekly event list with add/delete
- **Power level meter** — ratio of done cards + completed checklist items drives a numeric power level and fighter transformation
- **Celebration FX** — ki burst particles + screen shake when a card is marked done or a checklist completes
- **Weekly automation** — a script reads the latest `.docx` or `.txt` weekly summary, parses tasks and payments, and merges them into the live board without overwriting manual edits
- **Board key auth** — single shared-key gate; key stored in `localStorage` on first entry

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Persistence | Upstash Redis (REST API) |
| Hosting | Vercel |
| Styling | Plain CSS (no framework) |
| Doc parsing | `mammoth` (`.docx` → text) |
| FX | Canvas-based particle bursts, CSS animations |

---

## Project structure

```
app/
  page.js                   Entry point — renders App
  globals.css               All styles (no CSS modules)
  api/state/route.js        GET board / POST mutations (auth-gated REST API)

components/
  App.jsx                   Root client component: state, API calls, view routing, FX
  Column.jsx                A board column — drop target + card list + reorder slots
  Card.jsx                  A card — checklist, flags, due date, done/archive/revert buttons
  CardModal.jsx             Full card editor — notes, checklist, links, flags, priority, move
  TaskModal.jsx             Add-a-card dialog
  Fighter.jsx               SVG Super Saiyan fighter, reacts to power tier
  PaymentsView.jsx          Payments follow-up tracker view
  CalendarView.jsx          Weekly calendar view
  Backgrounds.jsx           Animated background aura, changes per view

lib/
  board.js                  Board model: all mutations (addTask, moveTask, mergeWeekly…) + boardStats
  store.js                  Storage adapter — Upstash Redis in prod, local JSON file in dev
  tiers.js                  Power-tier ladder + powerLevel() calculation
  fx.js                     burstAt() particle engine + shakeScreen()
  auth.js                   Shared-key gate (reads BOARD_KEY env var)
  parseDoc.mjs              Weekly summary parser — bullets → tasks, payments section → payment items

scripts/
  weekly-update.mjs         CLI: reads latest .docx/.txt, merges into live board via API

data/
  tasks.json                Seed data (used on first boot) + versioned task backup
```

---

## How the board state works

All board state lives in a **single Upstash Redis key** (`goku-board:v1`). The Next.js API route at `/api/state` handles:

- `GET` — returns the full board + computed stats
- `POST { action, payload }` — runs a named mutation and saves

Every mutation in `lib/board.js` is a pure function that takes the board object and returns it modified. The API loads, mutates, saves, and returns in one request. No optimistic updates — the UI waits for the round-trip and re-renders from the server response.

In local dev (no Redis env vars set), state is stored in `data/board.local.json` and the key gate is skipped.

---

## Running locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. No database or key required — uses local file storage.

---

## Deploying

1. Push the repo to GitHub
2. Import to [Vercel](https://vercel.com) — Next.js is auto-detected
3. In Vercel → **Storage → Create → Upstash for Redis** — connect to the project (injects `KV_REST_API_URL` + `KV_REST_API_TOKEN` automatically)
4. In Vercel → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `BOARD_KEY` | Any private password you choose |

5. Redeploy so the env vars take effect
6. Open the URL, enter the key once — it's remembered in `localStorage` on that device

---

## Weekly automation

The script `scripts/weekly-update.mjs` reads a weekly summary file, parses tasks and payments, and syncs them to the live board.

```bash
# Point at a folder — picks the most recently modified .docx or .txt automatically
BOARD_URL=https://your-board.vercel.app BOARD_KEY=yourkey \
  node scripts/weekly-update.mjs --folder "/path/to/summaries"

# Or point at a specific file
BOARD_URL=https://your-board.vercel.app BOARD_KEY=yourkey \
  node scripts/weekly-update.mjs --file ./summary.docx
```

**Flags:**
- `--dry` — preview parsed tasks/payments, change nothing
- `--force` — re-import a week that was already imported
- `--no-git` — skip the `data/tasks.json` backup commit
- `--no-live` — only update the local backup, don't POST to the live board
- `--week 2026-W26` — override the auto-detected ISO week

**How it merges:** the script GETs the live board first, then filters candidates two ways before POSTing: (1) only `todo` tasks are imported — checked/done items in the doc are skipped; (2) any task whose title (normalised to a slug) already exists on the board is skipped, regardless of which week or source it came from. Manually created cards and manually updated payment statuses are never overwritten.

**Parser** (`lib/parseDoc.mjs`): looks for sections named like *Master To-Do, Action Items, This Week, Follow-ups, Priorities*. Detects `☐`/`☑` Unicode checkboxes (from Google Docs exports) and `[ ]`/`[x]` markdown checkboxes. Parses a `PAYMENTS FOLLOW-UP` section into payment items. Tweak the section keywords and flag-detection regexes in that file to match your summary format.

### Scheduling on Windows (Task Scheduler)

The repo was set up with a scheduled task that fires every Sunday at 2pm:

```powershell
cd C:\path\to\goku-kanban
$env:BOARD_URL = "https://your-board.vercel.app"
$env:BOARD_KEY = "yourkey"
node scripts/weekly-update.mjs --folder "D:\path\to\summaries" --no-git
```

---

## Customising

| What | Where |
|---|---|
| Column names/IDs | `COLUMNS` array in `lib/board.js` |
| Power tiers + fighter transformations | `lib/tiers.js` — names, colours, unlock thresholds |
| Flags + flag colours | `FLAGS` array in `components/CardModal.jsx` + `.flag.*` in `app/globals.css` |
| Particle intensity | `burstAt()` `count` param in `lib/fx.js` |
| Nav quick links | `nav-links` div in `components/App.jsx` — currently: Dashboard, 2026-27, 2025-26, Sales Target |
| Summary parser keywords | `TASK_SECTION_HINTS` + `detectFlags()` in `lib/parseDoc.mjs` |

---

## Making this multi-user / public-facing

This was built as a **single-user personal tool**. The entire board state is one Redis key and auth is a single shared password. To turn it into a product for multiple users:

1. **Auth** — replace the shared-key gate (`lib/auth.js`) with a proper auth system (Clerk, NextAuth, or similar). Each user gets a session/user ID.
2. **Per-user storage** — namespace the Redis key by user ID: `goku-board:v1:{userId}` instead of a single key. Update `lib/store.js`.
3. **Customisable theming** — the DBZ fighter and power-level framing are hardcoded in `components/Fighter.jsx` and `lib/tiers.js`. Abstracting these into user settings would make the core board usable without the theme.
4. **Configurable columns** — `COLUMNS` in `lib/board.js` is a hardcoded array; expose it as a board setting stored in Redis so each user can name their columns.
5. **Remove personal quick links** — the Google Sheets links in the nav are personal; replace with a user-configurable links list.
6. **Weekly automation** — the `.docx` parser and Windows scheduled task are personal infrastructure; for a public product this would be replaced with a file upload UI or a webhook.

The core board logic (`lib/board.js`, the API route, and the components) is clean and well-separated from the personal config — a developer could extract the Kanban engine in a day and rebuild the surface on top of it.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `BOARD_KEY` | Yes (prod) | Password gate for the board API |
| `KV_REST_API_URL` | Yes (prod) | Upstash Redis REST URL (auto-set by Vercel integration) |
| `KV_REST_API_TOKEN` | Yes (prod) | Upstash Redis REST token (auto-set by Vercel integration) |
| `BOARD_URL` | Weekly script only | Full Vercel URL, e.g. `https://your-board.vercel.app` |
