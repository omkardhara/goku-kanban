"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Column from "../components/Column";
import Fighter from "../components/Fighter";
import TaskModal from "../components/TaskModal";
import { TIERS, tierFor, powerLevel } from "../lib/tiers";
import { COLUMNS } from "../lib/board";
import { burstAt, shakeScreen } from "../lib/fx";

const API = "/api/state";

function storedKey() {
  try { return localStorage.getItem("bk") || ""; } catch { return ""; }
}
function saveKey(k) {
  try { localStorage.setItem("bk", k); } catch {}
}

export default function Page() {
  const [key, setKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [flash, setFlash] = useState(false);
  const prevTierRef = useRef(null);

  useEffect(() => {
    const k = storedKey();
    if (k) setKey(k);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(API, { headers: { "x-board-key": key } });
    if (res.status === 401) {
      setError("Wrong key");
      saveKey("");
      setKey("");
      return;
    }
    setBoard(await res.json());
    setError("");
  }, [key]);

  useEffect(() => {
    if (key) load();
  }, [key, load]);

  const post = useCallback(async (action, payload) => {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-board-key": key },
      body: JSON.stringify({ action, payload }),
    });
    if (res.status === 401) { saveKey(""); setKey(""); return null; }
    return res.json();
  }, [key]);

  useEffect(() => {
    if (!board?.stats) return;
    const idx = tierFor(board.stats.ratio);
    if (prevTierRef.current !== null && idx > prevTierRef.current) {
      shakeScreen();
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
      setToast({ title: TIERS[idx].name.toUpperCase(), sub: "POWER UP!" });
      setTimeout(() => setToast(null), 2000);
    }
    prevTierRef.current = idx;
  }, [board?.stats?.ratio]);

  function applyBoard(data) {
    if (data) setBoard(data);
  }

  async function handleDrop(taskId, toColumn, x, y) {
    const data = await post("moveTask", { id: taskId, column: toColumn, order: Date.now() });
    if (data) { burstAt(x, y); applyBoard(data); }
  }
  async function handleToggleCheck(taskId, itemId) {
    applyBoard(await post("toggleChecklistItem", { taskId, itemId }));
  }
  async function handleAddCheck(taskId, text) {
    applyBoard(await post("addChecklistItem", { taskId, text }));
  }
  async function handleDelete(taskId) {
    applyBoard(await post("deleteTask", { id: taskId }));
  }
  async function handleCreate(task) {
    const col = modal;
    setModal(null);
    applyBoard(await post("addTask", { ...task, column: col }));
  }

  function handleKeySubmit(e) {
    e.preventDefault();
    const k = keyInput.trim();
    if (!k) return;
    saveKey(k);
    setKey(k);
  }

  if (!key) {
    return (
      <>
        <div className="stars" />
        <div className="gate">
          <div className="modal">
            <div className="title" style={{ display: "flex", justifyContent: "center" }}>
              Power-Up Board
            </div>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "8px 0 16px" }}>
              Enter your board key to continue.
            </p>
            <form onSubmit={handleKeySubmit}>
              <input
                className="input"
                type="password"
                autoFocus
                placeholder="Board key"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
              />
              {error && <div className="error">{error}</div>}
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 10 }}>
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    );
  }

  if (!board) {
    return (
      <>
        <div className="stars" />
        <div className="gate">
          <div style={{ color: "var(--muted)" }}>Loading…</div>
        </div>
      </>
    );
  }

  const stats = board.stats;
  const tierIdx = tierFor(stats.ratio);
  const tier = TIERS[tierIdx];
  const pl = powerLevel(stats);
  const tasks = Object.values(board.tasks || {});

  return (
    <>
      <div className="stars" />
      {flash && <div className="flash" />}
      {toast && (
        <div className="toast">
          {toast.title}
          <small>{toast.sub}</small>
        </div>
      )}
      <div className="app">
        <div className="topbar">
          <div className="hero">
            <Fighter tier={tierIdx} />
            <div className="hero-meta">
              <div className="title">Power-Up Board</div>
              <div className="tier-name">{tier.name}</div>
              <div className="powerline">
                <div className="power-label">
                  <span>Power Level</span>
                  <span className="power-num">{pl.toLocaleString()}</span>
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${Math.round((stats.ratio || 0) * 100)}%` }} />
                </div>
              </div>
              <div className="stat-row">
                <span><b>{stats.doneCards}</b>/{stats.total} tasks</span>
                {stats.checkTotal > 0 && (
                  <span><b>{stats.checkDone}</b>/{stats.checkTotal} checks</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="board">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={tasks
                .filter((t) => t.column === col.id)
                .sort((a, b) => a.order - b.order)}
              onDropTask={handleDrop}
              onToggleCheck={handleToggleCheck}
              onAddCheck={handleAddCheck}
              onDelete={handleDelete}
              onAddCard={(colId) => setModal(colId)}
              onDragStart={() => {}}
              onDragEnd={() => {}}
            />
          ))}
        </div>
      </div>

      {modal && (
        <TaskModal
          column={modal}
          onClose={() => setModal(null)}
          onCreate={handleCreate}
        />
      )}
    </>
  );
}
