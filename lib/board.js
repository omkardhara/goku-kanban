import seed from "../data/tasks.json";

export const COLUMNS = [
  { id: "todo", title: "This Week" },
  { id: "doing", title: "In Progress" },
  { id: "done", title: "Done" },
];

export function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
export function newId(prefix = "t") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
export function makeTask(input = {}) {
  return {
    id: input.id || newId(), title: input.title || "Untitled task", notes: input.notes || "",
    column: input.column || "todo", order: typeof input.order === "number" ? input.order : Date.now(),
    flags: Array.isArray(input.flags) ? input.flags : [], priority: input.priority || null,
    dueDate: input.dueDate || null, checklist: Array.isArray(input.checklist) ? input.checklist : [],
    links: Array.isArray(input.links) ? input.links : [], source: input.source || "manual",
    week: input.week || null, createdAt: input.createdAt || new Date().toISOString(),
    completedAt: input.completedAt || null,
  };
}
export function makePayment(input = {}) {
  return {
    id: input.id || newId("pay"), brand: input.brand || "Untitled", ptype: input.ptype || "",
    lastChased: input.lastChased || "", owner: input.owner || "", action: input.action || "",
    status: input.status || "pending", week: input.week || null,
  };
}
export function makeEvent(input = {}) {
  return {
    id: input.id || newId("ev"), date: input.date || null, day: input.day || "", time: input.time || "",
    title: input.title || "Untitled", location: input.location || "", attendees: input.attendees || "",
    bring: input.bring || "", link: input.link || "", week: input.week || null,
  };
}
export function emptyBoard() {
  return { version: 2, columns: COLUMNS, tasks: {}, payments: [], events: [], weeksImported: [] };
}
export function bootstrapBoard() {
  const board = emptyBoard();
  for (const t of seed.tasks || []) { const task = makeTask({ ...t, source: t.source || "weekly" }); board.tasks[task.id] = task; }
  board.payments = (seed.payments || []).map(makePayment);
  board.events = (seed.events || []).map(makeEvent);
  if (seed.week && !board.weeksImported.includes(seed.week)) board.weeksImported.push(seed.week);
  return board;
}
export function normalize(board) {
  if (!board.columns || board.columns.length === 0) board.columns = COLUMNS;
  if (!board.payments) board.payments = [];
  if (!board.events) board.events = [];
  for (const t of Object.values(board.tasks || {})) {
    if (!Array.isArray(t.links)) t.links = [];
    if (!Array.isArray(t.checklist)) t.checklist = [];
    if (!Array.isArray(t.flags)) t.flags = [];
  }
  // Re-index orders per column if any adjacent gap has collapsed below 1
  const byCol = {};
  for (const t of Object.values(board.tasks || {})) {
    if (!byCol[t.column]) byCol[t.column] = [];
    byCol[t.column].push(t);
  }
  for (const tasks of Object.values(byCol)) {
    tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    const needsReindex = tasks.some((t, i) => i > 0 && Math.abs(t.order - tasks[i - 1].order) < 1);
    if (needsReindex) tasks.forEach((t, i) => { t.order = (i + 1) * 1000; });
  }
  return board;
}
export function addColumn(board, title) {
  const clean = (title || "").trim() || "New column";
  const base = slug(clean) || "column";
  const taken = new Set([...board.columns.map((c) => c.id), "archive"]);
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  board.columns = [...board.columns, { id, title: clean }];
  return board;
}
export function renameColumn(board, id, title) {
  const clean = (title || "").trim();
  if (!clean) return board;
  board.columns = board.columns.map((c) => (c.id === id ? { ...c, title: clean } : c));
  return board;
}
export function archiveDone(board) {
  const now = new Date().toISOString();
  for (const t of Object.values(board.tasks)) {
    if (t.column === "done") {
      t.column = "archive";
      if (!t.completedAt) t.completedAt = now;
    }
  }
  return board;
}
export function reorderColumn(board, id, toIndex) {
  const cols = [...board.columns];
  const from = cols.findIndex((c) => c.id === id);
  if (from === -1) return board;
  const [moved] = cols.splice(from, 1);
  cols.splice(Math.max(0, Math.min(toIndex, cols.length)), 0, moved);
  board.columns = cols;
  return board;
}
// "todo" and "done" drive the This Week / Mark Done / stats logic, so they can't be removed.
export function deleteColumn(board, id) {
  if (id === "todo" || id === "done") return board;
  if (!board.columns.some((c) => c.id === id) || board.columns.length <= 1) return board;
  const fallback = board.columns.some((c) => c.id === "todo") ? "todo" : board.columns.find((c) => c.id !== id)?.id;
  for (const t of Object.values(board.tasks)) if (t.column === id) t.column = fallback;
  board.columns = board.columns.filter((c) => c.id !== id);
  return board;
}
export function isDone(task) { return task.column === "done"; }
export function addTask(board, input) { const t = makeTask(input); board.tasks[t.id] = t; return board; }
export function updateTask(board, id, patch) { const t = board.tasks[id]; if (t) board.tasks[id] = { ...t, ...patch }; return board; }
export function moveTask(board, id, toColumn, order) {
  const t = board.tasks[id]; if (!t) return board;
  const wasFinished = t.column === "done" || t.column === "archive";
  t.column = toColumn;
  if (typeof order === "number") t.order = order;
  if ((toColumn === "done" || toColumn === "archive") && !wasFinished) t.completedAt = new Date().toISOString();
  if (toColumn !== "done" && toColumn !== "archive" && wasFinished) t.completedAt = null;
  return board;
}
export function deleteTask(board, id) { delete board.tasks[id]; return board; }
// Dropping one card onto another turns it into a checklist item on the
// target and removes the dragged card entirely.
export function nestCardAsChecklist(board, draggedId, targetId) {
  if (draggedId === targetId) return board;
  const dragged = board.tasks[draggedId];
  const target = board.tasks[targetId];
  if (!dragged || !target) return board;
  target.checklist = [...(target.checklist || []), { id: newId("c"), text: dragged.title, done: false }];
  delete board.tasks[draggedId];
  return board;
}
export function toggleChecklistItem(board, taskId, itemId) {
  const t = board.tasks[taskId]; if (!t) return board;
  const items = t.checklist || [];
  const item = items.find((it) => it.id === itemId);
  if (!item) return board;
  const toggled = { ...item, done: !item.done };
  const rest = items.filter((it) => it.id !== itemId);
  // Checked items sink to the bottom; unchecked items return to the top.
  t.checklist = toggled.done ? [...rest, toggled] : [toggled, ...rest];
  return board;
}
export function addChecklistItem(board, taskId, text) {
  const t = board.tasks[taskId]; if (t) t.checklist = [...(t.checklist || []), { id: newId("c"), text, done: false }];
  return board;
}
export function updateChecklistItem(board, taskId, itemId, text) {
  const clean = (text || "").trim();
  if (!clean) return board;
  const t = board.tasks[taskId]; if (t) t.checklist = (t.checklist || []).map((it) => it.id === itemId ? { ...it, text: clean } : it);
  return board;
}
export function deleteChecklistItem(board, taskId, itemId) {
  const t = board.tasks[taskId]; if (t) t.checklist = (t.checklist || []).filter((it) => it.id !== itemId);
  return board;
}
export function reorderChecklistItem(board, taskId, draggedId, targetId, pos) {
  const t = board.tasks[taskId];
  if (!t || draggedId === targetId) return board;
  const items = [...(t.checklist || [])];
  const fromIdx = items.findIndex((it) => it.id === draggedId);
  if (fromIdx === -1) return board;
  const [moved] = items.splice(fromIdx, 1);
  let insertIdx = items.findIndex((it) => it.id === targetId);
  if (insertIdx === -1) insertIdx = items.length;
  else if (pos === "after") insertIdx += 1;
  items.splice(insertIdx, 0, moved);
  t.checklist = items;
  return board;
}
export function addLink(board, taskId, label, url) {
  const t = board.tasks[taskId]; if (t) t.links = [...(t.links || []), { id: newId("l"), label: label || url, url }];
  return board;
}
export function deleteLink(board, taskId, linkId) {
  const t = board.tasks[taskId]; if (t) t.links = (t.links || []).filter((l) => l.id !== linkId);
  return board;
}
export function setPayments(board, payments = []) { board.payments = payments.map(makePayment); return board; }
export function mergePayments(board, incoming = []) {
  const existing = board.payments || [];
  const existingBrands = new Set(existing.map((p) => p.brand.toLowerCase()));
  const fresh = incoming.filter((p) => !existingBrands.has((p.brand || "").toLowerCase()));
  board.payments = [...existing, ...fresh.map(makePayment)];
  return board;
}
export function addPayment(board, input) { board.payments = [...(board.payments || []), makePayment(input)]; return board; }
export function updatePayment(board, id, patch) { board.payments = (board.payments || []).map((p) => p.id === id ? { ...p, ...patch } : p); return board; }
export function deletePayment(board, id) { board.payments = (board.payments || []).filter((p) => p.id !== id); return board; }
export function setEvents(board, events = []) { board.events = events.map(makeEvent); return board; }
export function addEvent(board, input) { board.events = [...(board.events || []), makeEvent(input)]; return board; }
export function deleteEvent(board, id) { board.events = (board.events || []).filter((e) => e.id !== id); return board; }
export function mergeWeekly(board, week, incoming = []) {
  let added = 0;
  // Title-normalised set covers all existing tasks regardless of ID or week
  const existingTitles = new Set(
    Object.values(board.tasks).map((t) => slug(t.title))
  );
  for (const raw of incoming) {
    // Skip if a task with the same normalised title already exists on the board
    if (existingTitles.has(slug(raw.title))) continue;
    let id = raw.id || `wk_${week}_${slug(raw.title)}`;
    let n = 1;
    while (board.tasks[id]) {
      id = `${raw.id || `wk_${week}_${slug(raw.title)}`}_${n++}`;
    }
    board.tasks[id] = makeTask({ ...raw, id, source: "weekly", week, column: raw.column || "todo" });
    existingTitles.add(slug(raw.title)); // prevent intra-batch duplicates too
    added += 1;
  }
  if (!board.weeksImported.includes(week)) board.weeksImported.push(week);
  return { board, added };
}
export function boardStats(board) {
  const tasks = Object.values(board.tasks || {});
  const activeTasks = tasks.filter(t => t.column !== "archive");
  const total = activeTasks.length;
  const doneCards = activeTasks.filter(t => t.column === "done").length;
  let checkTotal = 0, checkDone = 0;
  for (const t of activeTasks) for (const it of t.checklist || []) { checkTotal += 1; if (it.done) checkDone += 1; }
  const ratio = (total + checkTotal) ? (doneCards + checkDone) / (total + checkTotal) : 0;
  return { total, doneCards, checkTotal, checkDone, ratio,
    payments: (board.payments || []).filter((p) => p.status !== "closed").length,
    events: (board.events || []).length };
}
