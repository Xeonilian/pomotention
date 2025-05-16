// src/services/dateCheckService.ts

import type { Ref } from "vue";
import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";

type TimeoutType = ReturnType<typeof setTimeout>;

interface DateCheckServiceOptions {
  activityList: Ref<Activity[]>;
  scheduleList: Ref<Schedule[]>;
  convertToSchedule: (activity: Activity) => Schedule;
}

/**
 * 日期变更检测与每日 schedule 自动更新服务
 */
export function createDateCheckService({
  activityList,
  scheduleList,
  convertToSchedule,
}: DateCheckServiceOptions) {
  let debounceTimer: TimeoutType | null = null;
  let lastCheckedDate: string = new Date().toISOString().split("T")[0];
  let debouncedCheckFunction: ((event: Event) => void) | null = null;

  /**
   * 若日期变化，处理 schedule
   */
  function checkDateChange() {
    const currentDate = new Date().toISOString().split("T")[0];
    if (currentDate !== lastCheckedDate) {
      console.log(`日期从 ${lastCheckedDate} 变为 ${currentDate}`);
      processSchedulesForNewDay();
      lastCheckedDate = currentDate;
      return true;
    }
    return false;
  }

  /**
   * 检查 activityList，自动把当天 schedule 加入 scheduleList
   */
  function processSchedulesForNewDay() {
    const today = new Date().toISOString().split("T")[0];
    activityList.value.forEach((activity: Activity) => {
      if (activity.class === "S" && activity.dueRange) {
        // dueRange[0] 是 number（时间戳）
        const activityDate = new Date(activity.dueRange[0])
          .toISOString()
          .split("T")[0];
        // 如果是今天且 scheduleList 还没加入
        if (
          activityDate === today &&
          !scheduleList.value.some((s) => s.activityId === activity.id)
        ) {
          activity.status = "ongoing";
          scheduleList.value.push(convertToSchedule(activity));
        }
      }
    });
  }

  /**
   * 设置用户交互监听（防抖）
   */
  function setupUserInteractionCheck() {
    debouncedCheckFunction = () => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        checkDateChange();
        debounceTimer = null;
      }, 1000);
    };
    document.addEventListener("click", debouncedCheckFunction!);
    document.addEventListener("keydown", debouncedCheckFunction!);
  }

  /**
   * 清理监听
   */
  function cleanupListeners() {
    if (debouncedCheckFunction) {
      document.removeEventListener("click", debouncedCheckFunction);
      document.removeEventListener("keydown", debouncedCheckFunction);
      debouncedCheckFunction = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  // Service接口
  return {
    checkDateChange,
    setupUserInteractionCheck,
    cleanupListeners,
  };
}
