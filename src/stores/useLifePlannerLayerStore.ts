// Planner 生活图层（会话态，不落盘）
// - 周：可叠多层（Set）
// - 月/年：互斥单层（toggle 时只留一个）
// - 任一图层开着 → 周视图藏普通时间块；全关恢复
import { defineStore } from "pinia";
import { computed, ref, toValue } from "vue";
import { useDevice } from "@/composables/platform/useDevice";
import { LIFE_RECORD_DEFS, type LifeRecordKind } from "@/core/lifeRecord";
import { findLifeRecordTodoForDay } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";

export type PlannerLayerMode = "stack" | "exclusive";

export const useLifePlannerLayerStore = defineStore("lifePlannerLayer", () => {
  const dataStore = useDataStore();
  const settingStore = useSettingStore();
  const { isMobile } = useDevice();
  const layers = ref<Set<LifeRecordKind>>(new Set());
  /** 月/年互斥时记住最后一层，周叠多层切到月/年时折叠用 */
  const lastKind = ref<LifeRecordKind | null>(null);

  const hasAny = computed(() => layers.value.size > 0);
  const hasDrink = computed(() => layers.value.has("drink"));

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

  /**
   * 非 day 统一生活视图：复用已有喝水皮肤（藏时间块 / 水位）。
   * 吃睡活动叠层观感后续再调。
   */
  const lifeView = ref(false);
  function toggleLifeView() {
    const next = !lifeView.value;
    lifeView.value = next;
    if (next) {
      layers.value = new Set(["drink"]);
      lastKind.value = "drink";
      return;
    }
    layers.value = new Set();
    lastKind.value = null;
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

  function openDaySheet() {
    // Pinia 对嵌套 computed 会拆包成 number，不能再取 .value（否则 undefined → id NaN → JSON null）
    const raw = dataStore.dateService.appDateTimestamp as Parameters<typeof toValue>[0];
    const dayStart = toValue(raw);
    daySheetTaskIds.value = dataStore.ensureAllLifeRecordTasksForDay(dayStart);
    daySheetOpen.value = true;
  }

  function closeDaySheet() {
    daySheetTaskIds.value = { drink: null, eat: null, toilet: null, sleep: null };
    daySheetOpen.value = false;
  }

  /** 手机非日生活预览：临时铺满规划区（不改设置）；顶栏 timetable/task 外观跟实际可见性走 */
  const mobilePreviewSolo = computed(
    () => isMobile.value && settingStore.settings.viewSet !== "day" && lifeView.value && !daySheetOpen.value,
  );

  function has(kind: LifeRecordKind): boolean {
    return layers.value.has(kind);
  }

  function toggle(kind: LifeRecordKind, mode: PlannerLayerMode) {
    if (mode === "exclusive") {
      if (layers.value.has(kind) && layers.value.size === 1) {
        layers.value = new Set();
        lastKind.value = null;
        return;
      }
      layers.value = new Set([kind]);
      lastKind.value = kind;
      return;
    }
    const next = new Set(layers.value);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    layers.value = next;
    lastKind.value = next.has(kind) ? kind : (next.values().next().value ?? null);
  }

  function clear() {
    layers.value = new Set();
    lastKind.value = null;
    lifeView.value = false;
  }

  /** 切视图：日清空；进月/年若多层则折成单层 */
  function onViewSetChange(viewSet: string) {
    if (viewSet === "day") {
      clear();
      return;
    }
    if ((viewSet === "month" || viewSet === "year") && layers.value.size > 1) {
      const keep =
        (lastKind.value && layers.value.has(lastKind.value) ? lastKind.value : null) ??
        (layers.value.has("drink") ? "drink" : [...layers.value][0]!);
      layers.value = new Set([keep]);
      lastKind.value = keep;
    }
  }

  return {
    layers,
    lastKind,
    hasAny,
    hasDrink,
    currentDayHasLifeRecord,
    has,
    toggle,
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

/** @deprecated 兼容旧名：请改用 useLifePlannerLayerStore */
export const useDrinkPlannerSkinStore = useLifePlannerLayerStore;
