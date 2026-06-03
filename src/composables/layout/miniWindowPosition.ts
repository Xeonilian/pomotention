import { getCurrentWindow, LogicalPosition, PhysicalPosition } from "@tauri-apps/api/window";

/** 进入迷你置顶前保存，退出时恢复（避免 center() 跑到屏幕正中） */
let savedNormalWindowPosition: PhysicalPosition | null = null;

function normalizeDockOffset(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

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
 * offsetX / offsetY 为逻辑像素，与设置项一致；offsetX 向右，offsetY 向上（屏幕 Y 减小）。
 * 须在迷你窗最终 setSize 完成后再调用，避免 outerSize 仍为旧尺寸导致定位异常。
 */
export async function applyMiniDockOffset(offsetX: number, offsetY: number): Promise<void> {
  const ox = normalizeDockOffset(offsetX);
  const oy = normalizeDockOffset(offsetY);
  if (ox === 0 && oy === 0) return;

  const appWindow = getCurrentWindow();
  const monitor = await appWindow.currentMonitor();
  if (!monitor) return;

  const scaleFactor = await appWindow.scaleFactor();
  const innerSize = await appWindow.innerSize();
  const area = monitor.workArea ?? monitor;

  const areaX = area.position.x / scaleFactor;
  const areaY = area.position.y / scaleFactor;
  const areaW = area.size.width / scaleFactor;
  const areaH = area.size.height / scaleFactor;

  const centerX = areaX + (areaW - innerSize.width) / 2;
  const centerY = areaY + (areaH - innerSize.height) / 2;
  const x = Math.round(centerX + ox);
  const y = Math.round(centerY - oy);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    console.warn("[mini] Invalid dock position, skipping:", { x, y, ox, oy });
    return;
  }

  await appWindow.setPosition(new LogicalPosition(x, y));
}
