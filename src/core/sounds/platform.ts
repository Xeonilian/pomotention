/**
 * 触控 Web 平台判定（提示音策略用；白噪音全平台 HTML 双轨，不依赖本模块分支）。
 *
 * **iOS（Safari / PWA）**：用户手势解锁后 AudioContext 可处于 running；但定时器触发的
 * `HTMLAudioElement.play()` 仍常报 NotAllowed。故在 `cuePlayback` 中：若检测到
 * `isAppleTouchWebKitDevice` 且 `AudioContext.state === 'running'`，提示音**优先 Web Audio**，
 * 失败再 HTML；首次或 ctx 未 running 时仍 HTML 优先以贴近手势链。
 *
 * **Android**：息屏/后台时 Web Audio 易 suspend，定时提示音仍以 **HTMLAudio 优先**，
 * 不在此平台反转顺序（与 iOS 分支区分）。
 */
export function isAppleTouchWebKitDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const iosUa = /iphone|ipad|ipod/.test(ua);
  const iPadDesktopMode = /macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iosUa || iPadDesktopMode;
}

/**
 * Android Chrome / WebView / PWA：提示音主走 HTMLAudio（息屏场景更稳）。
 */
export function isAndroidTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * 移动 Web：默认 HTMLAudio 优先、失败再 Web Audio（具体顺序见 cuePlayback 中 iOS+running 例外）。
 */
export function preferHtmlAudioCueFirst(): boolean {
  return isAppleTouchWebKitDevice() || isAndroidTouchDevice();
}
