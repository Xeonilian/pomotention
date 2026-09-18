<!--
  窄槽喝水：从 LifeRecordForm 拆出，观感保持原样
-->
<template>
  <div v-if="task" class="life-record-form">
    <div class="lr-header lr-header--drink">
      <div class="lr-header__lead">
        <n-button text size="small" class="lr-icon-btn lr-append-icon" title="记一杯" @click="append">
          <template #icon>
            <n-icon :size="20" color="var(--color-blue)">
              <component :is="kindIcon" />
            </n-icon>
          </template>
        </n-button>
        <span v-if="records.length > 0" class="lr-count">×{{ records.length }}</span>
      </div>

      <div class="lr-header__drink-meta">
        <div class="lr-drink-cup" title="杯量（之后每次 +1）">
          <n-icon class="lr-drink-cup__icon" :size="16">
            <DrinkToGo24Regular />
          </n-icon>
          <span class="lr-drink-cup__eq">=</span>
          <n-input-number
            class="lr-drink-cup__ml"
            size="tiny"
            :value="settingStore.settings.drinkCupMl"
            :min="50"
            :max="1000"
            :step="50"
            :precision="0"
            :show-button="false"
            @update:value="changeCupMl"
          />
          <span class="lr-drink-unit">ml</span>
        </div>
        <div class="lr-drink-totals" title="今日目标（仅本天）">
          <span class="lr-drink-sum">{{ drunkMl }}</span>
          <span class="lr-drink-sep">/</span>
          <n-input-number
            class="lr-drink-goal"
            size="tiny"
            :value="dayGoalMl"
            :min="100"
            :max="20000"
            :step="100"
            :precision="0"
            :show-button="false"
            @update:value="changeDayGoal"
          />
          <span class="lr-drink-unit">ml</span>
        </div>
      </div>

      <div class="lr-actions">
        <n-button v-if="records.length === 0" text size="small" class="lr-icon-btn" title="删除空记录" @click="discard">
          <template #icon>
            <n-icon :size="18"><Delete20Regular /></n-icon>
          </template>
        </n-button>
        <n-button text size="small" class="lr-icon-btn" title="关闭" @click="deselect">
          <template #icon>
            <n-icon :size="18"><Dismiss20Regular /></n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <div class="lr-drink-bar" :title="`${drunkMl} / ${dayGoalMl || '—'} ml`">
      <div class="lr-drink-bar__fill" :class="{ 'lr-drink-bar__fill--met': goalMet }" :style="{ width: progressPct + '%' }" />
    </div>

    <div v-if="records.length > 0" class="lr-drink-list">
      <DrinkSipTag
        v-for="record in records"
        :key="record.id"
        :recorded-at="record.recordedAt"
        :amount-ml="record.amountMl"
        @update:recorded-at="(ts) => changeRecordedAt(record, ts)"
        @remove="remove(record)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon, NInputNumber } from "naive-ui";
import { Delete20Regular, Dismiss20Regular, DrinkToGo24Regular, Drop20Filled, Drop20Regular } from "@vicons/fluent";
import { isDrinkGoalMet, sumLifeRecordAmountMl } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useLifeRecordEditor } from "@/composables/lifeRecord/useLifeRecordEditor";
import DrinkSipTag from "@/components/LifeRecord/DrinkSipTag.vue";

const props = defineProps<{ taskId: number }>();

const dataStore = useDataStore();
const settingStore = useSettingStore();
const { task, records, append, changeRecordedAt, remove, discard, deselect } = useLifeRecordEditor(() => props.taskId, "drink");

const kindIcon = computed(() => (records.value.length > 0 ? Drop20Filled : Drop20Regular));
const drunkMl = computed(() => sumLifeRecordAmountMl(records.value));
const dayGoalMl = computed(() => task.value?.drinkGoalMl ?? settingStore.settings.drinkDailyGoalMl);
const goalMet = computed(() => isDrinkGoalMet(drunkMl.value, dayGoalMl.value));
const progressPct = computed(() => {
  const goal = Number(dayGoalMl.value);
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(100, Math.round((drunkMl.value / goal) * 100));
});

function changeCupMl(v: number | null) {
  if (v == null || !Number.isFinite(v) || v <= 0) return;
  settingStore.settings.drinkCupMl = Math.min(1000, Math.max(50, Math.round(v)));
}

function changeDayGoal(v: number | null) {
  if (v == null || !Number.isFinite(v) || v <= 0) return;
  dataStore.updateTaskById(props.taskId, { drinkGoalMl: Math.round(v) });
}
</script>

<style scoped>
.life-record-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
  min-width: 0;
  min-height: 0;
  height: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
@media (max-width: 768px) {
  .life-record-form {
    padding: 4px 4px;
    gap: 4px;
  }
}
.lr-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  flex-shrink: 0;
}
.lr-header--drink {
  gap: 6px 6px;
  flex-wrap: nowrap;
}
.lr-header__lead {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.lr-header__drink-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
}
.lr-count {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
  margin-left: -4px;
}
.lr-icon-btn {
  width: 28px;
  min-width: 28px;
  height: 28px;
  padding: 0 !important;
  flex-shrink: 0;
}
.lr-icon-btn :deep(.n-button__icon) {
  margin: 0;
}
.lr-header--drink .lr-append-icon {
  width: 20px;
  min-width: 20px;
}
.lr-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}
.lr-drink-cup,
.lr-drink-totals {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 1;
  min-width: 0;
}
.lr-drink-cup__icon {
  color: var(--color-blue);
  flex-shrink: 0;
}
.lr-drink-cup__eq,
.lr-drink-sep,
.lr-drink-unit {
  color: var(--color-text-secondary);
  font-size: 13px;
  flex-shrink: 0;
}
.lr-drink-cup__ml {
  width: 48px;
}
.lr-drink-goal {
  width: 56px;
}
.lr-drink-sum {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-blue);
  font-variant-numeric: tabular-nums;
  min-width: 3.2em;
  text-align: right;
  flex-shrink: 0;
}
.lr-drink-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--color-primary-light-transparent);
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  margin-bottom: 4px;
}
.lr-drink-bar__fill {
  height: 100%;
  border-radius: 3px;
  background: var(--color-blue);
  transition: width 0.15s ease;
}
.lr-drink-bar__fill--met {
  background: var(--color-green);
}
.lr-drink-list {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: center;
  gap: 4px;
  justify-content: flex-start;
  flex: 1 1 0%;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
