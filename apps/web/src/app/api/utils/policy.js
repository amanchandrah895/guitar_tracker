import { deleteVideoMedia } from "./storage.js";

// Storage policy for the free tier. The app runs without paid storage, so it
// keeps only each student's most recent clips. Keep these numbers in sync with
// what the UI tells students (the UI reads them from GET /api/settings).
export const LIMITS = {
  videosPerStudent: 2,
  maxUploadMB: 100,
  maxMinutes: 10,
};

export const MAX_UPLOAD_BYTES = LIMITS.maxUploadMB * 1024 * 1024;

export const DEFAULT_INSTRUCTOR = {
  instructorName: "Ohila",
  instructorNote: "",
};

export function checkAdmin(password) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "guitar_admin";
  return Boolean(password) && password === ADMIN_PASSWORD;
}

export async function readSettings(db) {
  const rows = await db.prepare("SELECT key, value FROM settings").all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    instructorName: map.instructorName?.trim() || DEFAULT_INSTRUCTOR.instructorName,
    instructorNote: map.instructorNote ?? DEFAULT_INSTRUCTOR.instructorNote,
    limits: LIMITS,
  };
}

/**
 * Keep only the newest `LIMITS.videosPerStudent` clips for a student.
 * Older clips lose their file for good; their row stays (with removed_at set)
 * so the instructor's comments on them remain readable.
 * Returns the clips that were removed.
 */
export async function pruneStudentVideos(db, studentId) {
  const active = await db
    .prepare(
      `SELECT id, filename, storage, original_name, uploaded_at FROM videos
       WHERE student_id = ? AND removed_at IS NULL
       ORDER BY uploaded_at DESC, id DESC`
    )
    .all(studentId);

  const excess = active.slice(LIMITS.videosPerStudent);
  for (const v of excess) {
    await db.prepare("UPDATE videos SET removed_at = CURRENT_TIMESTAMP, url = NULL WHERE id = ?").run(v.id);
    await deleteVideoMedia(v);
  }
  return excess;
}
