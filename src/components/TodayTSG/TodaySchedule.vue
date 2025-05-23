<template>
  <div class="table-container">
    <table class="full-width-table">
      <!-- 表头部分，可单独调整样式 -->
      <thead class="table-header">
        <tr>
          <th style="width: 40px"></th>
          <th style="width: 60px">开始</th>
          <th style="width: 40px">分钟</th>
          <th style="width: calc((100% - 200px) / 2)">描述</th>
          <th style="width: calc((100% - 200px) / 2)">地点</th>
          <th style="width: 60px; text-align: center">操作</th>
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
            @click="handleRowClick(schedule)"
            style="cursor: pointer"
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
                  ? timestampToTimeString(schedule.activityDueRange[0])
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
              <div class="button-group">
                <n-button
                  v-if="!schedule.taskId"
                  size="tiny"
                  type="info"
                  secondary
                  @click="handleConvertToTask(schedule)"
                  title="追踪任务"
                >
                  <template #icon>
                    <n-icon size="18">
                      <ChevronCircleDown48Regular />
                    </n-icon>
                  </template>
                </n-button>
                <n-button
                  size="tiny"
                  type="error"
                  secondary
                  @click="handleSuspendSchedule(schedule.id)"
                  title="取消日程"
                >
                  <template #icon>
                    <n-icon size="18">
                      <ChevronCircleRight48Regular />
                    </n-icon>
                  </template>
                </n-button>
                <n-button
                  v-if="schedule.taskId"
                  size="tiny"
                  type="warning"
                  secondary
                  @click="handleEnergyRecord(schedule)"
                  title="能量记录"
                >
                  🔋
                </n-button>
                <n-button
                  v-if="schedule.taskId"
                  size="tiny"
                  type="success"
                  secondary
                  @click="handleRewardRecord(schedule)"
                  title="奖赏记录"
                >
                  😜
                </n-button>
                <n-button
                  v-if="schedule.taskId"
                  size="tiny"
                  type="info"
                  secondary
                  @click="handleInterruptionRecord(schedule)"
                  title="打扰记录"
                >
                  📬
                </n-button>
              </div>
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
  <n-popover
    v-model:show="showPopover"
    trigger="manual"
    placement="top-end"
    style="width: 200px"
  >
    <template #trigger>
      <div
        style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 1px;
          height: 1px;
        "
      ></div>
    </template>
    {{ popoverMessage }}
  </n-popover>
</template>

<script setup lang="ts">
import type { Schedule } from "@/core/types/Schedule";
import { timestampToTimeString } from "@/core/utils";
import { NCheckbox, NButton, NIcon, NPopover } from "naive-ui";
import {
  ChevronCircleRight48Regular,
  ChevronCircleDown48Regular,
} from "@vicons/fluent";
import { taskService } from "@/services/taskService";
import { ref } from "vue";

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
  (e: "convert-to-task", id: number): void;
  (e: "select-task", taskId: number | null): void;
}>();

// 添加状态来控制提示信息
const showPopover = ref(false);
const popoverMessage = ref("");

function handleCheckboxChange(schedule: Schedule, checked: boolean) {
  const newStatus = checked ? "done" : "";
  schedule.status = newStatus;

  emit("update-schedule-status", schedule.id, schedule.activityId, newStatus);
}

function handleSuspendSchedule(id: number) {
  emit("suspend-schedule", id);
}

function handleConvertToTask(schedule: Schedule) {
  if (schedule.taskId) {
    popoverMessage.value = "该日程已转换为任务";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    return;
  }

  taskService.createTaskFromSchedule(
    schedule.id.toString(),
    schedule.activityTitle,
    schedule.projectName
  );
  popoverMessage.value = "已转换为任务";
  showPopover.value = true;
  setTimeout(() => {
    showPopover.value = false;
  }, 2000);
  emit("convert-to-task", schedule.id);
}

// 添加点击行处理函数
function handleRowClick(schedule: Schedule) {
  emit("select-task", schedule.taskId || null);
}

// 添加记录处理函数
function handleEnergyRecord(schedule: Schedule) {
  if (!schedule.taskId) {
    popoverMessage.value = "请先转换为任务";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    return;
  }
  emit("select-task", schedule.taskId);
  // TODO: 打开能量记录输入界面
}

function handleRewardRecord(schedule: Schedule) {
  if (!schedule.taskId) {
    popoverMessage.value = "请先转换为任务";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    return;
  }
  emit("select-task", schedule.taskId);
  // TODO: 打开奖赏记录输入界面
}

function handleInterruptionRecord(schedule: Schedule) {
  if (!schedule.taskId) {
    popoverMessage.value = "请先转换为任务";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    return;
  }
  emit("select-task", schedule.taskId);
  // TODO: 打开打扰记录输入界面
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
  background-color: rgba(198, 219, 244, 0.3); /* 背景色 */
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
  padding-top: 3px;
  border-bottom: 1px solid #ddd; /* 底部边框 */
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

/* 按钮组样式 */
.button-group {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}
</style>
