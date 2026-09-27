import getDb, { usingTurso } from "../utils/db.js";
import { storageInfo } from "../utils/storage.js";

// GET /api/health — for Render's health check and UptimeRobot pings.
// Touches the database so a broken Turso connection shows up as a 503.
export async function GET() {
  const started = Date.now();
  try {
    const db = await getDb();
    await db.prepare("SELECT 1 AS ok").get();
    return Response.json({
      ok: true,
      database: usingTurso ? "turso" : "sqlite-file",
      ...storageInfo(),
      ms: Date.now() - started,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    // Surface configuration mistakes (never secrets) so they're easy to fix.
    const hint = /TURSO_AUTH_TOKEN/.test(error?.message || "")
      ? "TURSO_AUTH_TOKEN is missing"
      : /401|unauthori[sz]ed|token/i.test(String(error?.message || error?.code || ""))
        ? "Turso rejected the auth token"
        : "Database unavailable";
    return Response.json({ ok: false, database: usingTurso ? "turso" : "sqlite-file", ...storageInfo(), error: hint }, { status: 503 });
  }
}
