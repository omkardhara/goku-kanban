// Imperative particle burst. Spawns short-lived DOM sparks at a screen point.
export function burstAt(x, y, opts = {}) {
  if (typeof document === "undefined") return;
  const count = opts.count || 22;
  const colors = opts.colors || ["#ffd83d", "#ff9b21", "#ff6a00", "#34d6ff"];
  const container = document.createElement("div");
  container.className = "burst";
  container.style.left = "0px";
  container.style.top = "0px";
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "spark";
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 60 + Math.random() * 90;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.background = colors[i % colors.length];
    s.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    s.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
    s.style.animationDelay = `${Math.random() * 0.08}s`;
    container.appendChild(s);
  }
  setTimeout(() => container.remove(), 1100);
}

export function shakeScreen() {
  if (typeof document === "undefined") return;
  const root = document.querySelector(".app");
  if (!root) return;
  root.classList.remove("shake");
  // force reflow so the animation can replay
  void root.offsetWidth;
  root.classList.add("shake");
  setTimeout(() => root.classList.remove("shake"), 600);
}
