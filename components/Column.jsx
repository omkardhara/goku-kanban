"use client";

import { memo, useState } from "react";
import Card from "./Card";

const COLUMN_DND_TYPE = "application/x-column-id";

function Column({
  column,
  tasks,
  onDropTask,
  onNestCard,
  onOpen,
  onToggleCheck,
  onAddCard,
  onMoveDone,
  onArchive,
  onArchiveAll,
  onRevert,
  onReorder,
  posButtons,
  onDragStart,
  onDragEnd,
  onRenameColumn,
  onDeleteColumn,
  onReorderColumn,
  deletable,
}) {
  const [over, setOver] = useState(false);
  const [colOver, setColOver] = useState(false);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragPos, setDragPos] = useState("after");
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(column.title);
  const isDone = column.id === "done";

  function commitRename() {
    setEditing(false);
    const v = draftTitle.trim();
    if (v && v !== column.title) onRenameColumn(column.id, v);
    else setDraftTitle(column.title);
  }

  return (
    <div
      className={`column ${over ? "dragover" : ""} ${colOver ? "column-dragover" : ""} ${isDone ? "col-done" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes(COLUMN_DND_TYPE)) {
          e.dataTransfer.dropEffect = "move";
          if (!colOver) setColOver(true);
          return;
        }
        e.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOver(false);
          setColOver(false);
          setDragOverId(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        const draggedColId = e.dataTransfer.getData(COLUMN_DND_TYPE);
        if (draggedColId) {
          setColOver(false);
          if (draggedColId !== column.id) onReorderColumn(draggedColId, column.id);
          return;
        }
        setOver(false);
        setDragOverId(null);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropTask(id, column.id, e.clientX, e.clientY);
      }}
    >
      <div className="col-head">
        <span
          className="col-drag-handle"
          draggable
          title="Drag to reorder columns"
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData(COLUMN_DND_TYPE, column.id);
            e.dataTransfer.effectAllowed = "move";
          }}
        >⠿</span>
        {editing ? (
          <input
            className="col-title-input"
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { setDraftTitle(column.title); setEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="col-title" title="Double-click to rename" onDoubleClick={() => setEditing(true)}>
            {column.title}
          </span>
        )}
        <span className="col-count">{tasks.length}</span>
        {isDone && tasks.length > 0 && (
          <button
            className="col-archive-all"
            title="Archive all done cards"
            onClick={() => {
              if (window.confirm(`Archive all ${tasks.length} done cards?`)) onArchiveAll();
            }}
          >↓ Archive all</button>
        )}
        {deletable && (
          <button
            className="col-del"
            title="Delete column"
            onClick={() => {
              if (window.confirm(`Delete "${column.title}"? Its cards will move to This Week.`)) onDeleteColumn(column.id);
            }}
          >×</button>
        )}
      </div>

      {tasks.map((t, i) => {
        const moveTop  = posButtons && i > 0                ? () => onReorder(t.id, tasks[0].id,     "before", column.id) : null;
        const moveUp   = posButtons && i > 0                ? () => onReorder(t.id, tasks[i-1].id,   "before", column.id) : null;
        const moveDown = posButtons && i < tasks.length - 1 ? () => onReorder(t.id, tasks[i+1].id,   "after",  column.id) : null;
        return (
          <div
            key={t.id}
            className={`card-slot${dragOverId === t.id ? ` insert-${dragPos}` : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientY - rect.top) / rect.height;
              setDragOverId(t.id);
              setDragPos(ratio < 0.3 ? "before" : ratio > 0.7 ? "after" : "nest");
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOver(false);
              const pos = dragPos;
              setDragOverId(null);
              const draggedId = e.dataTransfer.getData("text/plain");
              if (!draggedId || draggedId === t.id) return;
              if (pos === "nest") onNestCard(draggedId, t.id);
              else onReorder(draggedId, t.id, pos, column.id);
            }}
          >
            <Card
              task={t}
              onOpen={onOpen}
              onToggleCheck={onToggleCheck}
              onMoveDone={onMoveDone}
              onArchive={onArchive}
              onRevert={onRevert}
              onMoveTop={moveTop}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          </div>
        );
      })}

      <button className="add-card-btn" onClick={() => onAddCard(column.id)}>+ Add a card</button>
    </div>
  );
}

export default memo(Column);
