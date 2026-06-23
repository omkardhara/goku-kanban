"use client";

// Per-view background images from /public/backgrounds/.
// bg1.jpg = board (Namek), bg2.jpg = payments (City), bg3.jpg = calendar (Island)

const VIEW_IMGS = {
  board: "/backgrounds/bg1.jpg",
  payments: "/backgrounds/bg2.jpg",
  calendar: "/backgrounds/bg3.jpg",
};

export default function Backgrounds({ view }) {
  const src = VIEW_IMGS[view] || VIEW_IMGS.board;
  return (
    <div className={`bg bg-${view}`} aria-hidden="true">
      <img src={src} className="bg-img" alt="" />
      <div className="bg-scrim" />
    </div>
  );
}
