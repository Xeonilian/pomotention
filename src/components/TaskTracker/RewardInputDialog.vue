<!-- RewardInputDialog.vue -->
<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="记录愉悦值"
    class="mobile-dialog-top"
    :on-after-leave="handleCancel"
    @keyup.enter="handleConfirm"
    @after-enter="focusSlider"
  >
    <n-space vertical>
      <n-slider v-model:value="rewardValue" :min="1" :max="10" :step="1" :marks="marks" ref="sliderRef" />
      <n-space justify="space-between" class="reward-value-row">
        <n-text class="reward-value-text">当前愉悦值: {{ rewardValue }}</n-text>
        <n-button @click="showHelp = true">
          <template #icon>
            <n-icon><Beach24Regular /></n-icon>
          </template>
        </n-button>
      </n-space>
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
import { ref, computed, nextTick } from "vue";
import { Beach24Regular } from "@vicons/fluent";
import { NModal, NSlider, NSpace, NText, NButton, NIcon, NDataTable } from "naive-ui";
import type { DataTableColumns } from "naive-ui";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "confirm", value: { value: number; description?: string }): void;
}>();

const rewardValue = ref(5);
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
    { title: "", key: "score", align: "center", width: 30 },
    { title: "情绪体验", key: "emotion", width: 110 },
    { title: "成就感/满足感", key: "satisfaction", width: 130 },
    { title: "整体描述", key: "overall", width: 55 },
  ];
};

const columns = createColumns();
const helpData: RowData[] = [
  { score: "1分", emotion: "情绪崩溃，痛苦烦躁", satisfaction: "自我厌恶，认为毫无价值", overall: "崩溃状态" },
  { score: "2分", emotion: "情绪低落，压抑沮丧", satisfaction: "自我否定，做得很差", overall: "否定状态" },
  { score: "3分", emotion: "情绪不佳，烦闷不安", satisfaction: "明显不满意，漏洞百出", overall: "不满状态" },
  { score: "4分", emotion: "情绪一般，略有波动", satisfaction: "方向迷茫，试错中摸索", overall: "迷茫状态" },
  { score: "5分", emotion: "情绪稳定，稍感轻松", satisfaction: "方向踟蹰，但日拱一卒", overall: "执行状态" },
  { score: "6分", emotion: "情绪向好，轻松舒适", satisfaction: "方向确定，认可努力", overall: "良好状态" },
  { score: "7分", emotion: "情绪积极，心情愉悦", satisfaction: "感到满意，推进顺利", overall: "满意状态" },
  { score: "8分", emotion: "情绪高涨，兴奋满足", satisfaction: "明显自豪，发现亮点", overall: "自豪状态" },
  { score: "9分", emotion: "情绪极佳，充满喜悦", satisfaction: "非常自豪，感到价值意义", overall: "喜悦状态" },
  { score: "10分", emotion: "情绪巅峰，幸福充盈", satisfaction: "极度自豪，自我实现感", overall: "巅峰状态" },
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

const handleConfirm = () => {
  emit("confirm", {
    value: rewardValue.value,
    description: description.value.trim(),
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
.reward-value-row {
  flex-wrap: nowrap;
}
.reward-value-text {
  white-space: nowrap;
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
}
</style>
