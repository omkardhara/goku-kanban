// Pure board model + mutations. The board is a single JSON object that is the
// source of truth (stored in Redis). The weekly job reads it live, merges new
// tasks, and writes it back.

import seed from "../data/tasks.json";

export const COLUMNS = [
  { id: "todo", title: "This Week" },
  { id: "doing", title: "In Progress" },
  { id: "done", title: "Done" },
];

export function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function newId(prefix = "t") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// A normalized task with sane defaults.
export function makeTask(input = {}) {
  return {
    id: input.id || newId(),
    title: input.title || "Untitled task",
    notes: input.notes || "",
    column: input.column || "todo",
    order: typeof input.order === "number" ? input.order : Date.now(),
    flags: Array.isArray(input.flags) ? input.flags : [],
    priority: input.priority || null, // "high" | "med" | "low" | null
    dueDate: input.dueDate || null,
    checklist: Array.isArray(input.checklist) ? input.checklist : [],
    source: input.source || "manual", // "manual" | "weekly"
    week: input.week || null,
    createdAt: input.createdAt || new Date().toISOString(),
    completedAt: input.completedAt || null,
  };
}

export function emptyBoard() {
  return { version: 1, columns: COLUMNS, tasks: {}, weeksImported: [] };
}

// Build the very first board from the seed file (data/tasks.json).
export function bootstrapBoard() {
  const board = emptyBoard();
  for (const t of seed.tasks || []) {
    const task = makeTask({ ...t, source: t.source || "weekly" });
    board.tasks[task.id] = task;
  }
  if (seed.week && !board.weeksImported.includes(seed.week)) {
    board.weeksImported.push(seed.week);
  }
  return board;
}

export function isDone(task) {
  return task.column === "done";
}

// ---- mutations (each returns the mutated board) ----

export function addTask(board, input) {
  const task = makeTask(input);
  board.tasks[task.id] = task;
  return board;
}

export function updateTask(board, id, patch) {
  const t = board.tasks[id];
  if (!t) return board;
  board.tasks[id] = { ...t, ...patch };
  return board;
}

export function moveTask(board, id, toColumn, order) {
  const t = board.tasks[id];
  if (!t) return board;
  const wasDone = t.column === "done";
  t.column = toColumn;
  if (typeof order === "number") t.order = order;
  const nowDone = toColumn === "done";
  if (nowDone && !wasDone) t.completedAt = new Date().toISOString();
  if (!nowDone && wasDone) t.completedAt = null;
  return board;
}

export function deleteTask(board, id) {
  delete board.tasks[id];
  return board;
}

export function toggleChecklistItem(board, taskId, itemId) {
  const t = board.tasks[taskId];
  if (!t) return board;
  t.checklist = (t.checklist || []).map((it) =>
    it.id === itemId ? { ...it, done: !it.done } : it
  );
  return board;
}

export function addChecklistItem(board, taskId, text) {
  const t = board.tasks[taskId];
  if (!t) return board;
  t.checklist = [...(t.checklist || []), { id: newId("c"), text, done: false }];
  return board;
}

// Merge a batch of weekly tasks into a LIVE board without disturbing existing
// cards, manual additions, completion state, or column positions.
// Tasks already present (matched by stable id) are skipped — carry-over preserved.
export function mergeWeekly(board, week, incoming = []) {
  let added = 0;
  for (const raw of incoming) {
    const id = raw.id || `wk_${week}_${slug(raw.title)}`;
    if (board.tasks[id]) continue; // already on the board, leave live state alone
    board.tasks[id] = makeTask({
      ...raw,
      id,
      source: "weekly",
      week,
      column: raw.column || "todo",
    });
    added += 1;
  }
  if (!board.weeksImported.includes(week)) board.weeksImported.push(week);
  return { board, added };
}

// Stats for the power meter.
export function boardStats(board) {
  const tasks = Object.values(board.tasks || {});
  const total = tasks.length;
  const doneCards = tasks.filter(isDone).length;
  let checkTotal = 0;
  let checkDone = 0;
  for (const t of tasks) {
    for (const it of t.checklist || []) {
      checkTotal += 1;
      if (it.done) checkDone += 1;
    }
  }
  const completionUnits = doneCards + checkDone;
  const totalUnits = total + checkTotal;
  const ratio = totalUnits ? completionUnits / totalUnits : 0;
  return { total, doneCards, checkTotal, checkDone, ratio };
}
