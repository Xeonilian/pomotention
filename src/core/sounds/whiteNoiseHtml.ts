import { useSettingStore } from "@/stores/useSettingStore";
import { dbgAudio, dbgAudioThrottled, postAudioRuntimeDebug } from "./debug";

/**
 * 白噪音播放链（须与「调音量」心智一致）：
 * - 仅使用两个 HTMLAudioElement 解码/播放，不用 Web Audio GainNode 做环路增益。
 * - 浏览器侧音量唯一入口：各元素的 HTMLMediaElement.volume（0–1，规范为线性振幅系数）。
 * - startWhiteNoiseHtml(src, v) 将 v clamp 后存入 state.masterVolume；有效输出 = masterVolume × duckFactor，写入 leader/follower 的 .volume。
 * - 系统/设备媒体音量不由网页控制；提示音 duck 靠 duckFactor，须与 tick 同步写到元素上（见 htmlWnCrossfadeTick）。
 * - tick 内顺序：先写 !followerArmed 的 .volume（含 leader 仍 paused、duration 仍为 0 时），再做 crossfade；否则 duck 与 master 调整会「看起来完全没区别」。
 */

/** 全平台白噪音：双轨交叉淡化，避免 HTML loop 接缝约每 file 时长卡一下 */
/** 双轨重叠与其它参数：想试听感主要改 ratioOfDuration、minSec、maxSec */
const HTML_WN_CROSSFADE = {
  ratioOfDuration: 0.01,
  minSec: 0.01,
  maxSec: 0.3,
  tooLongRatio: 0.42,
  capRatio: 0.35,
  handoffBeforeEndSec: 0.04,
  tickIntervalMs: 40,
} as const;

type HtmlWnCrossState = {
  els: [HTMLAudioElement, HTMLAudioElement];
  leaderIdx: 0 | 1;
  /** clamp 后的入参，与 duckFactor 相乘后写入 HTMLAudioElement.volume */
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

function effectiveHtmlMediaVolume(state: HtmlWnCrossState): number {
  return Math.min(1, Math.max(0, state.masterVolume * state.duckFactor));
}

function htmlWnCrossfadeTick(state: HtmlWnCrossState) {
  if (htmlWnCross !== state) return;
  const { els, leaderIdx, duration: d, crossfadeSec: cf } = state;
  const mv = effectiveHtmlMediaVolume(state);

  const leader = els[leaderIdx];
  const follower = els[1 - leaderIdx];

  /* paused 时也要写 .volume，否则起播前 playSound 触发的 duck 只改了 duckFactor，起播后仍用旧增益 */
  if (!state.followerArmed) {
    leader.volume = mv;
    if (follower.paused) follower.volume = 0;
  }

  if (leader.paused) return;

  if (d <= 0 || cf <= 0) return;

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

/**
 * 绑定双轨事件与首段起播（新建与切轨共用，复用元素以保持 iOS 媒体解锁）。
 */
function connectHtmlWnCrossfadePlayback(state: HtmlWnCrossState, mode: "new" | "retarget"): void {
  const [a, b] = state.els;

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
        if (!ts.isActive || (!ts.isWorking && !ts.isBreaking)) return;

        const { els, leaderIdx } = state;
        const mv = effectiveHtmlMediaVolume(state);
        const leader = els[leaderIdx];
        const follower = els[1 - leaderIdx];

        if (state.followerArmed) {
          leader.pause();
          leader.currentTime = 0;
          leader.volume = mv;
          follower.volume = mv;
          state.leaderIdx = (1 - leaderIdx) as 0 | 1;
          state.followerArmed = false;
          dbgAudioThrottled("wn_handoff_throttle", 30_000, "[WN] crossfade 息屏补交接", {});
          return;
        }

        leader.currentTime = 0;
        leader.volume = mv;
        void leader.play().catch((e: unknown) => {
          dbgAudio("[WN] crossfade ended play 拒绝", { message: e instanceof Error ? e.message : String(e) });
        });
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
  let sourceReloadRetried = false;
  /** 首段起播：须等有效时长；仅依赖 loadedmetadata 时，部分环境 duration 仍为 NaN/0，会永远不 play()（无拒绝日志、整块无声） */
  const tryArmPlayback = () => {
    if (htmlWnCross !== state || playbackStarted) return;
    const d = a.duration;
    if (!d || !isFinite(d) || d <= 0.05) return;

    playbackStarted = true;
    a.removeEventListener("loadedmetadata", tryArmPlayback);
    a.removeEventListener("durationchange", tryArmPlayback);
    a.removeEventListener("loadeddata", tryArmPlayback);
    a.removeEventListener("canplay", tryArmPlayback);

    state.duration = d;
    let cf = Math.min(HTML_WN_CROSSFADE.maxSec, Math.max(HTML_WN_CROSSFADE.minSec, d * HTML_WN_CROSSFADE.ratioOfDuration));
    if (cf > d * HTML_WN_CROSSFADE.tooLongRatio) {
      cf = d * HTML_WN_CROSSFADE.capRatio;
    }
    state.crossfadeSec = cf;

    const eff = effectiveHtmlMediaVolume(state);
    a.volume = eff;
    b.volume = 0;

    const onLeaderPlaying = () => {
      if (htmlWnCross !== state) return;
      dbgAudio(mode === "retarget" ? "[WN] crossfade 切轨" : "[WN] crossfade 起播", { durationSec: Math.round(d * 10) / 10 });
      // #region agent log
      postAudioRuntimeDebug("run_ios_prod", "H4_media_ready_but_play_chain_breaks", "whiteNoiseHtml.ts:226", "leader playing", {
        mode,
        durationSec: Math.round(d * 10) / 10,
        src: a.currentSrc || a.src,
      });
      // #endregion
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
        dbgAudio("[WN] crossfade play 拒绝", { message: msg });
        // #region agent log
        postAudioRuntimeDebug("run_ios_prod", "H4_media_ready_but_play_chain_breaks", "whiteNoiseHtml.ts:295", "leader play rejected", {
          message: msg,
          src: a.currentSrc || a.src,
        });
        // #endregion
        if (htmlWnCross !== state) return;
        scheduleLeaderPlayRecovery();
      });
  };

  const onLeaderError = () => {
    if (htmlWnCross !== state) return;
    const err = a.error;
    dbgAudio("[WN] crossfade 素材加载失败（整块无声，非 play 拒绝）", {
      code: err?.code,
      message: err?.message ?? "",
      src: a.currentSrc || a.src,
    });
    // #region agent log
    postAudioRuntimeDebug("run_ios_prod", "H5_asset_load_error_or_sw_cache_miss", "whiteNoiseHtml.ts:309", "leader media error", {
      code: err?.code ?? null,
      message: err?.message ?? "",
      src: a.currentSrc || a.src,
    });
    // #endregion
    if (sourceReloadRetried) return;
    sourceReloadRetried = true;
    /* 资源短时抖动（部署切换/CDN 回源）时做一次轻量重试；失败也不抛错，后续可由下一次 start/toggle 再尝试 */
    window.setTimeout(() => {
      if (htmlWnCross !== state) return;
      playbackStarted = false;
      a.load();
      b.load();
      dbgAudio("[WN] crossfade 素材重试加载");
    }, 1200);
  };
  a.addEventListener("error", onLeaderError);

  a.addEventListener("loadedmetadata", tryArmPlayback);
  a.addEventListener("durationchange", tryArmPlayback);
  a.addEventListener("loadeddata", tryArmPlayback);
  a.addEventListener("canplay", tryArmPlayback);
  a.load();
  b.load();

  const prevDetach = state.detachMediaListeners;
  state.detachMediaListeners = () => {
    prevDetach?.();
    a.removeEventListener("error", onLeaderError);
  };
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
  connectHtmlWnCrossfadePlayback(state, "new");
}

/**
 * 序列自动 work↔break：在已有双轨实例上换 src，不销毁元素，减少定时器触发的 play() NotAllowed。
 */
export function tryRetargetHtmlWhiteNoiseTrack(src: string, volume: number): boolean {
  const state = htmlWnCross;
  if (!state) return false;

  const masterVol = Math.min(1, Math.max(0, volume));
  state.masterVolume = masterVol;
  state.duckFactor = 1;
  if (state.duckTimer != null) {
    clearTimeout(state.duckTimer);
    state.duckTimer = null;
  }
  if (state.tickId != null) {
    clearInterval(state.tickId);
    state.tickId = null;
  }
  state.detachMediaListeners?.();
  state.detachMediaListeners = null;

  state.followerArmed = false;
  state.leaderIdx = 0;
  state.duration = 0;
  state.crossfadeSec = HTML_WN_CROSSFADE.minSec;

  const [a, b] = state.els;
  for (const el of state.els) {
    try {
      el.pause();
      el.src = src;
    } catch {
      /* 忽略 */
    }
  }
  applyHtmlAudioPlaysInline(a);
  applyHtmlAudioPlaysInline(b);

  connectHtmlWnCrossfadePlayback(state, "retarget");
  return true;
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
        if (!ts.isActive || (!ts.isWorking && !ts.isBreaking)) return;
        const [e0, e1] = stRef.els;
        if (!e0.paused || !e1.paused) return;
        const lead = stRef.els[stRef.leaderIdx];
        const fol = stRef.els[1 - stRef.leaderIdx];
        const mv = effectiveHtmlMediaVolume(stRef);
        if (!stRef.followerArmed) {
          lead.volume = mv;
          if (fol.paused) fol.volume = 0;
        }
        void lead.play().catch((e: unknown) => {
          dbgAudio("[WN] 前台补 play 拒绝", { message: e instanceof Error ? e.message : String(e) });
        });
      })
      .catch(() => {});
  } catch {
    /* Pinia 未就绪 */
  }
}
