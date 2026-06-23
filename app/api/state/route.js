import { NextResponse } from "next/server";
import { loadBoard, saveBoard } from "../../../lib/store";
import { checkKey } from "../../../lib/auth";
import {
  bootstrapBoard,
  boardStats,
  addTask,
  updateTask,
  moveTask,
  deleteTask,
  toggleChecklistItem,
  addChecklistItem,
  mergeWeekly,
  COLUMNS,
} from "../../../lib/board";

export const dynamic = "force-dynamic";

async function getOrBootstrap() {
  let board = await loadBoard();
  if (!board) {
    board = bootstrapBoard();
    await saveBoard(board);
  }
  if (!board.columns) board.columns = COLUMNS;
  return board;
}

function withStats(board) {
  return { ...board, stats: boardStats(board) };
}

export async function GET(request) {
  if (!checkKey(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const board = await getOrBootstrap();
  return NextResponse.json(withStats(board));
}

export async function POST(request) {
  if (!checkKey(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const { action, payload = {} } = body || {};
  let board = await getOrBootstrap();
  let extra = {};

  switch (action) {
    case "addTask":
      board = addTask(board, payload);
      break;
    case "updateTask":
      board = updateTask(board, payload.id, payload.patch || {});
      break;
    case "moveTask":
      board = moveTask(board, payload.id, payload.column, payload.order);
      break;
    case "deleteTask":
      board = deleteTask(board, payload.id);
      break;
    case "toggleChecklistItem":
      board = toggleChecklistItem(board, payload.taskId, payload.itemId);
      break;
    case "addChecklistItem":
      board = addChecklistItem(board, payload.taskId, payload.text);
      break;
    case "mergeWeekly": {
      const res = mergeWeekly(board, payload.week, payload.tasks || []);
      board = res.board;
      extra.added = res.added;
      break;
    }
    case "replaceBoard":
      // full overwrite (used rarely, e.g. restore from backup)
      if (payload.board) board = payload.board;
      break;
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  await saveBoard(board);
  return NextResponse.json({ ...withStats(board), ...extra });
}
