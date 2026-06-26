"use client";

import { memo, useState } from "react";
import Card from "./Card";

function Column({
  column,
  tasks,
  onDropTask,
  onOpen,
  onToggleCheck,
  onAddCard,
  onMoveDone,
  onArchive,
  onRevert,
  onReorder,
  onDragStart,
  onDragEnd,
}) {
  const [over, setOver] = useState(false);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragPos, setDragPos] = useState("after");
  const isDone = column.id === "done";

  return (
    <div
      className={`column ${over ? "dragover" : ""} ${isDone ? "col-done" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOver(false);
          setDragOverId(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        setDragOverId(null);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropTask(id, column.id, e.clientX, e.clientY);
      }}
    >
      <div className="col-head">
        <span className="col-title">{column.title}</span>
        <span className="col-count">{tasks.length}</span>
      </div>

      {tasks.map((t) => (
        <div
          key={t.id}
          className={`card-slot${dragOverId === t.id ? ` insert-${dragPos}` : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setDragOverId(t.id);
            setDragPos(e.clientY < rect.top + rect.height / 2 ? "before" : "after");
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
            if (draggedId && draggedId !== t.id) {
              onReorder(draggedId, t.id, pos, column.id);
            }
          }}
        >
          <Card
            task={t}
            onOpen={onOpen}
            onToggleCheck={onToggleCheck}
            onMoveDone={onMoveDone}
            onArchive={onArchive}
            onRevert={onRevert}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        </div>
      ))}

      <button className="add-card-btn" onClick={() => onAddCard(column.id)}>+ Add a card</button>
    </div>
  );
}

export default memo(Column);
