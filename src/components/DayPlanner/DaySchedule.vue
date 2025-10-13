<!--
  Component: DaySchedule.vue
-->
<template>
  <div class="table-container">
    <table class="full-width-table">
      <!-- 表头部分，可单独调整样式 -->
      <colgroup>
        <!-- 勾选 -->
        <col class="col-check" />
        <!-- 开始 -->
        <col class="col-start" />
        <!-- 结束 -->
        <col class="col-end" />
        <!-- 时长 -->
        <col class="col-duration" />
        <!-- 意图 -->
        <col class="col-intent" />
        <!-- 地点 -->
        <col class="col-location" />
        <!-- 状态 -->
        <col class="col-status" />
      </colgroup>

      <thead>
        <tr>
          <th class="col-check"></th>
          <th class="col-start">开始</th>
          <th class="col-end">结束</th>
          <th class="col-duration">时长</th>
          <th class="col-intent">意图</th>
          <th class="col-location">地点</th>
          <th class="col-status">状态</th>
        </tr>
      </thead>

      <!-- 表格内容部分，可单独调整样式 -->
      <tbody>
        <template v-if="schedules && schedules!.length > 0">
          <!-- 行 -->
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
            @click.stop="handleRowClick(schedule)"
            style="cursor: pointer"
          >
            <!-- 单元格 -->
            <!-- 1 完成状态 -->
            <td class="col-check">
              <n-checkbox
                v-if="schedule.status !== 'cancelled'"
                :checked="schedule.status === 'done'"
                @update:checked="handleCheckboxChange(schedule.id, $event)"
              />
              <n-icon v-else class="cancel-icon" color="var(--color-text-secondary)">
                <DismissSquare20Filled />
              </n-icon>
            </td>

            <!-- 2 开始时间 -->
            <td class="col-start">
              {{ schedule.activityDueRange ? timestampToTimeString(schedule.activityDueRange[0]) : "-" }}
            </td>

            <!-- 3 结束时间 -->
            <td
              class="col-end"
              @dblclick.stop="startEditing(schedule.id, 'done')"
              :title="editingRowId === schedule.id && editingField === 'done' ? '' : '双击编辑'"
            >
              <input
                class="done-input time-input"
                v-if="editingRowId === schedule.id && editingField === 'done'"
                v-model="editingValue"
                @blur="saveEdit(schedule)"
                @keyup.enter="saveEdit(schedule)"
                @keyup.esc="cancelEdit"
                :data-schedule-id="schedule.id"
                maxlength="5"
                autocomplete="off"
              />
              <span v-else>{{ schedule.doneTime ? timestampToTimeString(schedule.doneTime) : "-" }}</span>
            </td>

            <!-- 4 时长 -->
            <td class="col-duration" :class="{ 'is-empty-min': schedule.activityDueRange?.[1] === '' }">
              {{ (schedule.activityDueRange?.[1] ?? "") !== "" ? schedule.activityDueRange[1] : "min" }}
            </td>

            <!-- 5 意图 -->
            <td
              class="col-intent"
              :class="{
                'done-cell': schedule.status === 'done',
                'cloud-background': schedule.isUntaetigkeit === true,
                'cancel-cell': schedule.status === 'cancelled',
              }"
              @dblclick.stop="startEditing(schedule.id, 'title')"
              :title="editingRowId === schedule.id && editingField === 'title' ? '' : '双击编辑'"
            >
              <input
                class="title-input"
                v-if="editingRowId === schedule.id && editingField === 'title'"
                v-model="editingValue"
                @blur="saveEdit(schedule)"
                @keyup.enter="saveEdit(schedule)"
                @keyup.esc="cancelEdit"
                @click.stop
                :data-schedule-id="schedule.id"
              />
              <span class="ellipsis" v-else>{{ schedule.activityTitle ?? "-" }}</span>

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

            <!-- 6 地点 -->
            <td class="col-location">
              <span class="ellipsis">
                {{ schedule.location ?? "-" }}
              </span>
            </td>

            <!-- 7 状态 -->
            <td class="status-col">
              <div
                class="status-cell"
                :class="{
                  'check-mode': schedule.status === 'done' || schedule.status === 'cancelled',
                }"
              >
                <div class="records-stat">&nbsp;</div>
                <div
                  class="button-group"
                  :class="{
                    converted: !schedule.taskId,
                  }"
                  v-if="schedule.status !== 'done' && schedule.status !== 'cancelled'"
                >
                  <n-button
                    class="convert-button"
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
                    class="cancel-button"
                    v-if="schedule.isUntaetigkeit !== true"
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
                </div>
              </div>
            </td>
          </tr>
        </template>
        <tr v-else class="empty-row">
          <td colspan="7" style="text-align: center; padding: 10px">暂无日程</td>
        </tr>
      </tbody>
    </table>
  </div>
  <n-popover v-model:show="showPopover" trigger="manual" placement="top-end" style="width: 200px">
    <template #trigger>
      <div style="position: fixed; bottom: 20px; right: 20px; width: 1px; height: 1px"></div>
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

// 定义 Props
const props = defineProps<{
  schedules: Schedule[];
  activeId: number | null | undefined;
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
    const input = document.querySelector(`input.${field}-input[data-schedule-id="${scheduleId}"]`);
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
  return /^\d{2}:\d{2}$/.test(str) && +str.split(":")[0] <= 24 && +str.split(":")[1] < 60;
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

  const task = taskService.createTaskFromSchedule(schedule.id, schedule.activityTitle, schedule.projectName);
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
  border-collapse: collapse;
  table-layout: fixed;
}
col.col-check {
  width: 22px;
}

col.col-start {
  width: 40px;
}

col.col-end {
  width: 40px;
}

col.col-duration {
  width: 35px;
}
col.col-intent {
  width: 60%;
  min-width: 140px;
}
col.col-location {
  width: 40%;
  min-width: 75px;
}

col.col-status {
  width: 87px;
}

thead th,
tbody td {
  box-sizing: border-box; /* 避免 padding/border 影响固定计算 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 表头样式 */
thead th {
  padding: 2px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  height: 20px;
  font-weight: 400;
  border-bottom: 2px solid var(--color-background-dark);
  color: var(--color-text-primary);
  background-color: var(--color-background) !important;
  line-height: 1.3;
  box-sizing: border-box;
}

/* 行样式 */
/* 隔行变色 */
tr:nth-child(even) {
  background-color: var(--color-background-light-transparent);
}

/* hover 高亮（不加 !important，便于被 selected/active 覆盖） */
tr:hover {
  background-color: var(--color-cyan-light-transparent);
}

/* 激活行样式（覆盖一切） */
tr.active-row {
  background-color: var(--color-red-light-transparent) !important;
}

/* 选中行样式（覆盖一切） */
tr.selected-row {
  background-color: var(--color-yellow-transparent) !important;
}

/* 当同时 active + selected 时，明确以 selected 的颜色为准（可留可删） */
tr.active-row.selected-row {
  background-color: var(--color-yellow-transparent) !important;
}

/* 统一过渡效果 */
tr,
tr:hover,
tr.active-row,
tr.selected-row {
  transition: background-color 0.2s ease;
}

/* 行状态样式 */
tr.done-row {
  color: var(--color-text-secondary);
}

tr.done-cell {
  text-decoration: line-through var(--color-text-secondary) 0.5px;
}

tr.cancel-row {
  color: var(--color-text-secondary);
}

tr.cancel-cell {
  font-style: italic;
}

tr.empty-row {
  height: 30px;
  text-align: center;
  color: var(--color-text-secondary);
  width: 100%;
  border-bottom: 1px solid var(--color-background);
}

/* 表格内容样式 */
tbody td {
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 28px;
  line-height: 18px;
  padding: 2px 0px;
  border-bottom: 1px solid var(--color-background-dark);
}

td.col-check {
  padding-left: 1px;
}

td:first-child,
td:nth-child(2),
td:nth-child(3),
td:nth-child(4) {
  text-align: center;
}

td:nth-child(7) {
  min-height: 25px;
  height: 25px;
}

th.status-col,
td.status-col {
  white-space: nowrap;
  text-align: right;
  min-width: 0;
}

/* 补充：让省略容器具备可计算宽度并允许收缩 */
.col-location .ellipsis,
.col-intent .ellipsis {
  display: block; /* 或 inline-block */
  width: 100%;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.button-group.converted {
  padding-left: 38px;
}

.convert-button {
  left: 1px;
}

:deep(.n-button) :hover {
  color: var(--color-red);
}

.cancel-icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  transform: scale(1.4) translateY(2px) !important;
  transform-origin: center;
}

.cancel-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* 云朵样式 */
.cloud-background {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #ffffff7b 0%, #b2d3f585 50%, #dff6ff24 100%) !important;
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
  box-shadow: 15px 5px 0 5px rgba(255, 255, 255, 0.7), 25px -10px 0 -5px rgba(255, 255, 255, 0.8), 40px -5px 0 rgba(255, 255, 255, 0.6),
    55px 2px 0 -8px rgba(255, 255, 255, 0.7), 25px 8px 0 -5px rgba(255, 255, 255, 0.8), 35px 15px 0 -10px rgba(255, 255, 255, 0.6);
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
  box-shadow: 10px 3px 0 3px rgba(255, 255, 255, 0.8), 20px -8px 0 -3px rgba(255, 255, 255, 0.7), 32px -3px 0 rgba(255, 255, 255, 0.6),
    42px 1px 0 -5px rgba(255, 255, 255, 0.8), 20px 6px 0 -3px rgba(255, 255, 255, 0.7);
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
  box-shadow: 18px 6px 0 6px rgba(255, 255, 255, 0.8), 30px -12px 0 -6px rgba(255, 255, 255, 0.7), 50px -6px 0 rgba(255, 255, 255, 0.65),
    68px 3px 0 -10px rgba(255, 255, 255, 0.8), 30px 10px 0 -6px rgba(255, 255, 255, 0.75), 42px 18px 0 -12px rgba(255, 255, 255, 0.6),
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
  box-shadow: 15px 5px 0 5px rgba(255, 255, 255, 0.7), 25px -10px 0 -5px rgba(255, 255, 255, 0.8), 40px -5px 0 rgba(255, 255, 255, 0.6),
    55px 2px 0 -8px rgba(255, 255, 255, 0.7), 25px 8px 0 -5px rgba(255, 255, 255, 0.8), 35px 15px 0 -10px rgba(255, 255, 255, 0.6);
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
  box-shadow: 10px 3px 0 3px rgba(255, 255, 255, 0.8), 20px -8px 0 -3px rgba(255, 255, 255, 0.7), 32px -3px 0 rgba(255, 255, 255, 0.6),
    42px 1px 0 -5px rgba(255, 255, 255, 0.8), 20px 6px 0 -3px rgba(255, 255, 255, 0.7);
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
  box-shadow: 18px 6px 0 6px rgba(255, 255, 255, 0.8), 30px -12px 0 -6px rgba(255, 255, 255, 0.7), 50px -6px 0 rgba(255, 255, 255, 0.65),
    68px 3px 0 -10px rgba(255, 255, 255, 0.8), 30px 10px 0 -6px rgba(255, 255, 255, 0.75), 42px 18px 0 -12px rgba(255, 255, 255, 0.6),
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
