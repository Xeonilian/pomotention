// src/composables/useWeekBlock.ts
import { computed, unref, type MaybeRef } from "vue";
import type { WeekBlockItem } from "@/core/types/Week";
import { useWeekData } from "@/composables/planner/useWeekData";
import { getItemWeekRange, isWeekBlockOverlapping, getHour, startOfDay } from "@/core/utils/weekDays";
import { useDevice } from "@/composables/platform/useDevice";

const { isMobile } = useDevice();
const END_MARKER_SIZE_PX = 20;
const BASE_PX_PER_HOUR = 40;
const MIN_OVERLAP_MS = 5 * 60 * 1000;
/** 右侧叠放区：left 1/3 起，占宽 2/3 */
const OVERLAY_LEFT_PCT = 100 / 3;
const OVERLAY_WIDTH_PCT = isMobile.value ? 120 : 70;
/** 时长比 ≥ 此值视为「差不多长」，仍均分列 */
const SIMILAR_DURATION_RATIO = 0.6;

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

  const blockDurationMs = (b: WeekBlockItem) => Math.max(0, b.end - b.start);

  const layoutEqualColumns = (group: WeekBlockItem[]): WeekBlockItem[] => {
    const sorted = [...group].sort((a, b) => a.start - b.start);
    const count = Math.min(sorted.length, 3);
    return sorted.map((item, i) => {
      const col = i < 3 ? i : 2;
      const width = 100 / count;
      return {
        ...item,
        column: col,
        width: `${width}%`,
        left: `${col * width}%`,
      };
    });
  };

  const clusterOverlayBlocks = (overlays: WeekBlockItem[], seed: WeekBlockItem): WeekBlockItem[] => {
    const cluster: WeekBlockItem[] = [seed];
    let changed = true;
    while (changed) {
      changed = false;
      for (const o of overlays) {
        if (cluster.some((c) => c.id === o.id)) continue;
        if (cluster.some((c) => blocksOverlap(c, o))) {
          cluster.push(o);
          changed = true;
        }
      }
    }
    return cluster;
  };

  /** 重叠组内：最长块全宽，短块从 1/3 起叠在右侧 2/3 */
  const layoutSpanOverlayGroup = (group: WeekBlockItem[]): WeekBlockItem[] => {
    if (group.length === 1) {
      return [{ ...group[0], left: "0%", width: "100%", column: 0 }];
    }

    const durations = group.map((b) => blockDurationMs(b));
    const maxD = Math.max(...durations);
    const minD = Math.min(...durations);
    if (maxD > 0 && minD / maxD >= SIMILAR_DURATION_RATIO) {
      return layoutEqualColumns(group);
    }

    const sorted = [...group].sort((a, b) => blockDurationMs(b) - blockDurationMs(a) || a.start - b.start);
    const background = sorted[0];
    const overlays = sorted.slice(1);
    const result: WeekBlockItem[] = [{ ...background, left: "0%", width: "100%", column: 0 }];

    const laidOut = new Set<string>();
    for (const seed of overlays) {
      if (laidOut.has(seed.id)) continue;
      const cluster = clusterOverlayBlocks(overlays, seed).filter((o) => !laidOut.has(o.id));
      const count = Math.min(cluster.length, 3);
      cluster.sort((a, b) => a.start - b.start);
      cluster.forEach((o, i) => {
        const col = i < 3 ? i : 2;
        const w = OVERLAY_WIDTH_PCT / count;
        const l = OVERLAY_LEFT_PCT + col * w;
        result.push({ ...o, left: `${l}%`, width: `${w}%`, column: col + 1 });
        laidOut.add(o.id);
      });
    }
    return result;
  };

  const buildOverlapGroups = (timeBlocks: WeekBlockItem[]): WeekBlockItem[][] => {
    const groups: WeekBlockItem[][] = [];
    const visited = new Set<string>();

    for (const item of timeBlocks) {
      if (visited.has(item.id)) continue;
      const group: WeekBlockItem[] = [];
      const stack = [item];
      visited.add(item.id);
      while (stack.length) {
        const cur = stack.pop()!;
        group.push(cur);
        for (const other of timeBlocks) {
          if (visited.has(other.id)) continue;
          if (blocksOverlap(cur, other)) {
            visited.add(other.id);
            stack.push(other);
          }
        }
      }
      groups.push(group);
    }
    return groups;
  };

  const layoutEndMarkerColumns = (markers: WeekBlockItem[]): WeekBlockItem[] => {
    if (markers.length === 0) return [];
    const sorted = [...markers].sort((a, b) => a.end - b.end);
    return sorted.map((item) => {
      const overlapping = sorted.filter((o) => blocksOverlap(item, o));
      const overlapIndex = overlapping.findIndex((i) => i.id === item.id);
      const count = Math.min(overlapping.length, 3);
      const col = overlapIndex < 3 ? overlapIndex : 2;
      const width = 100 / count;
      return {
        ...item,
        column: col,
        width: `${width}%`,
        left: `${col * width}%`,
      };
    });
  };

  const calculateWeekBlockLayout = (items: WeekBlockItem[], dayIndex: number): WeekBlockItem[] => {
    const dayItems = items.filter((item) => item.dayIndex === dayIndex);
    if (dayItems.length === 0) return [];

    const timeBlocks = dayItems.filter((i) => !i.endOnly);
    const endMarkers = dayItems.filter((i) => i.endOnly);

    const laidOut: WeekBlockItem[] = [];
    for (const group of buildOverlapGroups(timeBlocks)) {
      laidOut.push(...layoutSpanOverlayGroup(group));
    }
    laidOut.push(...layoutEndMarkerColumns(endMarkers));
    return laidOut;
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
      const timeTop = (endHour - range.startHour) * pxPerHour.value;
      const gridH = timeGridHeight.value;
      // 灯泡整体在时刻线之上，并限制在网格高度内（避免 23:59 等贴底被 overflow 裁切）
      const top = Math.max(0, Math.min(timeTop - END_MARKER_SIZE_PX, gridH - END_MARKER_SIZE_PX));
      const col = item.column ?? 0;
      const rightPx = 2 + col * (END_MARKER_SIZE_PX + 2);
      return {
        position: "absolute",
        top: `${top}px`,
        right: `${rightPx}px`,
        left: "auto",
        width: "auto",
        height: `${END_MARKER_SIZE_PX}px`,
        zIndex: 10,
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

    const isBackground = (item.column ?? 0) === 0;
    const forceFullWidthForSchedule = item.type === "schedule" && isBackground;
    const zIndex = isBackground ? 2 : 3 + (item.column ?? 0);

    return {
      position: "absolute",
      top: `${top}px`,
      left: forceFullWidthForSchedule ? "0%" : item.left || "0%",
      width: forceFullWidthForSchedule ? "100%" : item.width || "100%",
      height: `${height}px`,
      zIndex,
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
