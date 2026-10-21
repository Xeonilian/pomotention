// Planner 生活可视化（会话态，不落盘）：非日 = 图层开关；日 = 集中 sheet
import { defineStore } from "pinia";
import { computed, ref, toValue, watch } from "vue";
import { useDevice } from "@/composables/platform/useDevice";
import { LIFE_RECORD_DEFS, type LifeRecordKind } from "@/core/lifeRecord";
import { findLifeRecordTaskForDay } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";

export const useLifePlannerLayerStore = defineStore("lifePlannerLayer", () => {
  const dataStore = useDataStore();
  const settingStore = useSettingStore();
  const { isMobile } = useDevice();

  const emptySheetTaskIds = (): Record<LifeRecordKind, number | null> => ({
    drink: null,
    eat: null,
    toilet: null,
    sleep: null,
  });

  function plannerDayStart(): number | null {
    const raw = dataStore.dateService.appDateTimestamp as Parameters<typeof toValue>[0];
    const dayStart = toValue(raw);
    return Number.isFinite(dayStart) ? (dayStart as number) : null;
  }

  /** 当天 4 类任一已有生活记录（空桶不算）→ 日按钮 ChannelAdd */
  function dayHasRecords(dayStart: number): boolean {
    for (const def of LIFE_RECORD_DEFS) {
      const task = findLifeRecordTaskForDay(dataStore.taskList, def.kind, dayStart, dataStore.activityById);
      if (task && !task.deleted && (task.lifeRecords?.length ?? 0) > 0) return true;
    }
    return false;
  }

  const currentDayHasLifeRecord = computed(() => {
    const dayStart = plannerDayStart();
    return dayStart != null && dayHasRecords(dayStart);
  });

  const lifeView = ref(false);
  function toggleLifeView() {
    lifeView.value = !lifeView.value;
  }

  /**
   * day 集中生活 sheet：4 类同框 2×2。
   * openDaySheet 才建缺的桶；enterDaySheet / 换日只绑已有桶，没有的不新建。
   * close 只关界面，空桶保留。
   */
  const daySheetOpen = ref(false);
  const daySheetTaskIds = ref<Record<LifeRecordKind, number | null>>(emptySheetTaskIds());

  /** 只取当天已有桶，不落盘、不补建 */
  function existingSheetTaskIds(dayStart: number): Record<LifeRecordKind, number | null> {
    const ids = emptySheetTaskIds();
    for (const def of LIFE_RECORD_DEFS) {
      const task = findLifeRecordTaskForDay(dataStore.taskList, def.kind, dayStart, dataStore.activityById);
      if (!task || task.deleted) continue;
      ids[def.kind] = task.id;
    }
    return ids;
  }

  function bindSheetTaskIds(create: boolean) {
    // Pinia 对嵌套 computed 会拆包成 number，不能再取 .value（否则 undefined → id NaN → JSON null）
    const dayStart = plannerDayStart();
    if (dayStart == null) return;
    if (create) {
      daySheetTaskIds.value = dataStore.ensureAllLifeRecordTasksForDay(dayStart);
      return;
    }
    // 已有空桶也要绑上；四类都没有才是空提示。不在这里补建。
    daySheetTaskIds.value = existingSheetTaskIds(dayStart);
  }

  function openDaySheet() {
    // 数据未进内存时建桶会把空列表落盘，盖掉还没 load 的本地记录
    if (!dataStore.isDataLoaded) return;
    bindSheetTaskIds(true);
    daySheetOpen.value = true;
  }

  /** 进入录入区：只绑已有桶（含空桶）；四类都没有才留新建提示 */
  function enterDaySheet() {
    if (!dataStore.isDataLoaded) return;
    bindSheetTaskIds(false);
    daySheetOpen.value = true;
  }

  function closeDaySheet() {
    daySheetTaskIds.value = emptySheetTaskIds();
    daySheetOpen.value = false;
  }

  watch(
    () => toValue(dataStore.dateService.appDateTimestamp as Parameters<typeof toValue>[0]),
    () => {
      if (daySheetOpen.value) bindSheetTaskIds(false);
    },
  );

  /** 手机非日生活预览：临时铺满规划区（不改设置）；顶栏 timetable/task 外观跟实际可见性走 */
  const mobilePreviewSolo = computed(
    () => isMobile.value && settingStore.settings.viewSet !== "day" && lifeView.value && !daySheetOpen.value,
  );

  function clear() {
    lifeView.value = false;
  }

  /** 切到日视图时关掉图层 */
  function onViewSetChange(viewSet: string) {
    if (viewSet === "day") clear();
  }

  return {
    currentDayHasLifeRecord,
    clear,
    onViewSetChange,
    lifeView,
    toggleLifeView,
    daySheetOpen,
    daySheetTaskIds,
    openDaySheet,
    enterDaySheet,
    closeDaySheet,
    mobilePreviewSolo,
  };
});
