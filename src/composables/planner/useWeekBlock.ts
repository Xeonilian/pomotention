// src/composables/planner/useWeekBlock.ts
/**
 * 周视图时间条布局
 *
 * 数据流：UnifiedItem → getItemWeekRange（weekDays）→ WeekBlockItem → 本文件叠放 → getItemBlockStyle
 *
 * 叠放规则（同一天内）：
 * 1. 连通重叠组：两段时间交叠 > MIN_OVERLAP_MS（5min）则同组
 * 2. 组内仅 1 条 → 全宽
 * 3. 时长差不多（短/长 ≥ SIMILAR_DURATION_RATIO）且交叠占短块比例 ≥ MIN_OVERLAP_RATIO_FOR_COLUMNS
 *    → 均分并排，最多 3 列（第 4 条起与第 3 列同列）
 * 4. 否则（包含关系 / 轻微交叠）→ 最长条全宽作底；其余按开始时间排在右侧 1/3 区域叠放，叠放簇内最多 3 列
 * 5. schedule 且为底条（column 0）→ 渲染强制全宽
 */
import { computed, unref, type MaybeRef, type CSSProperties } from "vue";
import type { WeekBlockItem } from "@/core/types/Week";
import { useWeekData } from "@/composables/planner/useWeekData";
import { getItemWeekRange, getHour, startOfDay } from "@/core/utils/weekDays";
import { useDevice } from "@/composables/platform/useDevice";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/stores/useDataStore";
import { collectLifeRecordOverlays, type LifePointMark, type LifeSleepRange } from "@/services/timetable/lifeRecordOverlays";

const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_PX_PER_HOUR = 40;
/** 低于此交叠时长不计为重叠 */
const MIN_OVERLAP_MS = 5 * 60 * 1000;
/** 叠放区起点：容器宽度的 1/3 */
const OVERLAY_LEFT_PCT = 100 / 4;
/** 叠放区总宽（占容器百分比；移动端用右侧可用区，避免条带超出叠放区互相遮挡） */
const OVERLAY_ZONE_PCT = 100 - OVERLAY_LEFT_PCT;
/** 短时长/长时长 ≥ 此值视为「差不多长」 */
const SIMILAR_DURATION_RATIO = 0.6;
/** 交叠/短块时长 ≥ 此值才允许均分并排（避免轻微交叠仍并排） */
const MIN_OVERLAP_RATIO_FOR_COLUMNS = 0.2;

export function useWeekBlock(days: ReturnType<typeof useWeekData>["days"], targetHeight?: MaybeRef<number>) {
  const { isMobile } = useDevice();
  const dataStore = useDataStore();
  const { todoList, activityById, taskById } = storeToRefs(dataStore);
  /** 叠放区总宽：随 viewport / 设备形态更新，避免模块加载时定死 */
  const overlayWidthPct = computed(() => (isMobile.value ? OVERLAY_ZONE_PCT : 70));

  /** 每天生活记录（未醒睡眠铺到入睡日日末）；先于时间轴范围计算，用于撑开下沿 */
  const lifeOverlaysByDay = computed(() => {
    const now = Date.now();
    const map = new Map<number, { points: LifePointMark[]; sleeps: LifeSleepRange[] }>();
    for (const day of days.value) {
      const dayStart = day.startTs;
      const dayEnd = dayStart + DAY_MS;
      map.set(
        day.index,
        collectLifeRecordOverlays({
          dayStart,
          dayEnd,
          timeRange: { start: dayStart, end: dayEnd },
          todos: todoList.value,
          getActivity: (id) => activityById.value.get(id),
          getTask: (id) => taskById.value.get(id),
          now,
          minGapMs: 5 * 60_000,
          openSleepEnd: "dayOfStart",
        }),
      );
    }
    return map;
  });

  const unifiedTimeRange = computed(() => {
    let minHour = 24;
    let maxHour = 0;
    /** 本周最早醒来的时间戳；无醒来则为 null，不改上沿 */
    let earliestWakeTs: number | null = null;

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

      // 入睡撑开下沿；醒来决定上沿。跨日早晨段从 0 点起，绝不能把轴顶拉到 0
      const life = lifeOverlaysByDay.value.get(day.index);
      if (!life) continue;
      for (const sleep of life.sleeps) {
        // 当日真实入睡点（非日初跨日截）才参与下沿
        if (sleep.start > day.startTs) {
          const startH = getHour(sleep.start);
          const startM = new Date(sleep.start).getMinutes();
          const startCeil = startM > 0 ? startH + 1 : startH;
          if (startCeil > maxHour) maxHour = startCeil;
        }

        if (sleep.end >= day.startTs + DAY_MS) {
          maxHour = 24;
        } else {
          const endH = getHour(sleep.end);
          const endM = new Date(sleep.end).getMinutes();
          const endCeil = endM > 0 ? endH + 1 : endH;
          if (endCeil > maxHour) maxHour = endCeil;
          if (earliestWakeTs == null || sleep.end < earliestWakeTs) earliestWakeTs = sleep.end;
        }
      }
      for (const point of life.points) {
        // 点事件只参与下沿，不撑上沿（避免把「醒点上方 1 格」撑成两格）
        const h = getHour(point.time);
        if (h + 1 > maxHour) maxHour = Math.min(h + 1, 24);
      }
    }

    if (minHour === 24 && maxHour === 0) {
      minHour = 6;
      maxHour = 22;
    }

    minHour = Math.floor(minHour);
    maxHour = Math.min(Math.ceil(maxHour), 24);

    let startHour: number;
    if (earliestWakeTs != null) {
      // 醒点向上取整到小时再 −1：5:30→5，整点 8:00→7（上方恰留 1 格）；不受默认 6 压制
      const d = new Date(earliestWakeTs);
      const wakeFrac = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
      startHour = Math.max(0, Math.ceil(wakeFrac) - 1);
      // 更早的普通活动仍可再往上抬
      if (minHour < startHour) startHour = minHour;
    } else {
      startHour = minHour < 6 ? minHour : 6;
    }

    return {
      startHour,
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
          dayIndex: dayIdx,
          item,
        });
      }
    }

    return items;
  });

  const getOverlapDuration = (a: { start: number; end: number }, b: { start: number; end: number }): number => {
    if (a.end <= b.start || b.end <= a.start) return 0;
    return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
  };

  const blocksOverlap = (a: WeekBlockItem, b: WeekBlockItem): boolean => getOverlapDuration(a, b) > MIN_OVERLAP_MS;

  const blockDurationMs = (b: WeekBlockItem) => Math.max(0, b.end - b.start);

  const overlapRatioOfPair = (a: WeekBlockItem, b: WeekBlockItem): number => {
    const overlap = getOverlapDuration(a, b);
    const shorter = Math.min(blockDurationMs(a), blockDurationMs(b));
    return shorter > 0 ? overlap / shorter : 0;
  };

  const maxOverlapRatioInGroup = (group: WeekBlockItem[]): number => {
    let max = 0;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        max = Math.max(max, overlapRatioOfPair(group[i], group[j]));
      }
    }
    return max;
  };

  const shouldUseEqualColumns = (group: WeekBlockItem[]): boolean => {
    const durations = group.map(blockDurationMs);
    const maxD = Math.max(...durations);
    const minD = Math.min(...durations);
    const similarDuration = maxD > 0 && minD / maxD >= SIMILAR_DURATION_RATIO;
    const substantialOverlap = maxOverlapRatioInGroup(group) >= MIN_OVERLAP_RATIO_FOR_COLUMNS;
    return similarDuration && substantialOverlap;
  };

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

  /** 包含/轻交叠：最长全宽，短块叠在右侧 1/3 区域 */
  const layoutSpanOverlayGroup = (group: WeekBlockItem[]): WeekBlockItem[] => {
    if (group.length === 1) {
      return [{ ...group[0], left: "0%", width: "100%", column: 0 }];
    }

    if (shouldUseEqualColumns(group)) {
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
        const w = overlayWidthPct.value / count;
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

  const calculateWeekBlockLayout = (items: WeekBlockItem[], dayIndex: number): WeekBlockItem[] => {
    const dayItems = items.filter((item) => item.dayIndex === dayIndex);
    if (dayItems.length === 0) return [];

    const laidOut: WeekBlockItem[] = [];
    for (const group of buildOverlapGroups(dayItems)) {
      laidOut.push(...layoutSpanOverlayGroup(group));
    }
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

    const widthStr = item.width || "100%";
    const isSpanBackground = (item.column ?? 0) === 0 && widthStr === "100%";
    const forceFullWidthForSchedule = item.type === "schedule" && isSpanBackground;
    const zIndex = isSpanBackground ? 2 : 3 + (item.column ?? 0);

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

  /** 时刻相对当日 0 点的小时数；日末（次日 0 点）记为 24 */
  function hourOffsetInDay(ts: number, dayStartTs: number): number {
    if (ts >= dayStartTs + DAY_MS) return 24;
    if (ts <= dayStartTs) return 0;
    const d = new Date(ts);
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  function getLifeSleepBandStyle(sleep: LifeSleepRange, dayStartTs: number): CSSProperties {
    const range = unifiedTimeRange.value;
    const startH = hourOffsetInDay(sleep.start, dayStartTs);
    const endH = hourOffsetInDay(sleep.end, dayStartTs);
    const top = (startH - range.startHour) * pxPerHour.value;
    const height = Math.max((endH - startH) * pxPerHour.value, 2);
    return {
      position: "absolute",
      left: "0",
      width: "100%",
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor: "var(--color-blue-soft-transparent)",
      zIndex: 1,
      cursor: "pointer",
    };
  }

  function getLifePointStyle(mark: LifePointMark, dayStartTs: number): CSSProperties {
    const range = unifiedTimeRange.value;
    const h = hourOffsetInDay(mark.time, dayStartTs);
    const top = (h - range.startHour) * pxPerHour.value - 7;
    // 从右往左叠 lane，避免贴左边时间块
    const right = isMobile.value ? mark.lane * 15 : 12 + mark.lane * 15;
    return {
      position: "absolute",
      right: `${right}px`,
      top: `${top}px`,
      width: "14px",
      height: "14px",
      color: mark.colorVar,
      zIndex: 5 + mark.lane,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      userSelect: "none",
    };
  }

  return {
    layoutedWeekBlocks,
    hourStamps,
    timeGridHeight,
    getItemBlockStyle,
    getHourTickTop,
    lifeOverlaysByDay,
    getLifeSleepBandStyle,
    getLifePointStyle,
  };
}
