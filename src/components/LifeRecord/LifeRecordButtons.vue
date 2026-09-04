<!-- LifeRecordButtons.vue -->
<!-- day planner 按钮区的生活记录 +1 入口：Regular=当天无记录，Filled=当天已有 -->
<!-- 多根节点：直接作为 button-group 子项，与钱包/重复等同 gap，整排等距 -->
<template>
  <n-button
    v-for="def in visibleDefs"
    :key="def.kind"
    size="small"
    text
    class="life-record-button"
    :title="`记一次${def.title}`"
    @click.stop="onRecord(def.kind)"
  >
    <template #icon>
        <n-icon :size="18">
          <component :is="hasRecordToday(def.kind) ? ICONS[def.kind].filled : ICONS[def.kind].regular" />
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
const { todoList, activityById } = storeToRefs(dataStore);
const dateService = dataStore.dateService;

const visibleDefs = computed(() => {
  if (!props.kinds?.length) return LIFE_RECORD_DEFS;
  const allow = new Set(props.kinds);
  return LIFE_RECORD_DEFS.filter((d) => allow.has(d.kind));
});

// 删空会级联软删行，所以「当日存在该 kind 行」= 当天已有记录
// Pinia reactive 会解包嵌套 ComputedRef，用 toValue 兼容 number / Ref（同 HomeView dayHolidayLabel）
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

const emit = defineEmits<{ recorded: [kind: LifeRecordKind] }>();

function onRecord(kind: LifeRecordKind) {
  dataStore.recordLifeRecord(kind);
  emit("recorded", kind);
}
</script>

<style scoped>
/* 与 button-group 前两个 icon（标签/钱包）同为 18×18 */
.life-record-button {
  width: 18px;
  min-width: 18px;
  height: 18px;
  padding: 0 !important;
}

.life-record-button :deep(.n-button__icon) {
  margin: 0 !important;
  width: 18px;
  height: 18px;
}
</style>
