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

  /** 当天 4 类任一已有生活记录（空桶不算）→ 日按钮 ChannelAdd */
  const currentDayHasLifeRecord = computed(() => {
    const raw = dataStore.dateService.appDateTimestamp as Parameters<typeof toValue>[0];
    const dayStart = toValue(raw);
    if (!Number.isFinite(dayStart)) return false;
    for (const def of LIFE_RECORD_DEFS) {
      const todo = findLifeRecordTodoForDay(dataStore.todoList, dataStore.activityById, def.kind, dayStart as number);
      if (!todo) continue;
      const task = dataStore.taskByActivityId.get(todo.activityId);
      if (task && !task.deleted && (task.lifeRecords?.length ?? 0) > 0) return true;
    }
    return false;
  });

  const lifeView = ref(false);
  function toggleLifeView() {
    lifeView.value = !lifeView.value;
  }

  /**
   * day 集中生活 sheet：4 类同框 2×2。
   * openDaySheet 一次性建/取 4 类当天桶 taskId；close 只关界面，空桶保留。
   */
  const daySheetOpen = ref(false);
  const daySheetTaskIds = ref<Record<LifeRecordKind, number | null>>({
    drink: null,
    eat: null,
    toilet: null,
    sleep: null,
  });

  function syncSheetTaskIds() {
    // Pinia 对嵌套 computed 会拆包成 number，不能再取 .value（否则 undefined → id NaN → JSON null）
    const raw = dataStore.dateService.appDateTimestamp as Parameters<typeof toValue>[0];
    const dayStart = toValue(raw);
    if (!Number.isFinite(dayStart)) return;
    daySheetTaskIds.value = dataStore.ensureAllLifeRecordTasksForDay(dayStart);
  }

  function openDaySheet() {
    syncSheetTaskIds();
    daySheetOpen.value = true;
  }

  function closeDaySheet() {
    daySheetTaskIds.value = { drink: null, eat: null, toilet: null, sleep: null };
    daySheetOpen.value = false;
  }

  watch(
    () => toValue(dataStore.dateService.appDateTimestamp as Parameters<typeof toValue>[0]),
    () => {
      if (daySheetOpen.value) syncSheetTaskIds();
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
    closeDaySheet,
    mobilePreviewSolo,
  };
});
