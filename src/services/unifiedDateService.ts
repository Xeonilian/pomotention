// unifiedDateService.ts
import { reactive, computed, onMounted, onUnmounted } from "vue";
import { getDayStartTimestamp, getDateKey, addDays } from "@/core/utils";

// 导入项目中的数据类型定义
import type { Ref } from "vue";
import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";

/**
 * unifiedDateService 的配置选项。
 * 接收外部响应式数据列表和转换函数，以便在内部处理业务逻辑。
 */
interface UnifiedDateServiceOptions {
  activityList: Ref<Activity[]>;
  scheduleList: Ref<Schedule[]>;
  todoList: Ref<Todo[]>;
}

/**
 * 一个 Vue Composable 函数，用于集中管理和处理应用中的所有日期相关逻辑。
 * 它通过区分“应用视图日期 (AppDate)”和“设备系统日期 (SystemDate)”来解决复杂的跨天同步问题。
 *
 * @param options 包含数据源和业务逻辑函数的配置对象。
 * @returns 返回一个接口，包含UI所需的日期状态和操作函数。
 */
export function unifiedDateService({
  activityList,
  scheduleList,
  todoList,
}: UnifiedDateServiceOptions) {
  // --- 1. 核心响应式状态 ---

  const dateState = reactive({
    /**
     * App Date: 用户当前在界面上选择查看的日期。
     * 它以当天零点的毫秒时间戳形式存储，是绝大多数业务逻辑的基准。
     * 它的变更只由用户的直接操作（如点击导航按钮）触发。
     */
    app: getDayStartTimestamp(),

    /**
     * System Date: 用户设备的真实当前日期。
     * 同样以当天零点的毫秒时间戳形式存储。
     * 它用于判断 App Date 是否为“今天”，并在真实世界跨天时触发特定逻辑。
     * 它的变更由后台监听器静默更新。
     */
    system: getDayStartTimestamp(),
  });

  // --- 2. 派生状态 (Computed Properties) ---

  /**
   * 将 app 时间戳格式化为 'YYYY-MM-DD' 字符串。
   * 主要用于数据筛选或作为组件的 key。
   */
  const appDateKey = computed(() => getDateKey(dateState.app));

  /**
   * 生成一个用于在UI上友好展示的日期字符串。
   * 例如: "2023-10-27 Fri"
   */
  const displayDate = computed(() => {
    const date = new Date(dateState.app);
    const dateString = getDateKey(dateState.app);
    // toLocaleDateString 提供了一种获取本地化星期名称的便捷方式。
    const weekDay = date.toLocaleDateString("en-US", { weekday: "short" });

    // 计算当前日期是全年第几周（ISO 8601）
    const year = date.getFullYear();

    // 获取该年1月1日
    const firstDayOfYear = new Date(year, 0, 1);

    // 找到该年第一周的第一个周一
    const firstMondayOfYear = firstDayOfYear;
    // 如果1月1号是周六，周日，或者1月一号在星期一之后，则向下找到这个周的前面一个周一
    while (firstMondayOfYear.getDay() !== 1) {
      firstMondayOfYear.setDate(firstMondayOfYear.getDate() + 1);
    }

    // 计算第一周的基准日期
    const firstWeekStart = new Date(firstMondayOfYear);

    // 计算本周的开始
    const currentWeekStart = new Date(date);
    while (currentWeekStart.getDay() !== 1) {
      currentWeekStart.setDate(currentWeekStart.getDate() - 1);
    }

    // 计算相差天数
    const daysDifference = Math.floor(
      (currentWeekStart.getTime() - firstWeekStart.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // 计算周数，注意要加1，因为我们从0开始计数
    const week = Math.floor(daysDifference / 7) + 1;
    console.log(week);
    return `${dateString} ${weekDay} w${week}`;
  });

  /**
   * 一个布尔值计算属性，表示用户当前查看的日期是否就是设备的真实日期。
   * UI可以利用此状态来提供视觉反馈，例如高亮或禁用“回到今天”按钮。
   */
  const isViewingToday = computed(() => dateState.app === dateState.system);

  // --- 3. 跨天业务逻辑 ---

  /**
   * 处理真实跨天时，前一天未完成的计划 (Schedule)。
   * 将所有仍在 "ongoing" 状态的 Schedule 标记为 "cancelled"。
   * 【取消】大部分时候只是忘记标记了
   */
  // const processSchedulesForNewDay = () => {
  //   scheduleList.value.forEach((schedule) => {
  //     if (schedule.status === "ongoing") {
  //       schedule.status = "cancelled";
  //       const activity = activityList.value.find(
  //         (a) => a.id === schedule.activityId
  //       );
  //       if (activity) activity.status = "cancelled";
  //     }
  //   });
  // };

  /**
   * 处理真实跨天时，前一天未完成的待办 (Todo)。
   * 将所有仍在 "ongoing" 状态的 Todo 标记为 "delayed"。
   */
  const processTodoForNewDay = () => {
    todoList.value.forEach((todo) => {
      if (todo.status === "ongoing") {
        todo.status = "delayed";
        const activity = activityList.value.find(
          (a) => a.id === todo.activityId
        );
        if (activity) activity.status = "delayed";
      }
    });
  };

  /**
   * 在新的一天开始时，检查是否有计划好的活动 (Activity) 需要被激活。
   * 例如，一个设定在今天开始的周期性任务，需要自动转换为一个可执行的 Schedule。
   */
  const processActivityForNewDay = () => {
    // 使用最新的 system 时间戳来获取今天的日期 key
    const todayKey = getDateKey(dateState.system);
    activityList.value.forEach((activity) => {
      if (activity.class === "S" && activity.dueRange) {
        const activityKey = getDateKey(activity.dueRange[0]);
        // 检查活动的开始日期是否是今天，并且它还没有被转换成 Schedule
        if (
          activityKey === todayKey &&
          !scheduleList.value.some((s) => s.activityId === activity.id)
        ) {
          activity.status = "ongoing";
        }
      }
    });
  };

  // --- 4. 核心动作 (Methods) ---

  /**
   * 响应用户交互，变更当前视图 (App Date) 的日期。
   * @param type 定义导航的类型：'prev', 'next', 'today'，或直接传入一个日期。
   */
  const navigateDate = (type: "prev" | "next" | "today" | Date | number) => {
    if (type === "prev") {
      dateState.app = addDays(dateState.app, -1);
    } else if (type === "next") {
      dateState.app = addDays(dateState.app, 1);
    } else if (type === "today") {
      // “回到今天”的功能，是将 App Date 与当前的 System Date 对齐。
      dateState.app = dateState.system;
    } else {
      // 允许通过日历等组件直接跳转到指定日期。
      dateState.app = getDayStartTimestamp(type);
    }
  };

  // --- 5. 系统日期监听与同步 ---

  /**
   * 一个在后台运行的检查器，用于静默更新 System Date。
   * 它的核心职责是感知真实世界的日期变化（跨天）。
   * 当检测到跨天时，它会更新 `dateState.system` 并触发相关的业务逻辑。
   *
   * **重要**: 此函数绝不应修改 `dateState.app`，以尊重用户的当前视图。
   */
  const systemDateSync = () => {
    const newSystemTimestamp = getDayStartTimestamp();
    if (dateState.system !== newSystemTimestamp) {
      console.log(
        `[SYSTEM] 检测到真实日期变更。新日期: ${getDateKey(newSystemTimestamp)}`
      );

      // 更新 system date
      dateState.system = newSystemTimestamp;

      // 仅在真实跨天时，才执行这些一次性的数据处理任务。
      // processSchedulesForNewDay();
      processTodoForNewDay();
      processActivityForNewDay();
    }
  };

  /**
   * 设置事件监听器。
   * 'visibilitychange' 和 'focus' 是检测用户返回应用的最高效、最可靠的事件。
   * 当应用从后台恢复到前台时，会触发 `systemDateSync` 来校准时间。
   */
  const setupSystemDateWatcher = () => {
    document.addEventListener("visibilitychange", systemDateSync);
    window.addEventListener("focus", systemDateSync);
    // console.log("[UnifiedDateService] 系统日期同步监听器已启动。");
  };

  /**
   * 清理事件监听器，以防止在组件卸载后发生内存泄漏。
   */
  const cleanupSystemDateWatcher = () => {
    document.removeEventListener("visibilitychange", systemDateSync);
    window.removeEventListener("focus", systemDateSync);
    // console.log("[UnifiedDateService] 系统日期同步监听器已清理。");
  };

  // --- 6. Vue 生命周期钩子 ---

  onMounted(() => {
    // 组件挂载后，立即启动监听器。
    setupSystemDateWatcher();
  });

  onUnmounted(() => {
    // 组件卸载前，务必清理监听器。
    cleanupSystemDateWatcher();
  });

  // --- 7. 返回的公共接口 ---

  return {
    // 状态 (只读的计算属性，防止外部直接修改)
    appDateTimestamp: computed(() => dateState.app),
    appDateKey,
    displayDate,
    isViewingToday,
    // 动作
    navigateDate,
  };
}
