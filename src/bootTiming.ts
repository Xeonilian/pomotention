/** 开发环境启动打点（生产 tree-shake 后无开销） */
const PREFIX = "pomo-boot";

export function bootMark(name: string): void {
  if (!import.meta.env.DEV) return;
  try {
    performance.mark(`${PREFIX}:${name}`);
  } catch {
    /* ignore */
  }
}
