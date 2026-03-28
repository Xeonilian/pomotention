/**
 * iPhone / iPad WebKit：HTML 媒体与 AudioContext 解锁策略与桌面不同，提示音在此判定
 * （白噪音全平台已统一 HTML 双轨，不再用本函数分支）
 */
export function isAppleTouchWebKitDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const iosUa = /iphone|ipad|ipod/.test(ua);
  const iPadDesktopMode = /macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return iosUa || iPadDesktopMode;
}

/**
 * Android Chrome / WebView / PWA：与 iOS 一样提示音主走 HTMLAudio；
 * 若按桌面策略 Web Audio 优先，息屏/后台易 suspend，易出现仅回前台时提示音叠播。
 */
export function isAndroidTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

/** 提示音是否先 HTMLAudio、失败再 Web Audio（移动 Web 与桌面「Web Audio 优先」相对） */
export function preferHtmlAudioCueFirst(): boolean {
  return isAppleTouchWebKitDevice() || isAndroidTouchDevice();
}
