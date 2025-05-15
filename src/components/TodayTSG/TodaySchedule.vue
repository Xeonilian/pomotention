<template>
  <div class="table-container">
    <table class="full-width-table">
      <!-- 表头部分，可单独调整样式 -->
      <thead class="table-header">
        <tr>
          <th style="width: 40px"></th>
          <th style="width: 60px">开始</th>
          <th style="width: 40px">持续</th>
          <th style="width: calc((100% - 180px) / 2)">描述</th>
          <th style="width: calc((100% - 180px) / 2)">地点</th>
          <th style="width: 40px"></th>
        </tr>
      </thead>
      <!-- 表格内容部分，可单独调整样式 -->
      <tbody class="table-body">
        <template v-if="schedules && schedules.length > 0">
          <tr
            v-for="schedule in schedules.sort(
              (a, b) => a.activityDueRange[0] - b.activityDueRange[0]
            )"
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
            <td>
              {{
                schedule.activityDueRange ? schedule.activityDueRange[1] : "min"
              }}
            </td>
            <td class="ellipsis">{{ schedule.activityTitle ?? "-" }}</td>
            <td class="ellipsis">{{ schedule.location ?? "-" }}</td>
            <td>
              <n-button
                size="small"
                type="error"
                secondary
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
        </template>
        <tr v-else class="empty-row">
          <td colspan="6" style="text-align: center; padding: 10px">
            暂无日程安排
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
  table-layout: fixed; /* 使用固定布局算法 */
}

/* 表头样式 */
.table-header th {
  background-color: #d3f4f6; /* 背景色 */
  padding: 2px;
  text-align: left;
  border-top: 2px solid #ddd; /* 顶部边框 */
  border-bottom: 2px solid #ddd; /* 底部边框 */
  white-space: nowrap; /* 防止文本换行 */
  overflow: hidden; /* 隐藏溢出内容 */
  height: 28px; /* 固定高度 */
}

/* 表格内容样式 */
.table-body td {
  padding: 2px;
  border-bottom: 2px solid #ddd; /* 底部边框 */
  text-align: left;
  white-space: normal; /* 允许文本换行 */
  overflow: hidden; /* 隐藏溢出内容 */
  word-break: break-word; /* 允许在单词内换行 */
  min-height: 20px;
  height: auto;
}

/* 允许描述和地点列显示省略号 */
.ellipsis {
  text-overflow: ellipsis; /* 文本溢出显示省略号 */
}

/* 隔行变色 */
.table-body tr:nth-child(even) {
  background-color: #f9f9f9;
}

/* 激活行样式 */
.table-body tr.active-row {
  background-color: rgba(255, 255, 0, 0.378); /* 激活行的底色为黄色 */
}

/* 空行样式 */
.empty-row td {
  height: 28px;
  text-align: center;
}
</style>
