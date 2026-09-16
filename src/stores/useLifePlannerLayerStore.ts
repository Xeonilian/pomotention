// Planner 生活图层（会话态，不落盘）
// - 周：可叠多层（Set）
// - 月/年：互斥单层（toggle 时只留一个）
// - 任一图层开着 → 周视图藏普通时间块；全关恢复
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { LifeRecordKind } from "@/core/lifeRecord";

export type PlannerLayerMode = "stack" | "exclusive";

export const useLifePlannerLayerStore = defineStore("lifePlannerLayer", () => {
  const layers = ref<Set<LifeRecordKind>>(new Set());
  /** 月/年互斥时记住最后一层，周叠多层切到月/年时折叠用 */
  const lastKind = ref<LifeRecordKind | null>(null);

  const hasAny = computed(() => layers.value.size > 0);
  const hasDrink = computed(() => layers.value.has("drink"));

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

  return { layers, lastKind, hasAny, hasDrink, has, toggle, clear, onViewSetChange };
});

/** @deprecated 兼容旧名：请改用 useLifePlannerLayerStore */
export const useDrinkPlannerSkinStore = useLifePlannerLayerStore;
