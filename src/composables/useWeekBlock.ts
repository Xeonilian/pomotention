// src/composables/useWeekBlock.ts
import { computed, unref, type MaybeRef } from "vue";
import type { WeekBlockItem } from "@/core/types/Week";
import { useWeekData } from "@/composables/useWeekData";
import { getItemWeekRange, isWeekBlockOverlapping, getHour, startOfDay } from "@/core/utils/weekDays";

// 保留原有常量，新增动态计算逻辑
const BASE_PX_PER_HOUR = 40;

export function useWeekBlock(days: ReturnType<typeof useWeekData>["days"], targetHeight?: MaybeRef<number>) {
  // 1. 计算全周统一时间范围（完全保留原有代码）
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
      startHour: minHour < 6 ? minHour : 6, // 如果block在6点前开始，时间轴从更早时间开始
      endHour: maxHour < 22 ? 22 : maxHour,
    };
  });

  // 动态计算pxPerHour（响应式计算，随容器高度变化）
  const pxPerHour = computed(() => {
    const range = unifiedTimeRange.value;
    const totalHours = range.endHour - range.startHour;
    const height = unref(targetHeight); // 使用 unref 来获取响应式值或普通值

    // 如果传入了目标高度，就按高度/小时数计算，否则用默认值
    if (height && totalHours > 0) {
      const result = height / totalHours;
      // console.log(`pxPerHour calculated: targetHeight=${height}, totalHours=${totalHours}, result=${result}`);
      return result;
    }
    console.log(`pxPerHour using default: ${BASE_PX_PER_HOUR}`);
    return BASE_PX_PER_HOUR;
  });

  // 2. 生成时间块数据（完全保留）
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

  // 3. 计算时间块布局（完全保留）
  const calculateWeekBlockLayout = (items: WeekBlockItem[], dayIndex: number): WeekBlockItem[] => {
    const dayItems = items.filter((item) => item.dayIndex === dayIndex);
    if (dayItems.length === 0) return [];

    dayItems.sort((a, b) => a.start - b.start);
    const processedItems: WeekBlockItem[] = [];

    for (const item of dayItems) {
      const overlappingItems: WeekBlockItem[] = [item];

      for (const otherItem of dayItems) {
        if (otherItem.id === item.id) continue;
        if (isWeekBlockOverlapping(item, otherItem)) {
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

  // 5. 小时刻度数组（完全保留）
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
    return hours * pxPerHour.value; // 仅改这里，用动态值
  });

  // 7. 时间块样式计算
  const getItemBlockStyle = (item: WeekBlockItem, dayStartTs: number) => {
    const range = unifiedTimeRange.value;
    const itemDayStart = startOfDay(item.start);
    const itemDayEnd = startOfDay(item.end);

    let startHour = 0;
    let durationHours = 0;

    if (itemDayStart === dayStartTs && itemDayEnd === dayStartTs) {
      if (item.type === "todo") {
        // 对于todo类型，使用实际的startTime和doneTime计算持续时间
        const startTime = (item.item as any).startTime || item.start;
        const doneTime = (item.item as any).doneTime || item.end;
        const startDate = new Date(startTime);
        const endDate = new Date(doneTime);

        startHour = startDate.getHours() + startDate.getMinutes() / 60;
        const endHour = endDate.getHours() + endDate.getMinutes() / 60;
        durationHours = Math.max(endHour - startHour, 0.25); // 最小15分钟
      } else {
        // 对于schedule类型，使用实际的开始和结束时间
        const startDate = new Date(item.start);
        const endDate = new Date(item.end);

        startHour = startDate.getHours() + startDate.getMinutes() / 60;
        const endHour = endDate.getHours() + endDate.getMinutes() / 60;
        durationHours = endHour - startHour;
      }
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
    const top = relativeStartHour * pxPerHour.value;
    const height = Math.max(durationHours * pxPerHour.value, 10); // 确保最小高度10px

    // 调试信息 - 只输出todo类型的高度计算
    if (item.type === "todo") {
      // console.log(`Todo ${item.id}: durationHours=${durationHours}, height=${height}`);
    }

    return {
      position: "absolute",
      top: `${top}px`,
      left: item.left || "0%",
      width: item.width || "100%",
      height: `${height}px`,
      zIndex: 2,
    };
  };

  // 8. 小时刻度位置计算
  const getHourTickTop = (hour: number) => {
    const range = unifiedTimeRange.value;
    const relativeHour = hour - range.startHour;
    return relativeHour * pxPerHour.value; // 改这里
  };

  // 9. 暴露接口（新增pxPerHour，其他保留）
  return {
    unifiedTimeRange,
    weekBlockItems,
    layoutedWeekBlocks,
    hourStamps,
    timeGridHeight,
    pxPerHour, // 新增暴露
    calculateWeekBlockLayout,
    getItemBlockStyle,
    getHourTickTop,
  };
}
