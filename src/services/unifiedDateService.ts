// unifiedDateService.ts
import { reactive, computed } from "vue";
import { getDayStartTimestamp, getDateKey, addDays } from "@/core/utils";

// 导入项目中的数据类型定义
import type { Ref } from "vue";
import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";

/**
 * unifiedDateService 的配置选项。
 * 接收外部响应式数据列表和转换函数，以便在内部处理业务逻辑。
 */
interface UnifiedDateServiceOptions {
  activityList: Ref<Activity[]>;
  scheduleList: Ref<Schedule[]>;
  todoList: Ref<Todo[]>;
}

interface DateRange {
  start: number; // 当日含零点
  end: number; // 不含零点，代表下一个区间的开始
} // end exclusive

export function unifiedDateService({ activityList, scheduleList, todoList }: UnifiedDateServiceOptions) {
  const settingStore = useSettingStore();
  const dataStore = useDataStore();
  // --- 1. 核心状态 ---
  const dateState = reactive({
    app: getDayStartTimestamp(), // 当前基准日期（零点）
    system: getDayStartTimestamp(), // 设备当天零点
  });

  // --- 2. 工具函数（使用可配置 weekStartsOn） ---
  const getStartOfWeek = (ts: number) => {
    const weekStartsOn = 1;
    const d = new Date(getDayStartTimestamp(ts));
    const jsDay = d.getDay(); // 0~6, 周日=0
    // 将 jsDay 映射到从 weekStartsOn 开始的偏移
    // 计算从 d 回退多少天到一周的起始日
    const offset = (jsDay - weekStartsOn + 7) % 7;
    return addDays(d.getTime(), -offset);
  };

  const getStartOfNextWeek = (ts: number) => addDays(getStartOfWeek(ts), 7);

  const getStartOfMonth = (ts: number) => {
    const d = new Date(ts);
    const m0 = new Date(d.getFullYear(), d.getMonth(), 1);
    m0.setHours(0, 0, 0, 0);
    return m0.getTime();
  };
  const getStartOfNextMonth = (ts: number) => {
    const d = new Date(getStartOfMonth(ts));
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    next.setHours(0, 0, 0, 0);
    return next.getTime();
  };

  // ISO week 信息
  const getISOWeekInfo = (ts: number) => {
    const d = new Date(ts);
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7; // 周一=0
    date.setUTCDate(date.getUTCDate() - dayNum + 3); // 移到周四
    const isoYear = date.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
    const weekNumber = 1 + Math.round(((+date - +firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return { isoYear, weekNumber };
  };

  const getWeekKey = (ts: number) => {
    const start = getStartOfWeek(ts);
    const { isoYear, weekNumber } = getISOWeekInfo(start);
    return `${isoYear}-W${String(weekNumber).padStart(2, "0")}`;
  };

  const getMonthKey = (ts: number) => {
    const start = getStartOfMonth(ts);
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

  const weekStartTs = computed(() => getStartOfWeek(dateState.app));
  const weekKey = computed(() => getWeekKey(dateState.app));
  const displayWeekInfo = computed(() => {
    const start = new Date(weekStartTs.value);
    const { isoYear, weekNumber } = getISOWeekInfo(weekStartTs.value);
    const monthName = start.toLocaleString("en-US", { month: "long" }); // August
    return `${isoYear} ${monthName} Week ${weekNumber}`;
  });

  const displayWeekInfoMobile = computed(() => {
    const start = new Date(weekStartTs.value);
    const { isoYear, weekNumber } = getISOWeekInfo(weekStartTs.value);
    const monthName = start.toLocaleString("en-US", { month: "short" }); // Aug
    return `${isoYear} ${monthName} W${weekNumber}`;
  });

  const monthStartTs = computed(() => getStartOfMonth(dateState.app));
  const monthKey = computed(() => getMonthKey(dateState.app));
  const displayMonthInfo = computed(() => {
    const d = new Date(monthStartTs.value);
    const year = d.getFullYear();
    const monthName = d.toLocaleString("en-US", { month: "long" }); // August
    return `${year} ${monthName}`;
  });

  // --- 3.1 可见范围（新） ---

  // 半开区间 [start, end)
  const visibleRange = computed<DateRange>(() => {
    const app = dateState.app;
    const curView = settingStore.settings.viewSet;
    if (curView === "day") {
      const start = getDayStartTimestamp(app);
      const end = addDays(start, 1);
      return { start, end };
    }
    if (curView === "week") {
      const start = getStartOfWeek(app);
      const end = getStartOfNextWeek(app);
      return { start, end };
    }

    // 方案A：严格自然月
    const mStart = getStartOfMonth(app);
    const mEnd = getStartOfNextMonth(app);
    return { start: mStart, end: mEnd };

    // 方案B：若需要“按周填满月网格”，可改为：
    // const gridStart = getStartOfWeek(getStartOfMonth(app));
    // const gridEnd = getStartOfWeek(getStartOfNextMonth(app)); // 或 getStartOfNextWeek(endOfMonth)
    // return { start: gridStart, end: gridEnd };
  });

  // 系统日期与视图关系（命名更清晰）
  const currentDate = computed(() => dateState.system);
  const isViewDateToday = computed(() => dateState.app === dateState.system);
  const isViewDateYesterday = computed(() => dateState.app < dateState.system);
  const isViewDateTomorrow = computed(() => dateState.app > dateState.system);

  // --- 4. 跨天业务逻辑 ---
  const processTodoForNewDay = () => {
    todoList.value.forEach((todo) => {
      if (todo.status === "ongoing") {
        todo.status = "delayed";
        const activity = activityList.value.find((a) => a.id === todo.activityId);
        if (activity) activity.status = "delayed";
      }
    });
  };

  const processActivityForNewDay = () => {
    const todayKey = getDateKey(dateState.system);
    activityList.value.forEach((activity) => {
      if (activity.class === "S" && activity.dueRange && activity.dueRange[0]) {
        const activityKey = getDateKey(activity.dueRange[0]);
        if (activityKey === todayKey && !scheduleList.value.some((s) => s.activityId === activity.id)) {
          activity.status = "ongoing";
        }
      }
    });
  };

  // --- 5. 导航（仅视图感知版本） ---
  const navigateByView = (type: "prev" | "next" | "today"): number => {
    const curView = settingStore.settings.viewSet;

    if (type === "today") {
      const base = dateState.system;
      dateState.app = curView === "day" ? base : curView === "week" ? getStartOfWeek(base) : getStartOfMonth(base);
      return base;
    }

    if (curView === "day") {
      dateState.app = addDays(getDayStartTimestamp(dateState.app), type === "prev" ? -1 : 1);
      return dateState.app;
    }

    if (curView === "week") {
      const start = getStartOfWeek(dateState.app);
      const step = type === "prev" ? -7 : 7;
      dateState.app = addDays(start, step);
      return dateState.app;
    }

    // month
    const start = new Date(getStartOfMonth(dateState.app));
    const m = start.getMonth();
    const y = start.getFullYear();
    const next = type === "next";
    const target = new Date(y, m + (next ? 1 : -1), 1);
    target.setHours(0, 0, 0, 0);
    dateState.app = target.getTime();
    return dateState.app;
  };

  // 跳到某个日期，并按当前视图锚定到起点
  const navigateTo = (date: Date | number): number => {
    const target = getDayStartTimestamp(date);
    const curView = settingStore.settings.viewSet;
    dateState.app = curView === "day" ? target : curView === "week" ? getStartOfWeek(target) : getStartOfMonth(target);

    dataStore.setSelectedDate(target);
    return target;
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

  const setAppDate = (timestamp: number) => {
    const dayStart = getDayStartTimestamp(new Date(timestamp));
    dateState.app = dayStart;
  };

  // 将 appDateTimestamp 的年月日和给定时间戳的时分秒拼接
  const combineDateAndTime = (dateTimestamp: number, timeTimestamp: number): number => {
    const date = new Date(dateTimestamp);
    const time = new Date(timeTimestamp);

    const result = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes(),
      time.getSeconds(),
      time.getMilliseconds()
    );

    return result.getTime();
  };

  // --- 7. 暴露接口 ---
  return {
    // 状态
    appDateTimestamp: computed(() => dateState.app),
    appDateKey,
    visibleRange, // {start, end} 半开区间
    currentDate,

    // 日/周/月信息
    displayDateInfo,
    weekStartTs,
    weekKey,
    displayWeekInfo,
    displayWeekInfoMobile,
    monthStartTs,
    monthKey,
    displayMonthInfo,

    // 关系判断
    isViewDateToday,
    isViewDateTomorrow,
    isViewDateYesterday,
    setupSystemDateWatcher,
    cleanupSystemDateWatcher,
    // 导航
    navigateByView, // prev/next/today
    navigateTo, // 跳转日期并按当前视图锚定
    setAppDate,
    // 工具函数
    combineDateAndTime, // 将日期时间戳的年月日和另一个时间戳的时分秒拼接
  };
}
