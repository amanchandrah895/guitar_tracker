"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  Globe,
  KeyRound,
  Lock,
  Music,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { HARDCODED_SONGS, LEVELS, SECURITY_QUESTIONS, api, buildStudentStats, firstName, formatMinutes, levelColor, songCounts } from "./lib";
import { Heatmap } from "./charts";
import { useInstructorName } from "./settings";
import { SessionTimeline } from "./sessions";
import {
  Avatar,
  Button,
  Chip,
  ErrorNote,
  Field,
  Input,
  LevelBadge,
  Modal,
  ModalHeader,
  PasswordInput,
  Skeleton,
  Toggle,
  cx,
} from "./ui";

// ─── Tapping a roster card ───────────────────────────────────
export function StudentSheet({ student, stat, onClose, onViewProfile, onLogin }) {
  const isPublic = student.is_public !== 0;
  const first = firstName(student.name);
  return (
    <Modal onClose={onClose} size="sm" labelledBy="sheet-title">
      <ModalHeader
        id="sheet-title"
        onClose={onClose}
        visual={<Avatar name={student.name} level={student.level} size={60} locked={!isPublic} />}
        title={student.name}
        subtitle={<div className="mt-1.5"><LevelBadge level={student.level} /></div>}
      />
      <div className="mb-5 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Practice" value={formatMinutes(student.total_minutes)} />
        <MiniStat label="Sessions" value={student.session_count} />
        <MiniStat label="Streak" value={`${stat?.streak || 0}d`} icon={stat?.streak > 1 ? Flame : null} />
      </div>
      <div className="space-y-2.5">
        <OptionTile
          icon={isPublic ? Globe : Lock}
          title="View profile"
          body={isPublic ? "Practice stats, sessions and videos" : `${first}'s profile is private`}
          onClick={isPublic ? onViewProfile : undefined}
          disabled={!isPublic}
        />
        <OptionTile icon={KeyRound} title={`Log in as ${first}`} body="Enter your password to open your dashboard" onClick={onLogin} primary />
      </div>
    </Modal>
  );
}

function MiniStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-line bg-white/[0.025] px-2 py-3">
      <p className="flex items-center justify-center gap-1 text-lg font-semibold text-ink-1">{Icon && <Icon className="h-4 w-4 text-gold-1" />}{value}</p>
      <p className="mt-0.5 text-[11.5px] text-ink-3">{label}</p>
    </div>
  );
}

function OptionTile({ icon: Icon, title, body, onClick, disabled, primary }) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.985 }}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors",
        disabled ? "cursor-not-allowed border-line bg-white/[0.015] opacity-60" : primary ? "border-gold-2/35 bg-gold-2/[0.07] hover:bg-gold-2/[0.12]" : "border-line-strong bg-white/[0.03] hover:border-gold-2/30 hover:bg-white/[0.05]"
      )}
    >
      <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", primary ? "bg-amber-grad text-[#1a1206]" : "bg-white/[0.05] text-gold-1")}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink-1">{title}</span>
        <span className="mt-0.5 block text-[13px] text-ink-3">{body}</span>
      </span>
      {!disabled && <ChevronRight className="h-5 w-5 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-1" />}
    </motion.button>
  );
}

// ─── Read-only public profile ────────────────────────────────
export function PublicProfileModal({ student, onClose }) {
  const [sessions, setSessions] = useState(null);
  useEffect(() => {
    api(`/api/sessions/student/${student.id}`).then((d) => setSessions(d.sessions || [])).catch(() => setSessions([]));
  }, [student.id]);
  const stat = useMemo(() => (sessions ? buildStudentStats(sessions).get(student.id) : null), [sessions, student.id]);
  const songs = useMemo(() => songCounts(sessions || []), [sessions]);

  return (
    <Modal onClose={onClose} size="xl" labelledBy="profile-title">
      <ModalHeader
        id="profile-title"
        onClose={onClose}
        visual={<Avatar name={student.name} level={student.level} size={64} />}
        title={student.name}
        subtitle={<div className="mt-1.5 flex flex-wrap items-center gap-2"><LevelBadge level={student.level} /><span className="text-ink-3">Public profile</span></div>}
      />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MiniStat label="Total practice" value={formatMinutes(student.total_minutes)} />
        <MiniStat label="Sessions" value={student.session_count} />
        <MiniStat label="Current streak" value={`${stat?.streak || 0}d`} icon={stat?.streak > 1 ? Flame : null} />
        <MiniStat label="Best streak" value={`${stat?.bestStreak || 0}d`} />
      </div>
      {sessions === null ? (
        <div className="mt-6 space-y-3"><Skeleton className="h-40" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            <div className="min-w-0 rounded-2xl border border-line bg-black/20 p-4 lg:col-span-3">
              <p className="mb-3 text-[13px] font-semibold text-ink-1">Practice calendar</p>
              <Heatmap sessions={sessions} />
            </div>
            <div className="min-w-0 rounded-2xl border border-line bg-black/20 p-4 lg:col-span-2">
              <p className="mb-3 text-[13px] font-semibold text-ink-1">Most played</p>
              {songs.length === 0 ? (
                <p className="text-sm text-ink-3">No songs logged yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {songs.slice(0, 5).map(({ song, count }) => (
                    <li key={song}>
                      <div className="flex justify-between text-[13px]"><span className="truncate text-ink-1">{song}</span><span className="text-ink-3 tnum">{count}×</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gold-2/80" style={{ width: `${(count / songs[0].count) * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="mt-6">
            <p className="mb-3 text-[15px] font-semibold text-ink-1">Practice history</p>
            <SessionTimeline sessions={sessions} studentName={student.name} variant="public" pageSize={4} />
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Login ───────────────────────────────────────────────────
export function LoginModal({ user, onClose, onLogin, onForgot }) {
  const instructor = useInstructorName();
  const isAdmin = user.role === "admin";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (!password) return setError("Enter your password to continue.");
    setLoading(true);
    setError("");
    try {
      if (isAdmin) {
        await api("/api/auth/admin", { method: "POST", body: { password } });
        onLogin({ ...user, password });
      } else {
        const { student } = await api(`/api/students/${user.id}`, { method: "POST", body: { password } });
        onLogin({ ...student, role: "student" });
      }
    } catch (err) {
      setError(err.status === 401 ? "That password doesn't match. Try again." : "Couldn't log in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} size="sm" labelledBy="login-title">
      <form onSubmit={submit}>
        <div className="mb-6 flex flex-col items-center text-center">
          {isAdmin ? (
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-grad text-[#1a1206] shadow-[0_14px_40px_-10px_rgba(245,166,55,0.6)]"><Crown className="h-8 w-8" /></span>
          ) : (
            <Avatar name={user.name} level={user.level} size={68} />
          )}
          <h2 id="login-title" className="font-display mt-4 text-2xl font-bold text-ink-1">
            {isAdmin ? "Instructor login" : `Welcome back, ${firstName(user.name)}`}
          </h2>
          <p className="mt-1 text-sm text-ink-3">{isAdmin ? `Welcome back, ${instructor}. Review sessions and leave feedback.` : "Enter your password to open your dashboard"}</p>
        </div>
        <div className="space-y-3">
          <PasswordInput placeholder="Password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} data-autofocus aria-label="Password" />
          <ErrorNote>{error}</ErrorNote>
          <Button type="submit" size="lg" full loading={loading}>Log in</Button>
        </div>
        {!isAdmin && (
          <button type="button" onClick={onForgot} className="mx-auto mt-5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13.5px] font-medium text-gold-1 hover:text-gold-2">
            <KeyRound className="h-3.5 w-3.5" /> Forgot your password?
          </button>
        )}
      </form>
    </Modal>
  );
}

// ─── Reset password (2 steps) ────────────────────────────────
export function ResetPasswordModal({ user, onClose, onDone }) {
  const instructor = useInstructorName();
  const [step, setStep] = useState(1);
  const [answer, setAnswer] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async (e) => {
    e?.preventDefault();
    if (!answer.trim()) return setError("Type your answer first.");
    setLoading(true);
    setError("");
    try {
      await api(`/api/students/${user.id}`, { method: "POST", body: { securityAnswer: answer } });
      setStep(2);
    } catch {
      setError("That answer doesn't match. Spelling matters, but capitals and spaces don't.");
    } finally {
      setLoading(false);
    }
  };
  const save = async (e) => {
    e?.preventDefault();
    if (pw.length < 4) return setError("Use at least 4 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setLoading(true);
    setError("");
    try {
      await api(`/api/students/${user.id}/reset-password`, { method: "POST", body: { securityAnswer: answer, newPassword: pw } });
      toast.success("Password updated", { description: "Log in with your new password." });
      onDone();
    } catch (err) {
      setError(err.message || "Couldn't reset your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} size="sm" labelledBy="reset-title">
      <ModalHeader id="reset-title" icon={RotateCcw} title="Reset password" subtitle={user.name} onClose={onClose} />
      <Stepper steps={["Verify it's you", "New password"]} current={step - 1} />
      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.form key="s1" onSubmit={verify} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
            <div className="rounded-2xl border border-line bg-white/[0.03] p-4">
              <p className="eyebrow">Your security question</p>
              <p className="mt-1.5 font-semibold text-ink-1">{user.security_question || "Security question"}</p>
            </div>
            <Field label="Your answer" hint="Capital letters and extra spaces don't matter.">
              <Input placeholder="Type your answer" value={answer} onChange={(e) => { setAnswer(e.target.value); setError(""); }} data-autofocus />
            </Field>
            <ErrorNote>{error}</ErrorNote>
            <div className="flex gap-3 rounded-2xl border border-gold-2/25 bg-gold-2/[0.07] p-3.5">
              <Crown className="mt-0.5 h-4 w-4 shrink-0 text-gold-1" />
              <p className="text-[13px] leading-relaxed text-ink-2">
                <span className="font-semibold text-gold-1">Can't remember your answer?</span> Ask your instructor <span className="font-semibold text-ink-1">{instructor}</span>, who can share your password from the Instructor Studio.
              </p>
            </div>
            <Button type="submit" size="lg" full loading={loading} iconRight={ArrowRight}>Verify</Button>
          </motion.form>
        ) : (
          <motion.form key="s2" onSubmit={save} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="space-y-4">
            <p className="flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2.5 text-[13px] font-medium text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Verified — choose a new password.
            </p>
            <Field label="New password" hint="At least 4 characters.">
              <PasswordInput autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setError(""); }} data-autofocus />
            </Field>
            <Field label="Confirm new password">
              <PasswordInput autoComplete="new-password" value={pw2} onChange={(e) => { setPw2(e.target.value); setError(""); }} />
            </Field>
            <ErrorNote>{error}</ErrorNote>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" size="lg" icon={ArrowLeft} onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" size="lg" full loading={loading}>Save password</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function Stepper({ steps, current }) {
  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold transition-colors", done ? "bg-emerald-400/90 text-[#08110b]" : active ? "bg-amber-grad text-[#1a1206]" : "bg-white/[0.06] text-ink-3")} aria-current={active ? "step" : undefined}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cx("hidden truncate text-[12.5px] font-medium sm:block", active ? "text-ink-1" : "text-ink-3")}>{label}</span>
            {i < steps.length - 1 && <span className={cx("h-px flex-1", done ? "bg-emerald-400/50" : "bg-line-strong")} />}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Create profile (3-step wizard) ──────────────────────────
export function CreateProfileWizard({ onClose, onCreated }) {
  const instructor = useInstructorName();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [customLevel, setCustomLevel] = useState("");
  const [password, setPassword] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [songs, setSongs] = useState([]);
  const [extraSongs, setExtraSongs] = useState([]);
  const [songInput, setSongInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const levelValue = level === "Other" ? customLevel.trim() : level;
  const allSongs = [...HARDCODED_SONGS, ...extraSongs];

  const validate = (s) => {
    if (s === 0) {
      if (!name.trim()) return "What should we call you?";
      if (!levelValue) return level === "Other" ? "Type the name of your batch." : "Pick your batch or level.";
    }
    if (s === 1) {
      if (password.length < 4) return "Choose a password with at least 4 characters.";
      if (!question) return "Pick a security question.";
      if (!answer.trim()) return "Answer your security question.";
    }
    if (s === 2 && songs.length === 0) return "Select at least one song you're working on.";
    return "";
  };
  const go = (to) => {
    if (to > step) {
      const msg = validate(step);
      if (msg) return setError(msg);
    }
    setError("");
    setDir(to > step ? 1 : -1);
    setStep(to);
  };
  const addSong = () => {
    const s = songInput.trim();
    if (!s) return;
    if (!allSongs.some((x) => x.toLowerCase() === s.toLowerCase())) setExtraSongs((p) => [...p, s]);
    setSongs((p) => (p.includes(s) ? p : [...p, s]));
    setSongInput("");
  };
  const submit = async () => {
    const msg = validate(2);
    if (msg) return setError(msg);
    setSaving(true);
    setError("");
    try {
      const { student } = await api("/api/students", {
        method: "POST",
        body: { name: name.trim(), password, securityQuestion: question, securityAnswer: answer, level: levelValue, is_public: isPublic, songs },
      });
      toast.success(`Welcome to the stage, ${firstName(student.name)}`, { description: "Your profile is ready. Log your first session!" });
      onCreated(student);
    } catch (err) {
      if (err.status === 409) {
        setDir(-1);
        setStep(0);
      }
      setError(err.message || "Couldn't create your profile.");
    } finally {
      setSaving(false);
    }
  };
  const onEnter = (e, next) => {
    if (e.key === "Enter") {
      e.preventDefault();
      next();
    }
  };

  const titles = [
    { t: "Let's get you on stage", s: "Your name and batch — shown on your roster card." },
    { t: "Lock it down", s: "A password, plus a question in case you forget it." },
    { t: "Your repertoire", s: "What are you practising right now?" },
  ];

  return (
    <Modal onClose={onClose} size="lg" labelledBy="create-title">
      <ModalHeader id="create-title" icon={Sparkles} title={titles[step].t} subtitle={titles[step].s} onClose={onClose} />
      <Stepper steps={["About you", "Security", "Songs"]} current={step} />
      <div className="relative min-h-[300px]">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: 24 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 * dir }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {step === 0 && (
              <>
                <Field label="Your name" hint="Use the name your classmates know you by.">
                  <Input icon={UserRound} placeholder="e.g. Priya Raman" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} onKeyDown={(e) => onEnter(e, () => go(1))} data-autofocus autoComplete="name" />
                </Field>
                <Field label="Your batch / level">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[...LEVELS, "Other"].map((l) => {
                      const sel = level === l;
                      return (
                        <motion.button
                          key={l}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { setLevel(l); setError(""); }}
                          aria-pressed={sel}
                          className={cx("flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-[13.5px] font-medium transition-colors", sel ? "border-gold-2/60 bg-gold-2/[0.1] text-ink-1" : "border-line-strong bg-white/[0.025] text-ink-2 hover:border-white/20")}
                        >
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l === "Other" ? "#8a8172" : levelColor(l) }} />
                          <span className="flex-1">{l === "Other" ? "Other…" : l}</span>
                          {sel && <Check className="h-4 w-4 text-gold-1" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </Field>
                {level === "Other" && (
                  <Field label="Batch name">
                    <Input placeholder="e.g. Weekend Batch" value={customLevel} onChange={(e) => { setCustomLevel(e.target.value); setError(""); }} onKeyDown={(e) => onEnter(e, () => go(1))} autoFocus />
                  </Field>
                )}
              </>
            )}
            {step === 1 && (
              <>
                <Field label="Password" hint={`At least 4 characters. If you forget it, ${instructor} can help.`}>
                  <PasswordInput autoComplete="new-password" placeholder="Create a password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} data-autofocus />
                </Field>
                <Field label="Security question">
                  <div className="space-y-2" role="radiogroup">
                    {SECURITY_QUESTIONS.map((q) => {
                      const sel = question === q;
                      return (
                        <button
                          key={q}
                          type="button"
                          role="radio"
                          aria-checked={sel}
                          onClick={() => { setQuestion(q); setError(""); }}
                          className={cx("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[14px] transition-colors", sel ? "border-gold-2/60 bg-gold-2/[0.08] text-ink-1" : "border-line bg-white/[0.02] text-ink-2 hover:border-line-strong")}
                        >
                          <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors", sel ? "border-gold-2" : "border-ink-4")}>
                            {sel && <span className="h-2 w-2 rounded-full bg-gold-2" />}
                          </span>
                          {q}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Your answer" hint="Capitals and extra spaces won't matter later.">
                  <Input icon={ShieldCheck} placeholder="Type your answer" value={answer} onChange={(e) => { setAnswer(e.target.value); setError(""); }} onKeyDown={(e) => onEnter(e, () => go(2))} />
                </Field>
              </>
            )}
            {step === 2 && (
              <>
                <Field label="Songs you're practising">
                  <div className="flex flex-wrap gap-2">
                    {allSongs.map((s) => {
                      const sel = songs.includes(s);
                      return (
                        <Chip key={s} selected={sel} icon={sel ? Check : Music} onClick={() => { setSongs((p) => (sel ? p.filter((x) => x !== s) : [...p, s])); setError(""); }}>
                          {s}
                        </Chip>
                      );
                    })}
                  </div>
                </Field>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input icon={Plus} placeholder="Add another song…" value={songInput} onChange={(e) => setSongInput(e.target.value)} onKeyDown={(e) => onEnter(e, addSong)} aria-label="Add another song" />
                  </div>
                  <Button variant="secondary" onClick={addSong} disabled={!songInput.trim()}>Add</Button>
                </div>
                <p className={cx("text-[13px]", songs.length ? "text-ink-3" : "text-ink-4")}>
                  <span className="font-semibold text-ink-1">{songs.length}</span> selected · you can change these anytime
                </p>
                <Toggle
                  checked={isPublic}
                  onChange={setIsPublic}
                  icon={isPublic ? Globe : Lock}
                  label={isPublic ? "Public profile" : "Private profile"}
                  description={isPublic ? "Anyone can see your practice details and uploaded videos." : "Only you and your instructor can see your sessions and videos."}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <ErrorNote className="mt-4">{error}</ErrorNote>
      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => go(step - 1)}>Back</Button>
        ) : (
          <Button variant="ghost" size="lg" onClick={onClose}>Cancel</Button>
        )}
        {step < 2 ? (
          <Button size="lg" full iconRight={ArrowRight} onClick={() => go(step + 1)}>Continue</Button>
        ) : (
          <Button size="lg" full icon={Sparkles} loading={saving} onClick={submit}>Create my profile</Button>
        )}
      </div>
    </Modal>
  );
}

export { MiniStat };
