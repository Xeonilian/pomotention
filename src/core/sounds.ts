// sounds.ts
import { useSettingStore } from "@/stores/useSettingStore";
// 声音类型枚举
export enum SoundType {
  WORK_START = "work_start",
  WORK_MIDDLE = "work_middle",
  WORK_END = "work_end",
  BREAK_START = "break_start",
  BREAK_END = "break_end",
  WHITE_NOISE = "white_noise",
  PHASE_R1 = "phase_r1",
  PHASE_W1 = "phase_w1",
  PHASE_W2 = "phase_w2",
  PHASE_R2 = "phase_r2",
  PHASE_T = "phase_t",
  PHASE_BREAK = "phase_break",
  WORK_TICK = "work_tick",
}

// 声音文件路径
const soundPaths = {
  [SoundType.WORK_START]: "/sounds/work_start.wav",
  [SoundType.WORK_MIDDLE]: "/sounds/work_middle.wav",
  [SoundType.WORK_END]: "/sounds/work_end.wav",
  [SoundType.BREAK_START]: "/sounds/break_start.wav",
  [SoundType.BREAK_END]: "/sounds/break_end.wav",
  [SoundType.WHITE_NOISE]: "/sounds/white_noise.wav",
  [SoundType.PHASE_R1]: "/sounds/phase_r1.wav",
  [SoundType.PHASE_W1]: "/sounds/phase_w1.wav",
  [SoundType.PHASE_W2]: "/sounds/phase_w2.wav",
  [SoundType.PHASE_R2]: "/sounds/phase_r2.wav",
  [SoundType.PHASE_T]: "/sounds/phase_t.wav",
  [SoundType.PHASE_BREAK]: "/sounds/break_middle.wav",
  [SoundType.WORK_TICK]: "/sounds/work_tick.wav",
};

// 声音对象缓存
const soundCache = new Map<SoundType, HTMLAudioElement>();

// 写入设置页「音频诊断」，不抛错以免影响播放链
function dbgAudio(message: string, extra?: Record<string, unknown>) {
  try {
    const tail = extra !== undefined ? ` ${JSON.stringify(extra)}` : "";
    useSettingStore().pushAudioDebugLog(`${message}${tail}`);
  } catch {
    /* Pinia 未就绪等 */
  }
}

function attachAudioContextDebugListener(ctx: AudioContext) {
  const mark = "__pomotentionAudioDbgState";
  if ((ctx as unknown as Record<string, boolean>)[mark]) return;
  (ctx as unknown as Record<string, boolean>)[mark] = true;
  ctx.addEventListener("statechange", () => {
    dbgAudio("[WN] AudioContext statechange", { state: ctx.state });
  });
}

/** iOS 锁屏会挂起 AudioContext；长循环白噪音改走 HTMLAudio 才较可能不断 */
function preferHtmlAudioWhiteNoiseOnThisDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const iosUa = /iphone|ipad|ipod/.test(ua);
  // iPadOS 桌面 UA 含 Macintosh，用 maxTouchPoints 区分真 Mac（避免弃用 navigator.platform）
  const iPadDesktopMode = /macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iosUa || iPadDesktopMode;
}

/** iOS 白噪音：双轨交叉淡化，避免 HTML loop 接缝约每 file 时长卡一下 */
/** 双轨重叠与其它参数：想试听感主要改 ratioOfDuration、minSec、maxSec */
const HTML_WN_CROSSFADE = {
  /** 重叠时长（秒）≈ min(max(时长×ratio, minSec), maxSec)，再受 tooLongRatio/capRatio 约束 */
  ratioOfDuration: 0.03, // 听起来只是加重一下
  minSec: 0.2,
  maxSec: 0.3,
  /** 若重叠 > 时长×tooLongRatio，则改为 时长×capRatio */
  tooLongRatio: 0.42,
  capRatio: 0.35,
  /** 判定「该交出 leader」时比 duration 提前的秒数 */
  handoffBeforeEndSec: 0.04,
  /** 音量渐变刷新间隔（ms），越小越细 */
  tickIntervalMs: 40,
} as const;

type HtmlWnCrossState = {
  els: [HTMLAudioElement, HTMLAudioElement];
  leaderIdx: 0 | 1;
  masterVolume: number;
  duration: number;
  crossfadeSec: number;
  followerArmed: boolean;
  tickId: ReturnType<typeof setInterval> | null;
};

let htmlWnCross: HtmlWnCrossState | null = null;

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
  const { els, leaderIdx, masterVolume: mv, duration: d, crossfadeSec: cf } = state;
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

function stopHtmlWhiteNoise() {
  const st = htmlWnCross;
  htmlWnCross = null;
  if (st?.tickId != null) {
    clearInterval(st.tickId);
  }
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

function startWhiteNoiseHtml(src: string, volume: number): void {
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
    duration: 0,
    crossfadeSec: HTML_WN_CROSSFADE.minSec,
    followerArmed: false,
    tickId: null,
  };
  htmlWnCross = state;

  dbgAudio("[WN] 白噪音 HTMLAudio 双轨 crossfade（锁屏尽量不裁）", { src, volume: masterVol });

  const onMeta = () => {
    if (htmlWnCross !== state) return;
    const d = a.duration;
    if (!d || !isFinite(d) || d <= 0.5) return;

    state.duration = d;
    let cf = Math.min(HTML_WN_CROSSFADE.maxSec, Math.max(HTML_WN_CROSSFADE.minSec, d * HTML_WN_CROSSFADE.ratioOfDuration));
    if (cf > d * HTML_WN_CROSSFADE.tooLongRatio) {
      cf = d * HTML_WN_CROSSFADE.capRatio;
    }
    state.crossfadeSec = cf;

    a.volume = masterVol;
    b.volume = 0;

    void a
      .play()
      .then(() => {
        if (htmlWnCross !== state) return;
        dbgAudio("[WN] HTMLAudio crossfade 已起播", { duration: d, crossfadeSec: cf });
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
      })
      .catch((e: unknown) => {
        dbgAudio("[WN] HTMLAudio crossfade play 拒绝", {
          message: e instanceof Error ? e.message : String(e),
        });
      });

    state.tickId = setInterval(() => htmlWnCrossfadeTick(state), HTML_WN_CROSSFADE.tickIntervalMs);
  };

  a.addEventListener("loadedmetadata", onMeta, { once: true });
  a.load();
  b.load();
}

let audioCtx: AudioContext | null = null;
let whiteNoiseSource: AudioBufferSourceNode | null = null;
let whiteNoiseGain: GainNode | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx;
  const AC =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  audioCtx = ctx;
  attachAudioContextDebugListener(ctx);
  dbgAudio("[WN] AudioContext 已创建", { initialState: ctx.state });
  return ctx;
}

function decodeArrayBufferToAudioBuffer(ctx: AudioContext, buf: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const anyCtx = ctx as any;
    try {
      if (typeof anyCtx.decodeAudioData !== "function") {
        reject(new Error("decodeAudioData 不可用"));
        return;
      }
      if (anyCtx.decodeAudioData.length === 1) {
        anyCtx.decodeAudioData(buf).then(resolve, reject);
      } else {
        ctx.decodeAudioData(buf, resolve, reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}

/** 已解码的短音效（与白噪音共用 AudioContext，避免 iOS 上对非手势 HTMLAudio 的 NotAllowedError） */
const cueBufferCache = new Map<SoundType, AudioBuffer>();
const cueBufferInflight = new Map<SoundType, Promise<AudioBuffer | null>>();

async function getOrDecodeCueBuffer(type: SoundType): Promise<AudioBuffer | null> {
  const ctx = audioCtx;
  if (!ctx) return null;
  const cached = cueBufferCache.get(type);
  if (cached) return cached;
  let inflight = cueBufferInflight.get(type);
  if (!inflight) {
    inflight = (async () => {
      try {
        const url = soundPaths[type];
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        const decoded = await decodeArrayBufferToAudioBuffer(ctx, arr);
        cueBufferCache.set(type, decoded);
        return decoded;
      } catch (e) {
        console.error("[WebAudio cue] decode fail", type, e);
        dbgAudio("[WebAudio cue] decode FAIL", {
          type,
          message: e instanceof Error ? e.message : String(e),
        });
        return null;
      } finally {
        cueBufferInflight.delete(type);
      }
    })();
    cueBufferInflight.set(type, inflight);
  }
  return inflight;
}

// 获取声音对象
function getSound(type: SoundType): HTMLAudioElement {
  if (!soundCache.has(type)) {
    const audio = new Audio(soundPaths[type]);
    soundCache.set(type, audio);
  }
  return soundCache.get(type)!;
}

async function playSoundAsync(type: SoundType): Promise<void> {
  getOrCreateAudioContext();
  const ctx = audioCtx;
  if (ctx) {
    await ctx.resume().catch(() => {});
    if (ctx.state === "interrupted") {
      await ctx.resume().catch(() => {});
    }
    if (ctx.state === "running") {
      try {
        const buf = await getOrDecodeCueBuffer(type);
        if (buf) {
          const src = ctx.createBufferSource();
          const g = ctx.createGain();
          g.gain.value = 1;
          src.buffer = buf;
          src.connect(g).connect(ctx.destination);
          src.start(0);
          dbgAudio("[WebAudio cue] play OK", { type, sec: buf.duration });
          return;
        }
      } catch (e) {
        dbgAudio("[WebAudio cue] play FAIL", {
          type,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    } else {
      dbgAudio("[WebAudio cue] skip ctx not running", { type, state: ctx.state });
    }
  }

  const sound = getSound(type);
  sound.currentTime = 0;
  void sound
    .play()
    .then(() => {
      dbgAudio("[HTMLAudio] play OK", { type });
    })
    .catch((error) => {
      console.error("Failed to play sound:", type, error);
      dbgAudio("[HTMLAudio] play FAIL", {
        type,
        name: error instanceof Error ? error.name : "unknown",
        message: error instanceof Error ? error.message : String(error),
      });
    });
}

// 播放声音（优先 Web Audio，与白噪音同源上下文，适配 iOS 定时触发的提示音）
export function playSound(type: SoundType): void {
  void playSoundAsync(type);
}

// ====== Web Audio for 白噪音 BEGIN ======

// 跟踪所有活跃 Source，确保 stop 时能全部停止/断开
const whiteNoiseSources = new Set<AudioBufferSourceNode>();
const whiteNoiseSourceIds = new Map<AudioBufferSourceNode, number>();
let whiteNoiseNextId = 1;
// ====== Web Audio for 白噪音 END ======

// 开始播放白噪音（Web Audio，无缝循环，只有错误日志）
export function startWhiteNoise(): void {
  const settingStore = useSettingStore();
  if (!settingStore.settings.isWhiteNoiseEnabled) return;

  // 清理旧 Source（不影响持久 Gain）
  stopWhiteNoise();

  const src = soundPaths[settingStore.settings.whiteNoiseSoundTrack];
  const vol = settingStore.settings.whiteNoiseSoundTrack === SoundType.WORK_TICK ? 1 : 0.3;

  if (preferHtmlAudioWhiteNoiseOnThisDevice()) {
    startWhiteNoiseHtml(src, vol);
    return;
  }

  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    // 创建或复用全局 GainNode（只连接一次）
    if (!whiteNoiseGain) {
      whiteNoiseGain = ctx.createGain();
      whiteNoiseGain.connect(ctx.destination);
    }

    // 设置音量（WORK_TICK=1，其它=0.3）
    if (whiteNoiseGain) {
      whiteNoiseGain.gain.value = vol;
    }

    dbgAudio("[WN] startWhiteNoise 入口", {
      src,
      ctxState: ctx.state,
      track: settingStore.settings.whiteNoiseSoundTrack,
    });
    void ctx
      .resume()
      .then(() => {
        dbgAudio("[WN] audioCtx.resume 兑现", { state: ctx.state });
      })
      .catch((e: unknown) => {
        console.log("[WN] audioCtx.resume() 错误:", e);
        dbgAudio("[WN] audioCtx.resume 拒绝", {
          message: e instanceof Error ? e.message : String(e),
        });
      });

    fetch(src)
      .then((res) => res.arrayBuffer())
      .then((buf) => decodeArrayBufferToAudioBuffer(ctx, buf))
      .then((audioBuffer) => {
        const s = useSettingStore();
        if (!audioCtx || !whiteNoiseGain) return;
        if (!s.settings.isWhiteNoiseEnabled) return;

        dbgAudio("[WN] decode 完成，即将 source.start", {
          bufferDuration: audioBuffer.duration,
          ctxState: audioCtx.state,
        });

        const source = audioCtx.createBufferSource();
        const id = whiteNoiseNextId++;
        whiteNoiseSources.add(source);
        whiteNoiseSourceIds.set(source, id);

        source.buffer = audioBuffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = audioBuffer.duration;

        source.connect(whiteNoiseGain);

        try {
          source.start(0);
          dbgAudio("[WN] source.start 成功", {
            ctxState: audioCtx.state,
            gain: whiteNoiseGain?.gain.value,
          });
        } catch (e) {
          console.log("[WN] source.start(0) 错误:", e);
          dbgAudio("[WN] source.start 异常", {
            message: e instanceof Error ? e.message : String(e),
          });
        }

        // 替换旧的“当前 Source”
        if (whiteNoiseSource && whiteNoiseSource !== source) {
          try {
            whiteNoiseSource.stop(0);
          } catch (e) {
            console.log("[WN] 停止旧 Source 错误:", e);
          }
          try {
            whiteNoiseSource.disconnect();
          } catch (e) {
            console.log("[WN] 断开旧 Source 错误:", e);
          }
          whiteNoiseSources.delete(whiteNoiseSource);
          whiteNoiseSourceIds.delete(whiteNoiseSource);
        }

        whiteNoiseSource = source;
      })
      .catch((e) => {
        console.log("[WN] startWhiteNoise 流程错误:", e);
        dbgAudio("[WN] startWhiteNoise 流程错误", {
          message: e instanceof Error ? e.message : String(e),
        });
      });
  } catch (e) {
    console.log("[WN] startWhiteNoise 外层错误:", e);
    dbgAudio("[WN] startWhiteNoise 外层错误", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

function resumeHtmlWhiteNoiseIfNeeded(): void {
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
        if (!ts.isActive || (!ts.isWorking && !ts.isFromSequence)) return;
        const [e0, e1] = stRef.els;
        if (!e0.paused || !e1.paused) return;
        const lead = stRef.els[stRef.leaderIdx];
        void lead.play().catch((e: unknown) => {
          dbgAudio("[WN] HTML crossfade 回到前台补 play 拒绝", {
            message: e instanceof Error ? e.message : String(e),
          });
        });
        dbgAudio("[WN] HTML crossfade 回到前台补 play", {});
      })
      .catch(() => {});
  } catch {
    /* Pinia 未就绪 */
  }
}

/** 锁屏/切后台后 iOS 常 suspend AudioContext；回前台需 resume，否则整段 Web Audio 无声 */
export function resumeSharedAudioAfterForeground(): void {
  resumeHtmlWhiteNoiseIfNeeded();

  const ctx = audioCtx;
  if (!ctx) return;

  const tryRestartWhiteNoiseIfNeeded = () => {
    try {
      if (!useSettingStore().settings.isWhiteNoiseEnabled) return;
      if (preferHtmlAudioWhiteNoiseOnThisDevice()) return;
      if (whiteNoiseSources.size > 0) return;
      void import("@/stores/useTimerStore")
        .then(({ useTimerStore }) => {
          if (!useSettingStore().settings.isWhiteNoiseEnabled) return;
          const ts = useTimerStore();
          if (ts.isActive && (ts.isWorking || ts.isFromSequence)) {
            startWhiteNoise();
            dbgAudio("[WN] 前台恢复后补拉白噪音", { reason: "无活跃 BufferSource" });
          }
        })
        .catch(() => {});
    } catch {
      /* Pinia 未就绪 */
    }
  };

  if (ctx.state === "running") {
    tryRestartWhiteNoiseIfNeeded();
    return;
  }

  void ctx
    .resume()
    .then(() => {
      dbgAudio("[WN] resumeSharedAudio 兑现", { state: ctx.state });
      tryRestartWhiteNoiseIfNeeded();
    })
    .catch((e: unknown) => {
      dbgAudio("[WN] resumeSharedAudio 拒绝", {
        message: e instanceof Error ? e.message : String(e),
      });
      tryRestartWhiteNoiseIfNeeded();
    });
}

export function stopWhiteNoise(): void {
  try {
    stopHtmlWhiteNoise();
    dbgAudio("[WN] stopWhiteNoise", {
      sourceCount: whiteNoiseSources.size,
      ctxState: audioCtx?.state ?? "no-ctx",
    });
    if (whiteNoiseGain) {
      try {
        whiteNoiseGain.gain.value = 0; // 立即静音
      } catch (e) {
        console.log("[WN] 设置增益为 0 错误:", e);
      }
    }

    for (const src of Array.from(whiteNoiseSources)) {
      try {
        src.stop(0);
      } catch (e) {
        console.log("[WN] source.stop(0) 错误:", e);
      }
      try {
        src.disconnect();
      } catch (e) {
        console.log("[WN] source.disconnect() 错误:", e);
      }
      whiteNoiseSources.delete(src);
      whiteNoiseSourceIds.delete(src);
    }

    whiteNoiseSource = null;
  } catch (e) {
    console.log("[WN] stopWhiteNoise 外层错误:", e);
  }
}

// 切换白噪音状态（是否在跑以 Pinia timer 为准，与持久化恢复一致）
export function toggleWhiteNoise(): void {
  const settingStore = useSettingStore();
  settingStore.settings.isWhiteNoiseEnabled = !settingStore.settings.isWhiteNoiseEnabled;
  if (!settingStore.settings.isWhiteNoiseEnabled) {
    stopWhiteNoise();
    return;
  }
  void import("@/stores/useTimerStore")
    .then(({ useTimerStore }) => {
      if (!useSettingStore().settings.isWhiteNoiseEnabled) return;
      const ts = useTimerStore();
      // 专注中、或序列整场未结束（含休息）时允许恢复白噪音
      if (ts.isActive && (ts.isWorking || ts.isFromSequence)) {
        startWhiteNoise();
      }
    })
    .catch(() => {
      /* Pinia 未就绪等 */
    });
}
