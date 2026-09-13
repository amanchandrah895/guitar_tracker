import getDb from "../../utils/db.js";

// POST /api/admin/reveal-passwords — returns all students with their plain passwords
// Protected by admin password
export async function POST(request) {
  try {
    const { adminPassword } = await request.json();
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "guitar_admin";

    if (!adminPassword) {
      return Response.json({ error: "Admin password required" }, { status: 400 });
    }
    if (adminPassword !== ADMIN_PASSWORD) {
      return Response.json({ error: "Incorrect admin password" }, { status: 401 });
    }

    const db = getDb();
    const students = db
      .prepare("SELECT id, name, plain_password FROM students ORDER BY name ASC")
      .all();

    return Response.json({ students });
  } catch (error) {
    console.error("Reveal passwords error:", error);
    return Response.json({ error: "Failed to retrieve passwords" }, { status: 500 });
  }
}
