"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { RotateCcw, WifiOff } from "lucide-react";
import { ADMIN, api, buildStudentStats } from "@/components/gpl/lib";
import { HomePage } from "@/components/gpl/home";
import { StudentDashboard } from "@/components/gpl/student";
import { AdminDashboard } from "@/components/gpl/admin";
import { CreateProfileWizard, LoginModal, PublicProfileModal, ResetPasswordModal, StudentSheet } from "@/components/gpl/auth";
import { BrandName, Button, LogoMark } from "@/components/gpl/ui";
import { Page } from "@/components/gpl/shell";
import { DEVELOPER, SettingsProvider } from "@/components/gpl/settings";

const USER_KEY = "practiceTrackerUser";
const ADMIN_KEY = "gplAdminKey";

// The logged-in identity persists in localStorage; the instructor password is
// only needed to reveal student passwords, so it lives in sessionStorage
// (cleared when the tab closes) rather than sitting in localStorage forever.
function readSession() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return { user: null, key: null };
    const user = JSON.parse(raw);
    let key = sessionStorage.getItem(ADMIN_KEY);
    if (user?.role === "admin" && user.password) {
      // Migrate sessions saved by the previous version.
      key = key || user.password;
      sessionStorage.setItem(ADMIN_KEY, key);
      delete user.password;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return { user, key };
  } catch {
    return { user: null, key: null };
  }
}

export default function PracticeTracker() {
  const [user, setUser] = useState(null);
  const [adminKey, setAdminKeyState] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("loading");

  // Public-view overlays
  const [sheet, setSheet] = useState(null);
  const [profile, setProfile] = useState(null);
  const [login, setLogin] = useState(null);
  const [reset, setReset] = useState(null);
  const [create, setCreate] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api("/api/students"), api("/api/sessions")]);
      setStudents(s.students || []);
      setSessions(p.sessions || []);
      setStatus("ready");
    } catch {
      setStatus((prev) => (prev === "ready" ? "ready" : "error"));
    }
  }, []);

  useEffect(() => {
    const { user: saved, key } = readSession();
    setUser(saved);
    setAdminKeyState(key);
    loadAll();
  }, [loadAll]);

  const setAdminKey = useCallback((k) => {
    setAdminKeyState(k);
    try {
      k ? sessionStorage.setItem(ADMIN_KEY, k) : sessionStorage.removeItem(ADMIN_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const doLogin = useCallback(
    (u) => {
      const identity = u.role === "admin" ? { name: u.name, role: "admin" } : { id: u.id, name: u.name, role: "student" };
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(identity));
      } catch {
        /* storage unavailable */
      }
      if (u.role === "admin") setAdminKey(u.password || null);
      setUser(identity);
      setLogin(null);
      setSheet(null);
      window.scrollTo({ top: 0 });
    },
    [setAdminKey]
  );

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable */
    }
    setAdminKey(null);
    setUser(null);
    window.scrollTo({ top: 0 });
  }, [setAdminKey]);

  const stats = useMemo(() => buildStudentStats(sessions), [sessions]);
  const me = user?.role === "student" ? students.find((s) => s.id === user.id) : null;

  // A saved student session whose profile no longer exists → back to home.
  useEffect(() => {
    if (status === "ready" && user?.role === "student" && !me) logout();
  }, [status, user, me, logout]);

  let view = "home";
  if (status === "loading") view = "loading";
  else if (status === "error") view = "error";
  else if (user?.role === "admin") view = "admin";
  else if (me) view = "student";

  return (
    // Honour the OS "reduce motion" setting for every JS-driven animation.
    <MotionConfig reducedMotion="user">
      <SettingsProvider>
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {view === "loading" && <Splash />}
          {view === "error" && <LoadError onRetry={() => { setStatus("loading"); loadAll(); }} />}
          {view === "admin" && <AdminDashboard students={students} sessions={sessions} adminKey={adminKey} setAdminKey={setAdminKey} onLogout={logout} reloadAll={loadAll} />}
          {view === "student" && <StudentDashboard student={me} onLogout={logout} reloadAll={loadAll} />}
          {view === "home" && (
            <HomePage
              students={students}
              sessions={sessions}
              onJoin={() => setCreate(true)}
              onInstructor={() => setLogin(ADMIN)}
              onOpenStudent={(s) => setSheet(s)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {view === "home" && sheet && (
          <StudentSheet
            key={`sheet-${sheet.id}`}
            student={sheet}
            stat={stats.get(sheet.id)}
            onClose={() => setSheet(null)}
            onViewProfile={() => { setProfile(sheet); setSheet(null); }}
            onLogin={() => { setLogin(sheet); setSheet(null); }}
          />
        )}
        {view === "home" && profile && <PublicProfileModal key={`profile-${profile.id}`} student={profile} onClose={() => setProfile(null)} />}
        {view === "home" && login && (
          <LoginModal
            key={`login-${login.id ?? "admin"}`}
            user={login}
            onClose={() => setLogin(null)}
            onLogin={doLogin}
            onForgot={() => { setReset(login); setLogin(null); }}
          />
        )}
        {view === "home" && reset && (
          <ResetPasswordModal
            key={`reset-${reset.id}`}
            user={reset}
            onClose={() => setReset(null)}
            onDone={() => { const u = reset; setReset(null); setLogin(u); }}
          />
        )}
        {view === "home" && create && (
          <CreateProfileWizard
            key="create"
            onClose={() => setCreate(false)}
            onCreated={async (student) => {
              setCreate(false);
              await loadAll();
              doLogin({ ...student, role: "student" });
            }}
          />
        )}
      </AnimatePresence>
      </SettingsProvider>
    </MotionConfig>
  );
}

function Splash() {
  return (
    <Page>
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-6">
        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
          <LogoMark size={64} />
        </motion.div>
        <BrandName className="text-[44px] text-ink-1" />
        <div className="flex h-6 items-end gap-1" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 rounded-full bg-gold-2"
              animate={{ height: [6, 22, 6] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
            />
          ))}
        </div>
        <p className="text-[15px] font-medium text-ink-3" role="status">Tuning up…</p>
        <p className="absolute bottom-8 text-[12.5px] text-ink-3">
          Crafted by <span className="font-semibold text-gold-2">{DEVELOPER.name}</span>
        </p>
      </div>
    </Page>
  );
}

function LoadError({ onRetry }) {
  return (
    <Page>
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="panel max-w-md p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-line-strong bg-white/[0.04] text-ink-2"><WifiOff className="h-6 w-6" /></span>
          <h1 className="font-display mt-5 text-2xl font-bold text-ink-1">Can't reach the stage</h1>
          <p className="mt-2 text-ink-3">We couldn't load practice data. If the server was asleep it can take up to a minute to wake up.</p>
          <Button className="mt-6" icon={RotateCcw} onClick={onRetry}>Try again</Button>
        </div>
      </div>
    </Page>
  );
}
