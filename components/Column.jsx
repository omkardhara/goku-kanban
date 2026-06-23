"use client";

import { useState } from "react";
import Card from "./Card";

export default function Column({
  column,
  tasks,
  onDropTask,
  onOpen,
  onToggleCheck,
  onAddCard,
  onDragStart,
  onDragEnd,
}) {
  const [over, setOver] = useState(false);
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
        if (!e.currentTarget.contains(e.relatedTarget)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropTask(id, column.id, e.clientX, e.clientY);
      }}
    >
      <div className="col-head">
        <span className="col-title">{column.title}</span>
        <span className="col-count">{tasks.length}</span>
      </div>

      {tasks.map((t) => (
        <Card
          key={t.id}
          task={t}
          onOpen={onOpen}
          onToggleCheck={onToggleCheck}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}

      <button className="add-card-btn" onClick={() => onAddCard(column.id)}>+ Add a card</button>
    </div>
  );
}
