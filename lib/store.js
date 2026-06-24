import fs from "node:fs/promises";
import path from "node:path";

const KEY = "goku-board:v1";
const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LOCAL_FILE = path.join(process.cwd(), "data", "board.local.json");
const usingRedis = Boolean(URL && TOKEN);

async function redisCommand(command) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.result;
}

export async function loadBoard() {
  if (usingRedis) {
    const raw = await redisCommand(["GET", KEY]);
    return raw ? JSON.parse(raw) : null;
  }
  try { return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8")); } catch { return null; }
}

export async function saveBoard(board) {
  const raw = JSON.stringify(board);
  if (usingRedis) { await redisCommand(["SET", KEY, raw]); return; }
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, raw, "utf8");
}

export { usingRedis };
