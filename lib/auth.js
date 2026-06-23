// Minimal shared-key gate. The board is private to you; one password protects
// both reads and writes. The site asks once and remembers it in the browser.

export function getBoardKey() {
  return process.env.BOARD_KEY || "";
}

export function checkKey(request) {
  const expected = getBoardKey();
  if (!expected) return true; // no key configured -> open (dev convenience)
  const provided =
    request.headers.get("x-board-key") ||
    new URL(request.url).searchParams.get("key") ||
    "";
  return provided === expected;
}
