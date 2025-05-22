// src/services/dateCheckService.ts

import type { Ref } from "vue";
import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";

type TimeoutType = ReturnType<typeof setTimeout>;

interface DateCheckServiceOptions {
  activityList: Ref<Activity[]>;
  scheduleList: Ref<Schedule[]>;
  todoList: Ref<Todo[]>;
  convertToSchedule: (activity: Activity) => Schedule;
  convertToTodo: (activity: Activity) => Todo;
}

/**
 * 日期变更检测与每日 schedule 自动更新服务
 */
export function createDateCheckService({
  activityList,
  scheduleList,
  todoList,
  convertToSchedule,
  convertToTodo,
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
      processTodoForNewDay();
      processActivityForNewDay();
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
    // 先收集待处理 todo，防止遍历时 push 导致死循环
    const processingTodos = todoList.value.filter(
      (todo) => todo.status === "ongoing"
    );
    processingTodos.forEach((todo) => {
      // 标记旧 todo 为 delayed
      todo.status = "delayed";
      // 同步 activity 状态
      const activity = activityList.value.find((a) => a.id === todo.activityId);
      if (activity) {
        activity.status = "delayed";
      }
      // 新建今日新 todo（convertToTodo 默认 status 为 "ongoing"） 产生错误
      // if (activity) {
      //   const newTodo = convertToTodo(activity);
      //   todoList.value.push(newTodo);
      // }
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
