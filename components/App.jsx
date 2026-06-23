"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Column from "./Column";
import Fighter from "./Fighter";
import TaskModal from "./TaskModal";
import CardModal from "./CardModal";
import PaymentsView from "./PaymentsView";
import CalendarView from "./CalendarView";
import Backgrounds from "./Backgrounds";
import { TIERS, tierFor, powerLevel } from "../lib/tiers";
import { burstAt, shakeScreen } from "../lib/fx";

const KEY_STORAGE = "gokuBoardKey";
const VIEWS = [
  { id: "board", label: "Board" },
  { id: "payments", label: "Payments" },
  { id: "calendar", label: "Calendar" },
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

  const prevTier = useRef(0);
  const prevPower = useRef(0);
  const initialised = useRef(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(KEY_STORAGE) : "";
    setBoardKey(saved || "");
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
  function smallCelebrate(x, y) {
    shakeScreen();
    burstAt(x ?? window.innerWidth / 2, y ?? window.innerHeight / 3, { count: 24 });
  }

  const applyBoard = useCallback((data) => {
    setBoard(data);
    setStats(data.stats);
    const newTier = tierFor(data.stats.ratio);
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

  const api = useCallback(
    async (action, payload) => {
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
        return null;
      }
    },
    [boardKey, applyBoard]
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

  function tasksForColumn(colId) {
    if (!board) return [];
    return Object.values(board.tasks)
      .filter((t) => t.column === colId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // task handlers
  function handleDrop(id, toCol, x, y) {
    const task = board?.tasks[id];
    if (!task || task.column === toCol) return;
    const wasDone = task.column === "done";
    api("moveTask", { id, column: toCol });
    if (toCol === "done" && !wasDone) smallCelebrate(x, y);
  }
  function handleToggleCheck(taskId, itemId) {
    const task = board?.tasks[taskId];
    if (task) {
      const after = (task.checklist || []).map((c) => (c.id === itemId ? { ...c, done: !c.done } : c));
      const allBefore = task.checklist.length > 0 && task.checklist.every((c) => c.done);
      const allAfter = after.length > 0 && after.every((c) => c.done);
      if (allAfter && !allBefore) smallCelebrate();
    }
    api("toggleChecklistItem", { taskId, itemId });
  }
  const handleAddCheck = (taskId, text) => api("addChecklistItem", { taskId, text });
  const handleDelCheck = (taskId, itemId) => api("deleteChecklistItem", { taskId, itemId });
  const handleAddLink = (taskId, label, url) => api("addLink", { taskId, label, url });
  const handleDelLink = (taskId, linkId) => api("deleteLink", { taskId, linkId });
  const handleUpdateTask = (id, patch) => api("updateTask", { id, patch });
  const handleMoveTo = (id, column) => api("moveTask", { id, column });
  const handleDelete = (id) => { api("deleteTask", { id }); setOpenTaskId(null); };
  const handleCreate = (payload) => { api("addTask", payload); setAddingTo(null); };

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
  const tier = tierFor(ratio);
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
        {VIEWS.map((v) => (
          <button key={v.id} className={`nav-tab ${view === v.id ? "on" : ""}`} onClick={() => setView(v.id)}>
            {v.label}
            {v.id === "payments" && stats?.payments ? <span className="nav-badge">{stats.payments}</span> : null}
            {v.id === "calendar" && stats?.events ? <span className="nav-badge">{stats.events}</span> : null}
          </button>
        ))}
      </div>

      {loading && !board ? (
        <p className="muted">Charging ki…</p>
      ) : !board ? (
        <p className="error">{error}</p>
      ) : view === "board" ? (
        <div className="board">
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={tasksForColumn(col.id)}
              onDropTask={handleDrop}
              onOpen={setOpenTaskId}
              onToggleCheck={handleToggleCheck}
              onAddCard={(colId) => setAddingTo(colId)}
              onMoveDone={(id, x, y) => { api("moveTask", { id, column: "done" }); smallCelebrate(x, y); }}
            />
          ))}
        </div>
      ) : view === "payments" ? (
        <PaymentsView payments={board.payments} onUpdate={payUpdate} onDelete={payDelete} onAdd={payAdd} />
      ) : (
        <CalendarView events={board.events} onDelete={evDelete} onAdd={evAdd} />
      )}

      {addingTo && (
        <TaskModal column={addingTo} onClose={() => setAddingTo(null)} onCreate={handleCreate} />
      )}
      {openTask && (
        <CardModal
          task={openTask}
          onClose={() => setOpenTaskId(null)}
          onUpdate={handleUpdateTask}
          onMove={handleMoveTo}
          onDelete={handleDelete}
          onToggleCheck={handleToggleCheck}
          onAddCheck={handleAddCheck}
          onDelCheck={handleDelCheck}
          onAddLink={handleAddLink}
          onDelLink={handleDelLink}
        />
      )}
    </div>
    </>
  );
}
