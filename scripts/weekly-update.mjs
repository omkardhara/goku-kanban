#!/usr/bin/env node
/**
 * Weekly updater — run AFTER your weekly summary is generated.
 *
 * What it does, in order:
 *   1. Reads the weekly-summary text (from --file <path> or stdin).
 *   2. Parses it into task cards.
 *   3. Reads the LIVE board from your deployed site (the source of truth —
 *      includes manual cards, moves, and completions you made this week).
 *   4. Merges in ONLY the tasks that aren't already on the live board.
 *   5. Pushes that merge to the live board (instant update, no redeploy needed).
 *   6. Also appends the new tasks to data/tasks.json and git-commits, so the
 *      repo stays a versioned backup and Vercel redeploys.
 *
 * Usage:
 *   node scripts/weekly-update.mjs --file ./summary.txt
 *   cat summary.txt | node scripts/weekly-update.mjs
 *
 * Flags:
 *   --file <path>   read summary text from a file (otherwise stdin)
 *   --no-git        skip the git commit/push step
 *   --no-live       skip writing to the live board (only update repo)
 *   --force         re-import even if this week was already imported
 *   --dry           parse and print, change nothing
 *
 * Env (see .env.example):
 *   BOARD_URL   e.g. https://goku-kanban.vercel.app
 *   BOARD_KEY   the same access key the website uses
 */

import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { parseSummary } from "../lib/parseDoc.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const TASKS_FILE = path.join(ROOT, "data", "tasks.json");

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : null;
};

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function readInput() {
  const file = valOf("--file");
  if (file) return fs.readFile(file, "utf8");
  // stdin
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function getLiveBoard() {
  const url = process.env.BOARD_URL;
  const key = process.env.BOARD_KEY || "";
  if (!url) return null;
  const res = await fetch(`${url.replace(/\/$/, "")}/api/state`, {
    headers: { "x-board-key": key },
  });
  if (!res.ok) throw new Error(`Live board GET failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function mergeLive(week, tasks) {
  const url = process.env.BOARD_URL;
  const key = process.env.BOARD_KEY || "";
  const res = await fetch(`${url.replace(/\/$/, "")}/api/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-board-key": key },
    body: JSON.stringify({ action: "mergeWeekly", payload: { week, tasks } }),
  });
  if (!res.ok) throw new Error(`Live merge failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function updateRepoTasks(week, newTasks) {
  let data = { week, tasks: [] };
  try {
    data = JSON.parse(await fs.readFile(TASKS_FILE, "utf8"));
  } catch {}
  const existing = new Set((data.tasks || []).map((t) => t.id));
  for (const t of newTasks) {
    if (!existing.has(t.id)) data.tasks.push(t);
  }
  data.week = week;
  await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function gitPush(week, count) {
  const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: "pipe" }).toString().trim();
  run("git add data/tasks.json");
  const status = run("git status --porcelain");
  if (!status) {
    console.log("• Nothing changed in the repo, skipping commit.");
    return;
  }
  run(`git -c user.name="weekly-bot" -c user.email="bot@local" commit -m "weekly: +${count} tasks for ${week}"`);
  run("git push");
  console.log("• Pushed to GitHub — Vercel will redeploy.");
}

async function main() {
  const text = await readInput();
  const week = isoWeek();
  const parsed = parseSummary(text);

  if (parsed.length === 0) {
    console.log("No tasks found in the summary. Nothing to do.");
    return;
  }

  // stable ids so re-runs don't duplicate
  const candidates = parsed.map((t) => ({ ...t, id: `wk_${week}_${slug(t.title)}`, source: "weekly", week }));

  if (has("--dry")) {
    console.log(`Week ${week} — ${candidates.length} parsed task(s):`);
    for (const t of candidates) console.log(`  - [${t.column}] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`);
    return;
  }

  // 1) Read the live board first — it's the most up-to-date truth.
  let live = null;
  if (!has("--no-live")) {
    try {
      live = await getLiveBoard();
    } catch (e) {
      console.warn("⚠ Could not read live board:", e.message);
    }
  }

  let newTasks = candidates;
  if (live) {
    if (live.weeksImported?.includes(week) && !has("--force")) {
      console.log(`Week ${week} already imported on the live board. Use --force to re-run.`);
      return;
    }
    const present = new Set(Object.keys(live.tasks || {}));
    newTasks = candidates.filter((t) => !present.has(t.id));
    console.log(`Live board has ${present.size} cards; ${newTasks.length} new this week.`);
  }

  if (newTasks.length === 0) {
    console.log("Nothing new to add. Live board is already up to date.");
    return;
  }

  // 2) Push the merge to the live board (instant).
  if (live && !has("--no-live")) {
    const res = await mergeLive(week, newTasks);
    console.log(`✓ Live board updated: +${res.added ?? newTasks.length} cards.`);
  }

  // 3) Update the repo backup + redeploy.
  await updateRepoTasks(week, newTasks);
  console.log(`✓ data/tasks.json updated (+${newTasks.length}).`);

  if (!has("--no-git")) {
    try {
      gitPush(week, newTasks.length);
    } catch (e) {
      console.warn("⚠ git push skipped/failed:", e.message);
    }
  }

  console.log("Done. ⚡");
}

main().catch((e) => {
  console.error("weekly-update failed:", e);
  process.exit(1);
});
