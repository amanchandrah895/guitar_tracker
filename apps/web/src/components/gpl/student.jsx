"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Crown,
  Film,
  HardDrive,
  Loader2,
  Quote,
  Wand2,
  Flame,
  Globe,
  History,
  Lock,
  Minus,
  Music,
  Plus,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  HARDCODED_SONGS,
  addDays,
  api,
  buildStudentStats,
  clipLabel,
  firstName,
  formatBytes,
  formatDate,
  formatMinutes,
  parseDbDate,
  greeting,
  songCounts,
  toLocalInputs,
  uploadWithProgress,
} from "./lib";
import { Heatmap, MinutesBars } from "./charts";
import { SessionTimeline } from "./sessions";
import { compressVideo, probeDuration, shouldProcess } from "./compress";
import { possessive, useSettings } from "./settings";
import { Footer, Page, StudentNav } from "./shell";
import {
  Button,
  Chip,
  ErrorNote,
  Field,
  IconButton,
  Input,
  Modal,
  ModalHeader,
  ProgressBar,
  Segmented,
  Skeleton,
  StatTile,
  Textarea,
  Toggle,
  cx,
} from "./ui";

export function StudentDashboard({ student, onLogout, reloadAll }) {
  const [sessions, setSessions] = useState(null);
  const [modal, setModal] = useState(null); // "log" | "songs" | "delete"

  const loadSessions = useCallback(async () => {
    try {
      const d = await api(`/api/sessions/student/${student.id}`);
      setSessions(d.sessions || []);
    } catch {
      setSessions((s) => s || []);
      toast.error("Couldn't load your sessions");
    }
  }, [student.id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Keep dashboard + roster totals in sync after any change.
  const refresh = useCallback(async () => {
    await Promise.all([loadSessions(), reloadAll()]);
  }, [loadSessions, reloadAll]);

  const stat = useMemo(() => (sessions ? buildStudentStats(sessions).get(student.id) : null), [sessions, student.id]);
  const { instructorName, instructorNote, limits } = useSettings();
  // Stored clips, newest first (the server keeps only `limits.videosPerStudent`).
  const clips = useMemo(() => storedClips(sessions), [sessions]);
  const counts = useMemo(() => songCounts(sessions || []), [sessions]);
  const first = firstName(student.name);
  const isPublic = student.is_public !== 0;
  const week = stat?.week || 0;
  const prevWeek = stat?.prevWeek || 0;
  const delta = prevWeek ? Math.round(((week - prevWeek) / prevWeek) * 100) : null;
  const todayMinutes = stat?.byDay?.get(toLocalInputs(new Date()).date) || 0;

  const toggleVisibility = async (next) => {
    try {
      await api(`/api/students/${student.id}`, { method: "PATCH", body: { is_public: next } });
      toast.success(next ? "Your profile is now public" : "Your profile is now private");
      reloadAll();
    } catch {
      toast.error("Couldn't update visibility");
    }
  };

  let status;
  if (stat?.activeToday) status = { icon: CheckCircle2, cls: "text-emerald-300", text: `You practised today — ${formatMinutes(todayMinutes, { long: true })} logged. Nice.` };
  else if (stat?.streak > 0) status = { icon: Flame, cls: "text-gold-1", text: `Your ${stat.streak}-day streak is on the line — log a session today to keep it.` };
  else status = { icon: Music, cls: "text-ink-2", text: "Pick up the guitar — every session counts." };

  return (
    <Page>
      <StudentNav student={student} onLogout={onLogout} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-32 pt-6 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="font-display mt-2 text-4xl font-extrabold leading-[1.02] text-ink-1 sm:text-5xl lg:text-6xl">
              {greeting()}, <span className="font-accent text-amber-grad pr-1">{first}.</span>
            </h1>
            <p className={cx("mt-3 flex items-start gap-2 text-[15px]", status.cls)}>
              <status.icon className="mt-0.5 h-[18px] w-[18px] shrink-0" />
              <span className="text-ink-2">{status.text}</span>
            </p>
          </div>
          <div className="hidden gap-3 sm:flex">
            <Button variant="secondary" size="lg" icon={Music} onClick={() => setModal("songs")}>My songs</Button>
            <Button size="lg" icon={Plus} onClick={() => setModal("log")}>Log practice</Button>
          </div>
        </motion.div>

        {instructorNote && <InstructorNote name={instructorName} note={instructorNote} />}

        {/* KPI tiles */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile icon={Timer} label="Practice" value={student.total_minutes || 0} format={(v) => formatMinutes(v)} sub={`${student.session_count || 0} sessions logged`} delay={0.05} />
          <StatTile icon={Flame} label="Streak" value={stat?.streak || 0} format={(v) => `${Math.round(v)} day${Math.round(v) === 1 ? "" : "s"}`} sub={`Best: ${stat?.bestStreak || 0} days`} accent={(stat?.streak || 0) > 1} delay={0.1} />
          <StatTile
            icon={delta != null && delta < 0 ? TrendingDown : TrendingUp}
            label="This week"
            value={week}
            format={(v) => formatMinutes(v)}
            sub={delta == null ? (prevWeek === 0 && week > 0 ? "Up from 0 last week" : "Last 7 days") : `${delta > 0 ? "+" : ""}${delta}% vs previous 7 days`}
            delay={0.15}
          />
          <StatTile icon={Trophy} label="Songs" value={student.songs?.length || 0} format={(v) => String(Math.round(v))} sub={counts[0] ? `Most played: ${counts[0].song}` : "Add songs to practise"} delay={0.2} />
        </div>

        {/* Charts */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="panel min-w-0 p-5 sm:p-6 lg:col-span-2" aria-labelledby="chart14">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Minutes per day</p>
                <h2 id="chart14" className="font-display mt-1 text-xl font-bold text-ink-1">Last 14 days</h2>
              </div>
              <p className="text-right text-[13px] text-ink-3">
                <span className="block text-lg font-semibold text-ink-1">{formatMinutes((sessions || []).length ? (stat?.week || 0) + (stat?.prevWeek || 0) : 0)}</span>
                total
              </p>
            </div>
            {sessions === null ? <Skeleton className="h-48" /> : <MinutesBars sessions={sessions} />}
          </section>

          <section className="panel flex flex-col p-5 sm:p-6" aria-labelledby="songs-h">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">Repertoire</p>
                <h2 id="songs-h" className="font-display mt-1 text-xl font-bold text-ink-1">Your songs</h2>
              </div>
              <IconButton icon={Plus} label="Manage songs" onClick={() => setModal("songs")} className="border border-line-strong" />
            </div>
            <ul className="flex-1 space-y-3">
              {(student.songs || []).map((song) => {
                const c = counts.find((x) => x.song === song)?.count || 0;
                const max = counts[0]?.count || 1;
                return (
                  <li key={song}>
                    <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
                      <span className="truncate font-medium text-ink-1">{song}</span>
                      <span className="shrink-0 text-[12px] text-ink-3 tnum">{c ? `${c} session${c > 1 ? "s" : ""}` : "Not yet"}</span>
                    </div>
                    <ProgressBar value={c / max} className="mt-1.5" />
                  </li>
                );
              })}
              {(student.songs || []).length === 0 && <p className="text-sm text-ink-3">No songs yet — add what you're learning.</p>}
            </ul>
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="panel min-w-0 p-5 sm:p-6 lg:col-span-2" aria-labelledby="cal-h">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="eyebrow">Consistency</p>
                <h2 id="cal-h" className="font-display mt-1 text-xl font-bold text-ink-1">Practice calendar</h2>
              </div>
              <CalendarDays className="h-5 w-5 text-ink-3" />
            </div>
            {sessions === null ? <Skeleton className="h-40" /> : <Heatmap sessions={sessions} />}
          </section>
          <Milestones student={student} sessions={sessions} stat={stat} />
        </div>

        {/* History */}
        <section className="panel mt-4 p-5 sm:p-6" aria-labelledby="hist-h">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="eyebrow">Journal</p>
              <h2 id="hist-h" className="font-display mt-1 text-xl font-bold text-ink-1">Practice history</h2>
            </div>
            <History className="h-5 w-5 text-ink-3" />
          </div>
          {sessions === null ? (
            <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
          ) : (
            <SessionTimeline sessions={sessions} studentName={student.name} variant="student" onChanged={refresh} emptyAction={<Button icon={Plus} onClick={() => setModal("log")}>Log your first session</Button>} />
          )}
        </section>

        {/* Settings */}
        <section className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Profile settings">
          <StorageCard clips={clips} limits={limits} instructorName={instructorName} loading={sessions === null} />
          <div className="panel p-5 sm:p-6">
            <p className="eyebrow mb-3">Privacy</p>
            <Toggle
              checked={isPublic}
              onChange={toggleVisibility}
              icon={isPublic ? Globe : Lock}
              label={isPublic ? "Public profile" : "Private profile"}
              description={isPublic ? "Anyone can view your sessions and videos." : "Only you and your instructor can see them."}
            />
          </div>
          <div className="panel border-red-400/15 p-5 sm:p-6">
            <p className="eyebrow mb-3 !text-red-300/80">Danger zone</p>
            <div className="flex flex-col gap-4 rounded-2xl border border-red-400/15 bg-red-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink-1">Delete my profile</p>
                <p className="mt-0.5 text-[13px] text-ink-3">Removes your account, sessions and videos for good.</p>
              </div>
              <Button variant="danger-outline" size="sm" icon={Trash2} onClick={() => setModal("delete")} className="shrink-0">Delete</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#0b0a08]/85 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden">
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" icon={Music} onClick={() => setModal("songs")} aria-label="My songs" className="px-4" />
          <Button size="lg" full icon={Plus} onClick={() => setModal("log")}>Log practice</Button>
        </div>
      </div>

      <AnimatePresence>
        {modal === "log" && <LogPracticeModal key="log" student={student} clips={clips} streak={stat?.streak || 0} activeToday={!!stat?.activeToday} onClose={() => setModal(null)} onSaved={refresh} />}
        {modal === "songs" && <ManageSongsModal key="songs" student={student} onClose={() => setModal(null)} onSaved={reloadAll} />}
        {modal === "delete" && <DeleteProfileModal key="delete" student={student} onClose={() => setModal(null)} onDeleted={onLogout} reloadAll={reloadAll} />}
      </AnimatePresence>
    </Page>
  );
}

function storedClips(sessions) {
  return (sessions || [])
    .flatMap((s) => (s.videos || []).filter((v) => !v.removed).map((v) => ({ ...v, session: s })))
    .sort((a, b) => String(b.uploaded_at || "").localeCompare(String(a.uploaded_at || "")) || b.id - a.id);
}

const clipDate = (clip) => parseDbDate(clip.session?.created_at) || parseDbDate(clip.uploaded_at, { utc: true });

function InstructorNote({ name, note }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="panel relative mt-7 overflow-hidden p-5 sm:p-6"
      aria-label={`A note from ${name}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-gold-2/10 blur-3xl" />
      <div className="relative flex gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-grad text-[#1a1206]">
          <Quote className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">A note from {name}</p>
          <p className="font-accent mt-1.5 whitespace-pre-line text-[19px] leading-snug text-ink-1 sm:text-[21px]">{note}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-3"><Crown className="h-3.5 w-3.5 text-gold-2" /> {name}, your instructor</p>
        </div>
      </div>
    </motion.section>
  );
}

function ClipSlots({ clips, limit, className }) {
  return (
    <div className={cx("flex gap-1.5", className)} aria-hidden="true">
      {Array.from({ length: limit }).map((_, i) => (
        <span key={i} className={cx("h-1.5 flex-1 rounded-full", i < clips ? "bg-amber-grad" : "bg-white/[0.08]")} />
      ))}
    </div>
  );
}

function StorageCard({ clips, limits, instructorName, loading }) {
  const limit = limits.videosPerStudent;
  const used = Math.min(clips.length, limit);
  return (
    <div className="panel p-5 sm:p-6 md:col-span-2 lg:col-span-1">
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">Clip storage</p>
        <HardDrive className="h-4 w-4 text-ink-3" />
      </div>
      <p className="text-[15px] font-semibold text-ink-1 tnum">
        {loading ? "…" : `${used} of ${limit}`} <span className="font-normal text-ink-3">clips stored</span>
      </p>
      <ClipSlots clips={used} limit={limit} className="mt-2.5" />
      <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
        This is a free app, so we keep only your {limit} most recent clips. Uploading a new one deletes the oldest for good. {possessive(instructorName)} feedback stays, and your originals stay on your phone.
      </p>
    </div>
  );
}

// ─── Milestones ──────────────────────────────────────────────
const HOUR_MARKS = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

function Milestones({ student, sessions, stat }) {
  const total = student.total_minutes || 0;
  const hours = total / 60;
  const next = HOUR_MARKS.find((h) => h > hours) || HOUR_MARKS[HOUR_MARKS.length - 1];
  const prev = [...HOUR_MARKS].reverse().find((h) => h <= hours) || 0;
  const progress = next === prev ? 1 : (hours - prev) / (next - prev);
  const left = Math.max(0, next * 60 - total);

  const list = sessions || [];
  const longest = list.reduce((m, s) => Math.max(m, s.minutes || 0), 0);
  const byWeekday = new Array(7).fill(0);
  for (const [key, mins] of stat?.byDay || []) byWeekday[new Date(`${key}T00:00:00`).getDay()] += mins;
  const favIdx = byWeekday.some(Boolean) ? byWeekday.indexOf(Math.max(...byWeekday)) : -1;
  const favDay = favIdx >= 0 ? new Date(2024, 0, 7 + favIdx).toLocaleDateString("en-US", { weekday: "long" }) : "—";
  const avg = list.length ? Math.round(total / list.length) : 0;

  const R = 38;
  const C = 2 * Math.PI * R;
  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="ms-h">
      <p className="eyebrow">Milestones</p>
      <h2 id="ms-h" className="font-display mt-1 text-xl font-bold text-ink-1">Road to {next}h</h2>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-[92px] w-[92px] shrink-0">
          <svg viewBox="0 0 92 92" className="h-full w-full -rotate-90" aria-hidden="true">
            <defs>
              <linearGradient id="ms-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffd98a" />
                <stop offset="1" stopColor="#e8912c" />
              </linearGradient>
            </defs>
            <circle cx="46" cy="46" r={R} fill="none" stroke="rgba(255,236,205,0.07)" strokeWidth="8" />
            <motion.circle
              cx="46" cy="46" r={R} fill="none" stroke="url(#ms-grad)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - Math.min(1, progress)) }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-lg font-semibold text-ink-1">{Math.round(progress * 100)}%</span>
        </div>
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          <span className="font-semibold text-ink-1">{formatMinutes(left, { long: true })}</span> to go until your {next}-hour milestone.
        </p>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-2.5">
        {[
          ["Best streak", `${stat?.bestStreak || 0} days`],
          ["Longest session", formatMinutes(longest, { long: true })],
          ["Favourite day", favDay],
          ["Avg session", formatMinutes(avg, { long: true })],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-white/[0.02] px-3 py-2.5">
            <dt className="text-[11.5px] text-ink-3">{k}</dt>
            <dd className="mt-0.5 truncate text-[14.5px] font-semibold text-ink-1">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ─── Log practice ────────────────────────────────────────────
const QUICK_MINUTES = [15, 30, 45, 60, 90];

function LogPracticeModal({ student, clips = [], streak, activeToday, onClose, onSaved }) {
  const { limits, instructorName } = useSettings();
  const [songs, setSongs] = useState([]);
  const [newSong, setNewSong] = useState("");
  const [extra, setExtra] = useState([]);
  const [minutes, setMinutes] = useState(30);
  const [when, setWhen] = useState("today");
  const [custom, setCustom] = useState(() => toLocalInputs(new Date()));
  const [notes, setNotes] = useState("");
  // Selected clip: { original, file, phase: "checking" | "compressing" | "ready" | "blocked", ... }
  const [clip, setClip] = useState(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [drag, setDrag] = useState(false);
  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const [progress, setProgress] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const repertoire = [...(student.songs || []), ...extra];
  const toggle = (s) => setSongs((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  const addNew = () => {
    const s = newSong.trim();
    if (!s) return;
    if (!repertoire.some((x) => x.toLowerCase() === s.toLowerCase())) setExtra((p) => [...p, s]);
    setSongs((p) => (p.includes(s) ? p : [...p, s]));
    setNewSong("");
  };
  const maxBytes = limits.maxUploadMB * 1024 * 1024;
  const maxSeconds = limits.maxMinutes * 60;
  const file = clip?.phase === "ready" ? clip.file : null;
  const busyClip = clip?.phase === "checking" || clip?.phase === "compressing";
  // Clips that would be deleted if this one is uploaded (oldest first).
  const toRemove = clips.slice(Math.max(0, limits.videosPerStudent - 1)).reverse();

  const clearClip = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setClip(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const tooBig = (f, compressed) =>
    `${compressed ? "Even after compressing, this clip is" : "This clip is"} ${formatBytes(f.size)} — over the ${limits.maxUploadMB} MB limit. Set your camera to 720p, or trim the clip, and try again.`;

  const pickFile = async (f) => {
    if (!f) return;
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|mkv|3gp)$/i.test(f.name || "")) return setError("That file isn't a video. Try an MP4 or MOV.");
    setError("");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setClip({ original: f, file: f, phase: "checking" });

    const duration = await probeDuration(f);
    if (ctrl.signal.aborted) return;
    if (duration && duration > maxSeconds + 2) {
      setClip({ original: f, file: f, duration, phase: "blocked", message: `This clip is ${formatClock(duration)} long. Clips can be up to ${limits.maxMinutes} minutes — trim it in your phone's gallery and pick it again.` });
      return;
    }

    const needsWork = shouldProcess(f);
    if (!needsWork) {
      if (f.size > maxBytes) setClip({ original: f, file: f, duration, phase: "blocked", message: tooBig(f, false) });
      else setClip({ original: f, file: f, duration, phase: "ready" });
      return;
    }

    setClip({ original: f, file: f, duration, phase: "compressing", progress: 0 });
    try {
      const res = await compressVideo(f, {
        signal: ctrl.signal,
        onProgress: (p) => setClip((c) => (c && c.original === f && c.phase === "compressing" ? { ...c, progress: p } : c)),
      });
      if (ctrl.signal.aborted) return;
      if (res.file.size > maxBytes) setClip({ original: f, file: res.file, duration, phase: "blocked", message: tooBig(res.file, res.compressed) });
      else setClip({ original: f, file: res.file, duration, phase: "ready", compressed: res.compressed, before: res.before, after: res.after });
    } catch (e) {
      if (e?.name !== "AbortError") setClip({ original: f, file: f, duration, phase: f.size > maxBytes ? "blocked" : "ready", message: f.size > maxBytes ? tooBig(f, false) : undefined });
    }
  };

  // Stop compressing and use the file exactly as recorded (if it fits).
  const skipCompression = () => {
    const f = clip?.original;
    if (!f) return;
    abortRef.current?.abort();
    abortRef.current = null;
    if (f.size > maxBytes) setClip({ original: f, file: f, duration: clip.duration, phase: "blocked", message: tooBig(f, false) });
    else setClip({ original: f, file: f, duration: clip.duration, phase: "ready" });
  };

  const save = async ({ confirmed = false, withVideo = true } = {}) => {
    if (!songs.length) return setError("Tick at least one song you played.");
    const mins = Number(minutes);
    if (!mins || mins <= 0) return setError("How many minutes did you practise?");
    if (busyClip) return setError("Hang on — your video is still being prepared.");
    if (clip?.phase === "blocked" && withVideo) return setError("Remove or replace the video first — it can't be uploaded as it is.");
    const upload = withVideo ? file : null;
    // At the storage limit: make the student confirm which clip will be deleted.
    if (upload && toRemove.length && !confirmed) return setConfirmReplace(true);
    setConfirmReplace(false);
    setSaving(true);
    setError("");
    try {
      // Grow the repertoire with any brand-new songs first.
      const added = songs.filter((s) => !(student.songs || []).includes(s));
      if (added.length) await api(`/api/students/${student.id}`, { method: "PATCH", body: { songs: [...(student.songs || []), ...added] } });

      // Always send the student's local date/time so days/streaks are timezone-correct.
      const now = toLocalInputs(new Date());
      const at = when === "today" ? now : when === "yesterday" ? { date: toLocalInputs(addDays(new Date(), -1)).date, time: now.time } : custom;
      const { session } = await api("/api/sessions", {
        method: "POST",
        body: { studentId: student.id, songs, minutes: mins, notes: notes.trim() || null, practiceDate: at.date, practiceTime: at.time || "12:00" },
      });

      let removedNote = "";
      if (upload) {
        setProgress(0);
        try {
          const res = await uploadClip({ file: upload, sessionId: session.id, studentId: student.id, onProgress: setProgress });
          const n = res?.removed?.length || 0;
          if (n) removedNote = `Your oldest clip was removed to make room.`;
        } catch (e) {
          toast.error("Session saved, but the video didn't upload", { description: e.message });
        }
      }
      const extendsStreak = when === "today" && !activeToday;
      toast.success(`Session logged — ${formatMinutes(mins, { long: true })}`, {
        description: [extendsStreak ? `Streak: ${streak + 1} day${streak + 1 > 1 ? "s" : ""}. Keep going!` : "Nice work. Every minute counts.", removedNote].filter(Boolean).join(" "),
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.message || "Couldn't save your session.");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  return (
    <>
    <Modal onClose={saving ? undefined : onClose} size="lg" labelledBy="log-title" dismissible={!saving && !confirmReplace}>
      <ModalHeader id="log-title" icon={Timer} title="Log a practice session" subtitle={`Nice work, ${firstName(student.name)}. What did you play?`} onClose={saving ? undefined : onClose} />
      <div className="space-y-6">
        <Field label="Songs">
          <div className="flex flex-wrap gap-2">
            {repertoire.map((s) => (
              <Chip key={s} selected={songs.includes(s)} icon={songs.includes(s) ? CheckCircle2 : Music} onClick={() => toggle(s)}>{s}</Chip>
            ))}
          </div>
          <div className="mt-2.5 flex gap-2">
            <div className="flex-1"><Input icon={Plus} placeholder="Add a new song" value={newSong} onChange={(e) => setNewSong(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNew())} aria-label="Add a new song" /></div>
            <Button variant="secondary" onClick={addNew} disabled={!newSong.trim()}>Add</Button>
          </div>
        </Field>

        <Field label="Duration">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <IconButton icon={Minus} label="5 minutes less" onClick={() => setMinutes((m) => Math.max(5, (Number(m) || 0) - 5))} className="border border-line-strong" />
              <div className="relative w-28">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-line-strong bg-black/30 pr-12 text-center text-xl font-semibold text-ink-1 focus:border-gold-2/70 tnum"
                  aria-label="Minutes"
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">min</span>
              </div>
              <IconButton icon={Plus} label="5 minutes more" onClick={() => setMinutes((m) => (Number(m) || 0) + 5)} className="border border-line-strong" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_MINUTES.map((m) => (
                <Chip key={m} selected={Number(minutes) === m} onClick={() => setMinutes(m)}>{m >= 60 ? `${m / 60 === 1 ? "1h" : "1.5h"}` : `${m}m`}</Chip>
              ))}
            </div>
          </div>
        </Field>

        <Field label="When">
          <Segmented options={[{ value: "today", label: "Today" }, { value: "yesterday", label: "Yesterday" }, { value: "custom", label: "Pick a date" }]} value={when} onChange={setWhen} />
          {when === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input type="date" max={toLocalInputs(new Date()).date} value={custom.date} onChange={(e) => setCustom((c) => ({ ...c, date: e.target.value }))} aria-label="Practice date" />
              <Input type="time" value={custom.time} onChange={(e) => setCustom((c) => ({ ...c, time: e.target.value }))} aria-label="Practice time" />
            </div>
          )}
        </Field>

        <Field label="Notes" optional>
          <Textarea placeholder="What did you work on? e.g. barre chords, strumming at 80 bpm" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </Field>

        <Field
          label="Video clip"
          optional
          hint={`Up to ${limits.maxMinutes} min. Large videos are compressed on your device before upload, so the sound stays exactly as recorded.`}
        >
          <div className="mb-2.5 flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2">
            <HardDrive className="h-4 w-4 shrink-0 text-ink-3" />
            <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink-3">
              We store your <span className="font-semibold text-ink-2">{limits.videosPerStudent} most recent clips</span>
              {clips.length >= limits.videosPerStudent ? " — adding one replaces your oldest." : ` · ${clips.length} of ${limits.videosPerStudent} used`}
            </p>
            <ClipSlots clips={Math.min(clips.length, limits.videosPerStudent)} limit={limits.videosPerStudent} className="w-12 shrink-0" />
          </div>
          {clip ? (
            <ClipCard clip={clip} saving={saving} progress={progress} onRemove={clearClip} onSkip={skipCompression} onPickAnother={() => fileRef.current?.click()} />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); }}
              className={cx("flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors", drag ? "border-gold-2/70 bg-gold-2/[0.08]" : "border-line-strong bg-white/[0.02] hover:border-gold-2/40")}
            >
              <UploadCloud className="h-7 w-7 text-gold-2" />
              <span className="text-sm font-medium text-ink-1">Tap to choose a video <span className="hidden text-ink-3 sm:inline">or drop it here</span></span>
              <span className="text-[12px] text-ink-3">For {possessive(instructorName)} feedback · MP4 or MOV</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
        </Field>
      </div>
      <ErrorNote className="mt-5">{error}</ErrorNote>
      <div className="mt-6 flex gap-3">
        <Button variant="ghost" size="lg" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button size="lg" full loading={saving} disabled={busyClip} icon={busyClip ? Wand2 : CheckCircle2} onClick={() => save()}>
          {progress != null ? "Uploading video…" : busyClip ? "Preparing video…" : "Save session"}
        </Button>
      </div>
    </Modal>
    <AnimatePresence>
      {confirmReplace && (
        <ReplaceClipModal
          key="replace"
          toRemove={toRemove}
          limit={limits.videosPerStudent}
          instructorName={instructorName}
          onCancel={() => setConfirmReplace(false)}
          onConfirm={() => save({ confirmed: true })}
          onWithoutVideo={() => save({ withVideo: false })}
        />
      )}
    </AnimatePresence>
    </>
  );
}

/**
 * Upload a clip for a session. With Cloudinary configured the file goes
 * straight from the browser to Cloudinary (signed by our server) and is then
 * registered; otherwise it's posted to our own server.
 */
async function uploadClip({ file, sessionId, studentId, onProgress }) {
  const ticket = await api("/api/uploads/sign", { method: "POST", body: { sessionId, studentId } });
  if (ticket.mode === "cloudinary") {
    const form = new FormData();
    for (const [k, v] of Object.entries(ticket.fields)) form.append(k, String(v));
    form.append("file", file, file.name);
    const result = await uploadWithProgress(ticket.uploadUrl, form, (p) => onProgress?.(Math.min(0.98, p)));
    const pick = ({ public_id, version, signature, secure_url, bytes, duration, resource_type, original_filename, format }) =>
      ({ public_id, version, signature, secure_url, bytes, duration, resource_type, original_filename, format });
    const saved = await api("/api/videos", { method: "POST", body: { sessionId, studentId, originalName: file.name, cloudinary: pick(result) } });
    onProgress?.(1);
    return saved;
  }
  const form = new FormData();
  form.append("video", file, file.name);
  form.append("sessionId", String(sessionId));
  form.append("studentId", String(studentId));
  return uploadWithProgress("/api/videos", form, onProgress);
}

function formatClock(seconds) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

function ClipCard({ clip, saving, progress, onRemove, onSkip, onPickAnother }) {
  const { phase } = clip;
  const blocked = phase === "blocked";
  const meta = [];
  if (clip.duration) meta.push(formatClock(clip.duration));
  if (phase === "ready" && clip.compressed) meta.push(`${formatBytes(clip.before)} → ${formatBytes(clip.after)}`);
  else meta.push(formatBytes(clip.file.size));
  if (progress != null) meta.push(`uploading ${Math.round(progress * 100)}%`);

  return (
    <div className={cx("rounded-2xl border p-3.5", blocked ? "border-red-400/30 bg-red-500/[0.05]" : "border-gold-2/30 bg-gold-2/[0.06]")} data-testid="clip-card" data-phase={phase}>
      <div className="flex items-center gap-3">
        <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl", blocked ? "bg-red-500/15 text-red-300" : "bg-gold-2/15 text-gold-1")}>
          {blocked ? <AlertTriangle className="h-5 w-5" /> : phase === "compressing" ? <Wand2 className="h-5 w-5" /> : phase === "checking" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Film className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-1">{clip.original.name}</p>
          <p className="text-[12px] text-ink-3 tnum">
            {phase === "checking" ? "Checking video…" : phase === "compressing" ? `Compressing on your device · ${Math.round((clip.progress || 0) * 100)}%` : meta.join(" · ")}
          </p>
        </div>
        {!saving && <IconButton size="sm" icon={X} label="Remove video" onClick={onRemove} />}
      </div>
      {phase === "compressing" && (
        <>
          <ProgressBar value={clip.progress || 0} className="mt-3" />
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <p className="text-[12px] text-ink-3">Keep this screen open. Sound is copied untouched.</p>
            <button type="button" onClick={onSkip} className="shrink-0 text-[12.5px] font-medium text-gold-1 underline-offset-4 hover:underline">Skip</button>
          </div>
        </>
      )}
      {phase === "ready" && clip.compressed && progress == null && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />{" "}
          {clip.after < clip.before * 0.97 ? `${Math.round((1 - clip.after / clip.before) * 100)}% smaller, ready to upload` : "Converted to MP4 for smooth playback, ready to upload"}
        </p>
      )}
      {blocked && (
        <div className="mt-2.5 space-y-2">
          <p className="text-[12.5px] leading-relaxed text-red-200/90" role="alert">{clip.message}</p>
          <Button size="sm" variant="secondary" onClick={onPickAnother}>Choose another video</Button>
        </div>
      )}
      {progress != null && <ProgressBar value={progress} className="mt-3" />}
    </div>
  );
}

function ReplaceClipModal({ toRemove, limit, instructorName, onCancel, onConfirm, onWithoutVideo }) {
  const many = toRemove.length > 1;
  return (
    <Modal onClose={onCancel} size="sm" labelledBy="replace-title">
      <div className="flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-gold-2/30 bg-gold-2/10 text-gold-1"><Film className="h-6 w-6" /></span>
        <h2 id="replace-title" className="font-display mt-4 text-[22px] font-bold text-ink-1">Replace your oldest clip?</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          You already have {limit} clips stored. Uploading this one will permanently delete {many ? "these clips" : "this clip"}:
        </p>
      </div>
      <ul className="mt-4 space-y-2">
        {toRemove.map((c) => {
          const at = clipDate(c);
          const notes = c.comments?.length || 0;
          return (
            <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.03] px-3.5 py-3">
              <span className="grid h-10 w-10 shrink-0 place-content-center rounded-xl border border-line bg-black/25 text-center">
                <span className="font-display text-base font-bold leading-none text-ink-1">{at ? at.getDate() : "–"}</span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-3">{at ? at.toLocaleDateString("en-US", { month: "short" }) : ""}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink-1">{at ? formatDate(at, { weekday: "short", month: "short", day: "numeric" }) : "Earlier clip"}</p>
                <p className="truncate text-[12px] text-ink-3">
                  {(c.session?.songs || []).join(", ") || clipLabel(null, c.uploaded_at)}
                  {notes ? ` · ${notes} note${notes > 1 ? "s" : ""} from ${instructorName} (kept)` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-center text-[12.5px] text-ink-3">The video can't be recovered afterwards. Any feedback on it stays in your history.</p>
      <div className="mt-6 flex flex-col gap-2.5">
        <Button size="lg" full icon={CheckCircle2} onClick={onConfirm}>Replace and save</Button>
        <Button variant="secondary" size="lg" full onClick={onWithoutVideo}>Save without the video</Button>
        <Button variant="ghost" full onClick={onCancel}>Go back</Button>
      </div>
    </Modal>
  );
}

// ─── Manage songs ────────────────────────────────────────────
function ManageSongsModal({ student, onClose, onSaved }) {
  const [list, setList] = useState(student.songs || []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const suggestions = HARDCODED_SONGS.filter((s) => !list.includes(s));

  const persist = async (next, message) => {
    const prev = list;
    setList(next);
    setBusy(true);
    try {
      await api(`/api/students/${student.id}`, { method: "PATCH", body: { songs: next } });
      toast.success(message);
      onSaved();
    } catch {
      setList(prev);
      toast.error("Couldn't update your songs");
    } finally {
      setBusy(false);
    }
  };
  const add = (s) => {
    const v = (s ?? input).trim();
    if (!v || list.some((x) => x.toLowerCase() === v.toLowerCase())) return setInput("");
    persist([...list, v], `Added "${v}"`);
    setInput("");
  };
  const remove = (s) => {
    if (list.length <= 1) return toast.error("Keep at least one song in your repertoire");
    persist(list.filter((x) => x !== s), `Removed "${s}"`);
  };

  return (
    <Modal onClose={onClose} size="md" labelledBy="songs-title">
      <ModalHeader id="songs-title" icon={Music} title="Your songs" subtitle="These appear when you log a session." onClose={onClose} />
      <div className="flex flex-wrap gap-2">
        {list.map((s) => (
          <span key={s} title={s} className="inline-flex max-w-full items-center gap-1 rounded-full border border-gold-2/40 bg-gold-2/[0.1] py-1 pl-3.5 pr-1 text-[13px] font-medium text-gold-1">
            <span className="min-w-0 truncate">{s}</span>
            <button type="button" onClick={() => remove(s)} disabled={busy} aria-label={`Remove ${s}`} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-gold-1/70 hover:bg-black/20 hover:text-ink-1">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <div className="flex-1"><Input icon={Plus} placeholder="Add a song…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} data-autofocus aria-label="Add a song" /></div>
        <Button onClick={() => add()} disabled={!input.trim() || busy}>Add</Button>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-5">
          <p className="eyebrow mb-2">Class songs</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => <Chip key={s} icon={Plus} onClick={() => add(s)}>{s}</Chip>)}
          </div>
        </div>
      )}
      <Button variant="secondary" size="lg" full className="mt-7" onClick={onClose}>Done</Button>
    </Modal>
  );
}

// ─── Delete profile ──────────────────────────────────────────
function DeleteProfileModal({ student, onClose, onDeleted, reloadAll }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const del = async () => {
    setBusy(true);
    setError("");
    try {
      await api(`/api/students/${student.id}`, { method: "DELETE" });
      toast.success("Your profile has been deleted");
      onDeleted();
      reloadAll();
    } catch (e) {
      setError(e.message || "Couldn't delete your profile.");
      setBusy(false);
    }
  };
  return (
    <Modal onClose={busy ? undefined : onClose} size="sm" labelledBy="del-title" dismissible={!busy}>
      <div className="flex flex-col items-center text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl border border-red-400/30 bg-red-500/10 text-red-300"><Trash2 className="h-7 w-7" /></span>
        <h2 id="del-title" className="font-display mt-5 text-2xl font-bold text-ink-1">Are you sure?</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
          This permanently deletes <span className="font-semibold text-ink-1">{student.name}</span>'s profile, all {student.session_count || 0} practice sessions and any uploaded videos.
        </p>
        <p className="mt-2 text-[13px] font-semibold text-red-300">This cannot be undone.</p>
      </div>
      <ErrorNote className="mt-4">{error}</ErrorNote>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
        <Button variant="secondary" size="lg" full onClick={onClose} disabled={busy}>Keep my profile</Button>
        <Button variant="danger" size="lg" full icon={Trash2} loading={busy} onClick={del}>Yes, delete</Button>
      </div>
    </Modal>
  );
}
