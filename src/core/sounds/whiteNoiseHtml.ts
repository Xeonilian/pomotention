import { useSettingStore } from "@/stores/useSettingStore";
import { dbgAudio, dbgAudioThrottled } from "./debug";

/** 全平台白噪音：双轨交叉淡化，避免 HTML loop 接缝约每 file 时长卡一下 */
/** 双轨重叠与其它参数：想试听感主要改 ratioOfDuration、minSec、maxSec */
const HTML_WN_CROSSFADE = {
  ratioOfDuration: 0.0,
  minSec: 0.0,
  maxSec: 0.3,
  tooLongRatio: 0.42,
  capRatio: 0.35,
  handoffBeforeEndSec: 0.04,
  tickIntervalMs: 40,
} as const;

type HtmlWnCrossState = {
  els: [HTMLAudioElement, HTMLAudioElement];
  leaderIdx: 0 | 1;
  masterVolume: number;
  /** 与提示音同时播放时压低白噪音，避免盖过 Web Audio 提示音 */
  duckFactor: number;
  /** 浏览器定时器句柄为 number；勿用 ReturnType<typeof setTimeout>（含 Node 时会变成 NodeJS.Timeout） */
  duckTimer: number | null;
  duration: number;
  crossfadeSec: number;
  followerArmed: boolean;
  tickId: number | null;
  detachMediaListeners: (() => void) | null;
};

let htmlWnCross: HtmlWnCrossState | null = null;

/** 供前台恢复：是否仍有 HTML 双轨白噪音实例 */
export function isHtmlWhiteNoiseActive(): boolean {
  return htmlWnCross !== null;
}

function clearMediaSessionPlaybackState() {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.playbackState = "none";
  } catch {
    /* 忽略 */
  }
}

function applyHtmlAudioPlaysInline(el: HTMLAudioElement) {
  el.setAttribute("playsinline", "true");
  (el as unknown as { playsInline?: boolean }).playsInline = true;
}

function htmlWnCrossfadeTick(state: HtmlWnCrossState) {
  if (htmlWnCross !== state) return;
  const { els, leaderIdx, duration: d, crossfadeSec: cf } = state;
  const mv = state.masterVolume * state.duckFactor;
  if (d <= 0 || cf <= 0) return;

  const leader = els[leaderIdx];
  const follower = els[1 - leaderIdx];

  if (leader.paused) return;

  if (!state.followerArmed && leader.currentTime >= d - cf) {
    state.followerArmed = true;
    follower.currentTime = 0;
    follower.volume = 0;
    void follower.play().catch(() => {});
  }

  if (state.followerArmed) {
    const p = (leader.currentTime - (d - cf)) / cf;
    const u = Math.min(1, Math.max(0, p));
    leader.volume = mv * (1 - u);
    follower.volume = mv * u;
  }

  const atEnd = leader.ended || leader.currentTime >= d - HTML_WN_CROSSFADE.handoffBeforeEndSec;
  if (atEnd && state.followerArmed) {
    leader.pause();
    leader.currentTime = 0;
    leader.volume = mv;
    follower.volume = mv;
    state.leaderIdx = (1 - leaderIdx) as 0 | 1;
    state.followerArmed = false;
  }
}

export function stopHtmlWhiteNoise() {
  const st = htmlWnCross;
  htmlWnCross = null;
  if (st?.tickId != null) {
    clearInterval(st.tickId);
  }
  if (st?.duckTimer != null) {
    clearTimeout(st.duckTimer);
  }
  st?.detachMediaListeners?.();
  if (st) {
    for (const el of st.els) {
      try {
        el.pause();
        el.removeAttribute("src");
        el.load();
      } catch {
        /* 忽略 */
      }
    }
  }
  clearMediaSessionPlaybackState();
}

/** 全平台白噪音唯一实现：HTML 双轨 + crossfade */
export function startWhiteNoiseHtml(src: string, volume: number): void {
  stopHtmlWhiteNoise();

  const masterVol = Math.min(1, Math.max(0, volume));
  const a = new Audio();
  const b = new Audio();
  a.preload = "auto";
  b.preload = "auto";
  a.loop = false;
  b.loop = false;
  a.src = src;
  b.src = src;
  applyHtmlAudioPlaysInline(a);
  applyHtmlAudioPlaysInline(b);

  const state: HtmlWnCrossState = {
    els: [a, b],
    leaderIdx: 0,
    masterVolume: masterVol,
    duckFactor: 1,
    duckTimer: null,
    duration: 0,
    crossfadeSec: HTML_WN_CROSSFADE.minSec,
    followerArmed: false,
    tickId: null,
    detachMediaListeners: null,
  };
  htmlWnCross = state;

  const onMediaTimeUpdate = (ev: Event) => {
    if (htmlWnCross !== state) return;
    const el = ev.target as HTMLAudioElement;
    if (el !== state.els[state.leaderIdx]) return;
    htmlWnCrossfadeTick(state);
  };

  const onMediaEnded = (ev: Event) => {
    if (htmlWnCross !== state) return;
    if (!useSettingStore().settings.isWhiteNoiseEnabled) return;
    const el = ev.target as HTMLAudioElement;
    if (el !== state.els[state.leaderIdx]) return;

    void import("@/stores/useTimerStore")
      .then(({ useTimerStore }) => {
        if (htmlWnCross !== state) return;
        if (!useSettingStore().settings.isWhiteNoiseEnabled) return;
        const ts = useTimerStore();
        if (!ts.isActive || !ts.isWorking) return;

        const { els, leaderIdx } = state;
        const mv = state.masterVolume * state.duckFactor;
        const leader = els[leaderIdx];
        const follower = els[1 - leaderIdx];

        if (state.followerArmed) {
          leader.pause();
          leader.currentTime = 0;
          leader.volume = mv;
          follower.volume = mv;
          state.leaderIdx = (1 - leaderIdx) as 0 | 1;
          state.followerArmed = false;
          dbgAudioThrottled("wn_handoff_throttle", 30_000, "[WN] HTML crossfade ended 补交接（息屏定时器节流）", {});
          return;
        }

        leader.currentTime = 0;
        leader.volume = mv;
        void leader.play().catch((e: unknown) => {
          dbgAudio("[WN] HTML crossfade ended 硬重启 play 拒绝", {
            message: e instanceof Error ? e.message : String(e),
          });
        });
        dbgAudio("[WN] HTML crossfade ended 硬重启 leader（无 follower）", {});
      })
      .catch(() => {});
  };

  for (const el of state.els) {
    el.addEventListener("timeupdate", onMediaTimeUpdate);
    el.addEventListener("ended", onMediaEnded);
  }
  state.detachMediaListeners = () => {
    for (const el of state.els) {
      el.removeEventListener("timeupdate", onMediaTimeUpdate);
      el.removeEventListener("ended", onMediaEnded);
    }
  };

  let playbackStarted = false;
  const tryArmPlayback = () => {
    if (htmlWnCross !== state || playbackStarted) return;
    const d = a.duration;
    if (!d || !isFinite(d) || d <= 0.5) return;

    playbackStarted = true;
    a.removeEventListener("loadedmetadata", tryArmPlayback);
    a.removeEventListener("durationchange", tryArmPlayback);

    state.duration = d;
    let cf = Math.min(HTML_WN_CROSSFADE.maxSec, Math.max(HTML_WN_CROSSFADE.minSec, d * HTML_WN_CROSSFADE.ratioOfDuration));
    if (cf > d * HTML_WN_CROSSFADE.tooLongRatio) {
      cf = d * HTML_WN_CROSSFADE.capRatio;
    }
    state.crossfadeSec = cf;

    const eff = masterVol * state.duckFactor;
    a.volume = eff;
    b.volume = 0;

    /** 起播成功后再挂 tick，避免 play 被拒时空转 interval；并设 MediaSession */
    const onLeaderPlaying = () => {
      if (htmlWnCross !== state) return;
      dbgAudio("[WN] crossfade 起播", { src, volume: masterVol, duration: d, crossfadeSec: cf });
      if (state.tickId == null) {
        state.tickId = window.setInterval(() => htmlWnCrossfadeTick(state), HTML_WN_CROSSFADE.tickIntervalMs);
      }
      if (!("mediaSession" in navigator)) return;
      try {
        navigator.mediaSession.playbackState = "playing";
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "专注白噪音",
          artist: "Pomotention",
        });
      } catch {
        /* 忽略 */
      }
    };

    /** iOS：loadedmetadata 后 play 常晚于用户手势；短时重试 + 可见/触摸补一次 */
    const scheduleLeaderPlayRecovery = () => {
      const retryDelaysMs = [0, 60, 150, 320, 700, 1400];
      const retryTimers: number[] = [];
      let cleaned = false;
      const onVis = () => {
        if (document.visibilityState !== "visible") return;
        tryAgain();
      };
      const onPtr = () => {
        tryAgain();
      };
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("pointerdown", onPtr, true);
        for (const t of retryTimers) clearTimeout(t);
      };
      const tryAgain = () => {
        if (htmlWnCross !== state || cleaned) return;
        if (!a.paused) {
          cleanup();
          onLeaderPlaying();
          return;
        }
        void a
          .play()
          .then(() => {
            if (htmlWnCross !== state) return;
            cleanup();
            onLeaderPlaying();
          })
          .catch(() => {});
      };
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("pointerdown", onPtr, true);
      for (const ms of retryDelaysMs) {
        retryTimers.push(window.setTimeout(tryAgain, ms));
      }
    };

    void a
      .play()
      .then(() => {
        if (htmlWnCross !== state) return;
        onLeaderPlaying();
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        dbgAudio("[WN] HTMLAudio crossfade play 拒绝", { message: msg });
        if (htmlWnCross !== state) return;
        scheduleLeaderPlayRecovery();
      });
  };

  a.addEventListener("loadedmetadata", tryArmPlayback);
  a.addEventListener("durationchange", tryArmPlayback);
  a.load();
  b.load();
}

/**
 * 提示音播放期间压低白噪音，避免 HTML 与 Web Audio 同时输出时只听得到白噪音。
 * @param durationMs 与提示音时长对齐（略加长），结束自动恢复 duckFactor。
 */
export function duckHtmlWhiteNoiseForCuePlayback(durationMs: number): void {
  const st = htmlWnCross;
  if (!st) return;
  if (st.duckTimer != null) {
    clearTimeout(st.duckTimer);
    st.duckTimer = null;
  }
  /* 提示期间白噪音勿压过低，否则相对提示仍像「几比一」；过大则盖过 Web Audio */
  st.duckFactor = 0.55;
  htmlWnCrossfadeTick(st);
  st.duckTimer = window.setTimeout(
    function () {
      if (htmlWnCross !== st) return;
      st.duckFactor = 1;
      st.duckTimer = null;
      htmlWnCrossfadeTick(st);
    },
    Math.max(120, durationMs),
  );
}

export function resumeHtmlWhiteNoiseIfNeeded(): void {
  try {
    const st = htmlWnCross;
    if (!st) return;
    if (!useSettingStore().settings.isWhiteNoiseEnabled) return;
    const stRef = st;
    void import("@/stores/useTimerStore")
      .then(({ useTimerStore }) => {
        if (htmlWnCross !== stRef) return;
        if (!useSettingStore().settings.isWhiteNoiseEnabled) return;
        const ts = useTimerStore();
        if (!ts.isActive || !ts.isWorking) return;
        const [e0, e1] = stRef.els;
        if (!e0.paused || !e1.paused) return;
        const lead = stRef.els[stRef.leaderIdx];
        void lead.play().catch((e: unknown) => {
          dbgAudio("[WN] HTML crossfade 回到前台补 play 拒绝", {
            message: e instanceof Error ? e.message : String(e),
          });
        });
      })
      .catch(() => {});
  } catch {
    /* Pinia 未就绪 */
  }
}
