/**
 * 触控 Web 平台判定（提示音策略用；白噪音全平台 HTML 双轨，不依赖本模块分支）。
 *
 * **iOS（Safari / PWA）**：亮屏且用户手势解锁后 `AudioContext` 可 running，定时 `HTMLAudio.play()` 仍常
 * NotAllowed，故亮屏下可 **Web Audio 优先**。锁屏/切后台时 `document.hidden`，Web Audio 常「start 成功但无声」
 * 或随即 `interrupted`，故 **不再 Web-first**，并以短时检测否决假成功；提示音尽量走与白噪音相同的 HTML 管线。
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
