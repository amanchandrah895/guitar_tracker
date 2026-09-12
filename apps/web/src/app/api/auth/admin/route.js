// POST /api/auth/admin — verify admin password
export async function POST(request) {
  try {
    const { password } = await request.json();
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "guitar_admin";

    if (!password) {
      return Response.json({ error: "Password required" }, { status: 400 });
    }

    if (password !== ADMIN_PASSWORD) {
      return Response.json({ error: "Incorrect password" }, { status: 401 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: "Auth failed" }, { status: 500 });
  }
}
