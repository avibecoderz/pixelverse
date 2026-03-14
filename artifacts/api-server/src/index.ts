import app from "./app";

// Replit's artifact system injects PORT automatically.
// Fall back to 8080 so the server starts in any environment.
const port = Number(process.env["PORT"] ?? 8080);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

// Bind to 0.0.0.0 (all interfaces) so Replit's deployment proxy can reach
// the server. The default Node.js binding (127.0.0.1) only accepts
// loopback connections and causes health-check failures in Cloud Run.
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
