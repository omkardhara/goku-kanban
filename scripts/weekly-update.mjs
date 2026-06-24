#!/usr/bin/env node
/**
 * Weekly updater — run AFTER your weekly summary is generated.
 * Reads the live board first, merges only new MASTER TO-DO tasks, syncs payments,
 * writes the repo backup, and pushes. See README for the full flow.
 *
 * Usage:
 *   node scripts/weekly-update.mjs --folder "D:/path/to/summaries"
 *   node scripts/weekly-update.mjs --file ./summary.docx
 *   node scripts/weekly-update.mjs --file ./summary.txt
 * Flags: --folder <path>  --file <path>  --week <2026-W25>  --no-git  --no-live  --force  --dry
 * Env: BOARD_URL, BOARD_KEY
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { parseSummary, parsePayments } from "../lib/parseDoc.mjs";
import mammoth from "mammoth";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

async function latestFileInFolder(folder) {
  const entries = await fs.readdir(folder);
  const docs = entries.filter((f) => /\.(docx|txt)$/i.test(f));
  if (!docs.length) throw new Error(`No .docx or .txt files found in ${folder}`);
  const withMtime = await Promise.all(
    docs.map(async (f) => ({ f, mtime: (await fs.stat(path.join(folder, f))).mtimeMs }))
  );
  withMtime.sort((a, b) => b.mtime - a.mtime);
  return path.join(folder, withMtime[0].f);
}

async function readFileAsText(filePath) {
  if (/\.docx$/i.test(filePath)) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  return fs.readFile(filePath, "utf8");
}

async function readInput() {
  const folder = valOf("--folder");
  const file = valOf("--file");
  if (folder) {
    const latest = await latestFileInFolder(folder);
    console.log(`• Reading: ${path.basename(latest)}`);
    return readFileAsText(latest);
  }
  if (file) return readFileAsText(file);
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function getLiveBoard() {
  const url = process.env.BOARD_URL;
  const key = process.env.BOARD_KEY || "";
  if (!url) return null;
  const res = await fetch(`${url.replace(/\/$/, "")}/api/state`, { headers: { "x-board-key": key } });
  if (!res.ok) throw new Error(`Live board GET failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function postLive(action, payload) {
  const url = process.env.BOARD_URL;
  const key = process.env.BOARD_KEY || "";
  const res = await fetch(`${url.replace(/\/$/, "")}/api/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-board-key": key },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error(`Live ${action} failed: ${res.status} ${await res.text()}`);
  return res.json();
}
async function mergeLive(week, tasks) {
  return postLive("mergeWeekly", { week, tasks });
}

async function updateRepoTasks(week, newTasks) {
  let data = { week, tasks: [] };
  try {
    data = JSON.parse(await fs.readFile(TASKS_FILE, "utf8"));
  } catch {}
  if (!Array.isArray(data.tasks)) data.tasks = [];
  const existing = new Set(data.tasks.map((t) => t.id));
  for (const t of newTasks) if (!existing.has(t.id)) data.tasks.push(t);
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
  const week = valOf("--week") || isoWeek();
  const parsed = parseSummary(text);
  const payments = parsePayments(text);

  if (!process.env.BOARD_URL) {
    console.warn("⚠ BOARD_URL not set — live board will not be updated. Set it to your Vercel URL.");
  }

  if (parsed.length === 0 && payments.length === 0) {
    console.log("No tasks or payments found in the summary. Nothing to do.");
    return;
  }

  const candidates = parsed.map((t) => ({ ...t, id: `wk_${week}_${slug(t.title)}`, source: "weekly", week }));

  if (has("--dry")) {
    console.log(`Week ${week} — ${candidates.length} parsed task(s), ${payments.length} payment(s):`);
    for (const t of candidates) console.log(`  - [${t.column}] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`);
    for (const p of payments) console.log(`  $ ${p.brand} [${p.status}]`);
    return;
  }

  let live = null;
  if (!has("--no-live")) {
    try {
      live = await getLiveBoard();
    } catch (e) {
      console.warn("⚠ Could not read live board:", e.message);
    }
  }

  if (live && !has("--no-live") && payments.length) {
    try {
      await postLive("mergePayments", { payments });
      console.log(`✓ Payments merged: ${payments.length} from doc (existing statuses preserved).`);
    } catch (e) {
      console.warn("⚠ payments sync failed:", e.message);
    }
  }

  let newTasks = candidates;
  if (live) {
    if (live.weeksImported?.includes(week) && !has("--force")) {
      console.log(`Week ${week} tasks already imported. (Payments still refreshed.) Use --force to re-add tasks.`);
      return;
    }
    const present = new Set(Object.keys(live.tasks || {}));
    newTasks = candidates.filter((t) => !present.has(t.id));
    console.log(`Live board has ${present.size} cards; ${newTasks.length} new this week.`);
  }

  if (newTasks.length === 0) {
    console.log("No new tasks to add.");
    return;
  }

  if (live && !has("--no-live")) {
    const res = await mergeLive(week, newTasks);
    console.log(`✓ Live board updated: +${res.added ?? newTasks.length} cards.`);
  }

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
