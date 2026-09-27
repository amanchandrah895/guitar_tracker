import getDb from "../../utils/db.js";
import { deleteVideoMedia } from "../../utils/storage.js";
import argon2 from "argon2";

// GET /api/students/[id]
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;

    const student = await db
      .prepare(
        `SELECT
          s.id, s.name, s.security_question, s.security_answer, s.songs, s.created_at,
          COALESCE(SUM(sess.minutes), 0) AS total_minutes,
          COUNT(sess.id)                 AS session_count
         FROM students s
         LEFT JOIN sessions sess ON s.id = sess.student_id
         WHERE s.id = ?
         GROUP BY s.id`
      )
      .get(id);

    if (!student) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    return Response.json({
      student: { ...student, songs: JSON.parse(student.songs || "[]") },
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    return Response.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}

// PATCH /api/students/[id] — update songs or password
export async function PATCH(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const body = await request.json();

    if (body.is_public !== undefined) {
      await db.prepare("UPDATE students SET is_public = ? WHERE id = ?").run(body.is_public ? 1 : 0, id);
    }
    if (body.songs !== undefined) {
      await db.prepare("UPDATE students SET songs = ? WHERE id = ?").run(
        JSON.stringify(body.songs),
        id
      );
    }

    if (body.newPassword) {
      const hashed = await argon2.hash(body.newPassword);
      await db.prepare("UPDATE students SET password = ?, plain_password = ? WHERE id = ?").run(hashed, body.newPassword, id);
    }

    const student = await db
      .prepare("SELECT id, name, songs FROM students WHERE id = ?")
      .get(id);

    if (!student) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    return Response.json({ student: { ...student, songs: JSON.parse(student.songs || "[]") } });
  } catch (error) {
    console.error("Error updating student:", error);
    return Response.json({ error: "Failed to update student" }, { status: 500 });
  }
}

// POST /api/students/[id] — verify password or security answer
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const { password, securityAnswer } = await request.json();

    const student = await db
      .prepare("SELECT id, name, password, security_question, security_answer, songs, created_at FROM students WHERE id = ?")
      .get(id);

    if (!student) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    if (password !== undefined) {
      // Verify login password (support both hashed and legacy plain-text)
      let valid = false;
      try {
        valid = await argon2.verify(student.password, password);
      } catch {
        // Legacy plain-text comparison
        valid = student.password === password;
      }
      if (!valid) {
        return Response.json({ error: "Incorrect password" }, { status: 401 });
      }
    } else if (securityAnswer !== undefined) {
      const normalized = securityAnswer.toLowerCase().trim().replace(/\s+/g, ' ');
      if (normalized !== student.security_answer) {
        return Response.json({ error: "Incorrect answer" }, { status: 401 });
      }
    } else {
      return Response.json({ error: "Provide password or securityAnswer" }, { status: 400 });
    }

    return Response.json({
      student: {
        id: student.id,
        name: student.name,
        security_question: student.security_question,
        songs: JSON.parse(student.songs || "[]"),
        created_at: student.created_at,
      },
    });
  } catch (error) {
    console.error("Error verifying student:", error);
    return Response.json({ error: "Failed to verify" }, { status: 500 });
  }
}

// DELETE /api/students/[id] — remove student and all their data
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const studentId = Number(id);

    const student = await db.prepare("SELECT id FROM students WHERE id = ?").get(studentId);
    if (!student) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    // Remove each session's videos (files + rows), then the sessions themselves
    const sessions = await db.prepare("SELECT id FROM sessions WHERE student_id = ?").all(studentId);
    for (const sess of sessions) {
      const videos = await db.prepare("SELECT filename, storage, removed_at FROM videos WHERE session_id = ?").all(sess.id);
      for (const v of videos) {
        if (!v.removed_at) await deleteVideoMedia(v);
      }
      await db.prepare("DELETE FROM comments WHERE video_id IN (SELECT id FROM videos WHERE session_id = ?)").run(sess.id);
      await db.prepare("DELETE FROM videos WHERE session_id = ?").run(sess.id);
    }
    await db.prepare("DELETE FROM sessions WHERE student_id = ?").run(studentId);
    await db.prepare("DELETE FROM students WHERE id = ?").run(studentId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting student:", error);
    return Response.json({ error: "Failed to delete student" }, { status: 500 });
  }
}
