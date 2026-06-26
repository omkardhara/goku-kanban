"use client";

import { memo } from "react";

function fmtDue(d) {
  if (!d) return null;
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

function Card({ task, onOpen, onToggleCheck, onMoveDone, onArchive, onRestore, onRevert, onMoveTop, onMoveUp, onMoveDown, onDragStart, onDragEnd }) {
  const isDone = task.column === "done" || task.column === "archive";
  const isArchived = task.column === "archive";
  const checks = task.checklist || [];
  const links = task.links || [];
  const doneCount = checks.filter((c) => c.done).length;
  const pct = checks.length ? Math.round((doneCount / checks.length) * 100) : 0;
  const overdue = task.dueDate && !isDone && new Date(task.dueDate + "T23:59:59") < new Date();

  return (
    <div
      className={`card ${isDone ? "is-done" : ""} ${task.priority ? "prio-" + task.priority : ""}`}
      draggable
      onClick={() => onOpen(task.id)}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.classList.add("dragging");
        onDragStart && onDragStart(task.id);
      }}
      onDragEnd={(e) => {
        e.currentTarget.classList.remove("dragging");
        onDragEnd && onDragEnd();
      }}
    >
      {(onMoveTop || onMoveUp || onMoveDown) && (
        <div className="card-pos-btns" onClick={(e) => e.stopPropagation()}>
          {onMoveTop && <button className="card-pos-btn" title="Move to top" onClick={onMoveTop}>⇈</button>}
          {onMoveUp   && <button className="card-pos-btn" title="Move up"    onClick={onMoveUp}>↑</button>}
          {onMoveDown && <button className="card-pos-btn" title="Move down"  onClick={onMoveDown}>↓</button>}
        </div>
      )}
      <div className="card-title">{task.title}</div>

      {task.flags && task.flags.length > 0 && (
        <div className="flags">
          {task.flags.map((f) => (
            <span key={f} className={`flag ${f}`}>{f}</span>
          ))}
        </div>
      )}

      {checks.length > 0 && (
        <>
          <div className="checklist" onClick={(e) => e.stopPropagation()}>
            {checks.map((c) => (
              <label key={c.id} className={`check ${c.done ? "done" : ""}`}>
                <input type="checkbox" checked={c.done} onChange={() => onToggleCheck(task.id, c.id)} />
                <span>{c.text}</span>
              </label>
            ))}
          </div>
          <div className="check-progress"><div style={{ width: `${pct}%` }} /></div>
        </>
      )}

      <div className="card-meta">
        {task.dueDate && (
          <span className={`due ${overdue ? "overdue" : ""}`}>{overdue ? "⚑ " : "📅 "}{fmtDue(task.dueDate)}</span>
        )}
        {checks.length > 0 && <span>✓ {doneCount}/{checks.length}</span>}
        {links.length > 0 && <span>🔗 {links.length}</span>}
        {task.notes && <span title="Has a description">≡</span>}
        {task.week && <span className="week-tag">{task.week}</span>}
        {!isDone && (
          <button
            className="card-done-btn"
            title="Mark as done"
            onClick={(e) => { e.stopPropagation(); onMoveDone && onMoveDone(task.id, e.clientX, e.clientY); }}
          >✓ Done</button>
        )}
        {task.column === "done" && onRevert && (
          <button
            className="card-revert-btn"
            title="Move back to This Week"
            onClick={(e) => { e.stopPropagation(); onRevert(task.id); }}
          >↩ Week</button>
        )}
        {task.column === "done" && onArchive && (
          <button
            className="card-archive-btn"
            title="Move to archive"
            onClick={(e) => { e.stopPropagation(); onArchive(task.id); }}
          >↓ Archive</button>
        )}
        {isArchived && onRestore && (
          <button
            className="card-restore-btn"
            title="Restore to Done"
            onClick={(e) => { e.stopPropagation(); onRestore(task.id); }}
          >↩ Restore</button>
        )}
      </div>
    </div>
  );
}

export default memo(Card);
