<template>
  <div class="table-container">
    <table class="full-width-table">
      <!-- 表头部分，可单独调整样式 -->
      <thead class="table-header">
        <tr>
          <th style="width: 10%">状态</th>
          <th style="width: 20%">开始时间</th>
          <th style="width: 30%">描述</th>
          <th style="width: 32%">地点</th>
          <th style="width: 8%">取消</th>
        </tr>
      </thead>
      <!-- 表格内容部分，可单独调整样式 -->
      <tbody class="table-body">
        <tr
          v-for="schedule in schedules"
          :key="schedule.id"
          :class="{ 'active-row': schedule.activityId === activeId }"
        >
          <td>
            <n-checkbox
              :checked="schedule.status === 'done'"
              @update:checked="handleCheckboxChange(schedule, $event)"
            />
          </td>
          <td>
            {{
              schedule.activityDueRange
                ? formatTime(schedule.activityDueRange[0])
                : "-"
            }}
          </td>
          <td>{{ schedule.activityTitle ?? "-" }}</td>
          <td>{{ schedule.location ?? "-" }}</td>

          <td>
            <n-button
              size="small"
              type="error"
              @click="handleSuspendSchedule(schedule.id)"
            >
              <template #icon>
                <n-icon size="16">
                  <Delete24Regular />
                </n-icon>
              </template>
            </n-button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { Schedule } from "@/core/types/Schedule";
import { formatTime } from "@/core/utils";
import { NCheckbox } from "naive-ui";
import { Delete24Regular } from "@vicons/fluent";

// 定义 Props
defineProps<{
  schedules: Schedule[];
  activeId: number | null;
}>();

const emit = defineEmits<{
  (
    e: "update-schedule-status",
    id: number,
    activityId: number,
    status: string
  ): void;
  (e: "suspend-schedule", id: number): void;
}>();

function handleCheckboxChange(schedule: Schedule, checked: boolean) {
  const newStatus = checked ? "done" : "";
  schedule.status = newStatus;

  emit("update-schedule-status", schedule.id, schedule.activityId, newStatus);
}

function handleSuspendSchedule(id: number) {
  emit("suspend-schedule", id);
}
</script>

<style scoped>
/* 表格容器样式，占满页面 */
.table-container {
  width: 100%;
  overflow-x: auto; /* 支持横向滚动 */
}

/* 表格占满宽度 */
.full-width-table {
  width: 100%;
  border-collapse: collapse; /* 合并边框 */
}

/* 表头样式 */
.table-header th {
  background-color: #f5f5f5; /* 背景色 */
  padding: 10px;
  text-align: left;
  border-bottom: 2px solid #ddd; /* 底部边框 */
}

/* 表格内容样式 */
.table-body td {
  padding: 10px;
  border-bottom: 1px solid #ddd; /* 底部边框 */
}

/* 隔行变色 */
.table-body tr:nth-child(even) {
  background-color: #f9f9f9;
}

/* 激活行样式 */
.table-body tr.active-row {
  background-color: rgba(255, 255, 0, 0.378); /* 激活行的底色为黄色 */
}
</style>
