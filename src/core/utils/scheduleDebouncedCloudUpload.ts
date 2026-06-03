import { isTimerApp } from "@/core/appVariant";

/**
 * 本地持久化后的防抖上传调度（单一入口，供各 Store 共用）。
 * 动态 import autoSync，避免 useDataStore / sync / Pinia 之间的静态循环依赖。
 */
export function scheduleDebouncedCloudUpload(): void {
  if (isTimerApp) return;
  void import("./autoSync").then((m) => m.uploadAllDebounced());
}
