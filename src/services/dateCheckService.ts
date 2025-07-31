// src/services/dateCheckService.ts
// 不使用合并到unifiedDateService.ts
import type { Ref, ComputedRef } from "vue";
import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";
import { getDateKey } from "@/core/utils";

type TimeoutType = ReturnType<typeof setTimeout>;

interface DateCheckServiceOptions {
  activityList: Ref<Activity[]>;
  scheduleList: Ref<Schedule[]>;
  todoList: Ref<Todo[]>;
  currentDateKey: Ref<string> | ComputedRef<string>;
  onDateChange?: (currentDateKey: string) => void;
}

/**
 * 日期变更检测服务 (推荐写法)
 */
export function createDateCheckService({
  activityList,
  scheduleList,
  todoList,
  currentDateKey,
  onDateChange,
}: DateCheckServiceOptions) {
  let debounceTimer: TimeoutType | null = null;
  let debouncedCheckFunction: ((event: Event) => void) | null = null;
  let lastCheckedKey = currentDateKey.value;
  // console.log("[dateCheckService] 初始化，lastCheckedKey =", lastCheckedKey);

  /**
   * 检查日期变更并处理相关逻辑
   */
  function checkDateChange() {
    const nowKey = currentDateKey.value;

    if (nowKey !== lastCheckedKey) {
      // console.log(`日期变更: ${lastCheckedKey} → ${nowKey}`);

      processSchedulesForNewDay();
      processTodoForNewDay();
      processActivityForNewDay();

      if (onDateChange) {
        onDateChange(nowKey);
        // console.log("[dateCheckService] 调用 onDateChange 回调");
      }

      lastCheckedKey = nowKey;
      return true;
    }
    return false;
  }

  function processActivityForNewDay() {
    // 日期变更，识别S类Activity如果到期时间是系统时间，变为ongoing
    const todayKey = getDateKey(new Date());

    activityList.value.forEach((activity: Activity) => {
      if (
        activity.class === "S" &&
        activity.dueRange &&
        activity.dueRange[0] != null
      ) {
        const activityDate = new Date(activity.dueRange[0]);
        const activityKey = getDateKey(activityDate);

        if (
          activityKey === todayKey &&
          !scheduleList.value.some((s) => s.activityId === activity.id)
        ) {
          activity.status = "ongoing";
        }
      }
    });
  }

  function processSchedulesForNewDay() {
    scheduleList.value.forEach((schedule) => {
      if (schedule.status === "ongoing") {
        schedule.status = "cancelled";
        const activity = activityList.value.find(
          (a) => a.id === schedule.activityId
        );
        if (activity) {
          activity.status = "cancelled";
        }
      }
    });
  }

  function processTodoForNewDay() {
    todoList.value.forEach((todo) => {
      if (todo.status === "ongoing") {
        todo.status = "delayed";
        const activity = activityList.value.find(
          (a) => a.id === todo.activityId
        );
        if (activity) {
          activity.status = "delayed";
        }
      }
    });
  }

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

  return {
    checkDateChange,
    setupUserInteractionCheck,
    cleanupListeners,
  };
}
