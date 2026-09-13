import getDb from "../../utils/db.js";
import { VIDEO_DIR } from "../../utils/db.js";
import { readFile, unlink } from "node:fs/promises";
import { join, extname } from "node:path";

const MIME_MAP = {
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".mov":  "video/quicktime",
  ".avi":  "video/x-msvideo",
  ".mkv":  "video/x-matroska",
  ".m4v":  "video/mp4",
  ".ogv":  "video/ogg",
};

// GET /api/videos/[id] — stream / serve video file
export async function GET(request, { params }) {
  try {
    const db    = getDb();
    const video = db.prepare("SELECT * FROM videos WHERE id = ?").get(params.id);

    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    const filepath = join(VIDEO_DIR, video.filename);
    const ext      = extname(video.filename).toLowerCase();
    const mime     = MIME_MAP[ext] || "video/mp4";

    const data = await readFile(filepath);

    // Support Range requests (needed for <video> seek)
    const range = request.headers.get("range");
    if (range) {
      const total = data.length;
      const [startStr, endStr] = range.replace("bytes=", "").split("-");
      const start = parseInt(startStr, 10);
      const end   = endStr ? parseInt(endStr, 10) : total - 1;
      const chunk = data.slice(start, end + 1);

      return new Response(chunk, {
        status: 206,
        headers: {
          "Content-Range":  `bytes ${start}-${end}/${total}`,
          "Accept-Ranges":  "bytes",
          "Content-Length": String(chunk.length),
          "Content-Type":   mime,
        },
      });
    }

    return new Response(data, {
      headers: {
        "Content-Type":   mime,
        "Content-Length": String(data.length),
        "Accept-Ranges":  "bytes",
      },
    });
  } catch (error) {
    console.error("Error serving video:", error);
    return Response.json({ error: "Video not found" }, { status: 404 });
  }
}

// DELETE /api/videos/[id]
export async function DELETE(request, { params }) {
  try {
    const db    = getDb();
    const video = db.prepare("SELECT * FROM videos WHERE id = ?").get(params.id);

    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    // Remove comments first
    db.prepare("DELETE FROM comments WHERE video_id = ?").run(params.id);
    db.prepare("DELETE FROM videos WHERE id = ?").run(params.id);

    // Remove file (best-effort)
    try {
      await unlink(join(VIDEO_DIR, video.filename));
    } catch {}

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Error deleting video:", error);
    return Response.json({ error: "Failed to delete video" }, { status: 500 });
  }
}
