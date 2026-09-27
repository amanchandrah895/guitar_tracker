// ─────────────────────────────────────────────────────────────
// Shared constants, formatting and practice-stat computations
// ─────────────────────────────────────────────────────────────

export const ADMIN = { name: "Ohila", role: "admin" };

export const HARDCODED_SONGS = ["Photograph", "Fistful of Pesos", "Hungry Ghost"];

export const LEVELS = [
  "L1 Basic",
  "L2 Basic",
  "L1 Intermediate",
  "L2 Intermediate",
  "Advance L1",
  "Alumni",
];

export const SECURITY_QUESTIONS = [
  "What's your favorite pizza topping?",
  "If you were a guitar, what brand would you be?",
  "What's the worst song you secretly love?",
  "What's your go-to karaoke song?",
  "What's your pet's name? (or dream pet)",
];

// Level identity colours — validated categorical steps for the dark surface
// (OKLCH L 0.48–0.67, CVD-safe adjacent order; dataviz validate_palette.js).
// The text label always accompanies the colour, so colour never carries
// meaning on its own. Custom batches fall back to a neutral.
const LEVEL_COLORS = {
  "L1 Basic": "#3987e5",
  "L2 Basic": "#d95926",
  "L1 Intermediate": "#199e70",
  "L2 Intermediate": "#c98500",
  "Advance L1": "#d55181",
  Alumni: "#008300",
};
const OTHER_LEVEL_COLOR = "#8a8172";

// Heatmap: single amber hue, brighter = more minutes (validated ordinal ramp).
export const HEAT_RAMP = ["#74501a", "#a0661c", "#cc8423", "#f5b63f", "#ffd98a"];

export function levelColor(level) {
  return LEVEL_COLORS[level] || OTHER_LEVEL_COLOR;
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const firstName = (name = "") => name.trim().split(/\s+/)[0] || name;

// ─── Dates ────────────────────────────────────────────────────
// SQLite returns "YYYY-MM-DD HH:MM:SS". Safari cannot parse the space
// separated form, so normalise to ISO. Session times are stored as the
// student's local time; comment / upload times come from CURRENT_TIMESTAMP (UTC).
export function parseDbDate(value, { utc = false } = {}) {
  if (!value) return null;
  if (value instanceof Date) return value;
  let iso = String(value).trim().replace(" ", "T");
  if (utc && !/(Z|[+-]\d\d:?\d\d)$/i.test(iso)) iso += "Z";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dayKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function toLocalInputs(date = new Date()) {
  return {
    date: dayKey(date),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

export function timeAgo(date, now = new Date()) {
  if (!date) return "—";
  const diff = (now - date) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  const today = startOfDay(now);
  if (date >= today) return `${Math.floor(diff / 3600)}h ago`;
  if (date >= addDays(today, -1)) return "yesterday";
  const days = Math.round((today - startOfDay(date)) / 86400000);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDate(date, opts = { month: "short", day: "numeric", year: "numeric" }) {
  return date ? date.toLocaleDateString("en-US", opts) : "";
}

export function formatTime(date) {
  return date ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
}

export function formatMinutes(total = 0, { long = false } = {}) {
  const m = Math.round(total || 0);
  if (m < 60) return long ? `${m} min` : `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "Late night jam";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Practice statistics ─────────────────────────────────────
function streaksFromDays(daySet, today = startOfDay()) {
  // Current streak stays alive if the student practised today OR yesterday.
  let current = 0;
  let cursor = daySet.has(dayKey(today)) ? today : addDays(today, -1);
  while (daySet.has(dayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...daySet].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of sorted) {
    const d = new Date(`${k}T00:00:00`);
    run = prev && Math.round((d - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best };
}

/** Aggregate a flat list of sessions into per-student stats. */
export function buildStudentStats(sessions = [], now = new Date()) {
  const today = startOfDay(now);
  const weekStart = addDays(today, -6);
  const prevWeekStart = addDays(today, -13);
  const map = new Map();
  for (const s of sessions) {
    const at = parseDbDate(s.created_at);
    if (!at) continue;
    let st = map.get(s.student_id);
    if (!st) {
      st = { lastAt: null, lastSession: null, days: new Set(), week: 0, prevWeek: 0, byDay: new Map() };
      map.set(s.student_id, st);
    }
    const key = dayKey(at);
    st.days.add(key);
    st.byDay.set(key, (st.byDay.get(key) || 0) + (s.minutes || 0));
    if (!st.lastAt || at > st.lastAt) {
      st.lastAt = at;
      st.lastSession = s;
    }
    if (at >= weekStart) st.week += s.minutes || 0;
    else if (at >= prevWeekStart) st.prevWeek += s.minutes || 0;
  }
  for (const st of map.values()) {
    const { current, best } = streaksFromDays(st.days, today);
    st.streak = current;
    st.bestStreak = best;
    st.activeToday = st.days.has(dayKey(today));
  }
  return map;
}

/** Minutes per day for the last `n` days (oldest → newest). */
export function lastNDays(sessions = [], n = 14, now = new Date()) {
  const today = startOfDay(now);
  const buckets = new Map();
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    buckets.set(dayKey(d), { key: dayKey(d), date: d, minutes: 0, sessions: 0 });
  }
  for (const s of sessions) {
    const at = parseDbDate(s.created_at);
    if (!at) continue;
    const b = buckets.get(dayKey(at));
    if (b) {
      b.minutes += s.minutes || 0;
      b.sessions += 1;
    }
  }
  return [...buckets.values()];
}

/** GitHub-style calendar: `weeks` columns × 7 rows (Mon → Sun). */
export function buildHeatmap(sessions = [], weeks = 18, now = new Date()) {
  const today = startOfDay(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = addDays(today, -mondayOffset - (weeks - 1) * 7);
  const byDay = new Map();
  for (const s of sessions) {
    const at = parseDbDate(s.created_at);
    if (!at) continue;
    const k = dayKey(at);
    byDay.set(k, (byDay.get(k) || 0) + (s.minutes || 0));
  }
  const columns = [];
  let max = 0;
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const k = dayKey(date);
      const minutes = byDay.get(k) || 0;
      max = Math.max(max, minutes);
      col.push({ key: k, date, minutes, future: date > today });
    }
    columns.push(col);
  }
  return { columns, max };
}

export function songCounts(sessions = []) {
  const counts = new Map();
  for (const s of sessions) for (const song of s.songs || []) counts.set(song, (counts.get(song) || 0) + 1);
  return [...counts.entries()].map(([song, count]) => ({ song, count })).sort((a, b) => b.count - a.count);
}

// ─── Networking ───────────────────────────────────────────────
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Upload with real progress events (fetch has no upload progress). */
export function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON response */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else {
        // Our API returns { error: "..." }; Cloudinary returns { error: { message } }.
        const msg = typeof data.error === "string" ? data.error : data.error?.message;
        const err = new Error(msg || `Upload failed (${xhr.status})`);
        err.status = xhr.status;
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

/**
 * Short, readable name for a practice clip, e.g. "Priya · 27 Sep, 6:40 PM".
 * Used instead of phone file names like "VID_20260927_183455_…mp4", which
 * are long, meaningless and break narrow layouts.
 */
export function clipLabel(name, uploadedAt) {
  const who = name ? firstName(name) : "Practice clip";
  const at = parseDbDate(uploadedAt, { utc: true });
  if (!at) return who;
  const day = `${at.getDate()} ${at.toLocaleDateString("en-US", { month: "short" })}`;
  const time = at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${who} · ${day}, ${time}`;
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
