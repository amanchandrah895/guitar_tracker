# Deploying Strumrr on Render (free)

Everything that must survive restarts lives outside Render:

| What | Where | Free tier |
| --- | --- | --- |
| Students, sessions, feedback, settings | Turso (libSQL) | 5 GB storage |
| Practice clips (2 latest per student) | Cloudinary | 25 credits / month |
| The web app | Render web service | 750 hours / month |

## 1. Collect the six values

| Variable | Where to find it |
| --- | --- |
| `TURSO_DATABASE_URL` | Turso dashboard → your database → URL (starts with `libsql://`) |
| `TURSO_AUTH_TOKEN` | Turso dashboard → your database → **Create token** (read & write) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary console → Settings → API Keys → **Cloud name** at the top (lowercase, e.g. `dq3xyzabc`; not the key label "Root") |
| `CLOUDINARY_API_KEY` | Same page, the numeric API key |
| `CLOUDINARY_API_SECRET` | Same page, click the eye icon |
| `ADMIN_PASSWORD` | Choose a new instructor password (not `guitar_admin`) |

## 2. Create the service

1. Push this repo to GitHub.
2. Render dashboard → **New +** → **Blueprint** → pick the repo. Render reads `render.yaml`.
3. Paste the six values when asked, then **Apply**.

The first build takes a few minutes. When it's live, open
`https://<your-service>.onrender.com/api/health`. It should say
`"database":"turso","videos":"cloudinary"`.

## 3. Keep it awake (optional)

Free services sleep after 15 minutes idle. In UptimeRobot, add an HTTP monitor
for `https://<your-service>.onrender.com/api/health` every 5 minutes.

## Custom domain (optional)

After adding your domain under the service's Settings → Custom Domains, add
`PUBLIC_URL=https://your-domain` under Environment so link previews
(WhatsApp, iMessage) use it.

## Local development

`cd apps/web && bun install && bun run dev`. With the Turso and Cloudinary
variables empty, it uses a local SQLite file and local disk (`apps/web/data/`).
