import getDb from "../utils/db.js";

// GET /api/comments?videoId=X — get all comments for a video
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return Response.json({ error: "videoId required" }, { status: 400 });
    }

    const db = getDb();
    const comments = db
      .prepare(
        "SELECT id, video_id, text, created_at FROM comments WHERE video_id = ? ORDER BY created_at ASC"
      )
      .all(videoId);

    return Response.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return Response.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

// POST /api/comments — add a comment on a video
export async function POST(request) {
  try {
    const { videoId, text } = await request.json();

    if (!videoId || !text?.trim()) {
      return Response.json({ error: "videoId and text are required" }, { status: 400 });
    }

    const db = getDb();

    // Verify video exists
    const video = db.prepare("SELECT id FROM videos WHERE id = ?").get(videoId);
    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    const result = db
      .prepare("INSERT INTO comments (video_id, text) VALUES (?, ?)")
      .run(videoId, text.trim());

    const comment = db
      .prepare("SELECT id, video_id, text, created_at FROM comments WHERE id = ?")
      .get(result.lastInsertRowid);

    return Response.json({ comment });
  } catch (error) {
    console.error("Error adding comment:", error);
    return Response.json({ error: "Failed to add comment" }, { status: 500 });
  }
}

// DELETE /api/comments?id=X
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("DELETE FROM comments WHERE id = ?").run(id);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return Response.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
