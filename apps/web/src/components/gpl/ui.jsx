"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import { Eye, EyeOff, Loader2, Lock, X } from "lucide-react";
import { initials, levelColor } from "./lib";

export const cx = (...c) => c.filter(Boolean).join(" ");

// ─── Hooks ───────────────────────────────────────────────────
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

// ─── Brand ───────────────────────────────────────────────────
/**
 * Strumrr mark: a guitar pick with three strings, the middle one mid-strum.
 * String weights step up like a real set (thin → thick).
 */
export function LogoMark({ size = 34, className }) {
  // Unique per instance: a shared id breaks when the first copy sits in a
  // display:none subtree (e.g. the desktop logo hidden on phones).
  const gid = `strumrr-pick-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={cx("shrink-0", className)}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd98a" />
          <stop offset="55%" stopColor="#f5b63f" />
          <stop offset="100%" stopColor="#d9622b" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.6c-5.6 0-10 3.1-10 7.7 0 4.9 5 10.4 8.6 12.9a2.4 2.4 0 0 0 2.8 0c3.6-2.5 8.6-8 8.6-12.9 0-4.6-4.4-7.7-10-7.7Z"
        fill={`url(#${gid})`}
      />
      <g fill="none" stroke="#1a1206" strokeLinecap="round">
        <path d="M5.6 6.9h12.8" strokeWidth="1.5" />
        <path d="M5 10.3c1.1-1.5 2.2-1.5 3.3 0s2.2 1.5 3.3 0 2.2-1.5 3.3 0 2.2 1.5 3.3 0" strokeWidth="1.8" />
        <path d="M6.8 13.8h10.4" strokeWidth="2.1" />
      </g>
    </svg>
  );
}

/** The name set as a wordmark: "Strum" in ink, the ringing "rr" in amber. */
export function BrandName({ className }) {
  return (
    <span className={cx("wordmark", className)}>
      Strum<span className="text-amber-grad">rr</span>
    </span>
  );
}

export function Wordmark({ compact = false, size = "md" }) {
  const big = size === "lg";
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={big ? 52 : compact ? 30 : 34} />
      <span className="leading-none">
        <BrandName className={cx("block text-ink-1", big ? "text-[40px]" : "text-[23px]")} />
        {!compact && (
          <span className={cx("block font-semibold uppercase text-ink-3", big ? "mt-2 text-[12px] tracking-[0.18em]" : "mt-[3px] text-[9.5px] tracking-[0.16em]")}>
            Guitar practice · CVPA
          </span>
        )}
      </span>
    </span>
  );
}

// ─── Buttons ─────────────────────────────────────────────────
const BTN_VARIANTS = {
  primary: "bg-amber-grad text-[#1a1206] font-semibold glow-amber hover:brightness-[1.08]",
  secondary: "bg-white/[0.045] text-ink-1 border border-line-strong hover:bg-white/[0.08] hover:border-gold-2/30",
  ghost: "text-ink-2 hover:text-ink-1 hover:bg-white/[0.05]",
  danger: "bg-red-500/90 text-white font-semibold hover:bg-red-500",
  "danger-outline": "border border-red-400/30 text-red-300 hover:bg-red-500/10 hover:border-red-400/50",
};
const BTN_SIZES = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-2xl",
  lg: "h-[52px] px-6 text-[15px] gap-2.5 rounded-2xl",
};

export function Button({ variant = "primary", size = "md", icon: Icon, iconRight: IconRight, loading, full, className, children, disabled, ...props }) {
  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      disabled={disabled || loading}
      className={cx(
        "inline-flex select-none items-center justify-center font-medium transition-[filter,background-color,border-color,color,opacity] duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        full && "w-full",
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-4 w-4 shrink-0" /> : null}
    </motion.button>
  );
}

export function IconButton({ icon: Icon, label, className, size = "md", ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      aria-label={label}
      title={label}
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink-1",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        className
      )}
      {...props}
    >
      <Icon className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} />
    </motion.button>
  );
}

// ─── Form controls ───────────────────────────────────────────
const inputBase =
  "w-full rounded-2xl border border-line-strong bg-black/30 text-ink-1 placeholder:text-ink-4 transition-[border-color,box-shadow,background-color] duration-200 hover:border-white/20 focus:border-gold-2/70 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(245,182,63,0.12)]";

export function Field({ label, hint, error, children, htmlFor, optional }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="flex items-center justify-between text-[13px] font-medium text-ink-2">
          <span>{label}</span>
          {optional && <span className="text-[11px] font-normal text-ink-4">Optional</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-[12.5px] text-red-300">{error}</p> : hint ? <p className="text-[12px] text-ink-4">{hint}</p> : null}
    </div>
  );
}

export function Input({ icon: Icon, className, right, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3" />}
      <input className={cx(inputBase, "h-12 text-[15px]", Icon ? "pl-11" : "pl-4", right ? "pr-12" : "pr-4", className)} {...props} />
      {right && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  );
}

export function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <Input
      type={show ? "text" : "password"}
      autoComplete="current-password"
      right={<IconButton size="sm" icon={show ? EyeOff : Eye} label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)} type="button" />}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return <textarea className={cx(inputBase, "min-h-[88px] resize-none px-4 py-3 text-[15px] leading-relaxed", className)} {...props} />;
}

export function Toggle({ checked, onChange, label, description, icon: Icon }) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={id}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 rounded-2xl border border-line bg-white/[0.025] p-4 text-left transition-colors hover:border-line-strong hover:bg-white/[0.04]"
    >
      {Icon && (
        <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors", checked ? "bg-gold-2/15 text-gold-1" : "bg-white/5 text-ink-3")}>
          <Icon className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span id={id} className="block text-[14.5px] font-semibold text-ink-1">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-ink-3">{description}</span>}
      </span>
      <span className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300", checked ? "bg-amber-grad" : "bg-stage-3")}>
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 34 }}
          className={cx("absolute top-1 h-5 w-5 rounded-full bg-white shadow-md", checked ? "right-1" : "left-1")}
        />
      </span>
    </button>
  );
}

export function Chip({ selected, onClick, children, icon: Icon, className, as = "button", ...props }) {
  const Comp = as === "span" ? "span" : motion.button;
  return (
    <Comp
      {...(as === "span" ? {} : { whileTap: { scale: 0.95 }, type: "button", onClick, "aria-pressed": selected })}
      className={cx(
        "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200",
        selected
          ? "border-gold-2/60 bg-gold-2/15 text-gold-1"
          : "border-line-strong bg-white/[0.03] text-ink-2 hover:border-white/20 hover:text-ink-1",
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {typeof children === "string" ? <span className="min-w-0 truncate" title={children}>{children}</span> : children}
    </Comp>
  );
}

export function SongTag({ children, muted }) {
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium",
        muted ? "border-line text-ink-3" : "border-gold-2/25 bg-gold-2/[0.08] text-gold-1"
      )}
    >
      <span className="truncate" title={typeof children === "string" ? children : undefined}>{children}</span>
    </span>
  );
}

export function LevelBadge({ level, size = "sm" }) {
  if (!level) return null;
  const color = levelColor(level);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[10.5px] tracking-wide" : "px-2.5 py-1 text-xs"
      )}
      style={{ color: "#d9cfbf", borderColor: `${color}55`, background: `${color}1f` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {level}
    </span>
  );
}

export function Avatar({ name, level, size = 48, locked, className }) {
  const color = levelColor(level);
  return (
    <span className={cx("relative inline-grid shrink-0 place-items-center rounded-full", className)} style={{ width: size, height: size }}>
      <span className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(from 210deg, ${color}, #f5b63f, ${color}55, ${color})` }} />
      <span
        className="font-display absolute inset-[2px] grid place-items-center rounded-full font-bold text-ink-1"
        style={{ background: `radial-gradient(circle at 30% 25%, ${color}33, #15120e 70%)`, fontSize: size * 0.36, letterSpacing: "-0.02em" }}
      >
        {initials(name)}
      </span>
      {locked && (
        <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border border-line-strong bg-stage-2 text-ink-2">
          <Lock className="h-2.5 w-2.5" />
        </span>
      )}
    </span>
  );
}

// ─── Feedback / status ───────────────────────────────────────
export function Skeleton({ className }) {
  return <div className={cx("skeleton", className)} />;
}

export function EmptyState({ icon: Icon, title, body, action, compact }) {
  return (
    <div className={cx("flex flex-col items-center text-center", compact ? "py-8" : "py-14")}>
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white/[0.03] text-ink-3">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-display text-lg font-semibold text-ink-1">{title}</p>
      {body && <p className="mt-1 max-w-xs text-sm text-ink-3">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value = 0, className }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]", className)}>
      <motion.div
        className="h-full rounded-full bg-amber-grad"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function CountUp({ value = 0, format = (v) => Math.round(v).toLocaleString(), duration = 1.1, tabular = true }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const fromRef = useRef(0);
  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);
  return <span className={tabular ? "tnum" : undefined}>{format(display)}</span>;
}

export function StatTile({ icon: Icon, label, value, format, sub, accent, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cx("panel relative overflow-hidden p-4 sm:p-5", accent && "ring-1 ring-gold-2/25")}
    >
      {accent && <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold-2/20 blur-3xl" />}
      <div className="flex items-center justify-between">
        <span className="eyebrow">{label}</span>
        <span className={cx("grid h-8 w-8 place-items-center rounded-xl", accent ? "bg-gold-2/15 text-gold-1" : "bg-white/[0.04] text-ink-3")}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-ink-1 sm:text-[32px]">
        <CountUp value={value} format={format} tabular={false} />
      </div>
      {sub && <div className="mt-2 text-[12.5px] text-ink-3">{sub}</div>}
    </motion.div>
  );
}

export function SectionHeader({ eyebrow, title, action, icon: Icon, id }) {
  return (
    <div id={id} className="mb-5 flex scroll-mt-24 flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1.5 flex items-center gap-1.5">{Icon && <Icon className="h-3.5 w-3.5 text-gold-2" />}{eyebrow}</p>}
        <h2 className="font-display text-2xl font-bold text-ink-1 sm:text-[28px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Segmented({ options, value, onChange, className }) {
  const id = useId();
  return (
    <div role="tablist" className={cx("inline-flex rounded-2xl border border-line bg-black/25 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx("relative flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors", active ? "text-[#1a1206]" : "text-ink-2 hover:text-ink-1")}
          >
            {active && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-xl bg-amber-grad" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative flex items-center gap-1.5">
              {o.icon && <o.icon className="h-3.5 w-3.5" />}
              {o.label}
              {o.count != null && <span className={cx("tnum rounded-md px-1.5 text-[11px]", active ? "bg-black/15" : "bg-white/[0.06] text-ink-3")}>{o.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Modal / bottom sheet ────────────────────────────────────
// Rendered through a portal so transformed (animating) ancestors never
// break `position: fixed`. Bottom sheet on phones, centred dialog on desktop.
const openModals = [];

export function Modal({ onClose, children, size = "md", labelledBy, dismissible = true }) {
  const desktop = useMediaQuery("(min-width: 640px)");
  const reduce = useReducedMotion();
  const panelRef = useRef(null);
  const rootRef = useRef(null);
  const tokenRef = useRef(Symbol("modal"));
  // While AnimatePresence plays the exit animation the modal is still mounted.
  // Make it inert immediately so its fields can't be focused or clicked and it
  // no longer claims ESC — otherwise a fast user could type into a ghost form.
  const isPresent = useIsPresent();
  useEffect(() => {
    if (rootRef.current) rootRef.current.inert = !isPresent;
    if (!isPresent) {
      const i = openModals.indexOf(tokenRef.current);
      if (i >= 0) openModals.splice(i, 1);
    }
  }, [isPresent]);
  // Callers pass inline callbacks; keep them in refs so the mount effect
  // (scroll lock, ESC, autofocus) runs exactly once instead of on every render.
  const onCloseRef = useRef(onClose);
  const dismissRef = useRef(dismissible);
  onCloseRef.current = onClose;
  dismissRef.current = dismissible;

  useEffect(() => {
    const token = tokenRef.current;
    openModals.push(token);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && dismissRef.current && openModals[openModals.length - 1] === token) onCloseRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector("[data-autofocus], input:not([type=hidden]), textarea, select");
      el?.focus({ preventScroll: true });
    }, 60);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      const i = openModals.indexOf(token);
      if (i >= 0) openModals.splice(i, 1);
      if (openModals.length === 0) document.body.style.overflow = prevOverflow === "hidden" ? "" : prevOverflow;
    };
  }, []);

  const widths = { sm: "sm:max-w-[420px]", md: "sm:max-w-[480px]", lg: "sm:max-w-[640px]", xl: "sm:max-w-[860px]" };
  const variants = desktop
    ? { initial: { opacity: 0, scale: 0.96, y: 10 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: reduce ? 0 : 0.16, ease: [0.4, 0, 1, 1] } } }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%", transition: { duration: reduce ? 0 : 0.22, ease: [0.4, 0, 1, 1] } } };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div ref={rootRef} aria-hidden={isPresent ? undefined : true} className={cx("fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6", !isPresent && "pointer-events-none")}>
      <motion.div
        className="absolute inset-0 bg-[#050403]/75 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.18 } }}
        transition={{ duration: reduce ? 0 : 0.25 }}
        onClick={() => dismissible && onClose?.()}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        {...variants}
        transition={reduce ? { duration: 0 } : desktop ? { type: "spring", stiffness: 420, damping: 34 } : { type: "spring", stiffness: 380, damping: 40 }}
        drag={!desktop && dismissible ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose?.();
        }}
        className={cx(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-line-strong bg-gradient-to-b from-[#1d1a15] to-[#110f0c] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]",
          "rounded-t-[28px] sm:rounded-[28px]",
          widths[size]
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(245,182,63,0.12),transparent)]" />
        {!desktop && <div className="relative mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-white/15" />}
        <div className="relative overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-7 sm:pt-7">{children}</div>
      </motion.div>
    </div>,
    document.body
  );
}

export function ModalHeader({ icon: Icon, title, subtitle, onClose, id, visual }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      {visual || (Icon && (
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-gold-2/25 bg-gold-2/10 text-gold-1">
          <Icon className="h-6 w-6" />
        </span>
      ))}
      <div className="min-w-0 flex-1 pt-0.5">
        <h2 id={id} className="font-display text-[22px] font-bold leading-tight text-ink-1 sm:text-2xl">{title}</h2>
        {subtitle && <div className="mt-1 text-sm text-ink-3">{subtitle}</div>}
      </div>
      {onClose && <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2 -mt-1" />}
    </div>
  );
}

export function ErrorNote({ children, className }) {
  if (!children) return null;
  return (
    <motion.div
      key={String(children)}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx("animate-shake rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-200", className)}
      role="alert"
    >
      {children}
    </motion.div>
  );
}
