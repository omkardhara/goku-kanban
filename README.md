# ⚡ Power-Up Board

A Trello-style Kanban board that **powers up a Super Saiyan fighter** as you finish tasks.
Cards, checklists, flags, priorities and due dates. Drag a card to **Done** and you get a
ki burst, a screen shake, and a power-level spike. Clear enough work and the fighter
transforms: Base → Ki Awakened → Super Saiyan → SSJ2 → SSJ3 → Ultra Instinct (full clear).

New tasks land on the board automatically every week from your weekly summary. You can
also add cards and move things around by hand — and the weekly job reads your **live board
first**, so it never clobbers what you changed.

---

## How it fits together

- **The board state lives in a cloud database (Upstash Redis).** That's why it's synced
  across your phone and laptop, and why manual edits stick.
- **`data/tasks.json`** is just the starter seed used on the very first load, plus a
  versioned backup the weekly job appends to.
- **The weekly job** reads the live board, adds only the new tasks from your summary, and
  writes them back — instantly, no redeploy required.

---

## 1. Run it locally (optional, to try it first)

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no database configured it stores state in a local file
(`data/board.local.json`) and skips the password gate. Good for a test drive.

## 2. Put it on GitHub

```bash
git init
git add .
git commit -m "Power-Up Board"
git branch -M main
git remote add origin https://github.com/<you>/goku-kanban.git
git push -u origin main
```

## 3. Deploy on Vercel

1. Go to vercel.com → **Add New → Project** → import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Click **Deploy**.

## 4. Add the synced database (Upstash Redis)

1. In your Vercel project → **Storage → Create Database → Upstash for Redis** (or
   **Marketplace → Upstash**). Connect it to the project.
2. It injects `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*`
   equivalents). The app reads either — nothing for you to rename.

## 5. Set your access key

In Vercel → **Settings → Environment Variables**, add:

| Name        | Value                                  |
|-------------|----------------------------------------|
| `BOARD_KEY` | a long private password (you pick it)  |

Then **redeploy** (Deployments → ⋯ → Redeploy) so the new env vars take effect.

Open your URL, enter the key once, and the board remembers it on that device.

---

## 6. Wire up the weekly auto-update

The board updates itself by **POSTing new tasks to its own API** after your weekly summary
runs. This needs no GitHub token and updates the live board instantly.

### Easiest: add a step to your existing weekly task

Tell me *"wire my Power-Up Board into my weekly summary"* with your live URL and key, and
I'll set up a scheduled step that does this each week. It runs roughly this:

1. Read the new weekly summary.
2. `GET {BOARD_URL}/api/state` with header `x-board-key: {BOARD_KEY}` — the live board.
3. Take the to-do / action-item bullets, drop any already on the board.
4. `POST {BOARD_URL}/api/state` with:

```json
{ "action": "mergeWeekly",
  "payload": { "week": "2026-W26",
    "tasks": [ { "title": "...", "priority": "high", "flags": ["work"], "dueDate": "2026-06-27", "column": "todo" } ] } }
```

### Or run the bundled script

If you'd rather drive it from a machine that has the repo checked out:

```bash
BOARD_URL=https://your-board.vercel.app BOARD_KEY=yourkey \
  node scripts/weekly-update.mjs --file ./weekly-summary.txt
```

Flags: `--dry` (preview, change nothing), `--no-git` (don't commit the backup),
`--no-live` (only update the repo), `--force` (re-import a week). The script reads the live
board first, merges only new tasks, pushes them live, updates `data/tasks.json`, and
git-commits the backup.

The parser (`lib/parseDoc.mjs`) pulls bullets from sections named like *Action Items,
To-Do, This Week, Follow-ups, Priorities*, detects `[x]` as done, `urgent`/`asap` as a flag,
and dates like `2026-06-27` or `by Friday`. Tweak the keywords there to match how your
summary is written.

---

## Customizing

- **Columns:** edit `COLUMNS` in `lib/board.js`.
- **Power tiers / transformations:** edit `lib/tiers.js` (names, hair/aura colours, when
  each form unlocks).
- **Flags & colours:** the chips in `components/TaskModal.jsx` and `.flag.*` styles in
  `app/globals.css`.
- **Celebration intensity:** `bigCelebrate` / `smallCelebrate` in `components/Board.jsx`
  and the particle counts in `lib/fx.js`.

## Files

```
app/page.js              entry → renders the board
app/api/state/route.js   GET board / POST mutations (auth-gated)
components/Board.jsx      board orchestration, FX, power meter, key gate
components/Fighter.jsx    the SVG power-up fighter
components/Column.jsx     a column + drop target
components/Card.jsx       a card + checklist + flags + due date
components/TaskModal.jsx  add-a-card dialog
lib/board.js             board model + mutations + stats
lib/store.js             Redis (prod) / local file (dev) storage
lib/tiers.js             power-tier ladder + power-level math
lib/parseDoc.mjs         weekly-summary → tasks parser
lib/auth.js              shared-key gate
scripts/weekly-update.mjs the weekly merge/push job
data/tasks.json          seed + versioned backup
```
