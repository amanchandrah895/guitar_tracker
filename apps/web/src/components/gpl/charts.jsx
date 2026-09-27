"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { HEAT_RAMP, buildHeatmap, dayKey, formatMinutes, lastNDays } from "./lib";
import { cx } from "./ui";

const EMPTY_CELL = "rgba(255, 236, 205, 0.055)";

// Fixed practice thresholds for one person; relative (quintile of max) for the
// whole community, whose daily totals are an order of magnitude larger.
function heatStep(minutes, max, scale) {
  if (!minutes) return -1;
  if (scale === "personal") {
    if (minutes <= 15) return 0;
    if (minutes <= 30) return 1;
    if (minutes <= 45) return 2;
    if (minutes <= 75) return 3;
    return 4;
  }
  const r = minutes / (max || 1);
  return Math.min(4, Math.floor(r * 5 - 1e-9));
}

function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line-strong bg-[#221e18]/95 px-2.5 py-1.5 text-[12px] shadow-xl backdrop-blur"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <span className="font-semibold text-ink-1">{tip.value}</span>
      <span className="ml-1.5 text-ink-3">{tip.label}</span>
    </div>
  );
}

const GAP = 3;
const LABEL_W = 30; // day-label column + gap

/**
 * Calendar heatmap of minutes practised per day. Measures its container and
 * shows as many weeks as fit at a comfortable cell size (capped at `maxWeeks`).
 */
export function Heatmap({ sessions, maxWeeks = 26, minWeeks = 8, scale = "personal", className }) {
  const hostRef = useRef(null);
  const [fit, setFit] = useState({ weeks: 8, cell: 12 });
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - LABEL_W;
      if (w <= 0) return;
      const weeks = Math.max(minWeeks, Math.min(maxWeeks, Math.floor((w + GAP) / (16 + GAP))));
      const cell = Math.max(10, Math.min(22, Math.floor((w + GAP) / weeks) - GAP));
      setFit((f) => (f.weeks === weeks && f.cell === cell ? f : { weeks, cell }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWeeks, minWeeks]);
  const { weeks, cell } = fit;
  const cols = `repeat(${weeks}, ${cell}px)`;
  const { columns, max } = useMemo(() => buildHeatmap(sessions, weeks), [sessions, weeks]);
  const [tip, setTip] = useState(null);
  const todayKey = dayKey(new Date());
  const activeDays = columns.flat().filter((c) => c.minutes > 0).length;

  // Month labels at each month change, skipped when too close to the last one.
  let lastLabel = -9;
  const months = columns.map((col, i) => {
    const first = col[0].date;
    const prev = i > 0 ? columns[i - 1][0].date : null;
    const changed = !prev || prev.getMonth() !== first.getMonth();
    if (!changed || i - lastLabel < 3) return "";
    lastLabel = i;
    return first.toLocaleDateString("en-US", { month: "short" });
  });

  const show = (e, cell) => {
    const host = e.currentTarget.closest("[data-heat-host]").getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    setTip({
      x: r.left - host.left + r.width / 2,
      y: r.top - host.top,
      value: cell.minutes ? formatMinutes(cell.minutes, { long: true }) : "No practice",
      label: cell.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    });
  };

  return (
    <div ref={hostRef} className={cx("relative w-full min-w-0", className)} data-heat-host onMouseLeave={() => setTip(null)}>
      <div className="flex gap-[3px]">
        <div className="grid w-[27px] shrink-0 gap-[3px] pt-[18px] text-[10px] leading-none text-ink-3" style={{ gridTemplateRows: `repeat(7, ${cell}px)` }} aria-hidden="true">
          {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
            <span key={i} className="flex items-center">{d}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 grid gap-[3px] text-[10px] leading-3 text-ink-3" style={{ gridTemplateColumns: cols }} aria-hidden="true">
            {months.map((m, i) => (
              <span key={i} className="overflow-visible whitespace-nowrap">{m}</span>
            ))}
          </div>
          <div
            role="img"
            aria-label={`Practice calendar for the last ${weeks} weeks: ${activeDays} active days`}
            className="grid grid-flow-col gap-[3px]"
            style={{ gridTemplateColumns: cols, gridTemplateRows: `repeat(7, ${cell}px)` }}
          >
            {columns.flat().map((cell) => {
              const step = heatStep(cell.minutes, max, scale);
              return (
                <span
                  key={cell.key}
                  aria-label={`${cell.key}: ${cell.minutes} minutes`}
                  onMouseEnter={(e) => !cell.future && show(e, cell)}
                  onClick={(e) => !cell.future && show(e, cell)}
                  className={cx("rounded-[3px] transition-transform duration-150", !cell.future && "hover:scale-125", cell.key === todayKey && "ring-1 ring-ink-1/70 ring-offset-1 ring-offset-stage-1")}
                  style={{ background: cell.future ? "transparent" : step < 0 ? EMPTY_CELL : HEAT_RAMP[step] }}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-ink-3">
        <span>
          <span className="font-semibold text-ink-2">{activeDays}</span> active day{activeDays === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          Less
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: EMPTY_CELL }} />
          {HEAT_RAMP.map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />
          ))}
          More
        </span>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

function niceMax(v) {
  if (v <= 0) return 30;
  const steps = [30, 60, 90, 120, 180, 240, 300, 450, 600, 900, 1200, 1800, 2400];
  return steps.find((s) => s >= v) || Math.ceil(v / 600) * 600;
}

/** Minutes per day for the last N days — one series, so no legend box. */
export function MinutesBars({ sessions, days = 14, height = 168 }) {
  const data = useMemo(() => lastNDays(sessions, days), [sessions, days]);
  const [hover, setHover] = useState(null);
  const peak = data.reduce((m, d) => Math.max(m, d.minutes), 0);
  const top = niceMax(peak);
  const peakIndex = data.findIndex((d) => d.minutes === peak && peak > 0);
  const todayKey = dayKey(new Date());
  const ticks = [top, top / 2, 0];

  return (
    <div className="relative select-none" onMouseLeave={() => setHover(null)}>
      <div className="flex gap-2">
        {/* y-axis ticks */}
        <div className="relative w-9 shrink-0 text-right text-[10.5px] text-ink-3 tnum" style={{ height }} aria-hidden="true">
          {ticks.map((t, i) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 leading-none" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}>
              {t >= 60 ? `${t / 60}h` : `${t}m`}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }}>
          {/* hairline gridlines, solid & recessive */}
          {ticks.map((t, i) => (
            <div key={t} className={cx("absolute inset-x-0 h-px", i === ticks.length - 1 ? "bg-white/[0.14]" : "bg-white/[0.06]")} style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end" role="img" aria-label={`Minutes practised per day over the last ${days} days. Peak ${peak} minutes.`}>
            {data.map((d, i) => {
              const h = (d.minutes / top) * height;
              const isHover = hover === i;
              return (
                <button
                  key={d.key}
                  type="button"
                  aria-label={`${d.date.toDateString()}: ${d.minutes} minutes`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setHover(i)}
                  className="group relative flex h-full flex-1 items-end justify-center"
                >
                  {isHover && <span className="absolute inset-y-0 inset-x-[2px] rounded-md bg-white/[0.035]" />}
                  {i === peakIndex && !isHover && (
                    <span className="absolute text-[10.5px] font-semibold text-ink-2 tnum" style={{ bottom: h + 5 }}>{d.minutes}</span>
                  )}
                  <motion.span
                    initial={{ height: 0 }}
                    animate={{ height: Math.max(d.minutes ? 3 : 0, h) }}
                    transition={{ duration: 0.7, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                    className={cx("relative block w-[62%] max-w-[24px] rounded-t-[4px] transition-colors", d.key === todayKey ? "bg-gold-1" : isHover ? "bg-gold-1" : "bg-gold-2/80")}
                  />
                </button>
              );
            })}
          </div>
          {hover != null && (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line-strong bg-[#221e18]/95 px-2.5 py-1.5 text-[12px] shadow-xl backdrop-blur"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%`, bottom: (data[hover].minutes / top) * height + 10 }}
            >
              <span className="font-semibold text-ink-1">{formatMinutes(data[hover].minutes, { long: true })}</span>
              <span className="ml-1.5 text-ink-3">
                {data[hover].date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                {data[hover].sessions > 1 ? ` · ${data[hover].sessions} sessions` : ""}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* x labels */}
      <div className="ml-11 mt-2 flex text-[10.5px] text-ink-3" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.key} className={cx("flex-1 text-center", d.key === todayKey && "font-semibold text-ink-1", i % 2 === 1 && d.key !== todayKey && "max-sm:invisible")}>
            {d.key === todayKey ? "Today" : d.date.toLocaleDateString("en-US", { weekday: "narrow" })}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Tiny 14-day activity strip used on roster cards (decorative summary). */
export function Sparkbars({ byDay, days = 14 }) {
  const today = new Date();
  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    return byDay?.get(dayKey(d)) || 0;
  });
  const max = Math.max(30, ...cells);
  return (
    <div className="flex h-7 items-end gap-[2px]" aria-hidden="true">
      {cells.map((m, i) => (
        <span
          key={i}
          className={cx("flex-1 rounded-t-[2px]", m ? "bg-gold-2/75" : "bg-white/[0.06]")}
          style={{ height: m ? `${Math.max(14, (m / max) * 100)}%` : "3px" }}
        />
      ))}
    </div>
  );
}
