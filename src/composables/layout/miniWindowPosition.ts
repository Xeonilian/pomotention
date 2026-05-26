import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";

/** 进入迷你置顶前保存，退出时恢复（避免 center() 跑到屏幕正中） */
let savedNormalWindowPosition: PhysicalPosition | null = null;

export async function captureNormalWindowPosition(): Promise<void> {
  try {
    savedNormalWindowPosition = await getCurrentWindow().outerPosition();
  } catch {
    savedNormalWindowPosition = null;
  }
}

export async function restoreNormalWindowPosition(): Promise<void> {
  if (!savedNormalWindowPosition) return;
  const appWindow = getCurrentWindow();
  const pos = savedNormalWindowPosition;
  savedNormalWindowPosition = null;
  try {
    await appWindow.setPosition(pos);
  } catch (e) {
    console.error("[mini] restore position error:", e);
  }
}

/**
 * 相对当前显示器工作区居中，再按偏移停靠（仅 offset 非 0 时调用）。
 * offsetX：向右；offsetY：向上（屏幕 Y 减小）。
 */
export async function applyMiniDockOffset(offsetX: number, offsetY: number): Promise<void> {
  if (offsetX === 0 && offsetY === 0) return;

  const appWindow = getCurrentWindow();
  const monitor = await appWindow.currentMonitor();
  if (!monitor) return;

  const outerSize = await appWindow.outerSize();
  const area = monitor.workArea ?? monitor;

  const centerX = area.position.x + (area.size.width - outerSize.width) / 2;
  const centerY = area.position.y + (area.size.height - outerSize.height) / 2;

  await appWindow.setPosition(
    new PhysicalPosition(Math.round(centerX + offsetX), Math.round(centerY - offsetY)),
  );
}
