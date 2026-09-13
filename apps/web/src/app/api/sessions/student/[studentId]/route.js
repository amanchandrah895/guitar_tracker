import getDb from "../../../utils/db.js";

// GET /api/sessions/student/[studentId]
export async function GET(request, { params }) {
  try {
    const db = getDb();
    const { studentId } = params;

    const rows = db
      .prepare(
        `SELECT s.id, s.student_id, s.songs, s.minutes, s.notes, s.created_at,
                v.id AS video_id, v.filename AS video_filename,
                v.original_name AS video_original_name
         FROM sessions s
         LEFT JOIN videos v ON v.session_id = s.id
         WHERE s.student_id = ?
         ORDER BY s.created_at DESC`
      )
      .all(studentId);

    // Group videos per session
    const sessionMap = new Map();
    for (const row of rows) {
      if (!sessionMap.has(row.id)) {
        sessionMap.set(row.id, {
          id: row.id,
          student_id: row.student_id,
          songs: JSON.parse(row.songs || "[]"),
          minutes: row.minutes,
          notes: row.notes,
          created_at: row.created_at,
          videos: [],
        });
      }
      if (row.video_id) {
        // Fetch comments for this video
        const comments = db
          .prepare("SELECT id, text, created_at FROM comments WHERE video_id = ? ORDER BY created_at ASC")
          .all(row.video_id);

        sessionMap.get(row.id).videos.push({
          id: row.video_id,
          filename: row.video_filename,
          original_name: row.video_original_name,
          comments,
        });
      }
    }

    return Response.json({ sessions: Array.from(sessionMap.values()) });
  } catch (error) {
    console.error("Error fetching student sessions:", error);
    return Response.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}
