// src/composables/useWeekBlock.ts
import { computed } from "vue";
import type { WeekBlockItem } from "@/core/types/Week";
import { useWeekData } from "@/composables/useWeekData";
import { getItemWeekRange, isWeekOverlapping, getHour, startOfDay } from "@/core/utils/weekDays";

const pxPerHour = 60;

export function useWeekBlock(days: ReturnType<typeof useWeekData>["days"]) {
  // 1. 计算全周统一时间范围
  const unifiedTimeRange = computed(() => {
    let minHour = 24;
    let maxHour = 0;

    for (const day of days.value) {
      for (const item of day.items) {
        const range = getItemWeekRange(item);
        if (range) {
          const itemStartDay = startOfDay(range.start);
          const itemEndDay = startOfDay(range.end);

          if (itemStartDay === itemEndDay) {
            const startHour = getHour(range.start);
            const endHour = getHour(range.end);
            const endMinute = new Date(range.end).getMinutes();
            const actualEndHour = endMinute > 0 ? endHour + 1 : endHour;

            if (startHour < minHour) minHour = startHour;
            if (actualEndHour > maxHour) maxHour = actualEndHour;
          } else {
            const startHour = getHour(range.start);
            if (startHour < minHour) minHour = startHour;
            if (maxHour < 24) maxHour = 24;
          }
        }
      }
    }

    if (minHour === 24 && maxHour === 0) {
      minHour = 0;
      maxHour = 24;
    }

    minHour = Math.floor(minHour);
    maxHour = Math.min(Math.ceil(maxHour), 24);

    return {
      startHour: minHour,
      endHour: maxHour,
    };
  });

  // 2. 生成时间块数据
  const weekBlockItems = computed(() => {
    const items: WeekBlockItem[] = [];

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const day = days.value[dayIdx];
      for (const item of day.items) {
        const range = getItemWeekRange(item);
        if (range) {
          items.push({
            id: item.key,
            type: item.type,
            start: range.start,
            end: range.end,
            dayIndex: dayIdx,
            item,
          });
        }
      }
    }

    return items;
  });

  // 3. 计算时间块布局
  const calculateWeekBlockLayout = (items: WeekBlockItem[], dayIndex: number): WeekBlockItem[] => {
    const dayItems = items.filter((item) => item.dayIndex === dayIndex);
    if (dayItems.length === 0) return [];

    dayItems.sort((a, b) => a.start - b.start);
    const processedItems: WeekBlockItem[] = [];

    for (const item of dayItems) {
      const overlappingItems: WeekBlockItem[] = [item];

      for (const otherItem of dayItems) {
        if (otherItem.id === item.id) continue;
        if (isWeekOverlapping(item, otherItem)) {
          overlappingItems.push(otherItem);
        }
      }

      overlappingItems.sort((a, b) => a.start - b.start);
      const overlapIndex = overlappingItems.findIndex((i) => i.id === item.id);
      const overlapCount = Math.min(overlappingItems.length, 3);
      const validOverlapIndex = overlapIndex < 3 ? overlapIndex : 2;

      const width = `${100 / overlapCount}%`;
      const left = `${validOverlapIndex * (100 / overlapCount)}%`;

      processedItems.push({
        ...item,
        column: validOverlapIndex,
        width,
        left,
      });
    }

    return processedItems;
  };

  // 4. 按天分组的布局时间块
  const layoutedWeekBlocks = computed(() => {
    const result: Map<number, WeekBlockItem[]> = new Map();
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const layouted = calculateWeekBlockLayout(weekBlockItems.value, dayIdx);
      result.set(dayIdx, layouted);
    }
    return result;
  });

  // 5. 小时刻度数组
  const hourStamps = computed(() => {
    const range = unifiedTimeRange.value;
    const stamps: number[] = [];
    for (let hour = range.startHour; hour <= range.endHour; hour++) {
      stamps.push(hour);
    }
    return stamps;
  });

  // 6. 时间轴高度
  const timeGridHeight = computed(() => {
    const range = unifiedTimeRange.value;
    const hours = range.endHour - range.startHour;
    return hours * pxPerHour;
  });

  // 7. 时间块样式计算
  const getWeekBlockStyle = (item: WeekBlockItem, dayStartTs: number) => {
    const range = unifiedTimeRange.value;
    const itemDayStart = startOfDay(item.start);
    const itemDayEnd = startOfDay(item.end);

    let startHour = 0;
    let durationHours = 0;

    if (itemDayStart === dayStartTs && itemDayEnd === dayStartTs) {
      const startDate = new Date(item.start);
      const endDate = new Date(item.end);

      startHour = startDate.getHours() + startDate.getMinutes() / 60;
      const endHour = endDate.getHours() + endDate.getMinutes() / 60;
      durationHours = endHour - startHour;
    } else {
      if (itemDayStart === dayStartTs) {
        const startDate = new Date(item.start);
        startHour = startDate.getHours() + startDate.getMinutes() / 60;
        durationHours = range.endHour - startHour;
      } else if (itemDayEnd === dayStartTs) {
        const endDate = new Date(item.end);
        const endHour = endDate.getHours() + endDate.getMinutes() / 60;
        startHour = 0;
        durationHours = endHour;
      } else {
        return { display: "none" };
      }
    }

    const relativeStartHour = startHour - range.startHour;
    const top = relativeStartHour * pxPerHour;
    const height = durationHours * pxPerHour;

    return {
      position: "absolute",
      top: `${top}px`,
      left: item.left || "0%",
      width: item.width || "100%",
      height: `${Math.max(height, 20)}px`,
      zIndex: 2,
    };
  };

  // 8. 小时刻度位置计算
  const getHourTickTop = (hour: number) => {
    const range = unifiedTimeRange.value;
    const relativeHour = hour - range.startHour;
    return relativeHour * pxPerHour;
  };

  // 9. 暴露接口
  return {
    unifiedTimeRange,
    weekBlockItems,
    layoutedWeekBlocks,
    hourStamps,
    timeGridHeight,
    pxPerHour,
    calculateWeekBlockLayout,
    getWeekBlockStyle,
    getHourTickTop,
  };
}
