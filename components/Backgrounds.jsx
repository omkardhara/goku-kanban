"use client";

// Original, non-copyrighted painted-style backgrounds, one per view.
// If you drop your own image at /public/backgrounds/<view>.jpg it will be used
// instead (set via CSS in globals.css). These SVG scenes are the safe default.

function Namek() {
  return (
    <svg className="bg-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="nSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7b6cc9" />
          <stop offset="55%" stopColor="#b59bd6" />
          <stop offset="100%" stopColor="#e7c9d8" />
        </linearGradient>
        <linearGradient id="nGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8ed36a" />
          <stop offset="100%" stopColor="#4f9e3f" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#nSky)" />
      <circle cx="380" cy="150" r="70" fill="#eef0ff" opacity="0.85" />
      <circle cx="1080" cy="110" r="95" fill="#e9ebff" opacity="0.9" />
      <circle cx="760" cy="220" r="44" fill="#f3f1ff" opacity="0.8" />
      <circle cx="200" cy="300" r="32" fill="#f3f1ff" opacity="0.7" />
      <path d="M0 470 Q 360 410 720 460 T 1440 450 V 560 H0 Z" fill="#9fb0e0" opacity="0.5" />
      <rect x="180" y="360" width="150" height="170" rx="14" fill="#c8a87e" />
      <rect x="980" y="320" width="200" height="220" rx="16" fill="#c39e72" />
      <rect x="980" y="320" width="200" height="34" rx="14" fill="#8ed36a" />
      <rect x="180" y="360" width="150" height="26" rx="12" fill="#8ed36a" />
      <path d="M0 520 Q 720 470 1440 520 V 900 H0 Z" fill="url(#nGround)" />
      <ellipse cx="300" cy="700" rx="46" ry="22" fill="#c8a87e" opacity="0.9" />
      <ellipse cx="1180" cy="760" rx="56" ry="26" fill="#c39e72" opacity="0.9" />
    </svg>
  );
}

function City() {
  return (
    <svg className="bg-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="cSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f8fe0" />
          <stop offset="100%" stopColor="#9fd4f5" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#cSky)" />
      <ellipse cx="300" cy="160" rx="120" ry="40" fill="#ffffff" opacity="0.7" />
      <ellipse cx="1150" cy="120" rx="150" ry="46" fill="#ffffff" opacity="0.6" />
      <rect x="0" y="620" width="1440" height="280" fill="#7ec85a" />
      {/* domes */}
      <path d="M560 620 a 260 260 0 0 1 520 0 Z" fill="#e9d49a" />
      <path d="M560 620 a 260 260 0 0 1 520 0 Z" fill="none" stroke="#cdb878" strokeWidth="3" />
      <rect x="700" y="470" width="240" height="20" rx="8" fill="#2f6fb0" opacity="0.8" />
      <rect x="660" y="540" width="320" height="20" rx="8" fill="#2f6fb0" opacity="0.8" />
      <path d="M180 620 a 150 150 0 0 1 300 0 Z" fill="#e3cd92" />
      {/* round towers */}
      <rect x="120" y="430" width="16" height="190" fill="#bcd7ea" />
      <circle cx="128" cy="420" r="34" fill="#cfe6f4" />
      <rect x="1300" y="380" width="18" height="240" fill="#bcd7ea" />
      <circle cx="1309" cy="368" r="40" fill="#cfe6f4" />
      {/* path */}
      <path d="M760 900 L820 640 L900 640 L1000 900 Z" fill="#d9dde0" opacity="0.85" />
    </svg>
  );
}

function Island() {
  return (
    <svg className="bg-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="iSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb46b" />
          <stop offset="45%" stopColor="#ffd9a0" />
          <stop offset="100%" stopColor="#cfeaf2" />
        </linearGradient>
        <linearGradient id="iSea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2bb0c9" />
          <stop offset="100%" stopColor="#1b6f93" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#iSky)" />
      <circle cx="1120" cy="200" r="120" fill="#ffe9c2" opacity="0.7" />
      <rect y="520" width="1440" height="380" fill="url(#iSea)" />
      <path d="M0 540 Q 360 520 720 540 T 1440 535 V 560 H0 Z" fill="#cfeaf2" opacity="0.4" />
      {/* island */}
      <ellipse cx="720" cy="640" rx="300" ry="70" fill="#e7d49a" />
      <rect x="650" y="540" width="140" height="100" rx="10" fill="#f0a3a0" />
      <path d="M645 540 h150 l-20 -34 h-110 Z" fill="#d9534f" />
      {/* palms */}
      <rect x="560" y="560" width="10" height="80" fill="#9b6b3a" />
      <path d="M565 560 q -40 -20 -70 -6 q 40 -2 70 12 q 40 -22 76 -8 q -36 -2 -76 2" fill="#3f9e57" />
      {/* flying light streak */}
      <path d="M120 240 Q 520 180 980 320" fill="none" stroke="#ffe79a" strokeWidth="8" opacity="0.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Backgrounds({ view }) {
  let scene = <Namek />;
  if (view === "payments") scene = <City />;
  else if (view === "calendar") scene = <Island />;
  return (
    <div className={`bg bg-${view}`} aria-hidden="true">
      {scene}
      <div className="bg-scrim" />
    </div>
  );
}
