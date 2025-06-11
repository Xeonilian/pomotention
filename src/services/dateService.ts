import { ref } from "vue";
import { getLocalDateString } from "@/core/utils";

// 星期几的简写
const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function useDateService() {
  const currentViewDate = ref(new Date()); // 当前视图显示的日期
  const currentDate = ref(""); // 格式化后的日期字符串（用于显示）
  const selectedDate = ref(new Date()); // "选中"的日期（实际上跟随视图日期变化）

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
    // 使用本地时区计算日期，避免时区问题
    const dateStr = getLocalDateString(date);
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
    // 使用本地时区计算日期，避免时区问题
    return getLocalDateString(currentViewDate.value);
  }

  // 获取选中日期字符串
  function getSelectedDateStr() {
    // 使用本地时区计算日期，避免时区问题
    return getLocalDateString(selectedDate.value);
  }

  // 检查日期是否是选中日期
  function isSelectedDate(date: Date | string | number): boolean {
    const dateToCheck = new Date(date);
    // 使用本地时区计算日期，避免时区问题
    const selectedDateStr = getLocalDateString(selectedDate.value);
    const dateToCheckStr = getLocalDateString(dateToCheck);
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
