<template>
  <n-modal :show="showModal" preset="dialog" title="数据备份" @close="emitClose">
    <n-space vertical>
      <span>首次同步前，请导出数据备份（建议备份到安全位置）。</span>
      <li>同步完成后，您可以随时导入备份数据，恢复到当前版本。</li>
      <li>新建文件夹，选择文件夹，将数据导出到文件夹中。</li>
    </n-space>
    <template #action>
      <n-button type="primary" secondary @click="emitClose">取消导出</n-button>
      <n-button type="primary" @click="handleExportData">导出数据</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { useDataExport } from "@/composables/useDataExport";

// 定义接收的属性
defineProps<{
  showModal: boolean;
}>();

// 定义发出的事件
const emit = defineEmits<{
  (e: "update:showModal", value: boolean): void;
}>();

// 处理关闭对话框
const emitClose = () => {
  emit("update:showModal", false); // 触发更新事件关闭对话框
};

// 导出数据的逻辑
const handleExportData = async () => {
  const { exportData } = useDataExport();
  await exportData(); // 执行数据导出
  emitClose(); // 导出完成后关闭对话框
};
</script>
