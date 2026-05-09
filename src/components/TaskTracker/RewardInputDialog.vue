<!-- RewardInputDialog.vue -->
<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="记录愉悦值"
    class="mobile-dialog-top"
    :on-after-leave="handleCancel"
    @keyup.enter="handleModalEnterKeyup"
    @after-enter="focusSlider"
  >
    <n-space vertical>
      <n-slider v-model:value="rewardValue" :min="1" :max="10" :step="1" :marks="marks" ref="sliderRef" />
      <div class="reward-value-datetime-row">
        <n-text v-if="!isMobile" class="reward-value-datetime-row__label">当前愉悦值: {{ rewardValue }}</n-text>
        <n-date-picker v-model:value="recordedAt" type="datetime" size="small" class="reward-value-datetime-row__picker" />
        <n-button size="small" class="reward-value-datetime-row__help" @click="showHelp = true">
          <template #icon>
            <n-icon><Trophy20Regular /></n-icon>
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

  <n-modal v-model:show="showHelp" preset="dialog" title="愉悦值说明">
    <div class="table-wrap">
      <n-data-table :columns="columns" :data="helpData" :bordered="false" :single-line="true" class="table" />
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from "vue";
import { Trophy20Regular } from "@vicons/fluent";
import { NModal, NSlider, NSpace, NText, NButton, NIcon, NDataTable, NDatePicker } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
import { flushPickerValueToVue, pickRecordedAtMs, isEventFromDateTimePickerDeep } from "@/utils/recordedAtPick";
import { useDevice } from "@/composables/useDevice";
const { isMobile } = useDevice();

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "confirm", value: { value: number; description?: string; recordedAt: number }): void;
}>();

const rewardValue = ref(5);
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
  emotion: string;
  satisfaction: string;
  overall: string;
};

const createColumns = (): DataTableColumns<RowData> => {
  return [
    { title: "", key: "score", align: "center", width: 40 },
    { title: "情绪体验", key: "emotion" },
    { title: "成就感/满足感", key: "satisfaction" },
    { title: "整体\n描述", key: "overall" },
  ];
};

const columns = createColumns();
const helpData: RowData[] = [
  { score: "1分", emotion: "情绪崩溃，痛苦烦躁", satisfaction: "自我厌恶，认为毫无价值", overall: "崩溃\n状态" },
  { score: "2分", emotion: "情绪低落，压抑沮丧", satisfaction: "自我否定，做得很差", overall: "否定\n状态" },
  { score: "3分", emotion: "情绪不佳，烦闷不安", satisfaction: "明显不满意，漏洞百出", overall: "不满\n状态" },
  { score: "4分", emotion: "情绪一般，略有波动", satisfaction: "方向迷茫，试错中摸索", overall: "迷茫\n状态" },
  { score: "5分", emotion: "情绪稳定，稍感轻松", satisfaction: "方向踟蹰，但日拱一卒", overall: "执行\n状态" },
  { score: "6分", emotion: "情绪向好，轻松舒适", satisfaction: "方向确定，认可努力", overall: "良好\n状态" },
  { score: "7分", emotion: "情绪积极，心情愉悦", satisfaction: "感到满意，推进顺利", overall: "满意\n状态" },
  { score: "8分", emotion: "情绪高涨，兴奋满足", satisfaction: "明显自豪，发现亮点", overall: "自豪\n状态" },
  { score: "9分", emotion: "情绪极佳，充满喜悦", satisfaction: "非常自豪，感到价值意义", overall: "喜悦\n状态" },
  { score: "10分", emotion: "情绪巅峰，幸福充盈", satisfaction: "极度自豪，自我实现感", overall: "巅峰\n状态" },
];

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

// 用于modal显示双向绑定
const showModal = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const marks = {
  1: "1",
  5: "5",
  10: "10",
};

function handleModalEnterKeyup(e: KeyboardEvent) {
  if (isEventFromDateTimePickerDeep(e.target)) return;
  void handleConfirm();
}

const handleConfirm = async () => {
  await flushPickerValueToVue();
  emit("confirm", {
    value: rewardValue.value,
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

<style scoped>
.reward-value-datetime-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.reward-value-datetime-row__label {
  flex-shrink: 0;
  white-space: nowrap;
}
.reward-value-datetime-row__picker {
  flex: 1;
  min-width: 0;
}
.reward-value-datetime-row__picker :deep(.n-input-wrapper),
.reward-value-datetime-row__picker :deep(.n-base-selection) {
  min-width: 0;
}
.reward-value-datetime-row__help {
  flex-shrink: 0;
}
</style>

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
