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
      <n-slider v-model:value="energyValue" :min="1" :max="10" :step="1" :marks="marks" ref="sliderRef" />
      <div class="energy-value-datetime-row">
        <n-text v-if="!isMobile" class="energy-value-datetime-row__label">当前精力值: {{ energyValue }}</n-text>
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
import { useDevice } from "@/composables/platform/useDevice";
const { isMobile } = useDevice();

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
  overall: string;
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
    {
      title: "整体\n描述",
      key: "overall",
    },
  ];
};

const columns = createColumns();
const data: RowData[] = [
  {
    score: "1分",
    physical: "极度疲惫，难以行动",
    mental: "思维断片，无法处理信息",
    overall: "崩溃\n状态",
  },
  {
    score: "2分",
    physical: "沉重，基本动作困难",
    mental: "思维涣散，极度困倦",
    overall: "极度\n状态",
  },
  {
    score: "3分",
    physical: "乏力，动作迟缓",
    mental: "注意力涣散，需要休息",
    overall: "明显\n疲惫",
  },
  {
    score: "4分",
    physical: "略显沉重，勉强活动",
    mental: "思维迟缓，易出错",
    overall: "低效\n状态",
  },
  {
    score: "5分",
    physical: "轻微疲惫，维持活动",
    mental: "注意力一般，需要调动",
    overall: "及格\n状态",
  },
  {
    score: "6分",
    physical: "基本正常，偶有疲意",
    mental: "思维清晰，专注一般",
    overall: "正常\n水平",
  },
  {
    score: "7分",
    physical: "状态良好，行动自如",
    mental: "思维清醒，易于专注",
    overall: "良好\n状态",
  },
  {
    score: "8分",
    physical: "充沛，动作协调",
    mental: "思维活跃，高度专注",
    overall: "充满\n动力",
  },
  {
    score: "9分",
    physical: "轻快，行动自如",
    mental: "头脑敏捷，创意丰富",
    overall: "极佳\n状态",
  },
  {
    score: "10分",
    physical: "精力充沛，活力满满",
    mental: "清晰敏锐，专注兴奋",
    overall: "巅峰\n状态",
  },
];
// 修复 v-model 问题
const showModal = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const marks = {
  1: "1",
  5: "5",
  10: "10",
};

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
.energy-value-datetime-row__label {
  flex-shrink: 0;
  white-space: nowrap;
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
