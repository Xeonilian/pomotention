import { beginQuietWhiteNoisePrefetch } from "@/core/sounds/prefetch";

/** 首页 shell 就绪后的阶段 1：按序、限并发预拉非音频 chunk，音频播放入口须 await whenNonAudioIdle */

const HOME_CHUNK_LOADERS: ReadonlyArray<() => Promise<unknown>> = [
  // 登录/注册链路优先于首页大块与 Search/Chart（侧栏一点即进）
  () => import("@/views/LoginView.vue"),
  () => import("@/views/AuthCallbackView.vue"),
  () => import("@/views/ResetPasswordView.vue"),
  () => import("@/components/TimeTable/TimeTable.vue"),
  () => import("@/components/DayPlanner/DayPlanner.vue"),
  () => import("@/components/WeekPlanner/WeekPlanner.vue"),
  () => import("@/components/MonthPlanner/MonthPlanner.vue"),
  () => import("@/components/YearPlanner/YearPlanner.vue"),
  () => import("@/components/TaskTracker/TaskTracker.vue"),
  () => import("@/components/LifeRecord/LifeRecordDaySheet.vue"),
  () => import("@/components/ActivitySheet/ActivitySheet.vue"),
  () => import("@/components/Capture/CapturePanel.vue"),
  () => import("@/components/TaskTracker/StateLogModal.vue"),
  () => import("@/views/SearchView.vue"),
  () => import("@/views/ChartView.vue"),
  () => import("@/components/chart/ChartWidget.vue"),
  () => import("@/components/chart/HeatmapChart.vue"),
];

const PHASE1_CONCURRENCY = 6;

let phase1Promise: Promise<void> | null = null;
let phase1Done = false;

async function runLoadersWithConcurrency(loaders: ReadonlyArray<() => Promise<unknown>>, concurrency: number): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    for (;;) {
      const i = next++;
      if (i >= loaders.length) return;
      try {
        await loaders[i]();
      } catch {
        /* 预取失败不阻塞后续与音频 */
      }
    }
  });
  await Promise.all(workers);
}

/** shell-ready 后调用一次，开始阶段 1 */
export function beginBootNonAudioPhase(): void {
  if (phase1Promise) return;
  phase1Promise = runLoadersWithConcurrency(HOME_CHUNK_LOADERS, PHASE1_CONCURRENCY).then(() => {
    phase1Done = true;
    beginQuietWhiteNoisePrefetch();
  });
}

/** 音频 / 在用的素材：若阶段 1 未结束则等待，避免与首页 chunk 抢带宽 */
export function whenNonAudioIdle(): Promise<void> {
  if (phase1Done) return Promise.resolve();
  if (!phase1Promise) return Promise.resolve();
  return phase1Promise;
}