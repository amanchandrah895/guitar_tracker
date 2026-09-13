import getDb from "../../../utils/db.js";
import argon2 from "argon2";

/** Fuzzy-normalize: lowercase, trim, collapse internal whitespace */
function fuzzyNormalize(s) {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

// POST /api/students/[id]/reset-password
export async function POST(request, { params }) {
  try {
    const db = getDb();
    const { id } = params;
    const { securityAnswer, newPassword } = await request.json();

    if (!securityAnswer || !newPassword) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }
    if (newPassword.length < 4) {
      return Response.json({ error: "Password must be at least 4 characters" }, { status: 400 });
    }

    const student = db
      .prepare("SELECT id, security_answer FROM students WHERE id = ?")
      .get(Number(id));

    if (!student) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    const givenNorm = fuzzyNormalize(securityAnswer);
    const storedNorm = fuzzyNormalize(student.security_answer);

    if (givenNorm !== storedNorm) {
      return Response.json({ error: "Security answer doesn't match" }, { status: 401 });
    }

    const hashed = await argon2.hash(newPassword);
    db.prepare("UPDATE students SET password = ?, plain_password = ? WHERE id = ?").run(hashed, newPassword, Number(id));

    return Response.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return Response.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
