// dateService.ts
// 不使用合并到unifiedDateService.ts
// 简化并强化核心逻辑
import { ref, computed } from "vue";
import { getLocalDateString, getDateKey } from "@/core/utils";

export function useDateService() {
  const currentViewDate = ref(new Date());
  const currentDateKey = computed(() => getDateKey(currentViewDate.value));

  // 单一日期间隔计算
  const getDayInterval = (days: number) => {
    const date = new Date(currentViewDate.value);
    date.setDate(date.getDate() + days);
    return date;
  };

  // 统一日期操作
  const navigateDate = (type: "prev" | "next" | "today" | Date) => {
    let newDate = currentViewDate.value;

    switch (type) {
      case "prev":
        newDate = getDayInterval(-1);
        break;
      case "next":
        newDate = getDayInterval(1);
        break;
      case "today":
        newDate = new Date();
        break;
      default:
        newDate = type instanceof Date ? type : new Date(type);
    }

    currentViewDate.value = newDate;
    return newDate;
  };

  // 格式化显示日期
  const displayDate = computed(() => {
    const date = currentViewDate.value;
    return `${getLocalDateString(date)} ${date.toLocaleDateString("en-US", {
      weekday: "short",
    })}`;
  });

  return {
    currentViewDate,
    currentDateKey,
    displayDate,
    navigateDate,
    isSelectedDate: (date: Date | string | number) =>
      getDateKey(date) === currentDateKey.value,
  };
}
