// src/composables/useWeekBlock.ts
import { computed, unref, type MaybeRef } from "vue";
import type { WeekBlockItem } from "@/core/types/Week";
import { useWeekData } from "@/composables/planner/useWeekData";
import { getItemWeekRange, isWeekBlockOverlapping, getHour, startOfDay } from "@/core/utils/weekDays";

const END_MARKER_SIZE_PX = 18;
const BASE_PX_PER_HOUR = 40;
const MIN_OVERLAP_MS = 5 * 60 * 1000;

export function useWeekBlock(days: ReturnType<typeof useWeekData>["days"], targetHeight?: MaybeRef<number>) {
  const unifiedTimeRange = computed(() => {
    let minHour = 24;
    let maxHour = 0;

    for (const day of days.value) {
      for (const item of day.items) {
        const range = getItemWeekRange(item);
        if (!range) continue;

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

    if (minHour === 24 && maxHour === 0) {
      minHour = 6;
      maxHour = 22;
    }

    minHour = Math.floor(minHour);
    maxHour = Math.min(Math.ceil(maxHour), 24);

    return {
      startHour: minHour < 6 ? minHour : 6,
      endHour: maxHour > 22 ? maxHour : 22,
    };
  });

  const pxPerHour = computed(() => {
    const range = unifiedTimeRange.value;
    const totalHours = range.endHour - range.startHour;
    const height = unref(targetHeight);

    if (height && totalHours > 0) {
      return height / totalHours;
    }
    return BASE_PX_PER_HOUR;
  });

  const weekBlockItems = computed(() => {
    const items: WeekBlockItem[] = [];

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const day = days.value[dayIdx];
      for (const item of day.items) {
        const range = getItemWeekRange(item);
        if (!range) continue;
        items.push({
          id: item.key,
          type: item.type,
          start: range.start,
          end: range.end,
          endOnly: range.endOnly,
          dayIndex: dayIdx,
          item,
        });
      }
    }

    return items;
  });

  const getOverlapDuration = (a: { start: number; end: number }, b: { start: number; end: number }): number => {
    if (!isWeekBlockOverlapping(a, b)) return 0;
    const overlapStart = Math.max(a.start, b.start);
    const overlapEnd = Math.min(a.end, b.end);
    return Math.max(0, overlapEnd - overlapStart);
  };

  const blocksOverlap = (a: WeekBlockItem, b: WeekBlockItem): boolean => {
    if (a.endOnly && b.endOnly) return Math.abs(a.end - b.end) <= MIN_OVERLAP_MS;
    return getOverlapDuration(a, b) > MIN_OVERLAP_MS;
  };

  const calculateWeekBlockLayout = (items: WeekBlockItem[], dayIndex: number): WeekBlockItem[] => {
    const dayItems = items.filter((item) => item.dayIndex === dayIndex);
    if (dayItems.length === 0) return [];

    dayItems.sort((a, b) => (a.endOnly ? a.end : a.start) - (b.endOnly ? b.end : b.start));
    const processedItems: WeekBlockItem[] = [];

    for (const item of dayItems) {
      const overlappingItems: WeekBlockItem[] = [item];

      for (const otherItem of dayItems) {
        if (otherItem.id === item.id) continue;
        if (blocksOverlap(item, otherItem)) {
          overlappingItems.push(otherItem);
        }
      }

      overlappingItems.sort((a, b) => (a.endOnly ? a.end : a.start) - (b.endOnly ? b.end : b.start));
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

  const layoutedWeekBlocks = computed(() => {
    const result: Map<number, WeekBlockItem[]> = new Map();
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      result.set(dayIdx, calculateWeekBlockLayout(weekBlockItems.value, dayIdx));
    }
    return result;
  });

  const hourStamps = computed(() => {
    const range = unifiedTimeRange.value;
    const stamps: number[] = [];
    for (let hour = range.startHour; hour <= range.endHour; hour++) {
      stamps.push(hour);
    }
    return stamps;
  });

  const timeGridHeight = computed(() => {
    const range = unifiedTimeRange.value;
    const hours = range.endHour - range.startHour;
    return hours * pxPerHour.value;
  });

  const getItemBlockStyle = (item: WeekBlockItem, dayStartTs: number) => {
    const range = unifiedTimeRange.value;

    if (item.endOnly) {
      if (startOfDay(item.end) !== dayStartTs) return { display: "none" };
      const endDate = new Date(item.end);
      const endHour = endDate.getHours() + endDate.getMinutes() / 60;
      const centerTop = (endHour - range.startHour) * pxPerHour.value;
      const top = Math.max(centerTop - END_MARKER_SIZE_PX / 2, 0);
      return {
        position: "absolute",
        top: `${top}px`,
        left: item.left || "0%",
        width: item.width || "100%",
        height: `${END_MARKER_SIZE_PX}px`,
        zIndex: 4,
      };
    }

    const itemDayStart = startOfDay(item.start);
    const itemDayEnd = startOfDay(item.end);

    let startHour = 0;
    let durationHours = 0;

    if (itemDayStart === dayStartTs && itemDayEnd === dayStartTs) {
      if (item.type === "todo") {
        const startTime = item.item.startTime || item.start;
        const doneTime = item.item.doneTime || item.end;
        const startDate = new Date(startTime);
        const endDate = new Date(doneTime);

        startHour = startDate.getHours() + startDate.getMinutes() / 60;
        const endHour = endDate.getHours() + endDate.getMinutes() / 60;
        durationHours = Math.max(endHour - startHour, 0.5);
      } else {
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
    const height = Math.max(durationHours * pxPerHour.value, 10);

    const forceFullWidthForSchedule = item.type === "schedule";

    return {
      position: "absolute",
      top: `${top}px`,
      left: forceFullWidthForSchedule ? "0%" : (item.left || "0%"),
      width: forceFullWidthForSchedule ? "100%" : (item.width || "100%"),
      height: `${height}px`,
      zIndex: 2,
    };
  };

  const getHourTickTop = (hour: number) => {
    const range = unifiedTimeRange.value;
    const relativeHour = hour - range.startHour;
    return relativeHour * pxPerHour.value;
  };

  return {
    unifiedTimeRange,
    weekBlockItems,
    layoutedWeekBlocks,
    hourStamps,
    timeGridHeight,
    pxPerHour,
    calculateWeekBlockLayout,
    getItemBlockStyle,
    getHourTickTop,
  };
}
