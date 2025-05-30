// src/services/dateCheckService.ts

import type { Ref } from "vue";
import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";
import { getLocalDateString } from "@/core/utils";

type TimeoutType = ReturnType<typeof setTimeout>;

interface DateCheckServiceOptions {
  activityList: Ref<Activity[]>;
  scheduleList: Ref<Schedule[]>;
  todoList: Ref<Todo[]>;
  convertToSchedule: (activity: Activity) => Schedule;
  onDateChange?: (currentDate: string) => void;
}

/**
 * 日期变更检测与每日 schedule 自动更新服务
 */
export function createDateCheckService({
  activityList,
  scheduleList,
  todoList,
  convertToSchedule,
  onDateChange,
}: DateCheckServiceOptions) {
  let debounceTimer: TimeoutType | null = null;
  let debouncedCheckFunction: ((event: Event) => void) | null = null;

  // 使用本地时区日期初始化
  let lastCheckedDate: string = getLocalDateString();

  /**
   * 若日期变化，处理 schedule
   * 使用本地时区计算日期，避免 UTC 与本地时区差异导致的问题
   * (特别是在中国等 UTC+8 时区，每天0点到8点期间可能出现日期不匹配)
   */
  function checkDateChange() {
    const currentDate = getLocalDateString();

    if (currentDate !== lastCheckedDate) {
      console.log(`日期从 ${lastCheckedDate} 变为 ${currentDate}`);
      processSchedulesForNewDay();
      processTodoForNewDay();
      processActivityForNewDay();
      if (onDateChange) onDateChange(currentDate);
      lastCheckedDate = currentDate;
      return true;
    }
    return false;
  }
  /**
   * 检查 activityList，自动把当天 schedule 加入 scheduleList
   */
  function processActivityForNewDay() {
    const today = new Date().toISOString().split("T")[0];
    activityList.value.forEach((activity: Activity) => {
      if (activity.class === "S" && activity.dueRange) {
        // dueRange[0] 是 number（时间戳）
        const activityDate = getLocalDateString(new Date(activity.dueRange[0]));

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
   * 将所有当天未完成（ongoing）的 schedule 状态标记为 cancelled，
   * 并同步将对应 activity 的状态也改为 cancelled。
   */
  function processSchedulesForNewDay() {
    scheduleList.value.forEach((schedule) => {
      if (schedule.status === "ongoing") {
        schedule.status = "cancelled";
        // 同步 activity 的状态
        const activity = activityList.value.find(
          (a) => a.id === schedule.activityId
        );
        if (activity) {
          activity.status = "cancelled";
        }
      }
    });
  }
  /**
/**
 * 将所有当天未完成（ongoing）的 todo 状态标记为 delayed，
 * 同步将对应 activity 的状态改为 delayed，
 * 并为每个被归为 delayed 的 todo 新建今日一条新的 ongoing todo。
 */
  function processTodoForNewDay() {
    // 处理所有未完成的 todo
    todoList.value.forEach((todo) => {
      if (todo.status === "ongoing") {
        // 标记旧 todo 为 delayed
        todo.status = "delayed";
        // 同步 activity 状态为 delayed
        const activity = activityList.value.find(
          (a) => a.id === todo.activityId
        );
        if (activity) {
          activity.status = "delayed";
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
