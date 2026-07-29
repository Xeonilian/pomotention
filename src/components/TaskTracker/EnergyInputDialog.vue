<!-- EnergyInputDialog.vue -->
<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="记录精力值"
    class="mobile-dialog-top"
    :on-after-leave="handleCancel"
    @keyup.enter="handleModalEnterKeyup"
    @after-enter="focusSlider"
  >
    <n-space vertical>
      <n-slider v-model:value="energyValue" :min="1" :max="10" :step="1" ref="sliderRef" />
      <n-text class="score-meaning">{{ energyScoreMeaning }}</n-text>
      <div class="energy-value-datetime-row">
        <n-text class="energy-value-datetime-row__label">
          {{ energyScoreEmoji }}
        </n-text>
        <n-date-picker v-model:value="recordedAt" type="datetime" size="small" class="energy-value-datetime-row__picker" />
        <n-button size="small" class="energy-value-datetime-row__help" @click="showHelp = true">
          <template #icon>
            <n-icon><BatterySaver20Regular /></n-icon>
          </template>
        </n-button>
      </div>
      <n-input v-model:value="description" placeholder="请输入内容" maxlength="40" show-count />
    </n-space>

    <template #action>
      <n-button type="primary" @click="handleConfirm">确认</n-button>
      <n-button @click="handleCancel">取消</n-button>
    </template>
  </n-modal>

  <n-modal v-model:show="showHelp" preset="dialog" title="精力值说明">
    <n-data-table :columns="columns" :data="data" :bordered="false" :single-line="true" class="table" />
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from "vue";
import { BatterySaver20Regular } from "@vicons/fluent";
import { NModal, NSlider, NSpace, NText, NButton, NIcon, NDatePicker } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import { flushPickerValueToVue, pickRecordedAtMs, isEventFromDateTimePickerDeep } from "@/utils/recordedAtPick";
import { getEnergyScoreEmoji } from "@/core/scoreEmojis";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "confirm", value: { value: number; description?: string; recordedAt: number }): void;
}>();

const energyValue = ref(5);
/** 打开弹窗时重置为当前时刻，供用户改为补记时间 */
const recordedAt = ref<number | null>(Date.now());

watch(
  () => props.show,
  (open) => {
    if (open) recordedAt.value = Date.now();
  },
);
const showHelp = ref(false);
const description = ref("");
type RowData = {
  score: string;
  physical: string;
  mental: string;
};

const sliderRef = ref<any>(null);

async function focusSlider() {
  await nextTick();
  if (sliderRef.value?.focus) {
    sliderRef.value.focus();
  } else {
    const el: HTMLElement | null = sliderRef.value?.$el ?? sliderRef.value;
    el?.querySelector<HTMLElement>('[tabindex], input, button, [role="slider"]')?.focus();
  }
}

const createColumns = (): DataTableColumns<RowData> => {
  return [
    {
      title: "",
      key: "score",
      align: "center",
      width: 40,
    },
    {
      title: "身体状态",
      key: "physical",
    },
    {
      title: "心理/思维状态",
      key: "mental",
    },
  ];
};

const columns = createColumns();
const data: RowData[] = [
  {
    score: "1分",
    physical: "极度衰竭，难以自主行动",
    mental: "思维空白，简单信息亦难处理",
  },
  {
    score: "2分",
    physical: "身体沉重，起身亦感费力",
    mental: "反应迟缓，思绪如隔层雾",
  },
  {
    score: "3分",
    physical: "乏力明显，稍动即感疲惫",
    mental: "注意易散，仅能勉强维持",
  },
  {
    score: "4分",
    physical: "可勉强做事，节奏偏慢",
    mental: "思路黏滞，需反复核对确认",
  },
  {
    score: "5分",
    physical: "可维持日常，后段易现疲态",
    mental: "能跟进任务，专注不稳易偏",
  },
  {
    score: "6分",
    physical: "身体基本正常，偶有沉滞",
    mental: "思路清楚，专注尚可但难持久",
  },
  {
    score: "7分",
    physical: "精力充沛，行动顺畅协调",
    mental: "易于进入状态，专注较为稳定",
  },
  {
    score: "8分",
    physical: "精力旺盛，耐力充足",
    mental: "反应敏捷，任务切换利落",
  },
  {
    score: "9分",
    physical: "充沛敏捷，几乎不觉疲惫",
    mental: "清晰锐利，抗干扰能力强",
  },
  {
    score: "10分",
    physical: "高峰状态，能量充盈饱满",
    mental: "极度清醒敏锐，进入心流",
  },
];
// 修复 v-model 问题
const showModal = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const energyScoreEmoji = computed(() => getEnergyScoreEmoji(energyValue.value));
const energyScoreMeaning = computed(() => {
  const row = data[energyValue.value - 1];
  return `${row.physical}；${row.mental}`;
});

/** 弹窗级回车提交：不在日期时间输入里时才提交，避免与选择器内回车冲突 */
function handleModalEnterKeyup(e: KeyboardEvent) {
  if (isEventFromDateTimePickerDeep(e.target)) return;
  void handleConfirm();
}

const handleConfirm = async () => {
  await flushPickerValueToVue();
  emit("confirm", {
    value: energyValue.value,
    description: description.value.trim(),
    recordedAt: pickRecordedAtMs(recordedAt.value),
  });
  description.value = "";
  emit("update:show", false);
};

const handleCancel = () => {
  description.value = "";
  emit("update:show", false);
};
</script>
<style>
.table .n-data-table-td,
.table .n-data-table-th {
  padding: 4px 0px !important;
}

.table .n-data-table-th {
  font-weight: bold !important;
  white-space: pre-line;
}
</style>
<style scoped>
/* 精力文案、时间选择、说明按钮强制单行排列 */
.energy-value-datetime-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.score-meaning {
  display: block;
  font-size: 14px;
  line-height: 1.4;
  color: var(--color-text-secondary);
}
.energy-value-datetime-row__label {
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 22px;
}
.energy-value-datetime-row__picker {
  flex: 1;
  min-width: 0;
}
.energy-value-datetime-row__picker :deep(.n-input-wrapper),
.energy-value-datetime-row__picker :deep(.n-base-selection) {
  min-width: 0;
}
.energy-value-datetime-row__help {
  flex-shrink: 0;
}
</style>
