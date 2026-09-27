"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BellRing,
  CheckCircle2,
  Crown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Film,
  Flame,
  Globe,
  HardDrive,
  KeyRound,
  PenLine,
  Quote,
  Save,
  LayoutDashboard,
  Lock,
  MessageSquareText,
  Search,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { LEVELS, api, buildStudentStats, firstName, formatMinutes, levelColor, parseDbDate, songCounts, startOfDay, addDays, timeAgo } from "./lib";
import { Heatmap, MinutesBars } from "./charts";
import { SessionTimeline } from "./sessions";
import { MiniStat } from "./auth";
import { AdminNav, DevCredit, Footer, Page } from "./shell";
import { useSettings } from "./settings";
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  ErrorNote,
  Field,
  IconButton,
  Input,
  LevelBadge,
  Modal,
  ModalHeader,
  PasswordInput,
  Segmented,
  Textarea,
  Skeleton,
  StatTile,
  cx,
} from "./ui";

function useFeedbackQueue() {
  const [queue, setQueue] = useState(null);
  const load = useCallback(async () => {
    try {
      const { videos = [] } = await api("/api/videos");
      // Newer servers include comment_count; fall back to one request per clip.
      const withCounts = await Promise.all(
        videos.map(async (v) => {
          if (v.comment_count != null) return { ...v, commentCount: Number(v.comment_count) };
          const { comments = [] } = await api(`/api/comments?videoId=${v.id}`).catch(() => ({ comments: [] }));
          return { ...v, commentCount: comments.length };
        })
      );
      setQueue(withCounts.filter((v) => v.commentCount === 0));
    } catch {
      setQueue([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return [queue, load];
}

export function AdminDashboard({ students, sessions, adminKey, setAdminKey, onLogout, reloadAll }) {
  const [tab, setTab] = useState("overview");
  const [review, setReview] = useState(null);
  const [queue, reloadQueue] = useFeedbackQueue();
  const stats = useMemo(() => buildStudentStats(sessions), [sessions]);
  const { instructorName } = useSettings();

  const tabs = [
    { value: "overview", label: "Overview", icon: LayoutDashboard },
    { value: "students", label: "Students", icon: Users, count: students.length },
    { value: "passwords", label: "Passwords", icon: KeyRound },
    { value: "profile", label: "My profile", icon: PenLine },
  ];

  return (
    <Page>
      <AdminNav onLogout={onLogout} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="font-display mt-2 text-4xl font-extrabold leading-[1.02] text-ink-1 sm:text-5xl">
            Welcome back, <span className="font-accent text-amber-grad pr-1">{instructorName}.</span>
          </h1>
          <p className="mt-3 flex items-center gap-2 text-[15px] text-ink-2">
            {queue === null ? (
              "Checking for new clips…"
            ) : queue.length ? (
              <>
                <BellRing className="h-[18px] w-[18px] text-gold-1" />
                <span><span className="font-semibold text-ink-1">{queue.length} clip{queue.length > 1 ? "s" : ""}</span> waiting for your feedback.</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-[18px] w-[18px] text-emerald-300" /> All caught up — no clips waiting.
              </>
            )}
          </p>
        </motion.div>

        <div className="no-scrollbar -mx-4 mt-7 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Segmented options={tabs} value={tab} onChange={setTab} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="mt-6">
            {tab === "overview" && <Overview students={students} sessions={sessions} stats={stats} queue={queue} onReview={setReview} />}
            {tab === "students" && <StudentsTable students={students} stats={stats} onReview={setReview} />}
            {tab === "passwords" && <PasswordsPanel adminKey={adminKey} setAdminKey={setAdminKey} students={students} />}
            {tab === "profile" && <ProfilePanel adminKey={adminKey} setAdminKey={setAdminKey} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <AnimatePresence>
        {review && (
          <ReviewStudentModal
            key={review.id}
            student={review}
            onClose={() => setReview(null)}
            onChanged={() => {
              reloadQueue();
              reloadAll();
            }}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}

// ─── Overview ────────────────────────────────────────────────
function Overview({ students, sessions, stats, queue, onReview }) {
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const weekStart = addDays(startOfDay(), -6);
  const weekSessions = sessions.filter((s) => (parseDbDate(s.created_at) || 0) >= weekStart);
  const weekMinutes = weekSessions.reduce((a, s) => a + (s.minutes || 0), 0);
  const totalMinutes = students.reduce((a, s) => a + (s.total_minutes || 0), 0);
  const active = [...stats.values()].filter((st) => st.week > 0).length;
  const privateCount = students.filter((s) => s.is_public === 0).length;

  const nudge = students
    .map((s) => ({ s, last: stats.get(s.id)?.lastAt || null }))
    .filter(({ last }) => !last || (Date.now() - last) / 86400000 >= 5)
    .sort((a, b) => (a.last?.getTime() || 0) - (b.last?.getTime() || 0))
    .slice(0, 4);

  const top = students
    .map((s) => ({ s, v: stats.get(s.id)?.week || 0 }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 5);

  const recent = sessions
    .map((s) => ({ ...s, at: parseDbDate(s.created_at) }))
    .filter((s) => s.at)
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={Users} label="Players" value={students.length} format={(v) => String(Math.round(v))} sub={`${privateCount} private profile${privateCount === 1 ? "" : "s"}`} />
        <StatTile icon={Activity} label="Active" value={active} format={(v) => `${Math.round(v)} / ${students.length}`} sub="Practised this week" accent delay={0.05} />
        <StatTile icon={Timer} label="Practice" value={totalMinutes} format={(v) => formatMinutes(v)} sub={`${formatMinutes(weekMinutes)} this week`} delay={0.1} />
        <StatTile icon={Film} label="Sessions" value={sessions.length} format={(v) => String(Math.round(v))} sub={`${weekSessions.length} this week`} delay={0.15} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel p-5 sm:p-6 lg:col-span-2">
          <p className="eyebrow">Whole class</p>
          <h2 className="font-display mt-1 text-xl font-bold text-ink-1">Minutes per day · last 14 days</h2>
          <div className="mt-5"><MinutesBars sessions={sessions} /></div>
        </section>

        <section className="panel flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Inbox</p>
              <h2 className="font-display mt-1 text-xl font-bold text-ink-1">Needs feedback</h2>
            </div>
            {queue?.length > 0 && <span className="rounded-full bg-amber-grad px-2.5 py-0.5 text-[12px] font-bold text-[#1a1206] tnum">{queue.length}</span>}
          </div>
          <div className="mt-4 flex-1">
            {queue === null ? (
              <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
            ) : queue.length === 0 ? (
              <EmptyState compact icon={MessageSquareText} title="Inbox zero" body="Every clip has feedback." />
            ) : (
              <ul className="space-y-2">
                {queue.slice(0, 5).map((v) => {
                  const st = byId.get(v.student_id);
                  if (!st) return null;
                  const at = parseDbDate(v.uploaded_at, { utc: true });
                  return (
                    <li key={v.id}>
                      <button type="button" onClick={() => onReview(st)} className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-white/[0.02] p-3 text-left transition-colors hover:border-gold-2/30 hover:bg-gold-2/[0.04]">
                        <Avatar name={st.name} level={st.level} size={38} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-semibold text-ink-1">{st.name}</span>
                          <span className="block truncate text-[12px] text-ink-3">{v.original_name || "Practice clip"} · {at ? timeAgo(at) : ""}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-ink-3 group-hover:text-gold-1" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="panel p-5 sm:p-6 lg:col-span-3">
          <p className="eyebrow">Activity</p>
          <h2 className="font-display mt-1 text-xl font-bold text-ink-1">Latest sessions</h2>
          {recent.length === 0 ? (
            <EmptyState compact icon={Activity} title="No sessions yet" />
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {recent.map((s) => {
                const st = byId.get(s.student_id);
                if (!st) return null;
                return (
                  <li key={s.id}>
                    <button type="button" onClick={() => onReview(st)} className="flex w-full items-center gap-3 py-3 text-left hover:opacity-90">
                      <Avatar name={st.name} level={st.level} size={34} locked={st.is_public === 0} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] text-ink-2"><span className="font-semibold text-ink-1">{st.name}</span> · {(s.songs || []).join(", ")}</span>
                        <span className="block text-[12px] text-ink-3">{timeAgo(s.at)}</span>
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold text-gold-1 tnum">{formatMinutes(s.minutes)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <div className="flex flex-col gap-4 lg:col-span-2">
        <section className="panel p-5 sm:p-6">
          <p className="eyebrow">Check in</p>
          <h2 className="font-display mt-1 text-xl font-bold text-ink-1">Needs a nudge</h2>
          <p className="mt-1 text-[13px] text-ink-3">No practice logged in 5+ days.</p>
          {nudge.length === 0 ? (
            <EmptyState compact icon={Flame} title="Everyone's playing" body="All students practised this week." />
          ) : (
            <ul className="mt-4 space-y-1.5">
              {nudge.map(({ s, last }) => (
                <li key={s.id}>
                  <button type="button" onClick={() => onReview(s)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]">
                    <Avatar name={s.name} level={s.level} size={32} />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink-1">{s.name}</span>
                    <span className="shrink-0 text-[12px] text-ink-3">{last ? `Last: ${timeAgo(last)}` : "Never logged"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel p-5 sm:p-6">
          <p className="eyebrow">Momentum</p>
          <h2 className="font-display mt-1 text-xl font-bold text-ink-1">Top this week</h2>
          {top.length === 0 ? (
            <EmptyState compact icon={Flame} title="No practice this week" />
          ) : (
            <ol className="mt-4 space-y-1.5">
              {top.map(({ s, v }, i) => (
                <li key={s.id}>
                  <button type="button" onClick={() => onReview(s)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]">
                    <span className="w-4 text-center text-[12px] font-semibold text-ink-3 tnum">{i + 1}</span>
                    <Avatar name={s.name} level={s.level} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink-1">{s.name}</span>
                      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/[0.06]"><span className="block h-full rounded-full bg-gold-2/75" style={{ width: `${(v / top[0].v) * 100}%` }} /></span>
                    </span>
                    <span className="w-14 text-right text-[12.5px] font-semibold text-ink-2 tnum">{formatMinutes(v)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}

// ─── Students ────────────────────────────────────────────────
function StudentsTable({ students, stats, onReview }) {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("practice");
  const levels = useMemo(() => {
    const present = new Set(students.map((s) => s.level).filter(Boolean));
    return [...LEVELS.filter((l) => present.has(l)), ...[...present].filter((l) => !LEVELS.includes(l))];
  }, [students]);
  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const recent = (s) => stats.get(s.id)?.lastAt?.getTime() || 0;
    return students
      .filter((s) => (level === "all" || s.level === level) && (!qq || s.name.toLowerCase().includes(qq)))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "recent" ? recent(b) - recent(a) : b.total_minutes - a.total_minutes));
  }, [students, stats, q, level, sort]);

  return (
    <div className="panel p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="lg:w-80"><Input icon={Search} placeholder="Search students…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" /></div>
        <Segmented options={[{ value: "practice", label: "Most practice" }, { value: "recent", label: "Recent" }, { value: "name", label: "A–Z" }]} value={sort} onChange={setSort} />
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip selected={level === "all"} onClick={() => setLevel("all")}>All</Chip>
        {levels.map((l) => (
          <Chip key={l} selected={level === l} onClick={() => setLevel(l)}><span className="h-2 w-2 rounded-full" style={{ background: levelColor(l) }} />{l}</Chip>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState compact icon={Search} title="No students found" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] uppercase tracking-wider text-ink-3">
                  <th className="py-3 pr-4 font-semibold">Student</th>
                  <th className="px-3 py-3 font-semibold">Level</th>
                  <th className="px-3 py-3 font-semibold">Visibility</th>
                  <th className="px-3 py-3 text-right font-semibold">Practice</th>
                  <th className="px-3 py-3 text-right font-semibold">Sessions</th>
                  <th className="px-3 py-3 text-right font-semibold">Streak</th>
                  <th className="px-3 py-3 font-semibold">Last active</th>
                  <th className="py-3 pl-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((s) => {
                  const st = stats.get(s.id);
                  return (
                    <tr key={s.id} className="group cursor-pointer transition-colors hover:bg-white/[0.025]" onClick={() => onReview(s)}>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-3"><Avatar name={s.name} level={s.level} size={36} /><span className="font-semibold text-ink-1">{s.name}</span></span>
                      </td>
                      <td className="px-3 py-3"><LevelBadge level={s.level} /></td>
                      <td className="px-3 py-3 text-ink-2">
                        <span className="flex items-center gap-1.5">{s.is_public === 0 ? <><Lock className="h-3.5 w-3.5" />Private</> : <><Globe className="h-3.5 w-3.5" />Public</>}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-ink-1 tnum">{formatMinutes(s.total_minutes)}</td>
                      <td className="px-3 py-3 text-right text-ink-2 tnum">{s.session_count}</td>
                      <td className="px-3 py-3 text-right tnum">{st?.streak ? <span className="inline-flex items-center gap-1 font-semibold text-gold-1"><Flame className="h-3.5 w-3.5" />{st.streak}</span> : <span className="text-ink-4">—</span>}</td>
                      <td className="px-3 py-3 text-ink-3">{st?.lastAt ? timeAgo(st.lastAt) : "Never"}</td>
                      <td className="py-3 pl-3 text-right"><Button variant="secondary" size="sm" iconRight={ChevronRight} onClick={(e) => { e.stopPropagation(); onReview(s); }}>Review</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="mt-4 space-y-2.5 md:hidden">
            {rows.map((s) => {
              const st = stats.get(s.id);
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => onReview(s)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white/[0.02] p-3.5 text-left">
                    <Avatar name={s.name} level={s.level} size={44} locked={s.is_public === 0} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink-1">{s.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
                        <LevelBadge level={s.level} />
                        <span className="tnum">{formatMinutes(s.total_minutes)}</span>
                        {st?.streak > 1 && <span className="flex items-center gap-0.5 text-gold-1"><Flame className="h-3 w-3" />{st.streak}d</span>}
                        <span>{st?.lastAt ? timeAgo(st.lastAt) : "Never"}</span>
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-ink-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

// ─── Passwords ───────────────────────────────────────────────
// ─── Instructor profile ──────────────────────────────────────
const NAME_MAX = 40;
const NOTE_MAX = 280;

function ProfilePanel({ adminKey, setAdminKey }) {
  const { instructorName, instructorNote, limits, setSettings } = useSettings();
  const [name, setName] = useState(instructorName);
  const [note, setNote] = useState(instructorNote);
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = name.trim() !== instructorName || note.trim() !== (instructorNote || "");
  const previewName = name.replace(/\s+/g, " ").trim() || instructorName;

  const save = async (e) => {
    e.preventDefault();
    const n = name.replace(/\s+/g, " ").trim();
    if (!n) return setError("Your name can't be empty.");
    const key = adminKey || pw;
    if (!key) return setError("Confirm your instructor password to save.");
    setSaving(true);
    setError("");
    try {
      const d = await api("/api/admin/settings", { method: "POST", body: { adminPassword: key, instructorName: n, instructorNote: note.trim() } });
      setSettings(d);
      setName(d.instructorName);
      setNote(d.instructorNote || "");
      if (!adminKey) setAdminKey(key);
      setPw("");
      toast.success("Profile saved", { description: `Students now see you as ${d.instructorName}.` });
    } catch (err) {
      if (err.status === 401) {
        setAdminKey(null);
        setError("That instructor password isn't right.");
      } else setError(err.message || "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <form onSubmit={save} className="panel p-5 sm:p-7">
        <p className="eyebrow">Make it yours</p>
        <h2 className="font-display mt-1 text-2xl font-bold text-ink-1">How students see you</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">Your name appears on every piece of feedback, on the login screen and across the app. Add a note and it greets each student on their dashboard.</p>
        <div className="mt-6 space-y-5">
          <Field label="Display name" hint={`${name.trim().length}/${NAME_MAX} · e.g. Ohila, Ohila Ma'am, Ms. Ohila`}>
            <Input value={name} maxLength={NAME_MAX} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Your name" aria-label="Display name" />
          </Field>
          <Field label="Note to the class" optional hint={`${note.trim().length}/${NOTE_MAX} · leave empty to hide it`}>
            <Textarea
              value={note}
              maxLength={NOTE_MAX}
              rows={4}
              onChange={(e) => { setNote(e.target.value); setError(""); }}
              placeholder="e.g. Ten focused minutes beat an hour of noodling. Record one clean take this week."
              aria-label="Note to the class"
            />
          </Field>
          {!adminKey && (
            <Field label="Instructor password" hint="Needed once per visit to save changes.">
              <PasswordInput value={pw} onChange={(e) => { setPw(e.target.value); setError(""); }} placeholder="Confirm instructor password" aria-label="Instructor password" />
            </Field>
          )}
        </div>
        <ErrorNote className="mt-4">{error}</ErrorNote>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {dirty && <Button type="button" variant="ghost" onClick={() => { setName(instructorName); setNote(instructorNote || ""); setError(""); }}>Reset</Button>}
          <Button type="submit" size="lg" icon={Save} loading={saving} disabled={!dirty && !!adminKey}>Save profile</Button>
        </div>
      </form>

      <div className="space-y-4">
        <section className="panel p-5 sm:p-6" aria-label="Preview">
          <p className="eyebrow">Live preview</p>
          {note.trim() ? (
            <div className="mt-3 flex gap-3.5 rounded-2xl border border-line bg-white/[0.02] p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-grad text-[#1a1206]"><Quote className="h-[18px] w-[18px]" /></span>
              <div className="min-w-0">
                <p className="eyebrow">A note from {previewName}</p>
                <p className="font-accent mt-1 whitespace-pre-line break-words text-[18px] leading-snug text-ink-1">{note.trim()}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-line-strong px-4 py-5 text-center text-[13px] text-ink-3">Write a note to see how it greets students.</p>
          )}
          <p className="eyebrow mt-5">Feedback on a clip</p>
          <div className="mt-2.5 flex gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-grad text-[#1a1206]"><Crown className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-gold-2/20 bg-gold-2/[0.06] px-3 py-2">
              <p className="text-[11.5px] font-semibold text-gold-1">{previewName} <span className="font-normal text-ink-3">· just now</span></p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-1">Lovely tone on the chorus. Try the bridge at 70 bpm before speeding up.</p>
            </div>
          </div>
        </section>

        <section className="panel p-5 sm:p-6" aria-label="Storage policy">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Storage policy</p>
            <HardDrive className="h-4 w-4 text-ink-3" />
          </div>
          <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-2">
            <li>Each student keeps their <span className="font-semibold text-ink-1">{limits.videosPerStudent} latest clips</span>. Older ones are deleted automatically, but your feedback on them stays.</li>
            <li>Clips can be up to <span className="font-semibold text-ink-1">{limits.maxMinutes} minutes</span>. Big videos are compressed on the student's phone before upload.</li>
          </ul>
          <DevCredit compact className="mt-4" />
        </section>
      </div>
    </div>
  );
}

function PasswordsPanel({ adminKey, setAdminKey, students = [] }) {
  const levelOf = useMemo(() => new Map(students.map((s) => [s.id, s.level])), [students]);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlockPw, setUnlockPw] = useState("");
  const [revealed, setRevealed] = useState({});
  const [q, setQ] = useState("");

  const load = useCallback(
    async (key) => {
      setLoading(true);
      setError("");
      try {
        const { students = [] } = await api("/api/admin/reveal-passwords", { method: "POST", body: { adminPassword: key } });
        setRows(students);
        return true;
      } catch (e) {
        if (e.status === 401) {
          setAdminKey(null);
          setError("That instructor password isn't right.");
        } else setError("Couldn't load passwords. Try again.");
        setRows(null);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setAdminKey]
  );

  useEffect(() => {
    if (adminKey) load(adminKey);
  }, [adminKey, load]);

  const unlock = async (e) => {
    e.preventDefault();
    if (!unlockPw) return setError("Enter your instructor password.");
    if (await load(unlockPw)) setAdminKey(unlockPw);
  };
  const copy = async (s) => {
    try {
      await navigator.clipboard.writeText(s.plain_password || "");
      toast.success(`Copied ${firstName(s.name)}'s password`, { description: "Share it privately." });
    } catch {
      toast.error("Clipboard not available — reveal and read it out instead.");
    }
  };

  if (!adminKey || !rows) {
    return (
      <div className="panel mx-auto max-w-lg p-6 sm:p-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-gold-2/25 bg-gold-2/10 text-gold-1"><ShieldCheck className="h-7 w-7" /></span>
        <h2 className="font-display mt-5 text-2xl font-bold text-ink-1">Student passwords</h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">If a student forgets their password, you can look it up here and share it with them privately.</p>
        {adminKey && loading ? (
          <div className="mt-6 space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        ) : (
          <form onSubmit={unlock} className="mt-6 space-y-3">
            <PasswordInput placeholder="Confirm instructor password" value={unlockPw} onChange={(e) => { setUnlockPw(e.target.value); setError(""); }} aria-label="Instructor password" />
            <ErrorNote>{error}</ErrorNote>
            <Button type="submit" size="lg" full icon={Eye} loading={loading}>Unlock passwords</Button>
          </form>
        )}
      </div>
    );
  }

  const list = rows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()));
  const anyRevealed = Object.values(revealed).some(Boolean);
  return (
    <div className="panel p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:w-80"><Input icon={Search} placeholder="Find a student…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a student" /></div>
        <div className="flex gap-2">
          {anyRevealed && <Button variant="secondary" size="sm" icon={EyeOff} onClick={() => setRevealed({})}>Hide all</Button>}
          <Button variant="ghost" size="sm" icon={Lock} onClick={() => { setAdminKey(null); setRows(null); setRevealed({}); }}>Lock</Button>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {list.map((s) => {
          const show = revealed[s.id];
          return (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <Avatar name={s.name} level={levelOf.get(s.id)} size={36} />
              <span className="min-w-0 flex-1 truncate font-medium text-ink-1">{s.name}</span>
              <code className={cx("rounded-lg px-2.5 py-1 font-mono text-[13.5px] tracking-wider", show ? "bg-gold-2/10 text-gold-1" : "text-ink-3")}>
                {show ? s.plain_password || <span className="font-sans italic text-ink-3">not set</span> : "••••••••"}
              </code>
              <IconButton icon={show ? EyeOff : Eye} label={show ? "Hide password" : "Show password"} onClick={() => setRevealed((r) => ({ ...r, [s.id]: !r[s.id] }))} />
              <IconButton icon={Copy} label="Copy password" onClick={() => copy(s)} disabled={!s.plain_password} />
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <EmptyState compact icon={Search} title="No match" />}
    </div>
  );
}

// ─── Review a student (with feedback composer) ───────────────
function ReviewStudentModal({ student, onClose, onChanged }) {
  const [sessions, setSessions] = useState(null);
  const load = useCallback(() => api(`/api/sessions/student/${student.id}`).then((d) => setSessions(d.sessions || [])).catch(() => setSessions([])), [student.id]);
  useEffect(() => {
    load();
  }, [load]);
  const stat = useMemo(() => (sessions ? buildStudentStats(sessions).get(student.id) : null), [sessions, student.id]);
  const songs = useMemo(() => songCounts(sessions || []), [sessions]);
  const pending = (sessions || []).reduce((n, s) => n + (s.videos || []).filter((v) => !v.comments?.length).length, 0);

  return (
    <Modal onClose={onClose} size="xl" labelledBy="review-title">
      <ModalHeader
        id="review-title"
        onClose={onClose}
        visual={<Avatar name={student.name} level={student.level} size={64} locked={student.is_public === 0} />}
        title={student.name}
        subtitle={
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <LevelBadge level={student.level} />
            <span className="flex items-center gap-1 text-ink-3">{student.is_public === 0 ? <><Lock className="h-3.5 w-3.5" /> Private</> : <><Globe className="h-3.5 w-3.5" /> Public</>}</span>
            {pending > 0 && <span className="rounded-full bg-gold-2/15 px-2 py-0.5 text-[11.5px] font-semibold text-gold-1">{pending} clip{pending > 1 ? "s" : ""} need feedback</span>}
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MiniStat label="Total practice" value={formatMinutes(student.total_minutes)} />
        <MiniStat label="Sessions" value={student.session_count} />
        <MiniStat label="Current streak" value={`${stat?.streak || 0}d`} icon={stat?.streak > 1 ? Flame : null} />
        <MiniStat label="This week" value={formatMinutes(stat?.week || 0)} />
      </div>
      {sessions === null ? (
        <div className="mt-6 space-y-3"><Skeleton className="h-36" /><Skeleton className="h-24" /></div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            <div className="min-w-0 rounded-2xl border border-line bg-black/20 p-4 lg:col-span-3">
              <p className="mb-3 text-[13px] font-semibold text-ink-1">Practice calendar</p>
              <Heatmap sessions={sessions} />
            </div>
            <div className="rounded-2xl border border-line bg-black/20 p-4 lg:col-span-2">
              <p className="mb-3 text-[13px] font-semibold text-ink-1">Songs</p>
              <div className="flex flex-wrap gap-1.5">
                {(student.songs || []).map((song) => {
                  const c = songs.find((x) => x.song === song)?.count || 0;
                  return (
                    <span key={song} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-[12.5px] text-ink-2">
                      {song}<span className="text-ink-3 tnum">{c}×</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <p className="mb-3 text-[15px] font-semibold text-ink-1">Sessions & clips</p>
            <SessionTimeline
              sessions={sessions}
              variant="admin"
              pageSize={5}
              onChanged={() => {
                load();
                onChanged();
              }}
            />
          </div>
        </>
      )}
    </Modal>
  );
}
