/**
 * 触控 Web 平台判定（提示音策略用；白噪音全平台 HTML 双轨，不依赖本模块分支）。
 *
 * **iOS（Safari / PWA）**：亮屏且 `AudioContext` running 时可 Web-first；息屏时 `work_middle` / `work_end` 的 HTML
 * `play()` 常 NotAllowed，二者 Web→HTML；`work_end` 与 `resetTimer/stopWhiteNoise` 的先后顺序见 timer store。
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
