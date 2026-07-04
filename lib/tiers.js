// Power tiers driven by a fixed number of completed tasks per evolution,
// not a percentage of the (ever-growing) backlog — otherwise later tiers
// keep getting further away as more tasks pile onto the board.
// `img` points at an optional image you place in /public/goku/. If the file is
// missing, the Fighter falls back to the original animated SVG (colours below).
// This keeps any copyrighted artwork OUT of the repo — you supply your own files.

export const TASKS_PER_TIER = 4;

export const TIERS = [
  { key: "base",    name: "Base Form",        img: "/goku/base.png",     hair: "#1a1a22", hair2: "#3a3a48", aura: "#7fd3ff", auraOp: 0.0,  lightning: false, threshold: 0 * TASKS_PER_TIER },
  { key: "kaioken", name: "Kaioken",          img: "/goku/kaioken.png",  hair: "#241a16", hair2: "#4a2f22", aura: "#ff3b30", auraOp: 0.55, lightning: false, threshold: 1 * TASKS_PER_TIER },
  { key: "ssj2",    name: "Super Saiyan 2",   img: "/goku/ssj2.png",     hair: "#ffe24f", hair2: "#ffbe26", aura: "#ffe066", auraOp: 0.9,  lightning: true,  threshold: 2 * TASKS_PER_TIER },
  { key: "blue",    name: "Super Saiyan Blue",img: "/goku/blue.png",     hair: "#2fb6ff", hair2: "#0a84ff", aura: "#39c4ff", auraOp: 1.0,  lightning: false, threshold: 3 * TASKS_PER_TIER },
  { key: "ultra",   name: "Ultra Instinct",   img: "/goku/ultra.png",    hair: "#dbe6ff", hair2: "#9aa8d8", aura: "#8a7bff", auraOp: 1.0,  lightning: true,  threshold: 4 * TASKS_PER_TIER },
];

export function completedUnits(stats) {
  return (stats?.doneCards || 0) + (stats?.checkDone || 0);
}

export function tierFor(units, ratio) {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (units >= TIERS[i].threshold) idx = i;
  }
  // Only reach the final tier (Ultra Instinct) on a full clear.
  if (ratio < 1 && idx === TIERS.length - 1) idx = TIERS.length - 2;
  return idx;
}

export function powerLevel(stats) {
  if (!stats) return 0;
  const units = completedUnits(stats);
  return Math.round(units * 9000 + (stats.ratio || 0) * 1500);
}