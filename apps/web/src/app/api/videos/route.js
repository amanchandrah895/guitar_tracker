import getDb from "@/app/api/utils/db";
import { VIDEO_DIR } from "@/app/api/utils/db";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// POST /api/videos — upload a video for a session
export async function POST(request) {
  try {
    await mkdir(VIDEO_DIR, { recursive: true });

    const formData = await request.formData();
    const file       = formData.get("video");
    const sessionId  = formData.get("sessionId");
    const studentId  = formData.get("studentId");

    if (!file || !sessionId || !studentId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!file.type?.startsWith("video/")) {
      return Response.json({ error: "Only video files are allowed" }, { status: 400 });
    }

    const ext      = (file.name || "video.mp4").split(".").pop();
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(VIDEO_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO videos (session_id, student_id, filename, original_name, size)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(Number(sessionId), Number(studentId), filename, file.name, buffer.length);

    const video = db
      .prepare("SELECT * FROM videos WHERE id = ?")
      .get(result.lastInsertRowid);

    return Response.json({ video });
  } catch (error) {
    console.error("Error uploading video:", error);
    return Response.json({ error: "Failed to upload video" }, { status: 500 });
  }
}

// GET /api/videos — list all videos (admin)
export async function GET() {
  try {
    const db = getDb();
    const videos = db
      .prepare(
        `SELECT v.*, st.name AS student_name, sess.created_at AS session_date
         FROM videos v
         JOIN students st ON v.student_id = st.id
         JOIN sessions sess ON v.session_id = sess.id
         ORDER BY v.uploaded_at DESC`
      )
      .all();
    return Response.json({ videos });
  } catch (error) {
    console.error("Error listing videos:", error);
    return Response.json({ error: "Failed to list videos" }, { status: 500 });
  }
}
