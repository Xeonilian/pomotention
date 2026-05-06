import { ref, watch, onMounted, onUnmounted, type InjectionKey, type Ref } from "vue";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";
import { addDays, getDayStartTimestamp } from "@/core/utils";
import { loadVisiblePublicHolidays, type HolidayDisplay } from "@/services/publicHolidays";

export const plannerHolidayMapKey: InjectionKey<Ref<Record<string, HolidayDisplay>>> = Symbol("plannerHolidayMap");

/** 兼容 ComputedRef 与偶尔出现的 unwrap 时机问题 */
function unwrapRefLike<T>(x: { value?: T } | T | undefined): T | undefined {
  if (x === undefined || x === null) return undefined;
  if (typeof x === "object" && x !== null && "value" in x && (x as { value: T }).value !== undefined) {
    return (x as { value: T }).value;
  }
  return x as T;
}

/**
 * 按当前 visibleRange 与国家码加载公共假期；切换视图/国家时自动刷新。
 * 竞态：快速切换时只应用最后一次请求结果。
 */
export function usePublicHolidays() {
  const settingStore = useSettingStore();
  const dataStore = useDataStore();
  const holidayByDateKey = ref<Record<string, HolidayDisplay>>({});
  let loadSeq = 0;

  /** 解析可见区间；缺失时用当日零点～次日作为兜底，避免 vr 未就绪时报错 */
  function getVisibleRangeOrFallback(): { start: number; end: number } {
    const ds = dataStore.dateService;
    const vrRaw = ds?.visibleRange;
    const vr = unwrapRefLike<{ start: number; end: number }>(vrRaw);
    if (vr && typeof vr.start === "number" && typeof vr.end === "number" && vr.end > vr.start) {
      return vr;
    }
    const appRaw = ds?.appDateTimestamp;
    const appTs = unwrapRefLike<number>(appRaw);
    const dayStart = typeof appTs === "number" && !Number.isNaN(appTs) ? getDayStartTimestamp(appTs) : getDayStartTimestamp();
    return { start: dayStart, end: addDays(dayStart, 1) };
  }

  async function refresh() {
    const seq = ++loadSeq;
    if (!settingStore.settings.showPublicHolidays) {
      holidayByDateKey.value = {};
      return;
    }
    const country = (settingStore.settings.publicHolidayCountryCode || "CN").trim().toUpperCase();
    const { start, end } = getVisibleRangeOrFallback();
    try {
      const map = await loadVisiblePublicHolidays(start, end, country);
      if (seq !== loadSeq) return;
      holidayByDateKey.value = map;
    } catch {
      if (seq !== loadSeq) return;
      holidayByDateKey.value = {};
    }
  }

  watch(
    () => {
      const { start, end } = getVisibleRangeOrFallback();
      return {
        enabled: settingStore.settings.showPublicHolidays,
        country: settingStore.settings.publicHolidayCountryCode ?? "CN",
        start,
        end,
      };
    },
    () => {
      void refresh();
    },
    { immediate: true },
  );

  function onVisibility() {
    if (document.visibilityState === "visible") void refresh();
  }
  onMounted(() => document.addEventListener("visibilitychange", onVisibility));
  onUnmounted(() => document.removeEventListener("visibilitychange", onVisibility));

  return { holidayByDateKey, refresh };
}
