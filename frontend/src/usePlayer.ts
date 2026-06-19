import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { DocumentOut, Segment } from "./types";

const LOOKAHEAD = 3; // pre-generate this many paragraphs ahead of playback
const SPEEDS = [0.75, 1, 1.25, 1.5, 2, 3];

export type SegStatus = "ready" | "generating" | "failed" | "queued";

export interface PlayerState {
  para: number;
  playing: boolean;
  speed: number;
  failed: Set<number>;
  cached: Set<number>;
  generating: number | null;
}

/**
 * Audio engine for the reader.
 *
 *  - One <audio> element plays the current paragraph's clip.
 *  - A lookahead buffer pre-fetches the next few paragraphs (warming the
 *    backend cache + browser cache) so playback feels continuous despite
 *    local generation time on the user's Mac.
 *  - Speed is applied via playbackRate (cached clips stay speed-independent).
 *  - Position/speed/voice are persisted (debounced) for resume.
 */
export function usePlayer(doc: DocumentOut | null, voice: string | null) {
  const [state, setState] = useState<PlayerState>({
    para: doc?.session.current_segment ?? 0,
    playing: false,
    speed: doc?.session.speed ?? 1,
    failed: new Set(),
    cached: new Set(),
    generating: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prefetchRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const stateRef = useRef(state);
  stateRef.current = state;
  const saveTimer = useRef<number | null>(null);

  const segments: Segment[] = doc?.segments ?? [];

  // ---- persistence (debounced) ----
  const persist = useCallback(
    (patch: Partial<{ current_segment: number; speed: number; voice_profile_id: string }>) => {
      if (!doc) return;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        api.savePosition(doc.document.id, patch).catch(() => {});
      }, 600);
    },
    [doc],
  );

  // ---- lookahead prefetch: warm cache for para..para+LOOKAHEAD ----
  const prefetch = useCallback(
    (from: number) => {
      if (!doc || !voice) return;
      for (let i = from; i <= from + LOOKAHEAD && i < segments.length; i++) {
        if (prefetchRef.current.has(i) || stateRef.current.failed.has(i)) continue;
        const el = new Audio(api.audioUrl(doc.document.id, i, voice));
        el.preload = "auto";
        el.oncanplaythrough = () => {
          setState((s) => ({ ...s, cached: new Set(s.cached).add(i) }));
        };
        el.onerror = () => {
          setState((s) => ({ ...s, failed: new Set(s.failed).add(i) }));
        };
        prefetchRef.current.set(i, el);
      }
    },
    [doc, voice, segments.length],
  );

  // ---- advance to next non-failed paragraph ----
  const nextPlayable = useCallback(
    (from: number): number => {
      let i = from;
      while (i < segments.length && stateRef.current.failed.has(i)) i++;
      return i;
    },
    [segments.length],
  );

  // ---- core: play a given paragraph ----
  const playPara = useCallback(
    (idx: number) => {
      if (!doc || !voice) return;
      const i = nextPlayable(idx);
      if (i >= segments.length) {
        setState((s) => ({ ...s, playing: false }));
        api.savePosition(doc.document.id, { finished: true }).catch(() => {});
        return;
      }

      const buffered = prefetchRef.current.get(i);
      const el = buffered ?? new Audio(api.audioUrl(doc.document.id, i, voice));
      prefetchRef.current.set(i, el);
      audioRef.current = el;
      el.playbackRate = stateRef.current.speed;

      setState((s) => ({
        ...s,
        para: i,
        generating: s.cached.has(i) ? null : i,
      }));
      persist({ current_segment: i });
      prefetch(i + 1);

      el.onended = () => playPara(i + 1);
      el.onerror = () => {
        setState((s) => ({ ...s, failed: new Set(s.failed).add(i) }));
        playPara(i + 1);
      };
      el.oncanplaythrough = () => setState((s) => ({ ...s, generating: null }));

      el.play().catch(() => {
        // Autoplay may be blocked until a user gesture; leave it paused.
        setState((s) => ({ ...s, playing: false }));
      });
    },
    [doc, voice, segments.length, nextPlayable, persist, prefetch],
  );

  // ---- public controls ----
  const togglePlay = useCallback(() => {
    if (!doc) return;
    setState((s) => {
      const playing = !s.playing;
      if (playing) {
        if (audioRef.current && audioRef.current.paused && audioRef.current.currentTime > 0) {
          audioRef.current.playbackRate = s.speed;
          audioRef.current.play().catch(() => {});
        } else {
          playPara(s.para);
        }
      } else {
        audioRef.current?.pause();
      }
      return { ...s, playing };
    });
  }, [doc, playPara]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setState((s) => ({ ...s, playing: false }));
  }, []);

  const jumpTo = useCallback(
    (idx: number) => {
      audioRef.current?.pause();
      setState((s) => ({ ...s, para: idx, playing: true }));
      playPara(idx);
    },
    [playPara],
  );

  const nextPara = useCallback(() => {
    jumpTo(Math.min(segments.length - 1, stateRef.current.para + 1));
  }, [jumpTo, segments.length]);

  const prevPara = useCallback(() => {
    jumpTo(Math.max(0, stateRef.current.para - 1));
  }, [jumpTo]);

  const cycleSpeed = useCallback(() => {
    setState((s) => {
      const next = SPEEDS[(SPEEDS.indexOf(s.speed) + 1) % SPEEDS.length] ?? 1;
      if (audioRef.current) audioRef.current.playbackRate = next;
      persist({ speed: next });
      return { ...s, speed: next };
    });
  }, [persist]);

  const setSpeed = useCallback(
    (sp: number) => {
      if (audioRef.current) audioRef.current.playbackRate = sp;
      persist({ speed: sp });
      setState((s) => ({ ...s, speed: sp }));
    },
    [persist],
  );

  const retry = useCallback(
    (idx: number) => {
      prefetchRef.current.delete(idx);
      setState((s) => {
        const failed = new Set(s.failed);
        failed.delete(idx);
        return { ...s, failed };
      });
      prefetch(idx);
    },
    [prefetch],
  );

  // start prefetching as soon as a doc + voice are available
  useEffect(() => {
    if (doc && voice) prefetch(state.para);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, voice]);

  // cleanup on unmount / doc change
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      prefetchRef.current.forEach((el) => el.pause());
      prefetchRef.current.clear();
    };
  }, [doc?.document.id]);

  const statusOf = useCallback(
    (idx: number): SegStatus => {
      if (state.failed.has(idx)) return "failed";
      if (state.generating === idx && !state.cached.has(idx)) return "generating";
      if (state.cached.has(idx)) return "ready";
      return "queued";
    },
    [state],
  );

  return { state, segments, togglePlay, stop, jumpTo, nextPara, prevPara, cycleSpeed, setSpeed, retry, statusOf, SPEEDS };
}
