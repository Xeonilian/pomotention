<!-- LifeRecordButtons.vue -->
<!-- 日：空=灰 filled / 有数据=黑 regular；非日：关=regular / 开层=对应色 filled -->
<template>
  <n-button
    v-for="def in visibleDefs"
    :key="def.kind"
    size="small"
    text
    class="life-record-button"
    :class="buttonClass(def.kind)"
    :title="buttonTitle(def)"
    @click.stop="onOpen(def.kind)"
  >
    <template #icon>
      <n-icon :size="18">
        <component :is="iconFor(def.kind)" />
      </n-icon>
    </template>
  </n-button>
</template>

<script setup lang="ts">
import { computed, toValue, type Component } from "vue";
import { storeToRefs } from "pinia";
import { NButton, NIcon } from "naive-ui";
import {
  Door20Filled,
  Door20Regular,
  Drop20Filled,
  Drop20Regular,
  FoodApple20Filled,
  FoodApple20Regular,
  WeatherMoon20Filled,
  WeatherMoon20Regular,
} from "@vicons/fluent";
import { LIFE_RECORD_DEFS, type LifeRecordKind } from "@/core/lifeRecord";
import { findLifeRecordTodoForDay } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useLifePlannerLayerStore } from "@/stores/useLifePlannerLayerStore";

const props = withDefaults(
  defineProps<{
    /** 只渲染这些 kind；缺省为全部四种 */
    kinds?: LifeRecordKind[];
  }>(),
  { kinds: undefined },
);

const ICONS: Record<LifeRecordKind, { regular: Component; filled: Component }> = {
  drink: { regular: Drop20Regular, filled: Drop20Filled },
  eat: { regular: FoodApple20Regular, filled: FoodApple20Filled },
  toilet: { regular: Door20Regular, filled: Door20Filled },
  sleep: { regular: WeatherMoon20Regular, filled: WeatherMoon20Filled },
};

const dataStore = useDataStore();
const settingStore = useSettingStore();
const layerStore = useLifePlannerLayerStore();
const { todoList, activityById } = storeToRefs(dataStore);
const dateService = dataStore.dateService;

const isDayView = computed(() => settingStore.settings.viewSet === "day");
const viewSet = computed(() => settingStore.settings.viewSet);

const visibleDefs = computed(() => {
  if (!props.kinds?.length) return LIFE_RECORD_DEFS;
  const allow = new Set(props.kinds);
  return LIFE_RECORD_DEFS.filter((d) => allow.has(d.kind));
});

const kindsWithRecordToday = computed(() => {
  const raw = toValue(dateService.appDateTimestamp as Parameters<typeof toValue>[0]);
  const dayStart = typeof raw === "number" && !Number.isNaN(raw) ? raw : null;
  const set = new Set<LifeRecordKind>();
  if (dayStart == null) return set;
  for (const def of LIFE_RECORD_DEFS) {
    if (findLifeRecordTodoForDay(todoList.value, activityById.value, def.kind, dayStart)) {
      set.add(def.kind);
    }
  }
  return set;
});

function hasRecordToday(kind: LifeRecordKind): boolean {
  return kindsWithRecordToday.value.has(kind);
}

function iconFor(kind: LifeRecordKind): Component {
  const pair = ICONS[kind];
  if (isDayView.value) {
    // 日：空态 filled（灰），有数据 regular（默认黑）
    return hasRecordToday(kind) ? pair.regular : pair.filled;
  }
  // 非日：仅图层开 → filled；不看当日有无数据
  return layerStore.has(kind) ? pair.filled : pair.regular;
}

function buttonClass(kind: LifeRecordKind): Record<string, boolean> {
  if (isDayView.value) {
    return { "life-record-button--empty": !hasRecordToday(kind) };
  }
  return {
    "life-record-button--layer": layerStore.has(kind),
    [`life-record-button--${kind}`]: layerStore.has(kind),
  };
}

function buttonTitle(def: (typeof LIFE_RECORD_DEFS)[number]): string {
  if (isDayView.value) return `打开${def.title}`;
  if (def.kind === "drink") return layerStore.has("drink") ? "退出喝水图层" : "喝水图层";
  return `${def.title}图层（即将推出）`;
}

const emit = defineEmits<{ recorded: [kind: LifeRecordKind] }>();

function onOpen(kind: LifeRecordKind) {
  if (isDayView.value) {
    dataStore.openLifeRecord(kind);
    emit("recorded", kind);
    return;
  }
  // 首版仅喝水图层有 UI；其它 kind 仍可进 store 占位，但暂不 toggle 以免空层
  if (kind !== "drink") return;
  const mode = viewSet.value === "week" ? "stack" : "exclusive";
  layerStore.toggle(kind, mode);
}
</script>

<style scoped>
.life-record-button {
  width: 18px;
  min-width: 18px;
  height: 18px;
  padding: 0 !important;
}

.life-record-button :deep(.n-button__icon) {
  margin: 0;
}

/* 日视图：尚无数据（比 secondary 再浅一档） */
.life-record-button--empty {
  color: var(--color-background-dark-dark);
}

/* 非日：图层开 → kind 色 */
.life-record-button--layer.life-record-button--drink {
  color: var(--color-blue);
}
.life-record-button--layer.life-record-button--eat {
  color: var(--color-red);
}
.life-record-button--layer.life-record-button--toilet {
  color: var(--color-text-secondary);
}
.life-record-button--layer.life-record-button--sleep {
  color: var(--color-yellow-dark);
}
</style>
