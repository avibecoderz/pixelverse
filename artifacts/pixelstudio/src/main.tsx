import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// ── Service Worker ────────────────────────────────────────────────────────────
// In development we register a plain static SW from /public/sw.js so the
// offline-save-and-sync flow can be tested without a production build.
// In production the VitePWA plugin injects and registers its own SW (which
// has a full pre-cache manifest generated at build time).
if ("serviceWorker" in navigator) {
  const swPath =
    import.meta.env.DEV ? "/sw.js" : "/sw.js";

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(swPath, { scope: "/" })
      .then((reg) => {
        if (import.meta.env.DEV) {
          console.log("[SW] registered:", reg.scope);
        }
      })
      .catch((err) => {
        console.warn("[SW] registration failed:", err);
      });
  });
}
