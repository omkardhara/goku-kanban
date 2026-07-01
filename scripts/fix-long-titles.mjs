#!/usr/bin/env node
/**
 * One-off fix: truncate all existing board card titles that exceed TITLE_MAX.
 * Applies the same splitTitleNotes logic as parseDoc.mjs to existing cards.
 * Overflow text is moved into the card's notes field.
 *
 * Usage:
 *   $env:BOARD_URL = "https://goku-kanban.vercel.app"; $env:BOARD_KEY = "Goku123"
 *   node scripts/fix-long-titles.mjs [--dry]
 */

const TITLE_MAX = 72; // tighter than 90 — fits 2 lines on a kanban card

function splitTitleNotes(text) {
  // Pull trailing [source context] bracket into notes
  let sourceNote = "";
  const bracketMatch = text.match(/\s*(\[[^\]]+\])\s*$/);
  if (bracketMatch) {
    sourceNote = bracketMatch[1];
    text = text.slice(0, bracketMatch.index).trim();
  }

  if (text.length <= TITLE_MAX) {
    return { title: sourceNote ? `${text} ${sourceNote}`.trim() : text, notes: "" };
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

const DRY = process.argv.includes("--dry");
const BOARD_URL = (process.env.BOARD_URL || "").replace(/\/$/, "");
const BOARD_KEY = process.env.BOARD_KEY || "";

async function get() {
  const res = await fetch(`${BOARD_URL}/api/state`, { headers: { "x-board-key": BOARD_KEY } });
  if (!res.ok) throw new Error(`GET failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function patch(id, patchObj) {
  const res = await fetch(`${BOARD_URL}/api/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-board-key": BOARD_KEY },
    body: JSON.stringify({ action: "updateTask", payload: { id, patch: patchObj } }),
  });
  if (!res.ok) throw new Error(`updateTask(${id}) failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  if (!BOARD_URL) throw new Error("BOARD_URL not set");

  const board = await get();
  const tasks = Object.values(board.tasks || {});
  const toFix = tasks.filter((t) => t.title && t.title.length > TITLE_MAX);

  console.log(`Board has ${tasks.length} tasks; ${toFix.length} have titles longer than ${TITLE_MAX} chars.`);

  if (toFix.length === 0) {
    console.log("Nothing to fix.");
    return;
  }

  let fixed = 0;
  for (const task of toFix) {
    const { title: newTitle, notes: overflow } = splitTitleNotes(task.title);
    // Merge overflow with existing notes (if any) — don't stomp user-written notes
    const existingNotes = (task.notes || "").trim();
    const newNotes = [overflow, existingNotes].filter(Boolean).join("\n\n");

    if (DRY) {
      console.log(`\n[DRY] id=${task.id}`);
      console.log(`  OLD (${task.title.length}): ${task.title}`);
      console.log(`  NEW (${newTitle.length}): ${newTitle}`);
      if (overflow) console.log(`  NOTES: ${overflow.slice(0, 120)}${overflow.length > 120 ? "…" : ""}`);
    } else {
      const patchObj = { title: newTitle };
      if (newNotes) patchObj.notes = newNotes;
      await patch(task.id, patchObj);
      console.log(`✓ [${task.id.slice(-16)}] ${newTitle}`);
      fixed++;
    }
  }

  if (DRY) {
    console.log(`\nDry run complete — ${toFix.length} titles would be shortened.`);
  } else {
    console.log(`\nDone. ${fixed} card title(s) shortened.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
