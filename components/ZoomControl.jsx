"use client";

export default function ZoomControl({ zoom, onChange, min = 0.6, max = 1.4, step = 0.1 }) {
  function nudge(dir) {
    const next = Math.round((zoom + dir * step) * 100) / 100;
    onChange(Math.min(max, Math.max(min, next)));
  }

  return (
    <div className="zoom-control">
      <button className="zoom-btn" title="Zoom out" onClick={() => nudge(-1)} disabled={zoom <= min}>−</button>
      <button className="zoom-pct" title="Reset zoom" onClick={() => onChange(1)}>{Math.round(zoom * 100)}%</button>
      <button className="zoom-btn" title="Zoom in" onClick={() => nudge(1)} disabled={zoom >= max}>+</button>
    </div>
  );
}
