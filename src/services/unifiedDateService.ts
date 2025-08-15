// unifiedDateService.ts
import { reactive, computed, onMounted, onUnmounted } from "vue";
import { getDayStartTimestamp, getDateKey, addDays } from "@/core/utils";

// 导入项目中的数据类型定义
import type { Ref } from "vue";
import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";
import { useSettingStore } from "@/stores/useSettingStore";

/**
 * unifiedDateService 的配置选项。
 * 接收外部响应式数据列表和转换函数，以便在内部处理业务逻辑。
 */
interface UnifiedDateServiceOptions {
  activityList: Ref<Activity[]>;
  scheduleList: Ref<Schedule[]>;
  todoList: Ref<Todo[]>;
}

export function unifiedDateService({
  activityList,
  scheduleList,
  todoList,
}: UnifiedDateServiceOptions) {
  const settingStore = useSettingStore();
  // --- 1. 核心状态 ---
  const dateState = reactive({
    app: getDayStartTimestamp(), // 当前基准日期（零点）
    system: getDayStartTimestamp(), // 设备当天零点
  });

  // --- 2. 工具函数 ---
  const getWeekStart = (ts: number) => {
    const day = new Date(ts).getDay() || 7; // 周日=7
    return addDays(getDayStartTimestamp(ts), -(day - 1)); // 回到周一
  };

  const getMonthStart = (ts: number) => {
    const d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), 1).setHours(0, 0, 0, 0);
  };

  const getISOWeekInfo = (ts: number) => {
    const d = new Date(ts);
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7; // 周一=0
    date.setUTCDate(date.getUTCDate() - dayNum + 3); // 移到周四
    const isoYear = date.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
    const weekNumber =
      1 +
      Math.round(
        ((+date - +firstThursday) / 86400000 -
          3 +
          ((firstThursday.getUTCDay() + 6) % 7)) /
          7
      );
    return { isoYear, weekNumber };
  };

  const getWeekKey = (ts: number) => {
    const start = getWeekStart(ts);
    const { isoYear, weekNumber } = getISOWeekInfo(start);
    return `${isoYear}-W${String(weekNumber).padStart(2, "0")}`;
  };

  const getMonthKey = (ts: number) => {
    const start = getMonthStart(ts);
    const d = new Date(start);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  // --- 3. 派生状态 ---
  const appDateKey = computed(() => getDateKey(dateState.app));

  const displayDateInfo = computed(() => {
    const date = new Date(dateState.app);
    const dateString = getDateKey(dateState.app);
    const weekDay = date.toLocaleDateString("en-US", { weekday: "short" });
    const { weekNumber } = getISOWeekInfo(dateState.app);
    return `${dateString} ${weekDay} w${weekNumber}`;
  });

  const weekStartTs = computed(() => getWeekStart(dateState.app));
  const weekKey = computed(() => getWeekKey(dateState.app));
  const displayWeekInfo = computed(() => {
    const start = new Date(weekStartTs.value);
    const { isoYear, weekNumber } = getISOWeekInfo(weekStartTs.value);
    const monthName = start.toLocaleString("en-US", { month: "long" }); // August
    return `${isoYear} ${monthName} Week ${weekNumber}`;
  });

  const monthStartTs = computed(() => getMonthStart(dateState.app));
  const monthKey = computed(() => getMonthKey(dateState.app));
  const displayMonthInfo = computed(() => {
    const d = new Date(monthStartTs.value);
    const year = d.getFullYear();
    const monthName = d.toLocaleString("en-US", { month: "long" }); // August
    return `${year} ${monthName}`;
  });

  const isViewingToday = computed(() => dateState.app === dateState.system);
  const isViewingYesterday = computed(() => dateState.app < dateState.system);
  const isViewingTomorrow = computed(() => dateState.app > dateState.system);

  // --- 4. 跨天业务逻辑 ---
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

  const processActivityForNewDay = () => {
    const todayKey = getDateKey(dateState.system);
    activityList.value.forEach((activity) => {
      if (activity.class === "S" && activity.dueRange && activity.dueRange[0]) {
        const activityKey = getDateKey(activity.dueRange[0]);
        if (
          activityKey === todayKey &&
          !scheduleList.value.some((s) => s.activityId === activity.id)
        ) {
          activity.status = "ongoing";
        }
      }
    });
  };

  // --- 5. 导航（仅视图感知版本） ---
  const navigateByView = (type: "prev" | "next" | "today") => {
    const curView = settingStore.settings.viewSet;

    if (type === "today") {
      const base = dateState.system;
      dateState.app =
        curView === "day"
          ? base
          : curView === "week"
          ? getWeekStart(base)
          : getMonthStart(base);
      return;
    }

    if (curView === "day") {
      dateState.app = addDays(
        getDayStartTimestamp(dateState.app),
        type === "prev" ? -1 : 1
      );
      return;
    }

    if (curView === "week") {
      const start = getWeekStart(dateState.app);
      const step = type === "prev" ? -7 : 7;
      dateState.app = addDays(start, step);
      return;
    }

    // month
    const start = new Date(getMonthStart(dateState.app));
    const m = start.getMonth();
    const y = start.getFullYear();
    const next = type === "next";
    const target = new Date(y, m + (next ? 1 : -1), 1);
    target.setHours(0, 0, 0, 0);
    dateState.app = target.getTime();
  };

  // 跳到某个日期，并按当前视图锚定到起点
  const navigateTo = (date: Date | number) => {
    const target = getDayStartTimestamp(date);
    const curView = settingStore.settings.viewSet;
    dateState.app =
      curView === "day"
        ? target
        : curView === "week"
        ? getWeekStart(target)
        : getMonthStart(target);
  };

  // --- 6. 系统日期监听 ---
  const systemDateSync = () => {
    const newSystemTimestamp = getDayStartTimestamp();
    if (dateState.system !== newSystemTimestamp) {
      dateState.system = newSystemTimestamp;
      processTodoForNewDay();
      processActivityForNewDay();
    }
  };

  const setupSystemDateWatcher = () => {
    document.addEventListener("visibilitychange", systemDateSync);
    window.addEventListener("focus", systemDateSync);
  };

  const cleanupSystemDateWatcher = () => {
    document.removeEventListener("visibilitychange", systemDateSync);
    window.removeEventListener("focus", systemDateSync);
  };

  onMounted(setupSystemDateWatcher);
  onUnmounted(cleanupSystemDateWatcher);

  // --- 7. 暴露接口 ---
  return {
    // 状态
    appDateTimestamp: computed(() => dateState.app),
    appDateKey,

    // 日/周/月信息
    displayDateInfo,
    weekStartTs,
    weekKey,
    displayWeekInfo,
    monthStartTs,
    monthKey,
    displayMonthInfo,

    // 关系判断
    isViewingToday,
    isViewingTomorrow,
    isViewingYesterday,

    // 导航
    navigateByView, // prev/next/today
    navigateTo, // 跳转日期并按当前视图锚定
  };
}
