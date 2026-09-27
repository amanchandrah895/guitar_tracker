import getDb from "../utils/db.js";
import { VIDEO_DIR } from "../utils/db.js";
import { LIMITS, MAX_UPLOAD_BYTES, pruneStudentVideos } from "../utils/policy.js";
import { cloudinaryEnabled, destroyCloudinary, verifyUploadResult } from "../utils/storage.js";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const tooLarge = () =>
  Response.json(
    { error: `Videos must be under ${LIMITS.maxUploadMB} MB. Try recording at 720p or trimming the clip.` },
    { status: 413 }
  );

async function sessionOwnedBy(db, sessionId, studentId) {
  const session = await db.prepare("SELECT id, student_id FROM sessions WHERE id = ?").get(sessionId);
  return Boolean(session && Number(session.student_id) === studentId);
}

async function finish(db, videoId, studentId) {
  const video = await db.prepare("SELECT * FROM videos WHERE id = ?").get(videoId);
  // Only now that the new clip is stored do we drop the oldest ones.
  const removed = await pruneStudentVideos(db, studentId);
  return Response.json({
    video,
    removed: removed.map((v) => ({ id: v.id, uploaded_at: v.uploaded_at })),
    limits: LIMITS,
  });
}

// POST /api/videos — attach a clip to a session.
//
//  • Cloudinary mode (JSON body): the browser has already uploaded the file
//    straight to Cloudinary using a ticket from /api/uploads/sign; here we
//    verify Cloudinary's signature and record the clip.
//  • Local mode (multipart body): the file itself is uploaded here and saved
//    to DATA_DIR/videos. Used when Cloudinary isn't configured (development).
//
// Storage policy: only the newest LIMITS.videosPerStudent clips per student are
// kept. Older clips are deleted permanently once the new one is safely stored.
export async function POST(request) {
  try {
    const type = request.headers.get("content-type") || "";
    const db = await getDb();

    if (type.includes("application/json")) {
      if (!cloudinaryEnabled) return Response.json({ error: "Cloud video storage isn't configured" }, { status: 400 });
      const { sessionId: sid, studentId: stid, originalName, cloudinary: result } = await request.json();
      const sessionId = Number(sid);
      const studentId = Number(stid);
      if (!sessionId || !studentId || !result) return Response.json({ error: "Missing required fields" }, { status: 400 });

      const problem = verifyUploadResult(result, studentId);
      if (problem) return Response.json({ error: problem }, { status: 400 });

      const reject = async (message, status = 400) => {
        await destroyCloudinary(result.public_id);
        return Response.json({ error: message }, { status });
      };
      if (!(await sessionOwnedBy(db, sessionId, studentId))) return reject("Session not found for this student", 404);
      if (Number(result.bytes) > MAX_UPLOAD_BYTES) return reject(`Videos must be under ${LIMITS.maxUploadMB} MB.`, 413);
      if (Number(result.duration) > LIMITS.maxMinutes * 60 + 5) return reject(`Clips can be up to ${LIMITS.maxMinutes} minutes.`);

      const existing = await db.prepare("SELECT id FROM videos WHERE filename = ? AND storage = 'cloudinary'").get(result.public_id);
      if (existing) return finish(db, existing.id, studentId);

      const name = String(originalName || result.original_filename || "clip").slice(0, 200);
      const { lastInsertRowid } = await db
        .prepare(
          `INSERT INTO videos (session_id, student_id, filename, original_name, size, storage, url)
           VALUES (?, ?, ?, ?, ?, 'cloudinary', ?)`
        )
        .run(sessionId, studentId, result.public_id, name, Number(result.bytes) || null, result.secure_url);
      return finish(db, lastInsertRowid, studentId);
    }

    // ── Local disk upload
    if (cloudinaryEnabled) {
      return Response.json({ error: "Please refresh the page and try the upload again." }, { status: 409 });
    }
    // Reject oversized uploads before buffering them into memory.
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > MAX_UPLOAD_BYTES + 1024 * 1024) return tooLarge();

    await mkdir(VIDEO_DIR, { recursive: true });

    const formData = await request.formData();
    const file       = formData.get("video");
    const sessionId  = Number(formData.get("sessionId"));
    const studentId  = Number(formData.get("studentId"));

    if (!file || typeof file === "string" || !sessionId || !studentId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!file.type?.startsWith("video/")) {
      return Response.json({ error: "Only video files are allowed" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) return tooLarge();
    if (!(await sessionOwnedBy(db, sessionId, studentId))) {
      return Response.json({ error: "Session not found for this student" }, { status: 404 });
    }

    const ext      = ((file.name || "video.mp4").split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(VIDEO_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    let id;
    try {
      const result = await db
        .prepare(
          `INSERT INTO videos (session_id, student_id, filename, original_name, size, storage)
           VALUES (?, ?, ?, ?, ?, 'local')`
        )
        .run(sessionId, studentId, filename, file.name, buffer.length);
      id = result.lastInsertRowid;
    } catch (err) {
      try { await unlink(filepath); } catch { /* ignore */ }
      throw err;
    }
    return finish(db, id, studentId);
  } catch (error) {
    console.error("Error uploading video:", error);
    return Response.json({ error: "Failed to upload video" }, { status: 500 });
  }
}

// GET /api/videos — clips still stored, with feedback counts (instructor inbox)
export async function GET() {
  try {
    const db = await getDb();
    const videos = await db
      .prepare(
        `SELECT v.id, v.session_id, v.student_id, v.original_name, v.size, v.uploaded_at, v.storage,
                st.name AS student_name, sess.created_at AS session_date,
                (SELECT COUNT(*) FROM comments c WHERE c.video_id = v.id) AS comment_count
         FROM videos v
         JOIN students st ON v.student_id = st.id
         JOIN sessions sess ON v.session_id = sess.id
         WHERE v.removed_at IS NULL
         ORDER BY v.uploaded_at DESC`
      )
      .all();
    return Response.json({ videos });
  } catch (error) {
    console.error("Error listing videos:", error);
    return Response.json({ error: "Failed to list videos" }, { status: 500 });
  }
}
