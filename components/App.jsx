"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Column from "./Column";
import Card from "./Card";
import Fighter from "./Fighter";
import TaskModal from "./TaskModal";
import CardModal from "./CardModal";
import PaymentsView from "./PaymentsView";
import CalendarView from "./CalendarView";
import Backgrounds from "./Backgrounds";
import { TIERS, tierFor, powerLevel, completedUnits } from "../lib/tiers";
import { burstAt, shakeScreen } from "../lib/fx";
import AddColumn from "./AddColumn";
import ZoomControl from "./ZoomControl";
import {
  moveTask, updateTask, deleteTask, addTask, toggleChecklistItem, addChecklistItem,
  updateChecklistItem, deleteChecklistItem, addLink, deleteLink, addColumn, renameColumn,
  reorderColumn, deleteColumn, boardStats,
} from "../lib/board";

const KEY_STORAGE = "gokuBoardKey";
const BOARD_ZOOM_STORAGE = "gokuBoardZoom";
const PAYMENTS_ZOOM_STORAGE = "gokuPaymentsZoom";
const VIEWS = [
  { id: "board", label: "Board" },
  { id: "payments", label: "Payments" },
  { id: "calendar", label: "Calendar" },
  { id: "archive", label: "Archive" },
];

export default function App() {
  const [board, setBoard] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needKey, setNeedKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [boardKey, setBoardKey] = useState("");
  const [view, setView] = useState("board");
  const [addingTo, setAddingTo] = useState(null);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState(null);
  const [displayPower, setDisplayPower] = useState(0);
  const [filterPriority, setFilterPriority] = useState(null);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [boardZoomState, setBoardZoomState] = useState(1);
  const [paymentsZoomState, setPaymentsZoomState] = useState(1);

  const prevTier = useRef(0);
  const prevPower = useRef(0);
  const initialised = useRef(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(KEY_STORAGE) : "";
    setBoardKey(saved || "");
    const bz = parseFloat(window.localStorage.getItem(BOARD_ZOOM_STORAGE));
    if (!Number.isNaN(bz)) setBoardZoomState(bz);
    const pz = parseFloat(window.localStorage.getItem(PAYMENTS_ZOOM_STORAGE));
    if (!Number.isNaN(pz)) setPaymentsZoomState(pz);
  }, []);

  const setBoardZoom = useCallback((z) => {
    setBoardZoomState(z);
    window.localStorage.setItem(BOARD_ZOOM_STORAGE, String(z));
  }, []);
  const setPaymentsZoom = useCallback((z) => {
    setPaymentsZoomState(z);
    window.localStorage.setItem(PAYMENTS_ZOOM_STORAGE, String(z));
  }, []);

  function showToast(big, sub) {
    setToast({ big, sub, id: Date.now() });
    setTimeout(() => setToast(null), 1900);
  }
  function bigCelebrate(tier) {
    setFlash(true);
    setTimeout(() => setFlash(false), 750);
    shakeScreen();
    showToast(TIERS[tier].name + "!", "POWER UP");
    const wrap = document.querySelector(".fighter-wrap");
    if (wrap) {
      const r = wrap.getBoundingClientRect();
      burstAt(r.left + r.width / 2, r.top + r.height / 2, { count: 36 });
    }
  }
  const smallCelebrate = useCallback((x, y) => {
    shakeScreen();
    burstAt(x ?? window.innerWidth / 2, y ?? window.innerHeight / 3, { count: 24 });
  }, []);

  const applyBoard = useCallback((data) => {
    setBoard(data);
    setStats(data.stats);
    const newTier = tierFor(completedUnits(data.stats), data.stats.ratio);
    const newPower = powerLevel(data.stats);
    if (initialised.current) {
      if (newTier > prevTier.current) bigCelebrate(newTier);
      if (prevPower.current < 9000 && newPower >= 9000) showToast("IT'S OVER 9000!", "POWER UNLEASHED");
    } else {
      initialised.current = true;
    }
    prevTier.current = newTier;
    prevPower.current = newPower;
  }, []);

  const fetchBoard = useCallback(
    async (key) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/state", { headers: { "x-board-key": key || "" }, cache: "no-store" });
        if (res.status === 401) { setNeedKey(true); setLoading(false); return; }
        const data = await res.json();
        setNeedKey(false);
        applyBoard(data);
      } catch {
        setError("Could not load the board. Check your connection.");
      } finally {
        setLoading(false);
      }
    },
    [applyBoard]
  );

  useEffect(() => { fetchBoard(boardKey); /* eslint-disable-next-line */ }, [boardKey]);

  // `mutate` runs the same pure lib/board.js function locally so the UI updates
  // instantly, instead of waiting on the round trip to /api/state.
  const api = useCallback(
    async (action, payload, mutate) => {
      if (mutate) {
        setBoard((prev) => {
          if (!prev) return prev;
          const next = mutate(structuredClone(prev));
          setStats(boardStats(next));
          return next;
        });
      }
      try {
        const res = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-board-key": boardKey || "" },
          body: JSON.stringify({ action, payload }),
        });
        if (res.status === 401) { setNeedKey(true); return null; }
        const data = await res.json();
        applyBoard(data);
        return data;
      } catch {
        setError("Something went wrong saving that change.");
        if (mutate) fetchBoard(boardKey);
        return null;
      }
    },
    [boardKey, applyBoard, fetchBoard]
  );

  useEffect(() => {
    if (!stats) return;
    const target = powerLevel(stats);
    const start = displayPower;
    const diff = target - start;
    if (diff === 0) return;
    const t0 = performance.now();
    let raf;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 700);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayPower(Math.round(start + diff * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line
  }, [stats]);

  const tasksByColumn = useMemo(() => {
    if (!board) return {};
    const map = {};
    for (const t of Object.values(board.tasks)) {
      if (!map[t.column]) map[t.column] = [];
      map[t.column].push(t);
    }
    for (const col in map) map[col].sort((a, b) => (a.order || 0) - (b.order || 0));
    return map;
  }, [board?.tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const PRIO_RANK = { high: 0, med: 1, low: 2 };
  const displayTasksByColumn = useMemo(() => {
    if (!filterPriority && !sortByPriority) return tasksByColumn;
    const result = {};
    for (const [colId, tasks] of Object.entries(tasksByColumn)) {
      let list = filterPriority ? tasks.filter((t) => t.priority === filterPriority) : tasks;
      if (sortByPriority) list = [...list].sort((a, b) => (PRIO_RANK[a.priority] ?? 99) - (PRIO_RANK[b.priority] ?? 99));
      result[colId] = list;
    }
    return result;
  }, [tasksByColumn, filterPriority, sortByPriority]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMoveDone = useCallback((id, x, y) => {
    api("moveTask", { id, column: "done" }, (b) => moveTask(b, id, "done"));
    smallCelebrate(x, y);
  }, [api, smallCelebrate]);

  const handleArchive = useCallback((id) => {
    api("moveTask", { id, column: "archive" }, (b) => moveTask(b, id, "archive"));
  }, [api]);

  const handleArchiveAll = useCallback(() => {
    api("archiveDone", {}, (b) => {
      for (const t of Object.values(b.tasks)) {
        if (t.column === "done") { t.column = "archive"; }
      }
      return b;
    });
  }, [api]);

  const handleRevert = useCallback((id) => {
    api("moveTask", { id, column: "todo" }, (b) => moveTask(b, id, "todo"));
  }, [api]);

  const handleRestore = useCallback((id) => {
    api("moveTask", { id, column: "done" }, (b) => moveTask(b, id, "done"));
  }, [api]);

  const handleReorder = useCallback((draggedId, targetId, pos, colId) => {
    const colTasks = tasksByColumn[colId] || [];
    const targetIdx = colTasks.findIndex((t) => t.id === targetId);
    if (targetIdx === -1) return;
    let newOrder;
    if (pos === "before") {
      const prev = colTasks[targetIdx - 1];
      newOrder = prev ? (prev.order + colTasks[targetIdx].order) / 2 : colTasks[targetIdx].order - 1000;
    } else {
      const next = colTasks[targetIdx + 1];
      newOrder = next ? (colTasks[targetIdx].order + next.order) / 2 : colTasks[targetIdx].order + 1000;
    }
    const draggedTask = board?.tasks[draggedId];
    if (!draggedTask) return;
    if (draggedTask.column !== colId) {
      const wasDone = draggedTask.column === "done";
      api("moveTask", { id: draggedId, column: colId, order: newOrder }, (b) => moveTask(b, draggedId, colId, newOrder));
      if (colId === "done" && !wasDone) smallCelebrate();
    } else {
      api("updateTask", { id: draggedId, patch: { order: newOrder } }, (b) => updateTask(b, draggedId, { order: newOrder }));
    }
  }, [board, tasksByColumn, api, smallCelebrate]);

  // task handlers
  const handleDrop = useCallback((id, toCol, x, y) => {
    const task = board?.tasks[id];
    if (!task || task.column === toCol) return;
    const wasDone = task.column === "done";
    api("moveTask", { id, column: toCol }, (b) => moveTask(b, id, toCol));
    if (toCol === "done" && !wasDone) smallCelebrate(x, y);
  }, [board, api, smallCelebrate]);

  const handleToggleCheck = useCallback((taskId, itemId) => {
    const task = board?.tasks[taskId];
    if (task) {
      const after = (task.checklist || []).map((c) => (c.id === itemId ? { ...c, done: !c.done } : c));
      const allBefore = task.checklist.length > 0 && task.checklist.every((c) => c.done);
      const allAfter = after.length > 0 && after.every((c) => c.done);
      if (allAfter && !allBefore) smallCelebrate();
    }
    api("toggleChecklistItem", { taskId, itemId }, (b) => toggleChecklistItem(b, taskId, itemId));
  }, [board, api, smallCelebrate]);
  const handleAddCheck = (taskId, text) => api("addChecklistItem", { taskId, text }, (b) => addChecklistItem(b, taskId, text));
  const handleUpdateCheck = (taskId, itemId, text) => api("updateChecklistItem", { taskId, itemId, text }, (b) => updateChecklistItem(b, taskId, itemId, text));
  const handleDelCheck = (taskId, itemId) => api("deleteChecklistItem", { taskId, itemId }, (b) => deleteChecklistItem(b, taskId, itemId));
  const handleAddLink = (taskId, label, url) => api("addLink", { taskId, label, url }, (b) => addLink(b, taskId, label, url));
  const handleDelLink = (taskId, linkId) => api("deleteLink", { taskId, linkId }, (b) => deleteLink(b, taskId, linkId));
  const handleUpdateTask = (id, patch) => api("updateTask", { id, patch }, (b) => updateTask(b, id, patch));
  const handleMoveTo = (id, column) => api("moveTask", { id, column }, (b) => moveTask(b, id, column));
  const handleDelete = (id) => { api("deleteTask", { id }, (b) => deleteTask(b, id)); setOpenTaskId(null); };
  const handleCreate = (payload) => { api("addTask", payload, (b) => addTask(b, payload)); setAddingTo(null); };

  const handleAddColumn = useCallback((title) => api("addColumn", { title }, (b) => addColumn(b, title)), [api]);
  const handleRenameColumn = useCallback((id, title) => api("renameColumn", { id, title }, (b) => renameColumn(b, id, title)), [api]);
  const handleReorderColumn = useCallback((draggedId, targetId) => {
    const toIndex = (board?.columns || []).findIndex((c) => c.id === targetId);
    if (toIndex === -1 || draggedId === targetId) return;
    api("reorderColumn", { id: draggedId, toIndex }, (b) => reorderColumn(b, draggedId, toIndex));
  }, [board, api]);
  const handleDeleteColumn = useCallback((id) => api("deleteColumn", { id }, (b) => deleteColumn(b, id)), [api]);

  const dragAutoScrollRef = useRef(null);
  const handleCardDragStart = useCallback(() => {
    if (dragAutoScrollRef.current) return;
    const EDGE = 90, MAX_SPEED = 22;
    const onWindowDragOver = (e) => {
      const y = e.clientY, h = window.innerHeight;
      if (y < EDGE) window.scrollBy(0, -MAX_SPEED * (1 - y / EDGE));
      else if (y > h - EDGE) window.scrollBy(0, MAX_SPEED * (1 - (h - y) / EDGE));
    };
    // capture phase: card-slot drag handlers call stopPropagation, so a bubble
    // listener would never see the event while dragging over a card.
    window.addEventListener("dragover", onWindowDragOver, true);
    dragAutoScrollRef.current = onWindowDragOver;
  }, []);
  const handleCardDragEnd = useCallback(() => {
    if (dragAutoScrollRef.current) {
      window.removeEventListener("dragover", dragAutoScrollRef.current, true);
      dragAutoScrollRef.current = null;
    }
  }, []);

  // payments + events
  const payUpdate = (id, patch) => api("updatePayment", { id, patch });
  const payDelete = (id) => api("deletePayment", { id });
  const payAdd = (p) => api("addPayment", p);
  const evDelete = (id) => api("deleteEvent", { id });
  const evAdd = (e) => api("addEvent", e);

  function submitKey(e) {
    e.preventDefault();
    const k = keyInput.trim();
    if (!k) return;
    window.localStorage.setItem(KEY_STORAGE, k);
    if (k === boardKey) fetchBoard(k); else setBoardKey(k);
  }

  if (needKey) {
    return (
      <>
        <Backgrounds view="board" />
        <div className="gate">
          <div className="modal">
            <div className="title">⚡ Power-Up Board</div>
            <p className="muted" style={{ fontSize: 13 }}>Enter your board access key to continue.</p>
            <form onSubmit={submitKey}>
              <input className="input" type="password" autoFocus placeholder="Access key" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
              <div className="modal-actions"><button className="btn btn-primary" type="submit">Enter</button></div>
            </form>
            {error && <div className="error">{error}</div>}
          </div>
        </div>
      </>
    );
  }

  const ratio = stats?.ratio || 0;
  const tier = tierFor(completedUnits(stats), ratio);
  const openTask = openTaskId && board ? board.tasks[openTaskId] : null;

  return (
    <>
    <Backgrounds view={view} />
    <div className={`app view-${view}`}>

      {flash && <div className="flash" />}
      {toast && <div className="toast" key={toast.id}>{toast.big}<small>{toast.sub}</small></div>}

      <div className="hero">
        <Fighter tier={tier} />
        <div className="hero-meta">
          <div className="title">⚡ Power-Up Board</div>
          <div className="tier-name">{TIERS[tier].name}</div>
          <div className="powerline">
            <div className="power-label"><span>Power Level</span><span className="power-num">{displayPower.toLocaleString()}</span></div>
            <div className="bar"><div className="bar-fill" style={{ width: `${Math.round(ratio * 100)}%` }} /></div>
          </div>
          {stats && (
            <div className="stat-row">
              <span><b>{stats.doneCards}</b>/{stats.total} cards</span>
              <span><b>{stats.checkDone}</b>/{stats.checkTotal} checklist</span>
              <span><b>{Math.round(ratio * 100)}%</b> charged</span>
            </div>
          )}
        </div>
      </div>

      <div className="nav">
        <div className="nav-views">
          {VIEWS.map((v) => (
            <button key={v.id} className={`nav-tab ${view === v.id ? "on" : ""}`} onClick={() => setView(v.id)}>
              {v.label}
              {v.id === "payments" && stats?.payments ? <span className="nav-badge">{stats.payments}</span> : null}
              {v.id === "calendar" && stats?.events ? <span className="nav-badge">{stats.events}</span> : null}
              {v.id === "archive" && (tasksByColumn["archive"] || []).length > 0 ? <span className="nav-badge nav-badge-muted">{(tasksByColumn["archive"] || []).length}</span> : null}
            </button>
          ))}
        </div>
        <div className="nav-links">
          <a className="nav-link" href="https://script.google.com/a/macros/bookmyshow.com/s/AKfycbwQBgMFLV6Nhi0bAGyD2WKXdTlvJs67VVm4xDF9ZAIhutN5HTbRxN3yWtveSVCMbiR0pw/exec" target="_blank" rel="noreferrer">Dashboard</a>
          <a className="nav-link" href="https://docs.google.com/spreadsheets/d/1V7dCI0-5ZqW0lRd42UDW_xfo5sNQO8UwyYlTffOlyPg/edit?usp=sharing" target="_blank" rel="noreferrer">2026-27</a>
          <a className="nav-link" href="https://docs.google.com/spreadsheets/d/1Y7NmUMgWrGi2rVGoixkkNkQKMuhT1F-OZERol1UTfrE/edit?usp=sharing" target="_blank" rel="noreferrer">2025-26</a>
          <a className="nav-link" href="https://docs.google.com/spreadsheets/d/11uMHinDJU-PJcGyPksUMWvmvnzF4k9G3ZUu0kqAjcm4/edit?gid=987424332#gid=987424332" target="_blank" rel="noreferrer">Sales Target</a>
        </div>
      </div>

      {loading && !board ? (
        <p className="muted">Charging ki…</p>
      ) : !board ? (
        <p className="error">{error}</p>
      ) : view === "board" ? (
        <>
          <div className="board-toolbar">
            <div className="toolbar-group">
              {[null, "high", "med", "low"].map((p) => (
                <button
                  key={p ?? "all"}
                  className={`toolbar-pill${filterPriority === p ? " on" : ""}${p ? ` tp-${p}` : ""}`}
                  onClick={() => setFilterPriority(filterPriority === p ? null : p)}
                >
                  {p === null ? "All" : p === "med" ? "Medium" : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <button
              className={`toolbar-pill${sortByPriority ? " on tp-sort" : ""}`}
              onClick={() => setSortByPriority(!sortByPriority)}
            >↕ Sort by priority</button>
            <ZoomControl zoom={boardZoomState} onChange={setBoardZoom} />
          </div>
          <div className="board" style={{ zoom: boardZoomState }}>
            {board.columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                tasks={displayTasksByColumn[col.id] || []}
                onDropTask={handleDrop}
                onOpen={setOpenTaskId}
                onToggleCheck={handleToggleCheck}
                onAddCard={setAddingTo}
                onMoveDone={handleMoveDone}
                onArchive={handleArchive}
                onArchiveAll={handleArchiveAll}
                onRevert={handleRevert}
                onReorder={handleReorder}
                posButtons={!sortByPriority}
                onDragStart={handleCardDragStart}
                onDragEnd={handleCardDragEnd}
                onRenameColumn={handleRenameColumn}
                onDeleteColumn={handleDeleteColumn}
                onReorderColumn={handleReorderColumn}
                deletable={col.id !== "todo" && col.id !== "done"}
              />
            ))}
            <AddColumn onAdd={handleAddColumn} />
          </div>
        </>
      ) : view === "payments" ? (
        <PaymentsView payments={board.payments} onUpdate={payUpdate} onDelete={payDelete} onAdd={payAdd} zoom={paymentsZoomState} onZoomChange={setPaymentsZoom} />
      ) : view === "archive" ? (
        <div className="archive-view">
          <div className="archive-head">
            <h2>Archive</h2>
            {(tasksByColumn["archive"] || []).length > 0 && (
              <span className="muted">{(tasksByColumn["archive"] || []).length} card{(tasksByColumn["archive"] || []).length !== 1 ? "s" : ""}</span>
            )}
          </div>
          {(tasksByColumn["archive"] || []).length === 0 ? (
            <p className="muted archive-empty">No archived cards yet. Hit "↓ Archive" on any done card to tidy up.</p>
          ) : (
            <div className="archive-grid">
              {(tasksByColumn["archive"] || []).map((t) => (
                <Card
                  key={t.id}
                  task={t}
                  onOpen={setOpenTaskId}
                  onToggleCheck={handleToggleCheck}
                  onRestore={handleRestore}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <CalendarView events={board.events} onDelete={evDelete} onAdd={evAdd} />
      )}

      {addingTo && (
        <TaskModal column={addingTo} onClose={() => setAddingTo(null)} onCreate={handleCreate} />
      )}
      {openTask && (
        <CardModal
          task={openTask}
          columns={board.columns}
          onClose={() => setOpenTaskId(null)}
          onUpdate={handleUpdateTask}
          onMove={handleMoveTo}
          onDelete={handleDelete}
          onToggleCheck={handleToggleCheck}
          onAddCheck={handleAddCheck}
          onUpdateCheck={handleUpdateCheck}
          onDelCheck={handleDelCheck}
          onAddLink={handleAddLink}
          onDelLink={handleDelLink}
        />
      )}
    </div>
    </>
  );
}
