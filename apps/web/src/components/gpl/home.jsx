"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  Crown,
  Flame,
  Lock,
  MessageSquareText,
  Search,
  Timer,
  Trophy,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { buildStudentStats, firstName, formatMinutes, levelColor, LEVELS, parseDbDate, timeAgo } from "./lib";
import { Heatmap, Sparkbars } from "./charts";
import { Avatar, Button, Chip, CountUp, EmptyState, Input, LevelBadge, SectionHeader, Segmented, SongTag, cx } from "./ui";
import { DevCredit, Footer, GuitarStrings, Page, PublicNav } from "./shell";
import { useSettings } from "./settings";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});

export function HomePage({ students, sessions, onJoin, onInstructor, onOpenStudent }) {
  const stats = useMemo(() => buildStudentStats(sessions), [sessions]);
  const publicIds = useMemo(() => new Set(students.filter((s) => s.is_public !== 0).map((s) => s.id)), [students]);

  return (
    <Page>
      <PublicNav onJoin={onJoin} onInstructor={onInstructor} />
      <main id="top" className="flex-1">
        <Hero students={students} sessions={sessions} stats={stats} onJoin={onJoin} onInstructor={onInstructor} />
        <Roster students={students} stats={stats} onOpenStudent={onOpenStudent} onJoin={onJoin} />
        <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-5 lg:px-8">
          <Leaderboard students={students} stats={stats} className="lg:col-span-3" onOpenStudent={onOpenStudent} />
          <ActivityFeed students={students} sessions={sessions} publicIds={publicIds} className="lg:col-span-2" onOpenStudent={onOpenStudent} />
        </section>
        <HowItWorks onJoin={onJoin} />
      </main>
      <Footer />
    </Page>
  );
}

// ─── Hero ────────────────────────────────────────────────────
function Hero({ students, sessions, stats, onJoin, onInstructor }) {
  const weekMinutes = [...stats.values()].reduce((s, st) => s + st.week, 0);
  const activeThisWeek = [...stats.values()].filter((st) => st.week > 0).length;
  let topStreak = { n: 0, name: "" };
  for (const s of students) {
    const n = stats.get(s.id)?.streak || 0;
    if (n > topStreak.n) topStreak = { n, name: firstName(s.name) };
  }
  const faces = [...students].sort((a, b) => b.total_minutes - a.total_minutes).slice(0, 5);

  return (
    <section className="relative overflow-hidden">
      <GuitarStrings className="bottom-3 h-[88px] opacity-80" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-32 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:pb-36 lg:pt-20">
        <div className="min-w-0 lg:col-span-7">
          <motion.div {...fade(0)} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-white/[0.03] py-1.5 pl-2 pr-3.5 text-[12.5px] font-medium text-ink-2 backdrop-blur">
            <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
            <span>
              <span className="font-semibold text-ink-1">Strumrr</span> · Guitar practice journal<span className="hidden sm:inline"> for CVPA, RV University</span>
            </span>
          </motion.div>
          <motion.h1 {...fade(0.08)} className="font-display mt-6 text-[46px] font-extrabold leading-[0.95] text-ink-1 sm:text-[68px] lg:text-[84px]">
            Play daily.
            <br />
            <span className="text-ink-2">Log your practice.</span>
            <br />
            <span className="font-accent text-amber-grad pr-2 text-[56px] sm:text-[84px] lg:text-[104px]">Improve.</span>
          </motion.h1>
          <motion.p {...fade(0.16)} className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-ink-2 sm:text-lg">
            One shared journal for the whole class. Log every session, upload clips for tutor feedback, and watch your streak — and your playing — grow.
          </motion.p>
          <motion.div {...fade(0.24)} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" iconRight={ArrowRight} onClick={onJoin}>Create your profile</Button>
            <Button size="lg" variant="secondary" icon={Crown} onClick={onInstructor}>Instructor login</Button>
          </motion.div>
          {faces.length > 0 && (
            <motion.div {...fade(0.32)} className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {faces.map((s) => (
                  <span key={s.id} className="rounded-full ring-[3px] ring-stage-0">
                    <Avatar name={s.name} level={s.level} size={34} />
                  </span>
                ))}
              </div>
              <p className="text-sm text-ink-3">
                <span className="font-semibold text-ink-1">{students.length} players</span> already practising
              </p>
            </motion.div>
          )}
        </div>

        <motion.aside {...fade(0.2)} className="glass relative min-w-0 rounded-[28px] p-5 sm:p-6 lg:col-span-5" aria-label="This week on stage">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-2/20 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <p className="eyebrow">This week on stage</p>
            <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-300">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
            </span>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-3">
            <HeroStat icon={Timer} label="Minutes" value={<CountUp value={weekMinutes} />} />
            <HeroStat icon={Users} label="Active" value={<><CountUp value={activeThisWeek} /><span className="text-base text-ink-3">/{students.length}</span></>} />
            <HeroStat icon={Flame} label={topStreak.name ? `${topStreak.name}'s streak` : "Top streak"} value={<><CountUp value={topStreak.n} /><span className="text-base text-ink-3">d</span></>} accent />
          </div>
          <div className="relative mt-5 rounded-2xl border border-line bg-black/25 p-4">
            <p className="mb-3 text-[13px] font-semibold text-ink-1">Class practice calendar</p>
            <Heatmap sessions={sessions} scale="relative" />
          </div>
        </motion.aside>
      </div>
    </section>
  );
}

function HeroStat({ icon: Icon, label, value, accent }) {
  return (
    <div className={cx("rounded-2xl border p-3", accent ? "border-gold-2/30 bg-gold-2/[0.08]" : "border-line bg-white/[0.025]")}>
      <Icon className={cx("h-4 w-4", accent ? "text-gold-1" : "text-ink-3")} />
      <div className="mt-2 text-2xl font-semibold leading-none tracking-tight text-ink-1">{value}</div>
      <p className="mt-1.5 truncate text-[11.5px] text-ink-3">{label}</p>
    </div>
  );
}

// ─── Roster ──────────────────────────────────────────────────
const SORTS = [
  { value: "practice", label: "Most practice" },
  { value: "recent", label: "Recent" },
  { value: "name", label: "A–Z" },
];

function Roster({ students, stats, onOpenStudent, onJoin }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("practice");

  const levels = useMemo(() => {
    const present = new Set(students.map((s) => s.level).filter(Boolean));
    const ordered = LEVELS.filter((l) => present.has(l));
    const custom = [...present].filter((l) => !LEVELS.includes(l)).sort();
    return [...ordered, ...custom];
  }, [students]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = students.filter((s) => (level === "all" || s.level === level) && (!q || s.name.toLowerCase().includes(q)));
    const byRecent = (s) => stats.get(s.id)?.lastAt?.getTime() || 0;
    return filtered.sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : sort === "recent" ? byRecent(b) - byRecent(a) : b.total_minutes - a.total_minutes || a.name.localeCompare(b.name)
    );
  }, [students, stats, query, level, sort]);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <SectionHeader
        id="roster"
        eyebrow="The roster"
        icon={Users}
        title="Find your card, jump in"
        action={<Segmented options={SORTS} value={sort} onChange={setSort} className="max-sm:w-full max-sm:[&>button]:flex-1" />}
      />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="lg:w-80">
          <Input icon={Search} placeholder="Search players…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search players" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Filter by level">
          <Chip selected={level === "all"} onClick={() => setLevel("all")}>All levels</Chip>
          {levels.map((l) => (
            <Chip key={l} selected={level === l} onClick={() => setLevel(l)}>
              <span className="h-2 w-2 rounded-full" style={{ background: levelColor(l) }} />
              {l}
            </Chip>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="panel">
          <EmptyState icon={Search} title="No players match" body="Try a different name or clear the level filter." action={<Button variant="secondary" size="sm" onClick={() => { setQuery(""); setLevel("all"); }}>Clear filters</Button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((s, i) => (
            <StudentCard key={s.id} student={s} stat={stats.get(s.id)} index={i} onClick={() => onOpenStudent(s)} />
          ))}
          <JoinCard onClick={onJoin} index={list.length} />
        </div>
      )}
    </section>
  );
}

function StudentCard({ student, stat, index, onClick }) {
  const isPublic = student.is_public !== 0;
  const last = student.last_songs || [];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      className="panel ring-amber-hover group flex flex-col p-5 text-left transition-shadow duration-300 hover:shadow-[0_24px_60px_-28px_rgba(245,166,55,0.45)]"
      aria-label={`${student.name}, ${student.level || "student"}. Open options`}
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={student.name} level={student.level} size={52} locked={!isPublic} />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-display truncate text-[18px] font-bold leading-tight text-ink-1">{student.name}</p>
          <div className="mt-1.5"><LevelBadge level={student.level} /></div>
        </div>
        {stat?.activeToday && <span className="mt-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">Today</span>}
      </div>

      <div className="mt-4 hidden min-h-[58px] flex-1 sm:block">
        {isPublic ? (
          <>
            {last.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {last.slice(0, 2).map((song) => <SongTag key={song}>{song}</SongTag>)}
                {last.length > 2 && <SongTag muted>+{last.length - 2}</SongTag>}
              </div>
            ) : (
              <p className="text-[13px] text-ink-3">No sessions yet — first one incoming.</p>
            )}
            <div className="mt-3"><Sparkbars byDay={stat?.byDay} /></div>
          </>
        ) : (
          <div className="flex h-full items-center gap-2 rounded-xl border border-dashed border-line-strong px-3 py-3 text-[13px] text-ink-3">
            <Lock className="h-4 w-4 shrink-0" /> Private profile
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5 text-[12.5px]">
        <span className="flex items-center gap-1.5 font-semibold text-ink-1"><Timer className="h-3.5 w-3.5 text-gold-2" />{formatMinutes(student.total_minutes)}</span>
        {stat?.streak > 1 ? (
          <span className="flex items-center gap-1 font-semibold text-gold-1"><Flame className="h-3.5 w-3.5" />{stat.streak}-day</span>
        ) : (
          <span className="text-ink-3">{student.session_count} session{student.session_count === 1 ? "" : "s"}</span>
        )}
        <span className="text-ink-3">{stat?.lastAt ? timeAgo(stat.lastAt) : "New"}</span>
      </div>
    </motion.button>
  );
}

function JoinCard({ onClick, index }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.04 }}
      whileHover={{ y: -4 }}
      className="group flex min-h-[220px] flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-gold-2/25 bg-gold-2/[0.03] p-5 text-center transition-colors hover:border-gold-2/50 hover:bg-gold-2/[0.06]"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-grad text-[#1a1206] shadow-[0_10px_30px_-8px_rgba(245,166,55,0.6)] transition-transform group-hover:scale-105">
        <UserPlus className="h-6 w-6" />
      </span>
      <p className="font-display mt-4 text-lg font-bold text-ink-1">Your name here</p>
      <p className="mt-1 text-[13px] text-ink-3">Create a profile in under a minute</p>
    </motion.button>
  );
}

// ─── Leaderboard ─────────────────────────────────────────────
function Leaderboard({ students, stats, className, onOpenStudent }) {
  const [range, setRange] = useState("week");
  const ranked = useMemo(() => {
    const value = (s) => (range === "week" ? stats.get(s.id)?.week || 0 : s.total_minutes || 0);
    return students
      .map((s) => ({ s, v: value(s) }))
      .filter((r) => r.v > 0)
      .sort((a, b) => b.v - a.v || a.s.name.localeCompare(b.s.name));
  }, [students, stats, range]);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3, 8);
  const leader = ranked[0]?.v || 1;
  const order = [1, 0, 2].filter((i) => podium[i]);

  return (
    <div className={cx("panel p-5 sm:p-6", className)}>
      <SectionHeader
        id="leaderboard"
        eyebrow="Leaderboard"
        icon={Trophy}
        title="Top performers"
        action={<Segmented options={[{ value: "week", label: "This week" }, { value: "all", label: "All time" }]} value={range} onChange={setRange} />}
      />
      {ranked.length === 0 ? (
        <EmptyState compact icon={Trophy} title="No minutes logged yet" body={range === "week" ? "Nobody has practised in the last 7 days." : "Be the first on the board."} />
      ) : (
        <>
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            {order.map((i) => {
              const { s, v } = podium[i];
              const heights = ["h-28 sm:h-32", "h-20 sm:h-24", "h-14 sm:h-16"];
              const medal = ["#f5c451", "#c9ced6", "#d08a4c"][i];
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => onOpenStudent(s)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.5 }}
                  className="group flex flex-col items-center text-center"
                >
                  <div className="relative">
                    <Avatar name={s.name} level={s.level} size={i === 0 ? 64 : 52} />
                    <span className="absolute -bottom-1 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full text-[11px] font-bold text-[#1a1206] shadow" style={{ background: medal }}>
                      {i + 1}
                    </span>
                  </div>
                  <p className="mt-3 w-full truncate text-[13.5px] font-semibold text-ink-1 group-hover:text-gold-1">{firstName(s.name)}</p>
                  <p className="text-[12px] text-ink-3 tnum">{formatMinutes(v)}</p>
                  <div
                    className={cx("mt-2.5 w-full rounded-t-2xl border-x border-t", heights[i])}
                    style={{ borderColor: `${medal}40`, background: `linear-gradient(180deg, ${medal}26, transparent)` }}
                  />
                </motion.button>
              );
            })}
          </div>
          {rest.length > 0 && (
            <ol className="mt-5 space-y-1.5" start={4}>
              {rest.map(({ s, v }, i) => (
                <li key={s.id}>
                  <button type="button" onClick={() => onOpenStudent(s)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]">
                    <span className="w-5 text-center text-[12px] font-semibold text-ink-3 tnum">{i + 4}</span>
                    <Avatar name={s.name} level={s.level} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink-1">{s.name}</span>
                      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <span className="block h-full rounded-full bg-gold-2/70" style={{ width: `${(v / leader) * 100}%` }} />
                      </span>
                    </span>
                    <span className="w-14 text-right text-[12.5px] font-semibold text-ink-2 tnum">{formatMinutes(v)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

// ─── Activity feed ───────────────────────────────────────────
function ActivityFeed({ students, sessions, publicIds, className, onOpenStudent }) {
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const items = useMemo(
    () =>
      sessions
        .filter((s) => publicIds.has(s.student_id))
        .map((s) => ({ ...s, at: parseDbDate(s.created_at) }))
        .filter((s) => s.at)
        .sort((a, b) => b.at - a.at)
        .slice(0, 7),
    [sessions, publicIds]
  );

  return (
    <div className={cx("panel p-5 sm:p-6", className)}>
      <SectionHeader id="activity" eyebrow="Activity" icon={Activity} title="Recently on stage" />
      {items.length === 0 ? (
        <EmptyState compact icon={Activity} title="Quiet backstage" body="Public practice sessions will show up here." />
      ) : (
        <ul className="relative space-y-1">
          <span className="absolute bottom-3 left-[17px] top-3 w-px bg-line" aria-hidden="true" />
          {items.map((it) => {
            const st = byId.get(it.student_id);
            if (!st) return null;
            return (
              <li key={it.id}>
                <button type="button" onClick={() => onOpenStudent(st)} className="relative flex w-full items-start gap-3 rounded-xl py-2 pl-0 pr-2 text-left transition-colors hover:bg-white/[0.03]">
                  <span className="relative z-10 rounded-full ring-4 ring-[#15130f]"><Avatar name={st.name} level={st.level} size={34} /></span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="block text-[13.5px] leading-snug text-ink-2">
                      <span className="font-semibold text-ink-1">{firstName(st.name)}</span> practised{" "}
                      <span className="text-ink-1">{(it.songs || []).slice(0, 2).join(", ")}</span>
                      {(it.songs || []).length > 2 ? ` +${it.songs.length - 2}` : ""}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-3">
                      {formatMinutes(it.minutes, { long: true })} · {timeAgo(it.at)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── How it works ────────────────────────────────────────────
function HowItWorks({ onJoin }) {
  const { instructorName, limits } = useSettings();
  const steps = [
    { icon: UserPlus, title: "Create your profile", body: "Pick your batch and the songs you're working on. Takes a minute." },
    { icon: Timer, title: "Log every session", body: "Minutes, songs and notes — build a streak you'll want to protect." },
    { icon: Video, title: "Upload a clip", body: `Record a take (up to ${limits.maxMinutes} min) on your phone. We keep your ${limits.videosPerStudent} latest clips.` },
    { icon: MessageSquareText, title: "Get tutor feedback", body: `${instructorName} reviews your clips and leaves notes right on the video.` },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <div className="glass relative overflow-hidden rounded-[28px] p-6 sm:p-10">
        <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-ember/15 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-sm">
            <p className="eyebrow">How it works</p>
            <h2 className="font-display mt-2 text-3xl font-bold text-ink-1 sm:text-4xl">
              Small sessions, <span className="font-accent text-amber-grad">big progress.</span>
            </h2>
            <div className="mt-6"><Button iconRight={ArrowRight} onClick={onJoin}>Start your journal</Button></div>
            <DevCredit compact className="mt-5" />
          </div>
          <ol className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-3xl">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-2/15 text-gold-1"><s.icon className="h-[18px] w-[18px]" /></span>
                  <span className="text-[12px] font-semibold text-ink-4 tnum">0{i + 1}</span>
                </div>
                <p className="mt-3 font-semibold text-ink-1">{s.title}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
