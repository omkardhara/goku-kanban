// Heuristic parser: turns weekly-summary text into task objects.
// It is deliberately forgiving — tweak the keywords/sections to match how your
// weekly summary is written.

const TASK_SECTION_HINTS = [
  "to-do", "todo", "to do", "action", "task", "follow", "next step",
  "this week", "priorit", "deliver", "open item", "need to",
];

const BULLET_RE = /^\s*(?:[-*•▪◦☐☑☒]|\d+[.)]|\[[ xX]?\])\s+/;
const CHECKBOX_DONE_RE = /^\s*(?:[-*•]\s*)?(?:\[[xX]\]|☑|☒)/;

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

// Max chars for card title (≈ 2 lines on a typical kanban card)
const TITLE_MAX = 72;

function splitTitleNotes(text) {
  // Pull trailing [source context] bracket into notes
  let sourceNote = "";
  const bracketMatch = text.match(/\s*(\[[^\]]+\])\s*$/);
  if (bracketMatch) {
    sourceNote = bracketMatch[1];
    text = text.slice(0, bracketMatch.index).trim();
  }

  if (text.length <= TITLE_MAX) {
    return { title: text, notes: sourceNote };
  }

  // Use first sentence break if it falls within 1.5× the title limit
  const sentIdx = text.search(/\.\s+[A-Z]/);
  if (sentIdx > 0 && sentIdx <= Math.floor(TITLE_MAX * 1.5)) {
    const title = text.slice(0, sentIdx + 1).trim();
    const rest = text.slice(sentIdx + 2).trim();
    return { title, notes: [rest, sourceNote].filter(Boolean).join("\n\n") };
  }

  // Word-boundary truncation
  const sub = text.slice(0, TITLE_MAX);
  const cut = sub.lastIndexOf(" ");
  const splitAt = cut > 20 ? cut : TITLE_MAX;
  const title = text.slice(0, splitAt).trim();
  const rest = text.slice(splitAt).trim();
  return { title, notes: [rest, sourceNote].filter(Boolean).join("\n\n") };
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
    const fullText = cleanTitle(line);
    if (!fullText || fullText.length < 3) continue;
    const k = fullText.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);

    const { title, notes } = splitTitleNotes(fullText);
    tasks.push({
      title,
      notes,
      priority: detectPriority(fullText),
      flags: detectFlags(fullText),
      dueDate: detectDueDate(fullText, now),
      column: done ? "done" : "todo",
    });
  }
  return tasks;
}

// Parse the "PAYMENTS FOLLOW-UP" section.
// The weekly summary uses a 5-column table: Brand/Party | Type | Last activity | Owner | Action.
// Mammoth renders each cell as a separate line (with blank lines between).
// We collect all non-empty lines in the section, skip the 5 header lines, then
// read the data in chunks of 5.
export function parsePayments(text) {
  const clean = normalizeEscapes(text);
  const lines = clean.split(/\r?\n/);
  const sectionLines = [];
  let inSection = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (/^payments follow[\-\s]?up\s*$/i.test(line)) { inSection = true; continue; }
    if (!inSection) continue;
    if (/^[-=]{3,}$/.test(line.replace(/\s/g, "")) || /^confidence\s+flag/i.test(line.toLowerCase())) break;
    if (!line) continue;
    sectionLines.push(line);
  }

  // First 5 non-empty lines are the header row (Brand/Party, Type, Last activity, Owner, Action)
  const COLS = 5;
  const data = sectionLines.slice(COLS);
  const payments = [];

  for (let i = 0; i + COLS <= data.length; i += COLS) {
    const brand = data[i] || "";
    const ptype = data[i + 1] || "";
    const lastChased = data[i + 2] || "";
    const owner = (data[i + 3] || "").replace(/\[.*?\]/g, "").trim();
    const action = data[i + 4] || "";
    if (!brand || brand.length < 2) continue;
    const combined = (ptype + " " + action).toLowerCase();
    let status = "pending";
    if (/chase|silent|escalate|follow up|awaiting po|awaiting re-upload/.test(combined)) status = "chasing";
    if (/^done\b|^paid\b|^closed\b/.test(ptype.toLowerCase())) status = "closed";
    payments.push({ brand, ptype, lastChased, owner, action, status });
  }

  return payments;
}

// Parse the "CALENDAR:" section into event objects.
// Day labels look like "Monday, June 29" or "Just outside this week (Tuesday, July 7)".
// Each meeting line contains "at X:XX AM/PM".
export function parseEvents(text) {
  const clean = normalizeEscapes(text);
  const lines = clean.split(/\r?\n/);
  const events = [];
  let inSection = false;
  let currentDay = "";

  const SECTION_END = /^(ongoing threads|master to-do|confidence flag)/i;
  const DAY_RE = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)[,\s]/i;
  const TIME_RE = /\bat\s+(\d{1,2}:\d{2}\s*[ap]m)/i;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^calendar[\s:]/i.test(line)) { inSection = true; continue; }
    if (!inSection) continue;
    if (SECTION_END.test(line)) break;

    if (DAY_RE.test(line) || /^just outside/i.test(line)) {
      currentDay = line;
      continue;
    }

    const timeMatch = line.match(TIME_RE);
    if (!timeMatch || !currentDay) continue;

    const time = timeMatch[1].trim();
    const needle = " at " + timeMatch[1].toLowerCase();
    const atIdx = line.toLowerCase().indexOf(needle);
    const title = atIdx > 0 ? line.slice(0, atIdx).trim() : line;
    const afterTime = line.slice(atIdx + needle.length).trim().replace(/^[.,]\s*/, "");

    const bringIdx = afterTime.search(/\bBring\s*:/i);
    const locationRaw = bringIdx >= 0 ? afterTime.slice(0, bringIdx) : afterTime;
    const location = locationRaw.replace(/\.\s*$/, "").trim();
    const bring = bringIdx >= 0 ? afterTime.slice(bringIdx).replace(/^Bring\s*:\s*/i, "").trim() : "";

    events.push({ date: null, day: currentDay, time, title, location, bring, attendees: "" });
  }
  return events;
}
