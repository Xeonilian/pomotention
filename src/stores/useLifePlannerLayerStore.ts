// Planner 生活可视化（会话态，不落盘）：非日 = 图层开关；日 = 集中 sheet
import { defineStore } from "pinia";
import { computed, ref, toValue, watch } from "vue";
import { useDevice } from "@/composables/platform/useDevice";
import { LIFE_RECORD_DEFS, type LifeRecordKind } from "@/core/lifeRecord";
import { findLifeRecordTodoForDay } from "@/services/lifeRecord/lifeRecordService";
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

  /** 当天 4 类任一已有生活记录（空桶不算）→ 日按钮 ChannelAdd；换日也按这个决定出图/表还是提示 */
  function dayHasRecords(dayStart: number): boolean {
    for (const def of LIFE_RECORD_DEFS) {
      const todo = findLifeRecordTodoForDay(dataStore.todoList, dataStore.activityById, def.kind, dayStart);
      if (!todo) continue;
      const task = dataStore.taskByActivityId.get(todo.activityId);
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
   * openDaySheet 建/取当天桶并出图/表；enterDaySheet / 换日无记录只留提示（空桶不算）。
   * close 只关界面，空桶保留。
   */
  const daySheetOpen = ref(false);
  const daySheetTaskIds = ref<Record<LifeRecordKind, number | null>>(emptySheetTaskIds());

  function bindSheetTaskIds(create: boolean) {
    // Pinia 对嵌套 computed 会拆包成 number，不能再取 .value（否则 undefined → id NaN → JSON null）
    const dayStart = plannerDayStart();
    if (dayStart == null) return;
    if (create || dayHasRecords(dayStart)) {
      daySheetTaskIds.value = dataStore.ensureAllLifeRecordTasksForDay(dayStart);
    } else {
      daySheetTaskIds.value = emptySheetTaskIds();
    }
  }

  function openDaySheet() {
    // 数据未进内存时建桶会把空列表落盘，盖掉还没 load 的本地记录
    if (!dataStore.isDataLoaded) return;
    bindSheetTaskIds(true);
    daySheetOpen.value = true;
  }

  /** 进入录入区：无记录只留提示；有记录才绑 4 类 */
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
