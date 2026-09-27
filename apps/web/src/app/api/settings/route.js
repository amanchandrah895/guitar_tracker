import getDb from "../utils/db.js";
import { readSettings } from "../utils/policy.js";

// GET /api/settings — public app settings: instructor profile + storage limits.
export async function GET() {
  try {
    return Response.json(await readSettings(await getDb()));
  } catch (error) {
    console.error("Error reading settings:", error);
    return Response.json({ error: "Failed to read settings" }, { status: 500 });
  }
}
