import { createHash } from "node:crypto";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { VIDEO_DIR } from "./db.js";

// Video storage: Cloudinary when configured, local disk (DATA_DIR/videos) otherwise.
//
//   CLOUDINARY_CLOUD_NAME   the "Cloud name" on the Cloudinary dashboard (e.g. dq3xyzabc)
//   CLOUDINARY_API_KEY      numeric API key
//   CLOUDINARY_API_SECRET   API secret
//   (or a single CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud name>)
//
// Browsers upload straight to Cloudinary with a short-lived signature from
// this server, so large clips never pass through the (512 MB RAM) web server.

function readConfig() {
  let name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  let key = process.env.CLOUDINARY_API_KEY?.trim();
  let secret = process.env.CLOUDINARY_API_SECRET?.trim();
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url && (!name || !key || !secret)) {
    const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (m) [, key, secret, name] = m;
  }
  return { name, key, secret };
}

const cfg = readConfig();
export const cloudinaryEnabled = Boolean(cfg.name && cfg.key && cfg.secret);
// Overridable only so tests can point at a local stand-in.
const API_BASE = (process.env.CLOUDINARY_API_BASE || "https://api.cloudinary.com").replace(/\/$/, "");
export const FOLDER = (process.env.CLOUDINARY_FOLDER || "guitar-practice-logs").replace(/^\/|\/$/g, "");

/** Cloudinary signature: sha1 of the sorted params joined with & plus the secret. */
function sign(params) {
  const base = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(base + cfg.secret).digest("hex");
}

export const studentFolder = (studentId) => `${FOLDER}/student-${studentId}`;

/** Fields the browser needs to upload one clip directly to Cloudinary. */
export function directUploadTicket(studentId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: studentFolder(studentId), timestamp };
  return {
    mode: "cloudinary",
    uploadUrl: `${API_BASE}/v1_1/${cfg.name}/video/upload`,
    fields: { ...params, api_key: cfg.key, signature: sign(params) },
  };
}

/**
 * Check that an upload result really came from our Cloudinary account and
 * belongs to this student. Cloudinary signs `public_id` + `version`.
 */
export function verifyUploadResult(result, studentId) {
  if (!result || typeof result !== "object") return "Missing upload result";
  const { public_id, version, signature, resource_type, secure_url } = result;
  if (!public_id || !version || !signature || !secure_url) return "Incomplete upload result";
  const expected = createHash("sha1").update(`public_id=${public_id}&version=${version}${cfg.secret}`).digest("hex");
  if (expected !== signature) return "Upload signature mismatch";
  if (resource_type && resource_type !== "video") return "Not a video upload";
  if (!String(public_id).startsWith(`${studentFolder(studentId)}/`)) return "Upload belongs to another student";
  if (!/^https:\/\//.test(secure_url) && !process.env.CLOUDINARY_API_BASE) return "Unexpected video URL";
  return null;
}

/** Permanently delete a Cloudinary video. Resolves to true on success. */
export async function destroyCloudinary(publicId) {
  if (!cloudinaryEnabled || !publicId) return false;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: "true", public_id: publicId, timestamp };
  const body = new URLSearchParams({ ...params, timestamp: String(timestamp), api_key: cfg.key, signature: sign(params) });
  try {
    const res = await fetch(`${API_BASE}/v1_1/${cfg.name}/video/destroy`, { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data.result !== "ok" && data.result !== "not found")) {
      console.error("Cloudinary destroy failed:", res.status, data?.error?.message || data?.result);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Cloudinary destroy error:", err);
    return false;
  }
}

/** Delete a clip's media wherever it lives (best-effort). */
export async function deleteVideoMedia(video) {
  if (!video) return;
  if (video.storage === "cloudinary") {
    await destroyCloudinary(video.filename);
  } else if (video.filename) {
    try {
      await unlink(join(VIDEO_DIR, video.filename));
    } catch {
      /* already gone */
    }
  }
}

export function storageInfo() {
  const info = { videos: cloudinaryEnabled ? "cloudinary" : "local" };
  // Cloud names are lowercase; "Root" is the default label of an API key, a common mix-up.
  if (cloudinaryEnabled && (/[A-Z\s]/.test(cfg.name) || cfg.name.toLowerCase() === "root")) {
    info.warning = "CLOUDINARY_CLOUD_NAME looks wrong: use the lowercase Cloud name from the Cloudinary console";
  }
  return info;
}
