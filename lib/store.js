// Storage adapter: uses Upstash Redis (REST) in production, a local JSON file in dev.
// Stores the entire board under a single key so reads/writes are atomic-enough
// for a single-user personal board.

import fs from "node:fs/promises";
import path from "node:path";

const KEY = "goku-board:v1";
// Works with either the Vercel KV or the Upstash Redis integration var names.
const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LOCAL_FILE = path.join(process.cwd(), "data", "board.local.json");

const usingRedis = Boolean(URL && TOKEN);

async function redisCommand(command) {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Upstash error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.result;
}

export async function loadBoard() {
  if (usingRedis) {
    const raw = await redisCommand(["GET", KEY]);
    return raw ? JSON.parse(raw) : null;
  }
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveBoard(board) {
  const raw = JSON.stringify(board);
  if (usingRedis) {
    await redisCommand(["SET", KEY, raw]);
    return;
  }
  try {
    await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await fs.writeFile(LOCAL_FILE, raw, "utf8");
  } catch {
    // On a read-only host (e.g. Vercel without a database connected yet) we
    // can't persist. Don't crash — the board still renders from the seed.
  }
}

export { usingRedis };
