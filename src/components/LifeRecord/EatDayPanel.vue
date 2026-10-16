<!--
  日视图吃饭：图=加一条 + 最后一条（时间/正餐甜点水果补剂/刀叉记吃什么）；表保持完整编辑。
-->
<template>
  <LifeRecordDayFrame v-if="task" :view="view" compact>
    <template #display>
      <div class="lr-chart">
        <button type="button" class="lr-chart__el lr-chart__icon" title="吃饭" @click="onAppleClick">
          <n-icon class="lr-chart__icon-glyph" color="var(--color-red)"><FoodApple20Filled /></n-icon>
        </button>
        <span class="lr-chart__el lr-chart__times" aria-hidden="true">×</span>
        <span class="lr-chart__el lr-chart__count">{{ records.length }}</span>
        <template v-if="lastRecord">
          <n-time-picker
            class="lr-chart__el lr-chart__time eat-day-chart__start"
            :value="pickerTs(lastRecord.recordedAt)"
            format="HH:mm"
            size="small"
            :show-icon="false"
            :bordered="false"
            :clearable="false"
            to="body"
            :z-index="10000"
            title="时间"
            @update:value="(ts: number | null) => changeRecordedAt(lastRecord, ts)"
          />
          <button
            type="button"
            class="lr-chart__el eat-day-chart__course"
            :title="eatCourseTitle(lastRecord.eatCourse)"
            @click="toggleEatCourse(lastRecord)"
          >
            <n-icon class="eat-day-chart__ctrl-icon">
              <component :is="eatCourseIcon(lastRecord.eatCourse)" />
            </n-icon>
          </button>
          <div class="lr-chart__el eat-day-chart__feel eat-day-chart__hunger">
            <LifeRecordScorePop
              :model-value="lastRecord.hunger"
              title="饥饿感"
              :icon="Storage24Regular"
              @update:model-value="(v) => changeHunger(lastRecord, v)"
            />
          </div>
          <div class="lr-chart__el eat-day-chart__feel eat-day-chart__satiety">
            <LifeRecordScorePop
              :model-value="lastRecord.satiety"
              title="饱足"
              :icon="Savings20Regular"
              @update:model-value="(v) => changeSatiety(lastRecord, v)"
            />
          </div>
          <LifeRecordChartNoteBar
            tone="eat"
            :model-value="lastRecord.description ?? ''"
            placeholder="food..."
            @update:model-value="onNoteBarInput"
          />
        </template>
      </div>
    </template>
    <template #table>
      <table class="lr-day-table">
        <colgroup>
          <col class="lr-day-table__col-action" />
          <col class="lr-day-table__col-time" />
          <col class="lr-day-table__col-time" />
          <col class="lr-day-table__col-score" />
          <col class="lr-day-table__col-score" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th class="lr-day-table__col-action">
              <button type="button" class="lr-day-table__cell-btn" :title="`记一条${def.title}`" @click="append">
                <n-icon :size="18"><Add20Regular /></n-icon>
              </button>
            </th>
            <th class="lr-day-table__col-time" title="时间">
              <n-icon :size="18" class="lr-day-table__th-icon"><Clock20Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-time" title="正餐 / 甜点 / 水果 / 补剂">
              <n-icon :size="18" class="lr-day-table__th-icon"><Food20Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-score" title="饥饿感">
              <n-icon :size="18" class="lr-day-table__th-icon"><Storage24Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-score" title="饱足">
              <n-icon :size="18" class="lr-day-table__th-icon"><Savings20Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-last" title="吃了什么">
              <n-icon :size="18" color="var(--color-red)" class="lr-day-table__th-icon"><FoodApple20Filled /></n-icon>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in records" :key="record.id">
            <td class="lr-day-table__col-action">
              <button type="button" class="lr-day-table__cell-btn lr-day-table__cell-btn--danger" title="删除这条" @click="remove(record)">
                <n-icon :size="14"><Delete20Regular /></n-icon>
              </button>
            </td>
            <td class="lr-day-table__col-time">
              <n-time-picker
                class="lr-day-table__time"
                :value="pickerTs(record.recordedAt)"
                format="HH:mm"
                size="small"
                :show-icon="false"
                :bordered="false"
                @update:value="(ts: number | null) => changeRecordedAt(record, ts)"
              />
            </td>
            <td class="lr-day-table__col-time">
              <button
                type="button"
                class="lr-day-table__cell-btn"
                :title="eatCourseTitle(record.eatCourse)"
                @click="toggleEatCourse(record)"
              >
                <n-icon :size="18">
                  <component :is="eatCourseIcon(record.eatCourse)" />
                </n-icon>
              </button>
            </td>
            <td class="lr-day-table__col-score">
              <LifeRecordScorePop
                :model-value="record.hunger"
                title="饥饿感"
                placement="bottom"
                @update:model-value="(v) => changeHunger(record, v)"
              />
            </td>
            <td class="lr-day-table__col-score">
              <LifeRecordScorePop
                :model-value="record.satiety"
                title="饱足"
                placement="bottom"
                @update:model-value="(v) => changeSatiety(record, v)"
              />
            </td>
            <td class="lr-day-table__col-last">
              <n-input
                class="lr-day-table__note"
                size="tiny"
                :bordered="false"
                :value="record.description ?? ''"
                placeholder="吃什么"
                @update:value="(v: string) => changeDescription(record, v)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </LifeRecordDayFrame>
</template>
<script setup lang="ts">
import { computed, type Component } from "vue";
import { NIcon, NInput, NTimePicker } from "naive-ui";
import {
  Add20Regular,
  Clock20Regular,
  Delete20Regular,
  Food20Regular,
  FoodApple20Filled,
  FoodApple20Regular,
  FoodCake20Regular,
  FoodPizza20Regular,
  Savings20Regular,
  Storage24Regular,
} from "@vicons/fluent";
import type { EatCourse } from "@/core/types/Task";
import { eatCourseLabel } from "@/core/lifeRecord";
import BriefcaseMedical20Regular from "@/components/LifeRecord/BriefcaseMedical20Regular.vue";
import LifeRecordChartNoteBar from "@/components/LifeRecord/LifeRecordChartNoteBar.vue";
import LifeRecordScorePop from "@/components/LifeRecord/LifeRecordScorePop.vue";
import { useLifeRecordEditor } from "@/composables/lifeRecord/useLifeRecordEditor";
import LifeRecordDayFrame from "@/components/LifeRecord/LifeRecordDayFrame.vue";
const props = withDefaults(defineProps<{ taskId: number; embedded?: boolean; view?: "chart" | "table" }>(), {
  view: "chart",
});
const { task, records, def, append, pickerTs, toggleEatCourse, changeRecordedAt, changeDescription, changeHunger, changeSatiety, remove } =
  useLifeRecordEditor(() => props.taskId, "eat", { embedded: () => props.embedded });
const lastRecord = computed(() => records.value[records.value.length - 1] ?? null);
function eatCourseTitle(course?: EatCourse): string {
  return eatCourseLabel(course);
}
function eatCourseIcon(course?: EatCourse): Component {
  if (course === "dessert") return FoodCake20Regular;
  if (course === "apple") return FoodApple20Regular;
  if (course === "supplement") return BriefcaseMedical20Regular;
  return FoodPizza20Regular;
}
function onAppleClick() {
  append();
}
function onNoteBarInput(v: string) {
  const last = lastRecord.value;
  if (last) changeDescription(last, v);
}
</script>
<style src="./lifeRecordChart.css"></style>
<style src="./lifeRecordTable.css"></style>
<style scoped>
/* 下排锚点跟睡觉图 */
.eat-day-chart__start {
  left: calc(50% - var(--a) - 30px);
  top: calc(50% + var(--f) - 20px);
}
.eat-day-chart__course {
  left: 50%;
  top: calc(50% + var(--f) - 20px);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
  cursor: pointer;
}
.eat-day-chart__feel {
  width: 28px;
  height: 28px;
  top: calc(50% + var(--f) - 20px);
}
.eat-day-chart__feel :deep(.n-popover-trigger) {
  display: block;
  width: 100%;
  height: 100%;
}
.eat-day-chart__hunger {
  left: calc(50% + (var(--a) + 50px) / 2);
}
.eat-day-chart__satiety {
  left: calc(50% + var(--a) + 50px);
}
.eat-day-chart__course:hover {
  opacity: 0.85;
}
.eat-day-chart__ctrl-icon {
  display: block;
  width: 28px;
  height: 28px;
  font-size: 28px;
  line-height: 0;
  color: inherit;
}
.eat-day-chart__ctrl-icon :deep(svg) {
  width: 1em;
  height: 1em;
  display: block;
}
</style>
