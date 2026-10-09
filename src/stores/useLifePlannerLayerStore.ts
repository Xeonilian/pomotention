// Planner 生活图层（会话态，不落盘）
// - 周：可叠多层（Set）
// - 月/年：互斥单层（toggle 时只留一个）
// - 任一图层开着 → 周视图藏普通时间块；全关恢复
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { LIFE_RECORD_DEFS, type LifeRecordKind } from "@/core/lifeRecord";
import { useDataStore } from "@/stores/useDataStore";

export type PlannerLayerMode = "stack" | "exclusive";

export const useLifePlannerLayerStore = defineStore("lifePlannerLayer", () => {
  const layers = ref<Set<LifeRecordKind>>(new Set());
  /** 月/年互斥时记住最后一层，周叠多层切到月/年时折叠用 */
  const lastKind = ref<LifeRecordKind | null>(null);

  const hasAny = computed(() => layers.value.size > 0);
  const hasDrink = computed(() => layers.value.has("drink"));

  /**
   * 非 day 统一生活视图开关：一次性集合全部数据的接口。
   * 可视化后续接入；当前仅作 hook，按下不渲染。
   */
  const lifeView = ref(false);
  function toggleLifeView() {
    lifeView.value = !lifeView.value;
  }

  /**
   * day 集中生活 sheet：4 类同框 2×2。
   * openDaySheet 一次性建/取 4 类当天桶 taskId；closeDaySheet 丢弃空桶并复位。
   */
  const daySheetOpen = ref(false);
  const daySheetTaskIds = ref<Record<LifeRecordKind, number | null>>({
    drink: null,
    eat: null,
    toilet: null,
    sleep: null,
  });

  function openDaySheet() {
    const dataStore = useDataStore();
    const dayStart = dataStore.dateService.appDateTimestamp.value;
    const ids = {} as Record<LifeRecordKind, number>;
    for (const def of LIFE_RECORD_DEFS) {
      ids[def.kind] = dataStore.ensureLifeRecordTaskForDay(def.kind, dayStart);
    }
    daySheetTaskIds.value = ids;
    daySheetOpen.value = true;
  }

  function closeDaySheet() {
    const dataStore = useDataStore();
    for (const def of LIFE_RECORD_DEFS) {
      const id = daySheetTaskIds.value[def.kind];
      if (id == null) continue;
      const task = dataStore.taskList.find((t) => t.id === id);
      // 退出时清空桶：无记录的整行软删，避免垃圾
      if (task && !task.deleted && (!task.lifeRecords || task.lifeRecords.length === 0)) {
        dataStore.discardLifeRecordTask(id);
      }
    }
    daySheetTaskIds.value = { drink: null, eat: null, toilet: null, sleep: null };
    daySheetOpen.value = false;
  }

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
  };
});

/** @deprecated 兼容旧名：请改用 useLifePlannerLayerStore */
export const useDrinkPlannerSkinStore = useLifePlannerLayerStore;
