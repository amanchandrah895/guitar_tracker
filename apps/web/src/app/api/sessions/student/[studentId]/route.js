import getDb from "../../../utils/db.js";

// GET /api/sessions/student/[studentId]
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { studentId } = params;

    const rows = await db
      .prepare(
        `SELECT s.id, s.student_id, s.songs, s.minutes, s.notes, s.created_at,
                v.id AS video_id, v.filename AS video_filename,
                v.original_name AS video_original_name,
                v.size AS video_size, v.uploaded_at AS video_uploaded_at,
                v.removed_at AS video_removed_at
         FROM sessions s
         LEFT JOIN videos v ON v.session_id = s.id
         WHERE s.student_id = ?
         ORDER BY s.created_at DESC`
      )
      .all(studentId);

    // All feedback for this student's clips in one query (Turso is remote, so
    // avoid a round trip per video).
    const allComments = await db
      .prepare(
        `SELECT c.id, c.video_id, c.text, c.created_at FROM comments c
         JOIN videos v ON v.id = c.video_id
         WHERE v.student_id = ?
         ORDER BY c.created_at ASC, c.id ASC`
      )
      .all(studentId);
    const commentsByVideo = new Map();
    for (const c of allComments) {
      if (!commentsByVideo.has(c.video_id)) commentsByVideo.set(c.video_id, []);
      commentsByVideo.get(c.video_id).push({ id: c.id, text: c.text, created_at: c.created_at });
    }

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
        const comments = commentsByVideo.get(row.video_id) || [];

        sessionMap.get(row.id).videos.push({
          id: row.video_id,
          filename: row.video_filename,
          original_name: row.video_original_name,
          size: row.video_size,
          uploaded_at: row.video_uploaded_at,
          removed: Boolean(row.video_removed_at),
          removed_at: row.video_removed_at,
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
