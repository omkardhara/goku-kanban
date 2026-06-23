import "./globals.css";

export const metadata = {
  title: "Power-Up Board",
  description: "A Super Saiyan power-up Kanban, charged by your weekly summary.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
