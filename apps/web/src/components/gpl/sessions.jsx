"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArchiveX, ChevronDown, Crown, Film, MessageSquareText, Music, Send, StickyNote, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, clipLabel, formatDate, formatMinutes, formatTime, parseDbDate, timeAgo } from "./lib";
import { possessive, useInstructorName, useSettings } from "./settings";
import { Button, EmptyState, IconButton, Segmented, SongTag, cx } from "./ui";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "video", label: "With video" },
  { value: "feedback", label: "Feedback" },
];

/**
 * Month-grouped practice timeline.
 * variant: "student" (own dashboard) | "public" (read-only) | "admin" (can comment)
 */
export function SessionTimeline({ sessions, studentName, variant = "student", pageSize = 6, onChanged, showFilters = true, emptyAction }) {
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(pageSize);

  const counts = useMemo(
    () => ({
      all: sessions.length,
      video: sessions.filter((s) => s.videos?.some((v) => !v.removed)).length,
      feedback: sessions.filter((s) => s.videos?.some((v) => v.comments?.length)).length,
    }),
    [sessions]
  );
  const filtered = useMemo(
    () =>
      sessions.filter((s) =>
        filter === "video" ? s.videos?.some((v) => !v.removed) : filter === "feedback" ? s.videos?.some((v) => v.comments?.length) : true
      ),
    [sessions, filter]
  );
  const visible = filtered.slice(0, limit);
  const groups = [];
  for (const s of visible) {
    const at = parseDbDate(s.created_at);
    const label = at ? at.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Earlier";
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, items: [] });
    groups[groups.length - 1].items.push({ ...s, at });
  }

  if (sessions.length === 0) {
    return <EmptyState icon={Music} title="No sessions yet" body={variant === "student" ? "Log your first practice to start your streak." : "Nothing logged yet."} action={emptyAction} />;
  }

  return (
    <div>
      {showFilters && (counts.video > 0 || variant === "admin") && (
        <div className="no-scrollbar -mx-1 mb-5 overflow-x-auto px-1">
          <Segmented
            options={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))}
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setLimit(pageSize);
            }}
          />
        </div>
      )}
      {filtered.length === 0 ? (
        <EmptyState compact icon={Film} title="Nothing here yet" body={filter === "video" ? "No sessions with clips yet." : "No tutor feedback yet."} />
      ) : (
        <div className="space-y-7">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="eyebrow sticky top-16 z-10 -mx-1 mb-3 bg-gradient-to-b from-[#16130f] to-transparent px-1 py-1 sm:top-[72px]">{g.label}</p>
              <ol className="space-y-3">
                {g.items.map((s) => (
                  <SessionItem key={s.id} session={s} studentName={studentName} variant={variant} onChanged={onChanged} />
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
      {filtered.length > limit && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" size="sm" iconRight={ChevronDown} onClick={() => setLimit((l) => l + pageSize * 2)}>
            Show more · {filtered.length - limit} left
          </Button>
        </div>
      )}
    </div>
  );
}

export function SessionItem({ session, studentName, variant, onChanged }) {
  const at = session.at || parseDbDate(session.created_at);
  const liveClips = (session.videos || []).filter((v) => !v.removed).length;
  return (
    <motion.li layout="position" className="rounded-2xl border border-line bg-white/[0.02] p-3.5 transition-colors hover:border-line-strong sm:p-4">
      <div className="flex gap-3.5">
        <div className="grid h-14 w-14 shrink-0 place-content-center rounded-xl border border-line bg-black/25 text-center">
          <span className="font-display text-xl font-bold leading-none text-ink-1">{at ? at.getDate() : "–"}</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-3">{at ? at.toLocaleDateString("en-US", { weekday: "short" }) : ""}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {(session.songs || []).map((song) => <SongTag key={song}>{song}</SongTag>)}
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold-2/10 px-2.5 py-1 text-[12.5px] font-semibold text-gold-1 tnum">
              <Timer className="h-3.5 w-3.5" />
              {formatMinutes(session.minutes)}
            </span>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">
            {at ? `${formatTime(at)} · ${timeAgo(at)}` : ""}
            {liveClips ? ` · ${liveClips} clip${liveClips > 1 ? "s" : ""}` : ""}
          </p>
          {session.notes && (
            <p className="mt-2.5 flex gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-[13.5px] leading-relaxed text-ink-2">
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
              <span className="whitespace-pre-line">{session.notes}</span>
            </p>
          )}
        </div>
      </div>
      {session.videos?.map((v) => (
        <VideoBlock key={v.id} video={v} studentName={studentName} canComment={variant === "admin"} onChanged={onChanged} />
      ))}
    </motion.li>
  );
}

function VideoBlock({ video, studentName, canComment, onChanged }) {
  const instructor = useInstructorName();
  const { limits } = useSettings();
  const removed = !!video.removed;
  const [comments, setComments] = useState(video.comments || []);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const add = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      const { comment } = await api("/api/comments", { method: "POST", body: { videoId: video.id, text: t } });
      setComments((c) => [...c, comment]);
      setText("");
      toast.success("Feedback sent");
      onChanged?.();
    } catch (e) {
      toast.error(e.message || "Could not send feedback");
    } finally {
      setSending(false);
    }
  };
  const remove = async (id) => {
    try {
      await api(`/api/comments?id=${id}`, { method: "DELETE" });
      setComments((c) => c.filter((x) => x.id !== id));
      onChanged?.();
    } catch {
      toast.error("Could not delete comment");
    }
  };

  return (
    <div className="mt-3.5 max-w-2xl overflow-hidden rounded-2xl border border-line bg-black/30 sm:ml-[70px]">
      {removed ? (
        <div className="flex items-start gap-3 border-b border-line bg-white/[0.02] px-3.5 py-3.5" data-testid="clip-removed">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line-strong bg-black/30 text-ink-3">
            <ArchiveX className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ink-2">Clip auto-removed</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">
              Only the {limits.videosPerStudent} most recent clips are stored, so this one was deleted{video.removed_at ? ` on ${formatDate(parseDbDate(video.removed_at, { utc: true }))}` : ""}.
              {comments.length ? " Feedback on it is kept below." : ""}
            </p>
          </div>
        </div>
      ) : (
        <video controls playsInline preload="metadata" className="aspect-video w-full bg-black" src={`/api/videos/${video.id}`} />
      )}
      <div className={cx("space-y-3 p-3.5", removed && !comments.length && "hidden")}>
        {!removed && (
          <p className="flex items-center gap-1.5 truncate text-[12px] text-ink-3">
            <Film className="h-3.5 w-3.5 shrink-0" /> <span className="min-w-0 truncate">{clipLabel(studentName, video.uploaded_at)}</span>
          </p>
        )}
        <AnimatePresence initial={false}>
          {comments.map((c) => {
            const at = parseDbDate(c.created_at, { utc: true });
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2.5"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-grad text-[#1a1206]">
                  <Crown className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-gold-2/20 bg-gold-2/[0.06] px-3 py-2">
                  <p className="text-[11.5px] font-semibold text-gold-1">{instructor} <span className="font-normal text-ink-3">· {at ? timeAgo(at) : ""}</span></p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-1">{c.text}</p>
                </div>
                {canComment && <IconButton size="sm" icon={Trash2} label="Delete comment" onClick={() => remove(c.id)} className="text-ink-3 hover:text-red-300" />}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!canComment && !removed && comments.length === 0 && (
          <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3"><MessageSquareText className="h-3.5 w-3.5" /> Awaiting {possessive(instructor)} feedback</p>
        )}
        {canComment && !removed && (
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="Write feedback…"
              aria-label="Write feedback. Press Enter to send"
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-line-strong bg-black/30 px-4 py-2.5 text-[14px] text-ink-1 placeholder:text-ink-4 focus:border-gold-2/70"
            />
            <Button size="md" icon={Send} loading={sending} disabled={!text.trim()} onClick={add} className={cx("h-[44px] px-4")} aria-label="Send feedback" />
          </div>
        )}
      </div>
    </div>
  );
}
