// In-browser video compression for practice clips.
//
// Phones record ~65 MB per minute at 1080p, so a 10-minute clip is far too big
// for free hosting. Before uploading we re-encode the picture to H.264 at a
// modest bitrate (720p / 480p) using the browser's own hardware encoder via
// WebCodecs (Mediabunny does the container work). The audio track is copied
// untouched, so the guitar sounds exactly as recorded.
//
// Everything degrades gracefully: if the browser can't do it, or the result
// wouldn't be meaningfully smaller, the original file is used as-is.

export const COMPRESS = {
  targetBytes: 45 * 1024 * 1024, // aim well under the 100 MB server limit
  skipBelowBytes: 15 * 1024 * 1024, // small clips are uploaded untouched
  audioBitrate: 160_000, // estimate for the copied audio track
  minVideoBitrate: 600_000,
  maxVideoBitrate: 2_500_000,
};

let mbPromise = null;
const loadMediabunny = () => (mbPromise ??= import("mediabunny"));

export function canCompressHere() {
  return typeof window !== "undefined" && typeof window.VideoEncoder === "function" && typeof window.VideoDecoder === "function";
}

/** Duration in seconds (or null if it can't be read). Never throws. */
export async function probeDuration(file) {
  // Parsing the container works everywhere, even without WebCodecs.
  try {
    const { Input, BlobSource, ALL_FORMATS } = await loadMediabunny();
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    try {
      const d = (await input.getDurationFromMetadata()) ?? (await input.computeDuration());
      if (Number.isFinite(d) && d > 0) return d;
    } finally {
      input.dispose();
    }
  } catch {
    /* fall through to the <video> element */
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    const done = (d) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) && d > 0 ? d : null);
    };
    v.preload = "metadata";
    v.onloadedmetadata = () => done(v.duration);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    v.src = url;
  });
}

// iPhone .mov clips are usually HEVC, which many browsers (e.g. Chrome on
// Windows) can't play. Re-encode them to H.264 MP4 even when they're small.
export const isQuickTime = (file) => /quicktime/i.test(file?.type || "") || /\.mov$/i.test(file?.name || "");

/** Whether a picked file should go through compressVideo at all. */
export const shouldProcess = (file) => canCompressHere() && (file.size > COMPRESS.skipBelowBytes || isQuickTime(file));

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

/**
 * Compress `file` for upload.
 * Resolves to { file, compressed, reason?, before, after }.
 * Rejects only with an AbortError when `signal` is aborted.
 */
export async function compressVideo(file, { onProgress, signal } = {}) {
  const keep = (reason) => ({ file, compressed: false, reason, before: file.size, after: file.size });

  const compat = isQuickTime(file);
  if (file.size <= COMPRESS.skipBelowBytes && !compat) return keep("small");
  if (!canCompressHere()) return keep("unsupported");

  let mb;
  try {
    mb = await loadMediabunny();
  } catch {
    return keep("unsupported");
  }
  const { Input, Output, BlobSource, BufferTarget, Mp4OutputFormat, Conversion, Quality, ALL_FORMATS, canEncodeVideo } = mb;

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  let conversion = null;
  const onAbort = () => conversion?.cancel().catch(() => {});
  signal?.addEventListener("abort", onAbort);

  try {
    const video = await input.getPrimaryVideoTrack();
    if (!video) return keep("no-video");
    const duration = (await input.getDurationFromMetadata()) ?? (await input.computeDuration());
    if (!(duration > 0)) return keep("unknown-duration");

    const budget = (COMPRESS.targetBytes * 8) / duration - COMPRESS.audioBitrate;
    const bitrate = Math.round(Math.min(COMPRESS.maxVideoBitrate, Math.max(COMPRESS.minVideoBitrate, budget)));

    // Estimated output size; skip if we wouldn't save much.
    const estimate = ((bitrate + COMPRESS.audioBitrate) * duration) / 8;
    if (estimate >= file.size * 0.85 && !compat) return keep("already-small");

    // Resize by the long edge; displayWidth/Height already account for rotation.
    const w = video.displayWidth;
    const h = video.displayHeight;
    const longEdge = bitrate >= 1_200_000 ? 1280 : 854;
    const scale = Math.min(1, longEdge / Math.max(w, h));
    const width = even(w * scale);
    const height = even(h * scale);

    // H.264 plays everywhere (including iPhones). The override exists only so
    // automated tests can run in browsers built without H.264.
    const codec = (typeof window !== "undefined" && window.__gplCompressCodec) || "avc";
    if (!(await canEncodeVideo(codec, { width, height, bitrate }))) return keep("no-encoder");
    if (signal?.aborted) throw abortError();

    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
    conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      // Audio options are omitted on purpose: the track is copied untouched,
      // which also works on browsers that have no audio encoder (older iOS).
      video: { codec, width, height, fit: "fill", quality: new Quality({ bitrate, bitrateMode: "variable" }) },
      showWarnings: false,
    });

    // Never trade away the sound: if the audio couldn't be carried over, bail.
    const lostAudio = conversion.discardedTracks.some((d) => d.track.type === "audio" && d.reason !== "discarded_by_user");
    const lostVideo = conversion.discardedTracks.some((d) => d.track.type === "video");
    if (!conversion.isValid || lostAudio || lostVideo) return keep("unsupported-codec");

    conversion.onProgress = (p) => onProgress?.(Math.max(0, Math.min(1, p)));
    if (signal?.aborted) throw abortError();
    await conversion.execute();
    if (signal?.aborted) throw abortError();

    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength === 0) return keep("failed");
    if (buffer.byteLength >= file.size * 0.95 && !compat) return keep("not-smaller");

    const base = (file.name || "clip").replace(/\.[^.]+$/, "");
    const out = new File([buffer], `${base}.mp4`, { type: "video/mp4", lastModified: Date.now() });
    return { file: out, compressed: true, before: file.size, after: out.size, duration, width, height };
  } catch (err) {
    if (signal?.aborted || err?.name === "AbortError" || conversion?.state === "canceled") throw abortError();
    console.warn("[compress] falling back to original file:", err);
    return keep("failed");
  } finally {
    signal?.removeEventListener("abort", onAbort);
    input.dispose();
  }
}

function abortError() {
  const e = new Error("Compression canceled");
  e.name = "AbortError";
  return e;
}
