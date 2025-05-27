import { ref, computed } from "vue";

// 星期几的简写
const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function useDateService() {
  const currentViewDate = ref(new Date());
  const currentDate = ref("");
  const selectedDate = ref(new Date());

  // 重置到当前日期
  function resetToToday() {
    currentViewDate.value = new Date();
    selectedDate.value = new Date();
    updateCurrentDate();
  }

  // 前往前一天
  function goToPreviousDay() {
    const newDate = new Date(currentViewDate.value);
    newDate.setDate(newDate.getDate() - 1);
    currentViewDate.value = newDate;
    selectedDate.value = new Date(newDate);
    updateCurrentDate();
  }

  // 前往后一天
  function goToNextDay() {
    const newDate = new Date(currentViewDate.value);
    newDate.setDate(newDate.getDate() + 1);
    currentViewDate.value = newDate;
    selectedDate.value = new Date(newDate);
    updateCurrentDate();
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
      return "今天是我最爱的喵喵的生日，没有啦";
    }
    return null;
  }

  // 获取当前日期字符串
  function getCurrentDateStr() {
    return currentViewDate.value.toISOString().split("T")[0];
  }

  // 获取选中日期字符串
  function getSelectedDateStr() {
    return selectedDate.value.toISOString().split("T")[0];
  }

  // 检查日期是否是选中日期
  function isSelectedDate(date: Date | string | number): boolean {
    const dateToCheck = new Date(date);
    const selectedDateStr = selectedDate.value.toISOString().split("T")[0];
    const dateToCheckStr = dateToCheck.toISOString().split("T")[0];
    return dateToCheckStr === selectedDateStr;
  }

  // 初始化时更新日期显示
  updateCurrentDate();

  return {
    currentViewDate,
    currentDate,
    selectedDate,
    goToPreviousDay,
    goToNextDay,
    updateCurrentDate,
    getCurrentDateStr,
    getSelectedDateStr,
    isSelectedDate,
    resetToToday,
  };
}
