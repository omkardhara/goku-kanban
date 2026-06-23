// Power tiers driven by board completion ratio (0..1).
// Stylized, original "Saiyan-style" power states (not licensed artwork).

export const TIERS = [
  { key: "base",    name: "Base Form",       img: "/goku/base.png",    hair: "#1a1a22", hair2: "#3a3a48", aura: "#7fd3ff", auraOp: 0.0, lightning: false, threshold: 0.0 },
  { key: "kaioken", name: "Ki Awakened",     img: "/goku/kaioken.png", hair: "#241a16", hair2: "#4a2f22", aura: "#ff5c3c", auraOp: 0.5, lightning: false, threshold: 0.2 },
  { key: "ssj",     name: "Super Saiyan",    img: "/goku/kaioken.png", hair: "#ffd83d", hair2: "#ffb01f", aura: "#ffd040", auraOp: 0.7, lightning: false, threshold: 0.4 },
  { key: "ssj2",    name: "Super Saiyan 2",  img: "/goku/ssj2.png",    hair: "#ffe24f", hair2: "#ffbe26", aura: "#ffe066", auraOp: 0.85, lightning: true,  threshold: 0.6 },
  { key: "ssj3",    name: "Super Saiyan 3",  img: "/goku/blue.png",    hair: "#ffe24f", hair2: "#f5a800", aura: "#fff0a0", auraOp: 1.0, lightning: true,  threshold: 0.8 },
  { key: "blue",    name: "Ultra Instinct",  img: "/goku/ultra.png",   hair: "#46e0ff", hair2: "#0a9cff", aura: "#7af0ff", auraOp: 1.0, lightning: true,  threshold: 1.0 },
];

export function tierFor(ratio) {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (ratio >= TIERS[i].threshold) idx = i;
  }
  // Only reach the final tier on a full clear.
  if (ratio < 1 && idx === TIERS.length - 1) idx = TIERS.length - 2;
  return idx;
}

export function powerLevel(stats) {
  if (!stats) return 0;
  const units = (stats.doneCards || 0) + (stats.checkDone || 0);
  return Math.round(units * 9000 + (stats.ratio || 0) * 1500);
}
