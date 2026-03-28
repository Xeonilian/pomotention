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
