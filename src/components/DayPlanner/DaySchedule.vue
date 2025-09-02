<!--
  Component: DaySchedule.vue
-->
<template>
  <div class="table-container">
    <table class="full-width-table">
      <!-- 表头部分，可单独调整样式 -->
      <colgroup>
        <!-- 勾选 -->
        <col style="width: 18px" />
        <!-- 开始 -->
        <col style="width: 38px" />
        <!-- 结束 -->
        <col style="width: 38px" />
        <!-- 时长 -->
        <col style="width: 34px" />
        <!-- 意图列：吃更多空间 -->
        <col class="col-intent" />
        <!-- 地点列：限制上限、避免跟着变长 -->
        <col class="col-location" />
        <!-- 状态列：最后才缩，常用 min-width 保护 -->
        <col class="col-status" />
      </colgroup>

      <thead class="table-header">
        <tr>
          <th></th>
          <th>开始</th>
          <th>结束</th>
          <th>时长</th>
          <th>意图</th>
          <th>地点</th>
          <th class="status-col">状态</th>
        </tr>
      </thead>

      <!-- 表格内容部分，可单独调整样式 -->
      <tbody class="table-body">
        <template v-if="schedules && schedules!.length > 0">
          <tr
            v-for="schedule in schedules.sort((a:Schedule, b:Schedule) => {
              const aValue = a.activityDueRange?.[0] ?? Infinity;
              const bValue = b.activityDueRange?.[0] ?? Infinity;
              return aValue - bValue;
            })"
            :key="schedule.id"
            :class="{
              'active-row': schedule.activityId === activeId,
              'selected-row': schedule.id === selectedRowId,
              'done-row': schedule.status === 'done',
              'cancel-row': schedule.status === 'cancelled',
            }"
            @click="handleRowClick(schedule)"
            style="cursor: pointer"
          >
            <!-- 完成checkbox -->
            <td>
              <n-checkbox
                v-if="schedule.status !== 'cancelled'"
                :checked="schedule.status === 'done'"
                @update:checked="handleCheckboxChange(schedule.id, $event)"
              />
              <n-icon
                v-else
                size="22"
                style="transform: translate(0px, 3px)"
                color="var(--color-red)"
              >
                <DismissSquare20Filled />
              </n-icon>
            </td>

            <!-- 开始时间 -->
            <td>
              {{
                schedule.activityDueRange
                  ? timestampToTimeString(schedule.activityDueRange[0])
                  : "-"
              }}
            </td>

            <!-- 结束时间 -->
            <td
              @dblclick.stop="startEditing(schedule.id, 'done')"
              :title="
                editingRowId === schedule.id && editingField === 'done'
                  ? ''
                  : '双击编辑'
              "
            >
              <input
                v-if="editingRowId === schedule.id && editingField === 'done'"
                v-model="editingValue"
                @blur="saveEdit(schedule)"
                @keyup.enter="saveEdit(schedule)"
                @keyup.esc="cancelEdit"
                ref="editingInput"
                class="done-input time-input"
                :data-schedule-id="schedule.id"
                maxlength="5"
                autocomplete="off"
              />
              <span v-else>{{
                schedule.doneTime
                  ? timestampToTimeString(schedule.doneTime)
                  : "-"
              }}</span>
            </td>

            <!-- 时长 -->
            <td
              :class="{ 'is-empty-min': schedule.activityDueRange?.[1] === '' }"
            >
              {{
                (schedule.activityDueRange?.[1] ?? "") !== ""
                  ? schedule.activityDueRange[1]
                  : "min"
              }}
            </td>

            <!-- 意图 -->
            <td
              class="title-cell"
              :class="{
                'done-cell': schedule.status === 'done',
                'cloud-background': schedule.isUntaetigkeit === true,
                'cancel-cell': schedule.status === 'cancelled',
              }"
              @dblclick.stop="startEditing(schedule.id, 'title')"
              :title="
                editingRowId === schedule.id && editingField === 'title'
                  ? ''
                  : '双击编辑'
              "
            >
              <input
                v-if="editingRowId === schedule.id && editingField === 'title'"
                v-model="editingValue"
                @blur="saveEdit(schedule)"
                @keyup.enter="saveEdit(schedule)"
                @keyup.esc="cancelEdit"
                @click.stop
                class="title-input"
                :data-schedule-id="schedule.id"
                ref="editingInput"
              />
              <span class="ellipsis" v-else>{{
                schedule.activityTitle ?? "-"
              }}</span>

              <!-- 云朵背景元素 - 只有当 isUntaetigkeit 为 true 时才显示 -->
              <template v-if="schedule.isUntaetigkeit === true">
                <div class="cloud cloud-1"></div>
                <div class="cloud cloud-2"></div>
                <div class="cloud cloud-3"></div>
                <div class="cloud cloud-4"></div>
                <div class="cloud cloud-5"></div>
                <div class="cloud cloud-6"></div>
              </template>
            </td>

            <!-- 地点 -->
            <td class="location-cell">
              <div class="ellipsis">
                {{ schedule.location ?? "-" }}
              </div>
            </td>

            <!-- 状态 -->
            <td class="status-col">
              <div class="status-cell">
                <div class="records-stat">&nbsp;</div>
                <div class="button-group">
                  <n-button
                    v-if="!schedule.taskId"
                    text
                    type="info"
                    @click="handleConvertToTask(schedule)"
                    title="追踪任务"
                  >
                    <template #icon>
                      <n-icon size="18">
                        <ChevronCircleDown48Regular />
                      </n-icon>
                    </template>
                  </n-button>
                  <!-- <n-button
                  v-if="
                    schedule.status !== 'done' &&
                    schedule.isUntaetigkeit !== true
                  "
                  text
                  type="info"
                  @click="handleRepeatSchedule(schedule.id)"
                  title="重复待办，新建活动"
                >
                  <template #icon>
                    <n-icon size="18">
                      <ArrowRepeatAll24Regular />
                    </n-icon>
                  </template>
                </n-button> -->
                  <!-- 取消任务按钮 -->
                  <n-button
                    v-if="
                      schedule.status !== 'done' &&
                      schedule.status !== 'cancelled' &&
                      schedule.isUntaetigkeit !== true
                    "
                    text
                    type="info"
                    @click="handleCancelSchedule(schedule.id)"
                    title="取消任务，不退回活动清单"
                  >
                    <template #icon>
                      <n-icon size="18">
                        <DismissCircle20Regular />
                      </n-icon>
                    </template>
                  </n-button>
                  <!-- 退回任务按钮 = 不再在今日
                <n-button
                  v-if="
                    schedule.status !== 'done' &&
                    schedule.status !== 'cancelled' &&
                    schedule.isUntaetigkeit !== true
                  "
                  text
                  type="info"
                  @click="handleSuspendSchedule(schedule.id)"
                  title="取消日程"
                >
                  <template #icon>
                    <n-icon size="18">
                      <ChevronCircleRight48Regular />
                    </n-icon>
                  </template>
                </n-button> -->
                </div>
              </div>
            </td>
          </tr>
        </template>
        <tr v-else class="empty-row">
          <td colspan="7" style="text-align: center; padding: 10px">
            暂无日程
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
  ChevronCircleDown48Regular,
  DismissCircle20Regular,
  // ArrowRepeatAll24Regular,
  DismissSquare20Filled,
} from "@vicons/fluent";
import { taskService } from "@/services/taskService";
import { ref, nextTick } from "vue";
import { Task } from "@/core/types/Task";

// 编辑用
const editingRowId = ref<number | null>(null);
const editingField = ref<null | "title" | "start" | "done">(null);
const editingValue = ref("");
const editingInput = ref<HTMLInputElement>();

// 定义 Props
const props = defineProps<{
  schedules: Schedule[];
  activeId: number | null;
  selectedRowId: number | null; // 新增：从父组件接收选中行ID
}>();

const emit = defineEmits<{
  (e: "update-schedule-status", id: number, checked: boolean): void;
  (e: "suspend-schedule", id: number): void;
  (e: "cancel-schedule", id: number): void;
  // (e: "repeat-schedule", id: number): void;
  (e: "select-task", taskId: number | null): void;
  (e: "select-row", id: number | null): void;
  (e: "select-activity", activityId: number | null): void;
  (e: "edit-schedule-title", id: number, newTitle: string): void;
  (e: "edit-schedule-done", id: number, newTs: string): void;
  (
    e: "convert-schedule-to-task",
    payload: {
      task: Task;
      scheduleId: number;
    }
  ): void;
}>();

// 添加状态来控制提示信息
const showPopover = ref(false);
const popoverMessage = ref("");

function handleCheckboxChange(id: number, checked: boolean) {
  emit("update-schedule-status", id, checked);
}

// 修改点击行处理函数
function handleRowClick(schedule: Schedule) {
  emit("select-row", schedule.id); // 发送选中行事件
  emit("select-task", schedule.taskId || null);
  emit("select-activity", schedule.activityId || null);
}

// 编辑相关函数
function startEditing(scheduleId: number, field: "title" | "start" | "done") {
  const schedule = props.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return;
  editingRowId.value = scheduleId;
  editingField.value = field;
  editingValue.value =
    field === "title"
      ? schedule.activityTitle || ""
      : field === "start"
      ? schedule.taskId
        ? timestampToTimeString(schedule.taskId)
        : ""
      : schedule.doneTime
      ? timestampToTimeString(schedule.doneTime)
      : "";

  // 使用 querySelector 来获取当前编辑的输入框，而不是依赖 ref
  nextTick(() => {
    const input = document.querySelector(
      `input.${field}-input[data-schedule-id="${scheduleId}"]`
    );
    if (input) {
      (input as HTMLInputElement).focus();
    }
  });
}

function saveEdit(schedule: Schedule) {
  if (!editingRowId.value) return;

  if (editingField.value === "title") {
    if (editingValue.value.trim()) {
      emit("edit-schedule-title", schedule.id, editingValue.value.trim());
    }
  }

  if (editingField.value === "done") {
    if (isValidTimeString(editingValue.value)) {
      const ts = editingValue.value;
      emit("edit-schedule-done", schedule.id, ts); // 注意这里是 timestring 不是timestamp，是在Home用currentViewdate进行的转化
    } else {
      if (editingValue.value === "") {
        emit("edit-schedule-done", schedule.id, "");
      }
    }
  }
  cancelEdit();
}

function cancelEdit() {
  editingRowId.value = null;
  editingField.value = null;
  editingValue.value = "";
}

function isValidTimeString(str: string) {
  return (
    /^\d{2}:\d{2}$/.test(str) &&
    +str.split(":")[0] <= 24 &&
    +str.split(":")[1] < 60
  );
}

function handleConvertToTask(schedule: Schedule) {
  console.log("handleConvertToTask", schedule.id, schedule.taskId);
  if (schedule.taskId) {
    popoverMessage.value = "该日程已转换为任务";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    return;
  }

  const task = taskService.createTaskFromSchedule(
    schedule.id,
    schedule.activityTitle,
    schedule.projectName
  );
  console.log("DaySch", task);
  if (task) {
    emit("convert-schedule-to-task", { task: task, scheduleId: schedule.id });
    popoverMessage.value = "已转换为任务";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
  }
}

function handleCancelSchedule(id: number) {
  emit("cancel-schedule", id);
}

// function handleRepeatSchedule(id: number) {
//   emit("repeat-schedule", id);
// }
</script>

<style scoped>
/* 表格容器样式，占满页面 */
.table-container {
  width: 100%;
  overflow-x: auto;
}

/* 表格占满宽度 */
.full-width-table {
  width: 100%;
  border-collapse: collapse; /* 合并边框 */
  table-layout: fixed; /* 使用固定布局算法 */
}

/* 列配额：重点在这三列 */
col.col-intent {
  /* 让“意图”吃更多空间：给较大百分比或 auto */
  width: 50%;
  min-width: 140px; /* 抗缩性：根据内容调整 */
}

col.col-location {
  /* “地点”不要无限拉长：较小配额 + 上限 */
  width: 15%;
  min-width: 80px;
}

/* 状态列：最后才缩（配额靠右，且有保底） */
col.col-status {
  width: 1%;
  min-width: 100px; /* 或 90~120，按你的内容调 */
}

/* 表头样式 */
.table-header th {
  padding: 2px;
  text-align: center;
  border-bottom: 2px solid var(--color-background-dark);
  white-space: nowrap;
  overflow: hidden;
  height: 20px;
  font-weight: 400;
  color: var(--color-text-primary);
  line-height: 1.3;
  background-color: var(--color-background) !important;
}

/* 表格内容样式 */
.table-body td {
  padding-top: 3px;
  border-bottom: 1px solid var(--color-background-dark);
  white-space: nowrap;
  overflow: hidden;
  min-height: 25px;
  height: 25px;
}

.table-body td:first-child,
.table-body td:nth-child(2),
.table-body td:nth-child(3),
.table-body td:nth-child(4) {
  text-align: center;
}

.table-body td:nth-child(7) {
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  min-height: 25px;
  height: 25px;
}

/* 补充：让省略容器具备可计算宽度并允许收缩 */
.location-cell .ellipsis,
.title-cell .ellipsis {
  display: block; /* 或 inline-block */
  width: 100%;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 隔行变色 */
.table-body tr:nth-child(even) {
  background-color: var(--color-background-light);
}

/* 激活行样式 */
.table-body tr.active-row {
  background-color: var(--color-red-light-transparent) !important;
  transition: background-color 0.2s ease;
}

/* 选中行样式 */
.table-body tr.selected-row {
  background-color: var(--color-yellow-transparent) !important;
  transition: background-color 0.2s ease;
}

/* 确保选中行的样式优先级高于其他样式 */
.table-body tr.selected-row:nth-child(even) {
  background-color: var(--color-yellow-light-transparent) !important;
}

/* 同时具有active和selected状态时的样式 */
.table-body tr.active-row.selected-row {
  background-color: var(--color-yellow-light-transparent) !important;
}

/* 鼠标悬停效果 */
.table-body tr:hover {
  background-color: var(--color-cyan-light-transparent);
  transition: background-color 0.2s ease;
}

/* 空行样式 */
.empty-row td {
  height: 30px;
  text-align: center;
  color: var(--color-text-secondary);
  width: 100%;
  border-bottom: 1px solid var(--color-background);
}

.is-empty-min {
  color: var(--color-text-secondary);
}

/* 完成行样式 */
.done-row {
  color: var(--color-text-secondary);
}

.done-cell {
  text-decoration: line-through var(--color-text-secondary) 0.5px;
}

.cancel-row {
  color: var(--color-text-secondary);
}

.cancel-cell {
  font-style: italic;
}

.title-cell {
  position: relative;
  cursor: pointer;
}

.title-cell:hover::after {
  content: "双击编辑";
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
}

.title-input {
  width: calc(100% - 10px);
  border: 1px solid #d9d9d9;
  border-radius: 4px;

  font-size: inherit;
  font-family: inherit;
  outline: none;
}

.title-input:focus {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(64, 169, 255, 0.2);
}

.start-input,
.done-input {
  width: 32px !important;
  max-width: 32px !important;
  min-width: 0 !important;
  box-sizing: border-box;
  padding: 0px 0px;
  font-size: inherit;
}

.time-input:focus {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(64, 169, 255, 0.2);
}
.time-input {
  border: 1px solid #d9d9d9;
  max-width: 100%;
  border-radius: 4px;
  font-size: inherit;
  font-family: inherit;
  outline: none;
}

/* 勾选 */
:deep(.n-checkbox) {
  --n-check-mark-color: var(--color-text-primary) !important;
  --n-color-checked: transparent !important;
  border-color: var(--color-text-primary);
  border-width: 1.2px;
}

th.status-col,
td.status-col {
  white-space: nowrap;
  text-align: right;
  min-width: 0;
}

/* 其他列：允许换行，降低最小宽度 */
th:not(.status-col),
td:not(.status-col) {
  white-space: nowrap;
  min-width: 0;
}
/* 单元格内部容器不必撑满：用 inline-flex 即可 */
.status-cell {
  display: inline-flex;
  align-items: center;
}

/* 统计值为内联块，避免撑满 */
.records-stat {
  display: inline-flex;
  font-family: Consolas, "Courier New", Courier, monospace;
  font-size: 14px;
  padding-right: 2px;
}

/* 按钮组为内联块，不再强制贴右（因为整列已右对齐） */
.button-group {
  display: inline-flex;
  height: 20px;
  transform: translateY(1px);
}

:deep(.n-button) :hover {
  color: var(--color-red);
}

/* 云朵样式 */
.cloud-background {
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    #ffffff7b 0%,
    #b2d3f585 50%,
    #dff6ff24 100%
  ) !important;
}

.cloud {
  position: absolute;
  pointer-events: none;
}

.cloud-1 {
  top: 25%;
  left: -8%;
  animation: floatMove1 45s infinite linear, fadeIn 1.5s forwards;
  opacity: 0;
}

.cloud-1::before {
  content: "";
  position: absolute;
  width: 50px;
  height: 30px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50px;
  box-shadow: 15px 5px 0 5px rgba(255, 255, 255, 0.7),
    25px -10px 0 -5px rgba(255, 255, 255, 0.8),
    40px -5px 0 rgba(255, 255, 255, 0.6),
    55px 2px 0 -8px rgba(255, 255, 255, 0.7),
    25px 8px 0 -5px rgba(255, 255, 255, 0.8),
    35px 15px 0 -10px rgba(255, 255, 255, 0.6);
}

.cloud-2 {
  top: 45%;
  left: -6%;
  animation: fadeIn 1.5s forwards, floatMove2 50s infinite linear;
  animation-delay: 2s, -10s;
  opacity: 0;
}

.cloud-2::before {
  content: "";
  position: absolute;
  width: 40px;
  height: 25px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 40px;
  box-shadow: 10px 3px 0 3px rgba(255, 255, 255, 0.8),
    20px -8px 0 -3px rgba(255, 255, 255, 0.7),
    32px -3px 0 rgba(255, 255, 255, 0.6),
    42px 1px 0 -5px rgba(255, 255, 255, 0.8),
    20px 6px 0 -3px rgba(255, 255, 255, 0.7);
}

.cloud-3 {
  top: 35%;
  left: -10%;
  animation: fadeIn 1.5s forwards, floatMove3 40s infinite linear;
  animation-delay: 1s, -25s;
  opacity: 0;
}

.cloud-3::before {
  content: "";
  position: absolute;
  width: 60px;
  height: 35px;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 60px;
  box-shadow: 18px 6px 0 6px rgba(255, 255, 255, 0.8),
    30px -12px 0 -6px rgba(255, 255, 255, 0.7),
    50px -6px 0 rgba(255, 255, 255, 0.65),
    68px 3px 0 -10px rgba(255, 255, 255, 0.8),
    30px 10px 0 -6px rgba(255, 255, 255, 0.75),
    42px 18px 0 -12px rgba(255, 255, 255, 0.6),
    15px -5px 0 -8px rgba(255, 255, 255, 0.7);
}

.cloud-4 {
  top: 25%;
  left: -8%;
  animation: fadeIn 3s, forwards floatMove1 45s infinite linear;
  opacity: 0;
  animation-delay: 1s, -15s;
}

.cloud-4::before {
  content: "";
  position: absolute;
  width: 50px;
  height: 30px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50px;
  box-shadow: 15px 5px 0 5px rgba(255, 255, 255, 0.7),
    25px -10px 0 -5px rgba(255, 255, 255, 0.8),
    40px -5px 0 rgba(255, 255, 255, 0.6),
    55px 2px 0 -8px rgba(255, 255, 255, 0.7),
    25px 8px 0 -5px rgba(255, 255, 255, 0.8),
    35px 15px 0 -10px rgba(255, 255, 255, 0.6);
}

.cloud-5 {
  top: 45%;
  left: -6%;
  animation: fadeIn 1.5s forwards, floatMove3 50s linear infinite;
  animation-delay: 1s, -45s;
  opacity: 0;
}

.cloud-5::before {
  content: "";
  position: absolute;
  width: 40px;
  height: 30px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 40px;
  box-shadow: 10px 3px 0 3px rgba(255, 255, 255, 0.8),
    20px -8px 0 -3px rgba(255, 255, 255, 0.7),
    32px -3px 0 rgba(255, 255, 255, 0.6),
    42px 1px 0 -5px rgba(255, 255, 255, 0.8),
    20px 6px 0 -3px rgba(255, 255, 255, 0.7);
}

.cloud-6 {
  top: 35%;
  left: -10%;
  animation: fadeIn 1.5s forwards, floatMove2 50s linear infinite;
  animation-delay: 1s, -5s;
  opacity: 0;
}

.cloud-6::before {
  content: "";
  position: absolute;
  width: 60px;
  height: 35px;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 60px;
  box-shadow: 18px 6px 0 6px rgba(255, 255, 255, 0.8),
    30px -12px 0 -6px rgba(255, 255, 255, 0.7),
    50px -6px 0 rgba(255, 255, 255, 0.65),
    68px 3px 0 -10px rgba(255, 255, 255, 0.8),
    30px 10px 0 -6px rgba(255, 255, 255, 0.75),
    42px 18px 0 -12px rgba(255, 255, 255, 0.6),
    15px -5px 0 -8px rgba(255, 255, 255, 0.7);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
/* 慢悠悠的飘动动画，带上下浮动 */
@keyframes floatMove1 {
  0% {
    transform: translateX(0px) translateY(0px);
    opacity: 0.8;
  }
  20% {
    transform: translateX(20vw) translateY(-8px);
    opacity: 0.9;
  }
  40% {
    transform: translateX(40vw) translateY(5px);
    opacity: 0.85;
  }
  60% {
    transform: translateX(60vw) translateY(-6px);
    opacity: 0.9;
  }
  80% {
    transform: translateX(80vw) translateY(4px);
    opacity: 0.8;
  }
  100% {
    transform: translateX(110vw) translateY(0px);
    opacity: 0.6;
  }
}

@keyframes floatMove2 {
  0% {
    transform: translateX(0px) translateY(0px);
    opacity: 0.7;
  }
  25% {
    transform: translateX(25vw) translateY(6px);
    opacity: 0.85;
  }
  45% {
    transform: translateX(45vw) translateY(-4px);
    opacity: 0.9;
  }
  65% {
    transform: translateX(65vw) translateY(7px);
    opacity: 0.8;
  }
  85% {
    transform: translateX(85vw) translateY(-3px);
    opacity: 0.85;
  }
  100% {
    transform: translateX(110vw) translateY(2px);
    opacity: 0.6;
  }
}

@keyframes floatMove3 {
  0% {
    transform: translateX(0px) translateY(0px);
    opacity: 0.75;
  }
  15% {
    transform: translateX(15vw) translateY(-5px);
    opacity: 0.8;
  }
  35% {
    transform: translateX(35vw) translateY(8px);
    opacity: 0.85;
  }
  55% {
    transform: translateX(55vw) translateY(-7px);
    opacity: 0.8;
  }
  75% {
    transform: translateX(75vw) translateY(3px);
    opacity: 0.85;
  }
  90% {
    transform: translateX(90vw) translateY(-4px);
    opacity: 0.75;
  }
  100% {
    transform: translateX(110vw) translateY(1px);
    opacity: 0.6;
  }
}

/* 确保文字内容在云朵之上 */
.title-input,
.cloud-background span {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
</style>
