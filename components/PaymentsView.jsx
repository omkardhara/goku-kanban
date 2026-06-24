"use client";

import { useState } from "react";

const STATUSES = [
  { id: "pending", label: "Pending" },
  { id: "chasing", label: "Chasing" },
  { id: "closed", label: "Closed" },
];

function PaymentCard({ p, onUpdate, onDelete }) {
  return (
    <div className={`pay-card status-${p.status}`}>
      <div className="pay-head">
        <span className="pay-brand">{p.brand}</span>
        <button className="mini-del" onClick={() => { if (window.confirm(`Delete "${p.brand}"?`)) onDelete(p.id); }} aria-label="Remove">×</button>
      </div>
      {p.ptype && <div className="pay-type">{p.ptype}</div>}
      {p.action && <div className="pay-action">{p.action}</div>}
      <div className="pay-meta">
        {p.lastChased && <span>Last chased: {p.lastChased}</span>}
        {p.owner && <span>Owner: {p.owner}</span>}
      </div>
      <select
        className="select pay-status"
        value={p.status}
        onChange={(e) => onUpdate(p.id, { status: e.target.value })}
      >
        {STATUSES.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function PaymentsView({ payments = [], onUpdate, onDelete, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [brand, setBrand] = useState("");
  const [ptype, setPtype] = useState("");

  const active = payments.filter((p) => p.status !== "closed");
  const closed = payments.filter((p) => p.status === "closed");

  function submit(e) {
    e.preventDefault();
    if (!brand.trim()) return;
    onAdd({ brand: brand.trim(), ptype: ptype.trim(), status: "pending" });
    setBrand("");
    setPtype("");
    setAdding(false);
  }

  return (
    <div className="view-pane">
      <div className="view-head">
        <h2>Payments & chase items</h2>
        <button className="btn btn-primary" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "+ Add payment"}
        </button>
      </div>

      {adding && (
        <form className="pay-add" onSubmit={submit}>
          <input className="input" placeholder="Brand / party" value={brand} onChange={(e) => setBrand(e.target.value)} autoFocus />
          <input className="input" placeholder="What you're waiting on" value={ptype} onChange={(e) => setPtype(e.target.value)} />
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
      )}

      {active.length === 0 && closed.length === 0 ? (
        <p className="muted">No payment items yet. They arrive with your weekly run, or add one above.</p>
      ) : (
        <>
          <div className="pay-grid">
            {active.map((p) => (
              <PaymentCard key={p.id} p={p} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
          {closed.length > 0 && (
            <>
              <h3 className="closed-head">Closed ({closed.length})</h3>
              <div className="pay-grid">
                {closed.map((p) => (
                  <PaymentCard key={p.id} p={p} onUpdate={onUpdate} onDelete={onDelete} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
