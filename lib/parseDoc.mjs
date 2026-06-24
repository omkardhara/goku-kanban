// Heuristic parser: turns weekly-summary text into task objects.
// It is deliberately forgiving — tweak the keywords/sections to match how your
// weekly summary is written.

const TASK_SECTION_HINTS = [
  "to-do", "todo", "to do", "action", "task", "follow", "next step",
  "this week", "priorit", "deliver", "open item", "need to",
];

const BULLET_RE = /^\s*(?:[-*•▪◦]|\d+[.)]|\[[ xX]?\])\s+/;
const CHECKBOX_DONE_RE = /^\s*(?:[-*•]\s*)?\[[xX]\]/;

const WEEKDAYS = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function nextWeekdayISO(name, from = new Date()) {
  const target = WEEKDAYS[name.toLowerCase()];
  if (target === undefined) return null;
  const d = new Date(from);
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function detectDueDate(text, now = new Date()) {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const by = text.match(/\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (by) return nextWeekdayISO(by[1], now);
  if (/\btomorrow\b/i.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (/\btoday\b/i.test(text)) return now.toISOString().slice(0, 10);
  return null;
}

function detectPriority(text) {
  if (/\b(urgent|asap|high\s*priority|critical|p0|p1)\b/i.test(text)) return "high";
  if (/\b(low\s*priority|whenever|someday|p3)\b/i.test(text)) return "low";
  return null;
}

function detectFlags(text) {
  const flags = [];
  if (/\b(bms|bookmyshow|internal|ops|approval|vendor|platform|dashboard)\b/i.test(text)) flags.push("bms");
  if (/\b(client|brand|sponsor|meeting|deck|proposal|email|review|contract|pitch)\b/i.test(text)) flags.push("client");
  if (/\b(payment|invoice|billing|po\b|receipt|chase|amount|debit|credit|reimburse)\b/i.test(text)) flags.push("payments");
  if (/\b(personal|home|family|gym|health|travel|flight|hotel)\b/i.test(text)) flags.push("misc");
  return [...new Set(flags)];
}

function cleanTitle(line) {
  return line
    .replace(BULLET_RE, "")          // leading bullet / number / checkbox
    .replace(/^\[[ xX]?\]\s*/, "")   // a checkbox left after a "- " bullet
    .replace(/\s+/g, " ")
    .replace(/\s*[:\-–]\s*$/, "")
    .trim();
}

function isHeading(line) {
  const l = line.trim();
  if (!l) return false;
  if (BULLET_RE.test(l)) return false;
  if (/^#{1,6}\s/.test(l)) return true; // markdown heading
  if (/:\s*$/.test(l) && l.length < 60) return true; // "Action items:"
  if (l === l.toUpperCase() && l.length > 3 && l.length < 50 && /[A-Z]/.test(l)) return true;
  // short label-like line with no sentence punctuation -> section boundary
  const words = l.split(/\s+/);
  if (words.length <= 5 && l.length < 45 && !/[.!?,]$/.test(l)) return true;
  return false;
}

function headingIsTaskSection(line) {
  const l = line.toLowerCase();
  return TASK_SECTION_HINTS.some((h) => l.includes(h));
}

// Google Docs / Drive exports escape markdown specials (\[ \], 1\., H\&M, \---).
// Strip a backslash that sits in front of any non-alphanumeric character.
function normalizeEscapes(s) {
  return String(s || "").replace(/\\([^A-Za-z0-9])/g, "$1");
}

// Returns [{ title, priority, flags, dueDate, column }]
// opts.onlySections: array of lowercase substrings to restrict capture to.
//   Defaults to the "master to-do list" section; falls back to all task
//   sections if that section isn't present, so it works on any summary.
export function parseSummary(text, opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date();
  const clean = normalizeEscapes(text);
  const defaults = ["master to-do", "to-do list", "to do list"];
  const requested = opts.onlySections === undefined ? defaults : opts.onlySections;
  const onlyArr = Array.isArray(requested) && requested.length ? requested : null;

  let tasks = collect(clean, { now, onlyArr, allBullets: opts.allBullets });
  if (tasks.length === 0 && onlyArr) {
    tasks = collect(clean, { now, onlyArr: null, allBullets: opts.allBullets });
  }
  return tasks;
}

function collect(text, { now, onlyArr, allBullets }) {
  const lines = text.split(/\r?\n/);
  const tasks = [];
  let inTaskSection = false;
  let currentSection = "";
  const seen = new Set();

  for (const raw of lines) {
    const line = raw.replace(/\t/g, "  ");
    if (!line.trim()) continue;

    if (isHeading(line)) {
      currentSection = line.toLowerCase();
      inTaskSection = headingIsTaskSection(line);
      continue;
    }

    if (!BULLET_RE.test(line)) continue;

    let include;
    if (onlyArr) {
      include = onlyArr.some((s) => currentSection.includes(s));
    } else if (inTaskSection || allBullets) {
      include = true;
    } else {
      include = /\[[ xX]?\]/.test(line); // capture stray checkbox items anywhere
    }
    if (!include) continue;

    const done = CHECKBOX_DONE_RE.test(line);
    const title = cleanTitle(line);
    if (!title || title.length < 3) continue;
    const k = title.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);

    tasks.push({
      title,
      priority: detectPriority(title),
      flags: detectFlags(title),
      dueDate: detectDueDate(title, now),
      column: done ? "done" : "todo",
    });
  }
  return tasks;
}

// Parse the "PAYMENTS FOLLOW-UP" section into payment items.
// Recognises blocks that start with "Brand/Party:" and the labelled lines under
// them, plus a trailing "Closed (...)" list.
export function parsePayments(text) {
  const clean = normalizeEscapes(text);
  const lines = clean.split(/\r?\n/);
  const payments = [];
  let inSection = false;
  let inClosed = false;
  let cur = null;

  const push = () => { if (cur && cur.brand) payments.push(cur); cur = null; };
  const statusFor = (s) => {
    const x = (s.ptype + " " + s.action).toLowerCase();
    if (/chase|silent|escalate|follow up|awaiting po|awaiting re-upload/.test(x)) return "chasing";
    return "pending";
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const low = line.toLowerCase();

    if (/^payments follow/i.test(low)) { inSection = true; continue; }
    if (inSection && /^[-=]{3,}$/.test(line.replace(/\s/g, ""))) { push(); break; }
    if (!inSection) continue;

    if (/^closed\b/i.test(low)) { push(); inClosed = true; continue; }

    if (inClosed) {
      // "- John Mayer / Vedica (Bisleri): payment received Jun 10 ..."
      const m = line.replace(/^[-*•]\s*/, "");
      if (m && m.length > 3) {
        const [brand, ...rest] = m.split(":");
        payments.push({ brand: brand.trim(), ptype: "", action: rest.join(":").trim(), status: "closed" });
      }
      continue;
    }

    if (/^brand\/party:/i.test(low)) {
      push();
      cur = { brand: line.split(":").slice(1).join(":").trim(), ptype: "", lastChased: "", owner: "", action: "", status: "pending" };
    } else if (cur && /^type:/i.test(low)) {
      cur.ptype = line.split(":").slice(1).join(":").trim();
    } else if (cur && /^last chased:/i.test(low)) {
      cur.lastChased = line.split(":").slice(1).join(":").trim();
    } else if (cur && /^owner/i.test(low)) {
      cur.owner = line.split(":").slice(1).join(":").trim().replace(/\[.*?\]/g, "").trim();
    } else if (cur && /^action:/i.test(low)) {
      cur.action = line.split(":").slice(1).join(":").trim();
    }
  }
  push();
  for (const p of payments) if (p.status !== "closed") p.status = statusFor(p);
  return payments;
}
