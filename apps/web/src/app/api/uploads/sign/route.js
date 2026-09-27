import getDb from "../../utils/db.js";
import { LIMITS } from "../../utils/policy.js";
import { cloudinaryEnabled, directUploadTicket } from "../../utils/storage.js";

// POST /api/uploads/sign — { sessionId, studentId }
// Returns how the browser should upload a clip for this session:
//   { mode: "cloudinary", uploadUrl, fields }  → upload the file straight to Cloudinary
//   { mode: "local" }                          → multipart POST to /api/videos
export async function POST(request) {
  try {
    const { sessionId, studentId } = await request.json();
    const sid = Number(sessionId);
    const stid = Number(studentId);
    if (!sid || !stid) return Response.json({ error: "Missing required fields" }, { status: 400 });

    const db = await getDb();
    const session = await db.prepare("SELECT id, student_id FROM sessions WHERE id = ?").get(sid);
    if (!session || Number(session.student_id) !== stid) {
      return Response.json({ error: "Session not found for this student" }, { status: 404 });
    }

    if (!cloudinaryEnabled) return Response.json({ mode: "local", limits: LIMITS });
    return Response.json({ ...directUploadTicket(stid), limits: LIMITS });
  } catch (error) {
    console.error("Error signing upload:", error);
    return Response.json({ error: "Couldn't prepare the upload" }, { status: 500 });
  }
}
