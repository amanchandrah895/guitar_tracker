import getDb from "../utils/db.js";
import argon2 from "argon2";

// GET /api/students — all students with stats + last session songs
export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT
          s.id, s.name, s.security_question, s.level, s.is_public, s.songs, s.created_at,
          COALESCE(SUM(sess.minutes), 0) AS total_minutes,
          COUNT(sess.id)                 AS session_count
         FROM students s
         LEFT JOIN sessions sess ON s.id = sess.student_id
         GROUP BY s.id
         ORDER BY s.created_at ASC`
      )
      .all();

    // Fetch each student's most recent session songs
    const latestSongs = db
      .prepare(
        `SELECT student_id, songs
         FROM sessions
         WHERE id IN (
           SELECT MAX(id) FROM sessions GROUP BY student_id
         )`
      )
      .all();

    const lastSongsMap = {};
    for (const row of latestSongs) {
      try {
        lastSongsMap[row.student_id] = JSON.parse(row.songs || "[]");
      } catch {
        lastSongsMap[row.student_id] = [];
      }
    }

    const students = rows.map((r) => ({
      ...r,
      songs: JSON.parse(r.songs || "[]"),
      last_songs: lastSongsMap[r.id] || [],
    }));

    return Response.json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    return Response.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

// POST /api/students — create student (min 1 song)
export async function POST(request) {
  try {
    const { name, password, securityQuestion, securityAnswer, songs, level, is_public } =
      await request.json();

    if (!name || !password || !securityQuestion || !securityAnswer || !songs || songs.length < 1) {
      return Response.json({ error: "Invalid student data — all fields required, select at least 1 song" }, { status: 400 });
    }

    const db = getDb();

    const existing = db
      .prepare("SELECT id FROM students WHERE LOWER(name) = LOWER(?)")
      .get(name);
    if (existing) {
      return Response.json(
        { error: "This name is already taken. Please choose a different name." },
        { status: 409 }
      );
    }

    const hashed = await argon2.hash(password);
    // Store normalized answer for consistent fuzzy matching
    const normalizedAnswer = securityAnswer.toLowerCase().trim().replace(/\s+/g, " ");

    const result = db
      .prepare(
        `INSERT INTO students (name, password, plain_password, security_question, security_answer, level, is_public, songs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(name, hashed, password, securityQuestion, normalizedAnswer, level || null, is_public === false ? 0 : 1, JSON.stringify(songs));

    const student = db
      .prepare("SELECT id, name, security_question, level, songs, created_at FROM students WHERE id = ?")
      .get(result.lastInsertRowid);

    return Response.json({ student: { ...student, level: student.level || null, songs: JSON.parse(student.songs) } });
  } catch (error) {
    console.error("Error creating student:", error);
    return Response.json({ error: "Failed to create student" }, { status: 500 });
  }
}
