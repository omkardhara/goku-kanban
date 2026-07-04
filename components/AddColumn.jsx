"use client";

import { useState } from "react";

export default function AddColumn({ onAdd }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");

  function submit(e) {
    e.preventDefault();
    const v = title.trim();
    if (v) onAdd(v);
    setTitle("");
    setEditing(false);
  }

  if (!editing) {
    return (
      <button className="add-column-tile" onClick={() => setEditing(true)}>+ Column</button>
    );
  }

  return (
    <form className="add-column-tile add-column-form" onSubmit={submit}>
      <input
        className="input"
        autoFocus
        placeholder="Column name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => { if (!title.trim()) setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Escape") { setTitle(""); setEditing(false); } }}
      />
      <div className="add-column-actions">
        <button type="submit" className="btn btn-primary">Add</button>
        <button type="button" className="btn btn-ghost" onClick={() => { setTitle(""); setEditing(false); }}>Cancel</button>
      </div>
    </form>
  );
}
