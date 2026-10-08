<!--
  窄槽上厕所：顶栏 + 平铺 ToiletTag
-->
<template>
  <div v-if="task" class="life-record-form">
    <div class="lr-header">
      <div class="lr-header__lead">
        <n-button text size="small" class="lr-icon-btn" :title="`记一条${def.title}`" @click="append">
          <template #icon>
            <n-icon :size="20"><Door20Regular /></n-icon>
          </template>
        </n-button>
        <span v-if="records.length > 0" class="lr-count">×{{ records.length }}</span>
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
    <div class="lr-list">
      <ToiletTag
        v-for="record in records"
        :key="record.id"
        :recorded-at="record.recordedAt"
        @update:recorded-at="(ts) => changeRecordedAt(record, ts)"
        @remove="remove(record)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon } from "naive-ui";
import { Delete20Regular, Dismiss20Regular, Door20Regular } from "@vicons/fluent";
import { useLifeRecordEditor } from "@/composables/lifeRecord/useLifeRecordEditor";
import ToiletTag from "@/components/LifeRecord/ToiletTag.vue";

const props = defineProps<{ taskId: number }>();
const { task, records, def, append, changeRecordedAt, remove, discard, deselect } = useLifeRecordEditor(
  () => props.taskId,
  "toilet",
);
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
  flex-wrap: nowrap;
  min-width: 0;
  flex-shrink: 0;
}
.lr-header__lead {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
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
.lr-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}
.lr-list {
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
