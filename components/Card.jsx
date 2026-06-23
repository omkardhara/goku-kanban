"use client";

function fmtDue(d) {
  if (!d) return null;
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

export default function Card({ task, onOpen, onToggleCheck, onDragStart, onDragEnd }) {
  const isDone = task.column === "done";
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
      </div>
    </div>
  );
}
