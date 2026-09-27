"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Crown, HardDrive, LogOut, ShieldAlert, UserPlus } from "lucide-react";
import { Avatar, Button, IconButton, LevelBadge, LogoMark, Wordmark, cx } from "./ui";
import { DEVELOPER, useSettings } from "./settings";

export function Page({ children }) {
  return <div className="stage-bg flex min-h-screen flex-col text-ink-1">{children}</div>;
}

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return scrolled;
}

function Bar({ children }) {
  const scrolled = useScrolled();
  return (
    <header
      className={cx(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "border-line bg-[#0b0a08]/80 backdrop-blur-xl" : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6 lg:px-8">{children}</div>
    </header>
  );
}

export function PublicNav({ onJoin, onInstructor }) {
  const links = [
    { href: "#roster", label: "Roster" },
    { href: "#leaderboard", label: "Leaderboard" },
    { href: "#activity", label: "Activity" },
  ];
  return (
    <Bar>
      <a href="#top" className="shrink-0 rounded-xl" aria-label="Strumrr home">
        <span className="hidden sm:block"><Wordmark /></span>
        <span className="sm:hidden"><Wordmark compact /></span>
      </a>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
        {links.map((l) => (
          <a key={l.href} href={l.href} className="rounded-xl px-3.5 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-white/[0.05] hover:text-ink-1">
            {l.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={Crown} onClick={onInstructor} className="hidden sm:inline-flex">
          Instructor
        </Button>
        <IconButton icon={Crown} label="Instructor login" onClick={onInstructor} className="sm:hidden" />
        <Button size="sm" icon={UserPlus} onClick={onJoin}>
          <span className="hidden sm:inline">Join the class</span>
          <span className="sm:hidden">Join</span>
        </Button>
      </div>
    </Bar>
  );
}

export function StudentNav({ student, onLogout }) {
  return (
    <Bar>
      <span className="hidden sm:block"><Wordmark /></span>
      <span className="sm:hidden"><Wordmark compact /></span>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-3 rounded-2xl border border-line bg-white/[0.03] py-1.5 pl-1.5 pr-4 md:flex">
          <Avatar name={student.name} level={student.level} size={34} />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink-1">{student.name}</p>
            <div className="mt-0.5"><LevelBadge level={student.level} /></div>
          </div>
        </div>
        <Button variant="secondary" size="sm" icon={LogOut} onClick={onLogout}>
          <span className="hidden sm:inline">Log out</span>
        </Button>
      </div>
    </Bar>
  );
}

export function AdminNav({ onLogout }) {
  return (
    <Bar>
      <div className="flex items-center gap-3">
        <span className="hidden sm:block"><Wordmark /></span>
        <span className="sm:hidden"><LogoMark size={30} /></span>
        <span className="flex items-center gap-1.5 rounded-full border border-gold-2/30 bg-gold-2/10 px-3 py-1 text-[12px] font-semibold text-gold-1">
          <Crown className="h-3.5 w-3.5" /> Instructor Studio
        </span>
      </div>
      <Button variant="secondary" size="sm" icon={LogOut} onClick={onLogout}>
        <span className="hidden sm:inline">Log out</span>
      </Button>
    </Bar>
  );
}

/** Six guitar strings stretched across the hero, gently vibrating. */
export function GuitarStrings({ className }) {
  const strings = [0.8, 1, 1.25, 1.6, 2, 2.6]; // high E → low E thickness
  return (
    <svg
      className={cx("pointer-events-none absolute inset-x-0 w-full", className)}
      viewBox="0 0 1200 220"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ maskImage: "linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)" }}
    >
      <defs>
        <linearGradient id="gpl-str" x1="0" x2="1">
          <stop offset="0" stopColor="#f5b63f" stopOpacity="0.05" />
          <stop offset="0.5" stopColor="#ffd98a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f5b63f" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="gpl-glint" x1="0" x2="1">
          <stop offset="0" stopColor="#fff3d6" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff3d6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3d6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {strings.map((w, i) => {
        const y = 22 + i * 35;
        return (
          <g key={i} className="gpl-string" style={{ animationDelay: `${i * 0.37}s`, transformBox: "fill-box" }}>
            <line x1="0" x2="1200" y1={y} y2={y} stroke="url(#gpl-str)" strokeWidth={w} />
            <rect className="gpl-string-glint" x="0" y={y - w} width="260" height={w * 2} fill="url(#gpl-glint)" style={{ animationDelay: `${i * 0.9}s` }} />
          </g>
        );
      })}
    </svg>
  );
}

/** "Developed by Aman" credit with a link to build your own. */
export function DevCredit({ className, compact = false }) {
  if (compact) {
    return (
      <a
        href={DEVELOPER.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cx("group inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 transition-colors hover:text-ink-1", className)}
      >
        Developed by <span className="font-semibold text-gold-2 group-hover:text-gold-1">{DEVELOPER.name}</span>
        <ArrowUpRight className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </a>
    );
  }
  return (
    <div className={cx("relative overflow-hidden rounded-3xl border border-gold-2/20 bg-gradient-to-br from-gold-2/[0.09] via-white/[0.02] to-transparent p-5", className)}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gold-2/10 blur-3xl" />
      <div className="relative flex items-start gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-grad font-display text-lg font-extrabold text-[#1a1206]">A</span>
        <div className="min-w-0">
          <p className="eyebrow">Developed by</p>
          <p className="font-display mt-0.5 text-lg font-bold text-ink-1">{DEVELOPER.name}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-3">Want an app like this for your class, club or idea?</p>
        </div>
      </div>
      <a
        href={DEVELOPER.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line-strong bg-black/30 px-4 py-3 text-sm transition-colors hover:border-gold-2/50"
      >
        <span className="min-w-0">
          <span className="block font-semibold text-ink-1">To build yours, click here</span>
          <span className="block truncate text-[12.5px] text-gold-2">{DEVELOPER.label}</span>
        </span>
        <ArrowUpRight className="h-5 w-5 shrink-0 text-gold-1 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </a>
    </div>
  );
}

export function Footer() {
  const { limits } = useSettings();
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-line bg-[#090806]/80">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] lg:grid-cols-[1.2fr_0.9fr_1fr]">
          <div className="max-w-sm">
            <Wordmark />
            <p className="mt-4 text-sm leading-relaxed text-ink-3">
              <span className="font-semibold text-ink-2">Strumrr</span> is the practice journal for the guitar students of CVPA, RV University. Play daily, log your practice, improve.
            </p>
            <p className="mt-3 text-[13px] font-semibold text-gold-2">Made for better earning</p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-2.5">
              <p className="eyebrow">Explore</p>
              <a href="#roster" className="block text-ink-2 hover:text-ink-1">Roster</a>
              <a href="#leaderboard" className="block text-ink-2 hover:text-ink-1">Leaderboard</a>
              <a href="#activity" className="block text-ink-2 hover:text-ink-1">Recent activity</a>
            </div>
            <div className="space-y-2.5">
              <p className="eyebrow">Portal</p>
              <p className="text-ink-2">Track sessions</p>
              <p className="text-ink-2">Tutor feedback</p>
              <a href={DEVELOPER.url} target="_blank" rel="noopener noreferrer" className="block text-ink-2 hover:text-ink-1">Build your own</a>
            </div>
          </div>
          <DevCredit className="md:col-span-2 lg:col-span-1" />
        </div>

        <div className="mt-10 space-y-3 border-t border-line pt-6 text-[12.5px] text-ink-3">
          <p className="flex max-w-3xl gap-2 leading-relaxed">
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
            <span>
              Storage policy: this is a free app built by an alumnus with no paid storage, so we keep only each student's {limits.videosPerStudent} most recent clips. Older clips are deleted automatically and can't be recovered. Tutor feedback is kept, and your original videos stay on your phone.
            </span>
          </p>
          <p className="flex max-w-3xl gap-2 leading-relaxed">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
            <span>
              This is a purely unofficial tool created by a previous batch student to contribute to better learning. It has no association with RV University or any official institution. Use at your own discretion.
            </span>
          </p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ink-4">© {new Date().getFullYear()} Strumrr</p>
            <DevCredit compact />
          </div>
        </div>
      </div>
      {/* Oversized wordmark bleeding off the bottom edge: a quiet brand sign-off. */}
      <div aria-hidden="true" className="pointer-events-none -mb-[0.2em] select-none px-4 text-center leading-none sm:px-6 lg:px-8">
        <span className="wordmark footer-wordmark block text-[23vw] sm:text-[19vw] xl:text-[240px]">Strumrr</span>
      </div>
    </footer>
  );
}
