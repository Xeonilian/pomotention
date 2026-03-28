// sounds.ts
import { useSettingStore } from "@/stores/useSettingStore";
// 声音类型枚举
export enum SoundType {
  WORK_START = "work_start",
  WORK_MIDDLE = "work_middle",
  WORK_END = "work_end",
  BREAK_START = "break_start",
  BREAK_END = "break_end",
  WHITE_NOISE_RAIN = "white_noise_rain",
  WHITE_NOISE_BIRD_SEA = "white_noise_bird_sea",
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
  [SoundType.WHITE_NOISE_RAIN]: "/sounds/white_noise_rain.wav",
  [SoundType.WHITE_NOISE_BIRD_SEA]: "/sounds/white_noise_bird_sea.wav",
  [SoundType.PHASE_R1]: "/sounds/phase_r1.wav",
  [SoundType.PHASE_W1]: "/sounds/phase_w1.wav",
  [SoundType.PHASE_W2]: "/sounds/phase_w2.wav",
  [SoundType.PHASE_R2]: "/sounds/phase_r2.wav",
  [SoundType.PHASE_T]: "/sounds/phase_t.wav",
  [SoundType.PHASE_BREAK]: "/sounds/break_middle.wav",
  [SoundType.WORK_TICK]: "/sounds/work_tick.wav",
};

/** soundPaths 内全部类型，供预取与遍历 */
const ALL_SOUND_TYPES = Object.values(SoundType).filter((v): v is SoundType => typeof v === "string");

/** 预取到的原始音频字节（不依赖 AudioContext）；与首次播放共用同一套 inflight，避免重复下载 */
const cueBytesCache = new Map<SoundType, ArrayBuffer>();
const cueBytesInflight = new Map<SoundType, Promise<ArrayBuffer | null>>();

async function loadCueBytes(type: SoundType): Promise<ArrayBuffer | null> {
  const hit = cueBytesCache.get(type);
  if (hit) return hit;
  let inflight = cueBytesInflight.get(type);
  if (!inflight) {
    inflight = (async () => {
      try {
        const url = soundPaths[type];
        const res = await fetch(url);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        cueBytesCache.set(type, arr);
        return arr;
      } catch {
        return null;
      } finally {
        cueBytesInflight.delete(type);
      }
    })();
    cueBytesInflight.set(type, inflight);
  }
  return inflight;
}

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

/** iPhone / iPad WebKit：HTML 媒体与 AudioContext 解锁策略与桌面不同，白噪音与提示音在此统一判定 */
function isAppleTouchWebKitDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const iosUa = /iphone|ipad|ipod/.test(ua);
  // iPadOS 桌面 UA 含 Macintosh，用 maxTouchPoints 区分真 Mac（避免弃用 navigator.platform）
  const iPadDesktopMode = /macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iosUa || iPadDesktopMode;
}

/** iOS 锁屏会挂起 AudioContext；长循环白噪音改走 HTMLAudio 才较可能不断 */
function preferHtmlAudioWhiteNoiseOnThisDevice(): boolean {
  return isAppleTouchWebKitDevice();
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
  /** 注销 timeupdate/ended（息屏后 setInterval 不可靠，需媒体事件兜底） */
  detachMediaListeners: (() => void) | null;
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
    detachMediaListeners: null,
  };
  htmlWnCross = state;

  // 息屏后主线程定时器被节流，crossfade 无法在尾声启动副轨；timeupdate 仍随解码推进，ended 负责收尾
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

        const { els, leaderIdx, masterVolume: mv } = state;
        const leader = els[leaderIdx];
        const follower = els[1 - leaderIdx];

        if (state.followerArmed) {
          leader.pause();
          leader.currentTime = 0;
          leader.volume = mv;
          follower.volume = mv;
          state.leaderIdx = (1 - leaderIdx) as 0 | 1;
          state.followerArmed = false;
          dbgAudio("[WN] HTML crossfade ended 补交接（息屏定时器节流）", {});
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

  dbgAudio("[WN] 白噪音 HTMLAudio 双轨 crossfade（锁屏尽量不裁）", { src, volume: masterVol });

  // 大文件在部分 WebKit 上 loadedmetadata 时 duration 可能仍为 NaN/Infinity，需等 durationchange
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

  a.addEventListener("loadedmetadata", tryArmPlayback);
  a.addEventListener("durationchange", tryArmPlayback);
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

/** 已解码的短音效（桌面 Web Audio 主路径；Apple 触控上提示音优先 HTMLAudio，此项供定时器等无手势兜底） */
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
        const arr = await loadCueBytes(type);
        if (!arr) return null;
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

// 获取声音对象（与 iOS 白噪音一致：playsinline + preload，避免首次 play 被拒或延迟）
function getSound(type: SoundType): HTMLAudioElement {
  if (!soundCache.has(type)) {
    const audio = new Audio(soundPaths[type]);
    audio.preload = "auto";
    applyHtmlAudioPlaysInline(audio);
    soundCache.set(type, audio);
  }
  return soundCache.get(type)!;
}

/** Apple 触控：提示音用 HTMLAudio，与白噪音同属「元素 play」解锁链，不依赖先开白噪音 */
function playCueHtml(type: SoundType): Promise<void> {
  const el = getSound(type);
  el.volume = 1;
  el.currentTime = 0;
  return el.play();
}

/** Web Audio 播放单条提示音；成功返回 true（与 HTML 白噪音无图依赖，仅共用 destination 汇点） */
async function tryPlayCueWebAudio(type: SoundType): Promise<boolean> {
  getOrCreateAudioContext();
  const ctx = audioCtx;
  if (!ctx) return false;
  const decodeP = getOrDecodeCueBuffer(type);
  await ctx.resume().catch(() => {});
  if ((ctx.state as AudioContextState | "interrupted") === "interrupted") {
    await ctx.resume().catch(() => {});
  }
  if (ctx.state !== "running") {
    dbgAudio("[WebAudio cue] skip ctx not running", { type, state: ctx.state });
    return false;
  }
  try {
    const buf = await decodeP;
    if (!buf) return false;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = 1;
    src.buffer = buf;
    src.connect(g).connect(ctx.destination);
    src.start(0);
    dbgAudio("[WebAudio cue] play OK", { type, sec: buf.duration });
    return true;
  } catch (e) {
    dbgAudio("[WebAudio cue] play FAIL", {
      type,
      message: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

/**
 * 应用启动后尽早调用：并行拉取全部 /sounds 字节，不等首次 playSound。
 * 与 HTMLAudio 回退共用 HTTP 缓存；解码仍在首次需要 AudioContext 时做。
 */
export function prefetchSoundAssets(): void {
  for (const type of ALL_SOUND_TYPES) {
    void loadCueBytes(type);
  }
}

async function playSoundAsync(type: SoundType): Promise<void> {
  if (isAppleTouchWebKitDevice()) {
    try {
      await playCueHtml(type);
      dbgAudio("[HTML cue] play OK", { type });
      return;
    } catch (error) {
      dbgAudio("[HTML cue] play FAIL → WebAudio", {
        type,
        name: error instanceof Error ? error.name : "unknown",
        message: error instanceof Error ? error.message : String(error),
      });
      if (await tryPlayCueWebAudio(type)) return;
    }
  }

  if (await tryPlayCueWebAudio(type)) return;

  try {
    await playCueHtml(type);
    dbgAudio("[HTML cue] fallback OK", { type });
  } catch (error) {
    console.error("Failed to play sound:", type, error);
    dbgAudio("[HTML cue] fallback FAIL", {
      type,
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 定点提示音：Apple 触控上主走 HTMLAudio（与 loop 白噪音同一套媒体策略，互不依赖）；
 * 桌面主走 Web Audio；无手势 tick 在 Apple 上靠 WebAudio 兜底（需在用户曾点开始时已 resume 过 context）。
 */
export function playSound(type: SoundType): void {
  const ctx = getOrCreateAudioContext();
  if (ctx?.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
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

  const track = settingStore.settings.whiteNoiseSoundTrack;
  const src = soundPaths[track];
  const vol = track === SoundType.WORK_TICK ? 1 : 0.3;
  // 持久化里可能残留已删除的枚举字符串：不写盘迁移，仅在此纠正并返回，用户再开一次白噪音即可
  if (!src) {
    dbgAudio("[WN] whiteNoiseSoundTrack 无映射，已改存 work_tick，请再切换/开始一次", { track });
    settingStore.settings.whiteNoiseSoundTrack = SoundType.WORK_TICK;
    return;
  }

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
      .then((res) => {
        if (!res.ok) {
          throw new Error(`fetch ${src} HTTP ${res.status}`);
        }
        return res.arrayBuffer();
      })
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
        // loopEnd=0 表示播放到缓冲区末尾，避免与 duration 浮点边界导致循环异常
        source.loopEnd = 0;

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
        // Web Audio 拉取/解码失败时回退 HTMLAudio（桌面端亦可用）
        if (!preferHtmlAudioWhiteNoiseOnThisDevice()) {
          startWhiteNoiseHtml(src, vol);
        }
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
        // 仅工作中补播，序列休息段 isFromSequence 仍为 true 不得开启
        if (!ts.isActive || !ts.isWorking) return;
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
          if (ts.isActive && ts.isWorking) {
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
      // 仅工作中开启；休息段不自动拉白噪音
      if (ts.isActive && ts.isWorking) {
        startWhiteNoise();
      }
    })
    .catch(() => {
      /* Pinia 未就绪等 */
    });
}
