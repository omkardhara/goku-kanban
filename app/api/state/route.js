import { NextResponse } from "next/server";
import { loadBoard, saveBoard } from "../../../lib/store";
import { checkKey } from "../../../lib/auth";
import {
  bootstrapBoard, normalize, boardStats, addTask, updateTask, moveTask, deleteTask,
  toggleChecklistItem, addChecklistItem, updateChecklistItem, deleteChecklistItem, addLink, deleteLink,
  setPayments, mergePayments, addPayment, updatePayment, deletePayment, setEvents, addEvent,
  updateEvent, deleteEvent, mergeEvents, mergeWeekly, addColumn, renameColumn, reorderColumn, deleteColumn,
} from "../../../lib/board";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getOrBootstrap() {
  let board = await loadBoard();
  if (!board) { board = bootstrapBoard(); await saveBoard(board); }
  return normalize(board);
}
function withStats(board) { return { ...board, stats: boardStats(board) }; }

export async function GET(request) {
  if (!checkKey(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const board = await getOrBootstrap();
  return NextResponse.json(withStats(board));
}

export async function POST(request) {
  if (!checkKey(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const { action, payload = {} } = body || {};
  let board = await getOrBootstrap();
  let extra = {};
  switch (action) {
    case "addTask": board = addTask(board, payload); break;
    case "updateTask": board = updateTask(board, payload.id, payload.patch || {}); break;
    case "moveTask": board = moveTask(board, payload.id, payload.column, payload.order); break;
    case "deleteTask": board = deleteTask(board, payload.id); break;
    case "toggleChecklistItem": board = toggleChecklistItem(board, payload.taskId, payload.itemId); break;
    case "addChecklistItem": board = addChecklistItem(board, payload.taskId, payload.text); break;
    case "updateChecklistItem": board = updateChecklistItem(board, payload.taskId, payload.itemId, payload.text); break;
    case "deleteChecklistItem": board = deleteChecklistItem(board, payload.taskId, payload.itemId); break;
    case "addLink": board = addLink(board, payload.taskId, payload.label, payload.url); break;
    case "deleteLink": board = deleteLink(board, payload.taskId, payload.linkId); break;
    case "setPayments": board = setPayments(board, payload.payments || []); break;
    case "mergePayments": board = mergePayments(board, payload.payments || []); break;
    case "addPayment": board = addPayment(board, payload); break;
    case "updatePayment": board = updatePayment(board, payload.id, payload.patch || {}); break;
    case "deletePayment": board = deletePayment(board, payload.id); break;
    case "setEvents": board = setEvents(board, payload.events || []); break;
    case "mergeEvents": board = mergeEvents(board, payload.week, payload.events || []); break;
    case "addEvent": board = addEvent(board, payload); break;
    case "updateEvent": board = updateEvent(board, payload.id, payload.patch || {}); break;
    case "deleteEvent": board = deleteEvent(board, payload.id); break;
    case "addColumn": board = addColumn(board, payload.title); break;
    case "renameColumn": board = renameColumn(board, payload.id, payload.title); break;
    case "reorderColumn": board = reorderColumn(board, payload.id, payload.toIndex); break;
    case "deleteColumn": board = deleteColumn(board, payload.id); break;
    case "mergeWeekly": {
      const res = mergeWeekly(board, payload.week, payload.tasks || []);
      board = res.board; extra.added = res.added;
      if (payload.payments) board = setPayments(board, payload.payments);
      if (payload.events) board = mergeEvents(board, payload.week, payload.events);
      break;
    }
    case "replaceBoard": if (payload.board) board = normalize(payload.board); break;
    default: return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  await saveBoard(board);
  return NextResponse.json({ ...withStats(board), ...extra });
}
