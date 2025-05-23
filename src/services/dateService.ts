import { ref, computed } from "vue";

// 星期几的简写
const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// 日期范围限制
const INITIAL_DATE = new Date("2025-04-03");

export function useDateService() {
  const currentViewDate = ref(new Date());
  const currentDate = ref("");

  // 计算是否可以前往前一天
  const canGoToPreviousDay = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return currentViewDate.value > today;
  });

  // 计算是否可以前往后一天
  const canGoToNextDay = computed(() => {
    const maxDate = new Date(INITIAL_DATE);
    maxDate.setHours(23, 59, 59, 999);
    return currentViewDate.value < maxDate;
  });

  // 前往前一天
  function goToPreviousDay() {
    if (canGoToPreviousDay.value) {
      const newDate = new Date(currentViewDate.value);
      newDate.setDate(newDate.getDate() - 1);
      currentViewDate.value = newDate;
      updateCurrentDate();
    }
  }

  // 前往后一天
  function goToNextDay() {
    if (canGoToNextDay.value) {
      const newDate = new Date(currentViewDate.value);
      newDate.setDate(newDate.getDate() + 1);
      currentViewDate.value = newDate;
      updateCurrentDate();
    }
  }

  // 更新当前日期显示
  function updateCurrentDate() {
    const date = currentViewDate.value;
    const dateStr = date.toISOString().split("T")[0];
    const weekDay = weekdayShort[date.getDay()];

    // 计算周数
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekNo = Math.ceil(
      ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );

    currentDate.value = `${dateStr} ${weekDay} W${weekNo}`;

    // 如果是2025年4月3日，显示特殊消息
    if (dateStr === "2025-04-03") {
      // 这里需要从外部传入消息提示函数
      return "今天是我最爱的喵喵的生日，没有啦";
    }
    return null;
  }

  // 获取当前日期字符串
  function getCurrentDateStr() {
    return currentViewDate.value.toISOString().split("T")[0];
  }

  return {
    currentViewDate,
    currentDate,
    canGoToPreviousDay,
    canGoToNextDay,
    goToPreviousDay,
    goToNextDay,
    updateCurrentDate,
    getCurrentDateStr,
  };
}
