"use client";

import { useState } from "react";
import { TIERS } from "../lib/tiers";

// Renders your own image for the current tier (from /public/goku/<tier>.png).
// If that file isn't present, it falls back to a fully-animated original SVG
// fighter so the board always works — no copyrighted art is shipped in the repo.
export default function Fighter({ tier = 0 }) {
  const t = TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))];
  const showAura = t.auraOp > 0;
  const particleCount = Math.min(10, 2 + tier * 2);
  const [failed, setFailed] = useState({});
  const useImg = t.img && !failed[t.img];

  return (
    <div className="fighter-wrap">
      {showAura && (
        <div className="ki-field" aria-hidden="true">
          {Array.from({ length: particleCount }).map((_, i) => (
            <span
              key={i}
              className="ki"
              style={{
                left: `${10 + (i * 80) / particleCount}%`,
                color: t.aura,
                background: t.aura,
                animationDelay: `${(i % 5) * 0.3}s`,
                animationDuration: `${1.1 + (i % 3) * 0.4}s`,
              }}
            />
          ))}
        </div>
      )}

      {useImg ? (
        <img
          className="fighter-img float"
          src={t.img}
          alt={t.name}
          onError={() => setFailed((f) => ({ ...f, [t.img]: true }))}
          style={{ filter: showAura ? `drop-shadow(0 0 14px ${t.aura})` : "none" }}
        />
      ) : (
        <svg className="fighter-svg" viewBox="0 0 132 160" aria-hidden="true">
          <defs>
            <radialGradient id="auraGrad" cx="50%" cy="60%" r="55%">
              <stop offset="0%" stopColor={t.aura} stopOpacity="0.95" />
              <stop offset="55%" stopColor={t.aura} stopOpacity="0.35" />
              <stop offset="100%" stopColor={t.aura} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.hair} />
              <stop offset="100%" stopColor={t.hair2} />
            </linearGradient>
            <linearGradient id="giGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff9b21" />
              <stop offset="100%" stopColor="#e85d00" />
            </linearGradient>
            <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={t.aura} stopOpacity="0.9" />
              <stop offset="100%" stopColor={t.aura} stopOpacity="0" />
            </radialGradient>
          </defs>

          {showAura && <ellipse className="ground-ring" cx="66" cy="150" rx="40" ry="9" fill="url(#glowGrad)" />}

          {showAura && (
            <g style={{ opacity: t.auraOp }}>
              <path className="aura" d="M66 6 C 92 32, 118 46, 104 88 C 124 100, 112 138, 66 150 C 20 138, 8 100, 28 88 C 14 46, 40 32, 66 6 Z" fill="url(#auraGrad)" />
              <path className="flame f1" d="M66 2 L74 26 L66 20 L58 26 Z" fill={t.aura} />
              <path className="flame f2" d="M30 60 L40 80 L30 74 L22 86 Z" fill={t.aura} />
              <path className="flame f3" d="M102 60 L110 86 L102 74 L92 80 Z" fill={t.aura} />
            </g>
          )}

          <g className="float">
            <path d="M66 22 L52 0 L58 24 L40 8 L50 28 L30 22 L48 36 L82 36 L84 22 L102 22 L84 28 L94 8 L76 24 L82 0 Z" fill="url(#hairGrad)" opacity="0.92" />
            <path d="M46 80 C 46 72, 86 72, 86 80 L92 120 C 92 128, 40 128, 40 120 Z" fill="url(#giGrad)" stroke="#7a2f00" strokeWidth="1.2" />
            <path d="M58 75 L66 94 L74 75 Z" fill="#1670c8" />
            <rect x="42" y="114" width="48" height="9" rx="3" fill="#1670c8" />
            <path d="M46 82 C 28 86, 22 104, 28 118 L40 114 C 36 104, 42 92, 50 90 Z" fill="url(#giGrad)" stroke="#7a2f00" strokeWidth="1" />
            <path d="M86 82 C 104 86, 110 104, 104 118 L92 114 C 96 104, 90 92, 82 90 Z" fill="url(#giGrad)" stroke="#7a2f00" strokeWidth="1" />
            <circle cx="28" cy="120" r="7.5" fill="#f2c79a" />
            <circle cx="104" cy="120" r="7.5" fill="#f2c79a" />
            <rect x="21" y="111" width="14" height="6" rx="2" fill="#1670c8" />
            <rect x="97" y="111" width="14" height="6" rx="2" fill="#1670c8" />
            <rect x="60" y="66" width="12" height="10" rx="3" fill="#f2c79a" />
            <ellipse cx="66" cy="54" rx="17" ry="18" fill="#f7d3a8" />
            <ellipse cx="59" cy="54" rx="2.4" ry="3.4" fill="#23314a" />
            <ellipse cx="73" cy="54" rx="2.4" ry="3.4" fill="#23314a" />
            <path d="M55 48 L63 50 M77 48 L69 50" stroke="#5a3a1d" strokeWidth="2" strokeLinecap="round" />
            <path d="M60 62 Q 66 66 72 62" stroke="#7a4a26" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M48 52 C 44 34, 50 24, 56 32 L54 16 L62 30 L64 12 L70 30 L72 14 L78 32 C 84 24, 90 36, 84 52 C 80 42, 74 40, 66 42 C 58 40, 52 42, 48 52 Z" fill="url(#hairGrad)" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
            {t.lightning && (
              <g className="bolt" stroke={t.aura} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 62 L16 76 L24 74 L18 92" />
                <path d="M110 60 L116 74 L108 72 L114 90" />
              </g>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}
