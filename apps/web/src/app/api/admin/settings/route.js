import getDb from "../../utils/db.js";
import { checkAdmin, readSettings } from "../../utils/policy.js";

// POST /api/admin/settings — instructor updates how her name and note appear.
// Body: { adminPassword, instructorName?, instructorNote? }
export async function POST(request) {
  try {
    const { adminPassword, instructorName, instructorNote } = await request.json();
    if (!checkAdmin(adminPassword)) {
      return Response.json({ error: "Incorrect admin password" }, { status: 401 });
    }

    const db = await getDb();
    const upsert = await db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    );

    if (instructorName !== undefined) {
      const name = String(instructorName).replace(/\s+/g, " ").trim();
      if (name.length < 1 || name.length > 40) {
        return Response.json({ error: "Name must be 1–40 characters" }, { status: 400 });
      }
      await upsert.run("instructorName", name);
    }
    if (instructorNote !== undefined) {
      const note = String(instructorNote).trim();
      if (note.length > 280) {
        return Response.json({ error: "Keep the note under 280 characters" }, { status: 400 });
      }
      await upsert.run("instructorNote", note);
    }

    return Response.json(await readSettings(db));
  } catch (error) {
    console.error("Error saving settings:", error);
    return Response.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
