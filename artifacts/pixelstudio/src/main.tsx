import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// ── Service Worker ────────────────────────────────────────────────────────────
// In development: register our hand-written static SW from /public/sw.js so
// the offline-save-and-sync flow can be tested without a production build.
//
// In production: VitePWA injects its own registration script (with the full
// pre-cache manifest built at compile time) directly into the HTML, so we
// must NOT also register here — doing so would cause a double-registration
// against the same scope with the same file, wasting a round-trip.
if ("serviceWorker" in navigator && import.meta.env.DEV) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => console.log("[SW] registered:", reg.scope))
      .catch((err) => console.warn("[SW] registration failed:", err));
  });
}
