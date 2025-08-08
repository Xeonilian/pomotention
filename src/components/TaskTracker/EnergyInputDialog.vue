<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="记录精力值"
    :on-after-leave="handleCancel"
  >
    <n-space vertical>
      <n-slider
        v-model:value="energyValue"
        :min="1"
        :max="10"
        :step="1"
        :marks="marks"
      />
      <n-space justify="space-between">
        <n-text>当前精力值: {{ energyValue }}</n-text>
        <n-button @click="showHelp = true">
          <template #icon>
            <n-icon><BatterySaver20Regular /></n-icon>
          </template>
        </n-button>
      </n-space>
      <n-input
        v-model:value="description"
        placeholder="请输入内容"
        maxlength="40"
        show-count
      />
    </n-space>

    <template #action>
      <n-button @click="handleCancel">取消</n-button>

      <n-button type="primary" @click="handleConfirm">确认</n-button>
    </template>
  </n-modal>

  <n-modal v-model:show="showHelp" preset="dialog" title="精力值说明">
    <n-data-table
      :columns="columns"
      :data="data"
      :bordered="false"
      :single-line="true"
      class="table"
    />
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { BatterySaver20Regular } from "@vicons/fluent";
import { NModal, NSlider, NSpace, NText, NButton, NIcon } from "naive-ui";
import type { DataTableColumns } from "naive-ui";
const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "confirm", value: { value: number; description?: string }): void;
}>();

const energyValue = ref(5);
const showHelp = ref(false);
const description = ref("");
type RowData = {
  score: string;
  physical: string;
  mental: string;
  overall: string;
};

const createColumns = (): DataTableColumns<RowData> => {
  return [
    {
      title: "分数",
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
      title: "整体描述",
      key: "overall",
    },
  ];
};

const columns = createColumns();
const data: RowData[] = [
  {
    score: "1分",
    physical: "极度疲惫, 难以行动",
    mental: "思维断片, 无法处理信息",
    overall: "崩溃状态",
  },
  {
    score: "2分",
    physical: "沉重, 基本动作困难",
    mental: "思维涣散, 极度困倦",
    overall: "极度疲惫",
  },
  {
    score: "3分",
    physical: "乏力, 动作迟缓",
    mental: "注意力涣散, 需要休息",
    overall: "明显疲惫",
  },
  {
    score: "4分",
    physical: "略显沉重, 勉强活动",
    mental: "思维迟缓, 易出错",
    overall: "低效状态",
  },
  {
    score: "5分",
    physical: "轻微疲惫, 可维持活动",
    mental: "注意力一般, 需要调动",
    overall: "及格状态",
  },
  {
    score: "6分",
    physical: "基本正常, 偶有疲意",
    mental: "思维清晰, 专注一般",
    overall: "正常水平",
  },
  {
    score: "7分",
    physical: "状态良好, 行动自如",
    mental: "思维清醒, 易于专注",
    overall: "良好状态",
  },
  {
    score: "8分",
    physical: "充沛, 动作协调",
    mental: "思维活跃, 高度专注",
    overall: "充满动力",
  },
  {
    score: "9分",
    physical: "轻快, 行动自如",
    mental: "头脑敏捷, 创意丰富",
    overall: "极佳状态",
  },
  {
    score: "10分",
    physical: "精力充沛, 活力满满",
    mental: "清晰敏锐, 专注兴奋",
    overall: "巅峰状态",
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

const handleConfirm = () => {
  emit("confirm", {
    value: energyValue.value,
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
<style>
.table .n-data-table-td,
.table .n-data-table-th {
  padding: 4px 2px !important;
}

.table .n-data-table-th {
  font-weight: bold !important;
}
</style>
