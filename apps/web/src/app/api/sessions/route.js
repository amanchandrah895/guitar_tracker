import getDb from "@/app/api/utils/db";

// GET /api/sessions — all sessions (admin)
export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT s.id, s.student_id, s.songs, s.minutes, s.notes, s.created_at,
                st.name AS student_name
         FROM sessions s
         JOIN students st ON s.student_id = st.id
         ORDER BY s.created_at DESC`
      )
      .all();

    const sessions = rows.map((r) => ({ ...r, songs: JSON.parse(r.songs || "[]") }));
    return Response.json({ sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return Response.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

// POST /api/sessions — log a practice session
export async function POST(request) {
  try {
    const { studentId, songs, minutes, notes, practiceDate, practiceTime } =
      await request.json();

    if (!studentId || !songs || songs.length === 0 || !minutes || minutes <= 0) {
      return Response.json({ error: "Invalid session data" }, { status: 400 });
    }

    const db = getDb();

    let createdAt = null;
    if (practiceDate || practiceTime) {
      const date = practiceDate || new Date().toISOString().split("T")[0];
      const time = practiceTime || "00:00";
      createdAt = `${date} ${time}:00`;
    }

    const result = createdAt
      ? db
          .prepare(
            `INSERT INTO sessions (student_id, songs, minutes, notes, created_at)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(studentId, JSON.stringify(songs), minutes, notes || null, createdAt)
      : db
          .prepare(
            `INSERT INTO sessions (student_id, songs, minutes, notes)
             VALUES (?, ?, ?, ?)`
          )
          .run(studentId, JSON.stringify(songs), minutes, notes || null);

    const session = db
      .prepare("SELECT id, student_id, songs, minutes, notes, created_at FROM sessions WHERE id = ?")
      .get(result.lastInsertRowid);

    return Response.json({ session: { ...session, songs: JSON.parse(session.songs || "[]") } });
  } catch (error) {
    console.error("Error creating session:", error);
    return Response.json({ error: "Failed to create session" }, { status: 500 });
  }
}
