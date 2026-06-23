"use client";

import { TIERS } from "../lib/tiers";

// A stylized, original "Saiyan-style" power-up fighter rendered in SVG.
// Hair colour, aura intensity and lightning are driven by `tier`.
export default function Fighter({ tier = 0 }) {
  const t = TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))];
  const showAura = t.auraOp > 0;

  return (
    <div className="fighter-wrap">
      <svg className="fighter-svg" viewBox="0 0 132 150" aria-hidden="true">
        <defs>
          <radialGradient id="auraGrad" cx="50%" cy="58%" r="55%">
            <stop offset="0%" stopColor={t.aura} stopOpacity="0.9" />
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
        </defs>

        {/* aura */}
        {showAura && (
          <g className="aura" style={{ opacity: t.auraOp }}>
            <path
              d="M66 6 C 90 30, 116 44, 104 84 C 122 96, 110 132, 66 142 C 22 132, 10 96, 28 84 C 16 44, 42 30, 66 6 Z"
              fill="url(#auraGrad)"
            />
          </g>
        )}

        <g className="float">
          {/* back hair spikes */}
          <path
            d="M66 20 L52 -2 L58 22 L40 6 L50 26 L30 20 L48 34 L82 34 L84 20 L102 20 L84 26 L94 6 L76 22 L82 -2 Z"
            fill="url(#hairGrad)"
            opacity="0.9"
          />

          {/* torso (gi) */}
          <path
            d="M46 78 C 46 70, 86 70, 86 78 L92 118 C 92 126, 40 126, 40 118 Z"
            fill="url(#giGrad)"
            stroke="#7a2f00"
            strokeWidth="1.2"
          />
          {/* blue undershirt V */}
          <path d="M58 73 L66 92 L74 73 Z" fill="#1670c8" />
          {/* belt */}
          <rect x="42" y="112" width="48" height="9" rx="3" fill="#1670c8" />

          {/* arms */}
          <path d="M46 80 C 30 86, 26 104, 30 116 L40 112 C 38 102, 42 90, 50 88 Z" fill="url(#giGrad)" stroke="#7a2f00" strokeWidth="1" />
          <path d="M86 80 C 102 86, 106 104, 102 116 L92 112 C 94 102, 90 90, 82 88 Z" fill="url(#giGrad)" stroke="#7a2f00" strokeWidth="1" />
          {/* fists + wristbands */}
          <circle cx="30" cy="118" r="7" fill="#f2c79a" />
          <circle cx="102" cy="118" r="7" fill="#f2c79a" />
          <rect x="24" y="110" width="13" height="5" rx="2" fill="#1670c8" />
          <rect x="95" y="110" width="13" height="5" rx="2" fill="#1670c8" />

          {/* neck + head */}
          <rect x="60" y="64" width="12" height="10" rx="3" fill="#f2c79a" />
          <ellipse cx="66" cy="52" rx="17" ry="18" fill="#f7d3a8" />
          {/* eyes */}
          <ellipse cx="59" cy="52" rx="2.4" ry="3.2" fill="#23314a" />
          <ellipse cx="73" cy="52" rx="2.4" ry="3.2" fill="#23314a" />
          {/* determined brow */}
          <path d="M55 46 L63 48 M77 46 L69 48" stroke="#5a3a1d" strokeWidth="2" strokeLinecap="round" />
          {/* mouth */}
          <path d="M61 60 Q 66 63 71 60" stroke="#7a4a26" strokeWidth="1.6" fill="none" strokeLinecap="round" />

          {/* front spiky hair */}
          <path
            d="M48 50
               C 44 32, 50 22, 56 30
               L54 14 L62 28 L64 10 L70 28 L72 12 L78 30
               C 84 22, 90 34, 84 50
               C 80 40, 74 38, 66 40
               C 58 38, 52 40, 48 50 Z"
            fill="url(#hairGrad)"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="0.6"
          />

          {/* lightning */}
          {t.lightning && (
            <g className="bolt" stroke={t.aura} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M24 60 L18 74 L26 72 L20 90" />
              <path d="M108 58 L114 72 L106 70 L112 88" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
