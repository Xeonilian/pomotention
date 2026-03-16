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
          <th class="col-check">
            <n-button text type="info" @click.stop="handleQuickAddSchedule" title="快速新增日程" class="add-schedule-button">
              <template #icon>
                <n-icon size="20">
                  <CalendarAdd20Regular />
                </n-icon>
              </template>
            </n-button>
          </th>
          <th
            class="col-start"
            :class="{ 'disabled-toggle': !selectedSchedule, 'header-active': !!selectedSchedule }"
            @click.stop="selectedRowId && handleFillCurrentTimeStart()"
            :title="selectedRowId ? '点击填入当前时间' : '请先选中一行'"
          >
            <n-icon size="20" class="header-icon">
              <Play20Regular />
            </n-icon>
          </th>
          <th
            class="col-end"
            :class="{ 'disabled-toggle': !selectedSchedule, 'header-active': !!selectedSchedule }"
            @click.stop="selectedRowId && handleFillCurrentTimeEnd()"
            :title="selectedRowId ? '点击填入当前时间' : '请先选中一行'"
          >
            <n-icon size="20" class="header-icon">
              <RecordStop20Regular />
            </n-icon>
          </th>
          <th class="col-duration">
            <n-icon size="20" class="header-icon">
              <ShiftsActivity20Regular />
            </n-icon>
          </th>
          <th class="col-intent" @click.stop="selectedRowId && handleFillCurrentTitle()" title="将当前日程意图复制到任务备注">
            <n-icon size="20" title="意图" class="header-icon"><Thinking20Regular /></n-icon>
          </th>
          <th class="col-location">
            <n-icon size="20" class="header-icon">
              <Location20Regular />
            </n-icon>
          </th>
          <th class="col-status">
            <!-- 表头操作：对选中行执行取消，仅对未完成日程生效 -->
            <n-button
              class="cancel-button"
              v-if="selectedSchedule && selectedSchedule.status !== 'done' && selectedSchedule.status !== 'cancelled'"
              text
              type="default"
              @click.stop="handleCancelSelectedSchedule"
              title="取消选中日程"
              :class="{ 'disabled-toggle': !selectedRowId, 'header-active': !!selectedRowId }"
            >
              <template #icon>
                <n-icon size="20">
                  <DismissCircle20Regular />
                </n-icon>
              </template>
            </n-button>
          </th>
        </tr>
      </thead>

      <!-- 表格内容部分，可单独调整样式 -->
      <tbody>
        <template v-if="schedulesForCurrentView && schedulesForCurrentView!.length > 0">
          <!-- 行 -->
          <tr
            v-for="schedule in sortedSchedules"
            :key="schedule.id"
            :class="{
              'active-row': schedule.activityId === activeId,
              'selected-row': schedule.id === selectedRowId,
              'done-row': schedule.status === 'done' && isViewDateToday,
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
                :size="isMobile ? 'small' : 'medium'"
                :checked="schedule.status === 'done'"
                @update:checked="handleCheckboxChange(schedule.id, $event)"
              />
              <n-icon
                v-else
                class="cancel-icon"
                color="var(--color-text-secondary)"
                style="cursor: pointer"
                title="点击撤销取消"
                @click.stop="handleUncancelSchedule(schedule.id)"
              >
                <DismissSquare20Filled />
              </n-icon>
            </td>

            <!-- 2 开始时间 -->
            <td
              class="col-start"
              @click.stop="startEditing(schedule.id, 'start')"
              :title="editingRowId === schedule.id && editingField === 'start' ? '' : '单击编辑'"
            >
              <input
                class="start-input time-input"
                v-if="editingRowId === schedule.id && editingField === 'start'"
                :ref="(el: any) => (startInputRef = el)"
                v-model="editingValue"
                @blur="saveEdit(schedule)"
                @keyup.enter="saveEdit(schedule)"
                @keyup.esc="cancelEdit"
                :data-schedule-id="schedule.id"
                maxlength="5"
                autocomplete="off"
              />
              <span v-else>{{ schedule.activityDueRange?.[0] ? formatTimeForDisplay(schedule.activityDueRange[0]) : "-" }}</span>
            </td>

            <!-- 3 结束时间 -->
            <td
              class="col-end"
              @click.stop="startEditing(schedule.id, 'done')"
              :title="editingRowId === schedule.id && editingField === 'done' ? '' : '单击编辑'"
            >
              <input
                class="done-input time-input"
                v-if="editingRowId === schedule.id && editingField === 'done'"
                :ref="(el: any) => (doneInputRef = el)"
                v-model="editingValue"
                @blur="saveEdit(schedule)"
                @keyup.enter="saveEdit(schedule)"
                @keyup.esc="cancelEdit"
                :data-schedule-id="schedule.id"
                maxlength="5"
                autocomplete="off"
              />
              <span v-else>{{ schedule.doneTime ? formatTimeForDisplay(schedule.doneTime) : "-" }}</span>
            </td>

            <!-- 4 时长 -->
            <td
              class="col-duration"
              :class="{ 'is-empty-min': schedule.activityDueRange?.[1] === '' }"
              @click.stop="startEditing(schedule.id, 'duration')"
              :title="editingRowId === schedule.id && editingField === 'duration' ? '' : '单击编辑'"
            >
              <input
                class="duration-input time-input"
                v-if="editingRowId === schedule.id && editingField === 'duration'"
                :ref="(el: any) => (durationInputRef = el)"
                v-model="editingValue"
                @blur="saveEdit(schedule)"
                @keyup.enter="saveEdit(schedule)"
                @keyup.esc="cancelEdit"
                :data-schedule-id="schedule.id"
                maxlength="4"
                autocomplete="off"
              />
              <span v-else>{{ (schedule.activityDueRange?.[1] ?? "") !== "" ? schedule.activityDueRange[1] : "min" }}</span>
            </td>

            <!-- 5 意图 -->
            <td
              class="col-intent"
              :class="{
                'cloud-background': schedule.isUntaetigkeit === true,
              }"
              @click.stop="handleRowClick(schedule)"
              @dblclick.stop="startEditing(schedule.id, 'title')"
              @touchstart.stop="handleTitleTouchStart($event, schedule)"
              @touchend.stop="handleTitleTouchEnd($event, schedule)"
              @touchcancel.stop="handleTitleTouchCancel(schedule)"
              :title="editingRowId === schedule.id && editingField === 'title' ? '' : '单击编辑'"
            >
              <input
                class="title-input"
                v-if="editingRowId === schedule.id && editingField === 'title'"
                :ref="(el: any) => (titleInputRef = el)"
                v-model="editingValue"
                @blur="saveEdit(schedule)"
                @keyup.enter="saveEdit(schedule)"
                @keyup.esc="cancelEdit"
                @input="handleTitleInput(schedule)"
                @keydown="handleInputKeydown($event, schedule)"
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
            <td
              class="col-location"
              @click.stop="handleRowClick(schedule)"
              @dblclick.stop="startEditing(schedule.id, 'location')"
              @touchstart.stop="handleLocationTouchStart($event, schedule)"
              @touchend.stop="handleLocationTouchEnd($event, schedule)"
              @touchcancel.stop="handleLocationTouchCancel(schedule)"
              :title="editingRowId === schedule.id && editingField === 'location' ? '' : '单击编辑'"
            >
              <input
                class="location-input"
                v-if="editingRowId === schedule.id && editingField === 'location'"
                :ref="(el: any) => (locationInputRef = el)"
                v-model="editingValue"
                @blur="saveEdit(schedule)"
                @keyup.enter="saveEdit(schedule)"
                @keyup.esc="cancelEdit"
                @click.stop
                :data-schedule-id="schedule.id"
                autocomplete="off"
              />
              <span class="ellipsis" v-else>
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
                <div class="records-stat" title="能量值 | 奖赏值 | 内部打扰 | 外部打扰">
                  <span style="color: var(--color-blue)">{{ averageValue(schedule.energyRecords) }}</span>
                  <span style="color: var(--color-text-secondary)">{{ averageValue(schedule.rewardRecords) }}</span>
                  <span style="color: var(--color-red)">{{ countInterruptions(schedule.interruptionRecords, "I") }}</span>
                  <span style="color: var(--color-text-secondary)">{{ countInterruptions(schedule.interruptionRecords, "E") }}</span>
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
  <!-- Tag Selector Popover -->
  <n-popover
    :show="tagEditor.popoverTargetId.value !== null && schedulesForCurrentView.some((s) => s.id === tagEditor.popoverTargetId.value)"
    @update:show="(show) => !show && (tagEditor.popoverTargetId.value = null)"
    placement="bottom-start"
    :trap-focus="false"
    trigger="manual"
    :show-arrow="false"
    style="padding: 0; border-radius: 6px; margin-top: -30px; margin-left: 130px; z-index: 10000"
    :z-index="10000"
  >
    <template #trigger>
      <span style="position: absolute; pointer-events: none"></span>
    </template>
    <TagSelector
      :ref="(el) => (tagSelectorRef = el)"
      :search-term="tagEditor.tagSearchTerm.value"
      :allow-create="true"
      @select-tag="(tagId: any) => handleTagSelected(tagId)"
      @create-tag="(tagName: any) => handleTagCreate(tagName)"
      @close-selector="tagEditor.popoverTargetId.value = null"
    />
  </n-popover>
</template>

<script setup lang="ts">
import type { Schedule } from "@/core/types/Schedule";
import { timestampToTimeString } from "@/core/utils";
import { NCheckbox, NButton, NIcon, NPopover } from "naive-ui";
import {
  CalendarAdd20Regular,
  DismissCircle20Regular,
  DismissSquare20Filled,
  Play20Regular,
  RecordStop20Regular,
  Thinking20Regular,
  ShiftsActivity20Regular,
  Location20Regular,
} from "@vicons/fluent";
// import { taskService } from "@/services/taskService";
import { ref, nextTick, computed } from "vue";
import { Task } from "@/core/types/Task";

import { useDataStore } from "@/stores/useDataStore";
import { storeToRefs } from "pinia";
import { useActivityTagEditor } from "@/composables/useActivityTagEditor";
import TagSelector from "../TagSystem/TagSelector.vue";
import { useDevice } from "@/composables/useDevice";
import { useLongPress } from "@/composables/useLongPress";

const dataStore = useDataStore();
const { isMobile } = useDevice();
const { activeId, selectedRowId, selectedActivityId, selectedTaskId, selectedTask, schedulesForCurrentView } = storeToRefs(dataStore);

// 当前视图是否为今天（仅今天时已完成行才变灰）
const dateService = dataStore.dateService;
const isViewDateToday = computed(() => dateService.isViewDateToday);

// 编辑用
const editingRowId = ref<number | null>(null);
const editingField = ref<null | "title" | "start" | "done" | "duration" | "location">(null);
const editingValue = ref("");
const titleInputRef = ref<HTMLInputElement | null>(null);
const startInputRef = ref<HTMLInputElement | null>(null);
const doneInputRef = ref<HTMLInputElement | null>(null);
const durationInputRef = ref<HTMLInputElement | null>(null);
const locationInputRef = ref<HTMLInputElement | null>(null);
const titleLongPressMap = ref(
  new Map<
    number,
    {
      longPressTriggered: { value: boolean };
      onLongPressStart: (e: TouchEvent | MouseEvent) => void;
      onLongPressEnd: () => void;
      onLongPressCancel: () => void;
    }
  >(),
);
const locationLongPressMap = ref(
  new Map<
    number,
    {
      longPressTriggered: { value: boolean };
      onLongPressStart: (e: TouchEvent | MouseEvent) => void;
      onLongPressEnd: () => void;
      onLongPressCancel: () => void;
    }
  >(),
);

// 定义 Emit

const emit = defineEmits<{
  (e: "update-schedule-status", id: number, checked: boolean): void;
  (e: "cancel-schedule", id: number): void;
  (e: "uncancel-schedule", id: number): void;
  (e: "edit-schedule-title", id: number, newTitle: string): void;
  (e: "edit-schedule-start", id: number, newTs: string): void;
  (e: "edit-schedule-done", id: number, newTs: string): void;
  (e: "edit-schedule-duration", id: number, newDurationMin: string): void;
  (e: "edit-schedule-location", id: number, newLocation: string): void;
  (
    e: "convert-schedule-to-task",
    payload: {
      task: Task;
      activityId: number;
    },
  ): void;
  (e: "quick-add-schedule"): void;
}>();

// 添加状态来控制提示信息
const showPopover = ref(false);
const popoverMessage = ref("");

// Tag Editor
const tagEditor = useActivityTagEditor();
const tagSelectorRef = ref<any>(null);

// 根据设备类型格式化时间显示，移动端去掉冒号
function formatTimeForDisplay(timestamp?: number | null) {
  if (!timestamp) return "-";
  const timeString = timestampToTimeString(timestamp);
  if (isMobile.value) {
    return timeString.replace(":", "");
  }
  return timeString;
}

const sortedSchedules = computed(() =>
  schedulesForCurrentView.value.sort((a, b) => {
    const aValue = a.activityDueRange?.[0] ?? Infinity;
    const bValue = b.activityDueRange?.[0] ?? Infinity;
    return aValue - bValue;
  }),
);

// 当前选中的日程（表头取消按钮用）
const selectedSchedule = computed(() =>
  selectedRowId.value == null ? null : (sortedSchedules.value.find((s) => s.id === selectedRowId.value) ?? null),
);

function handleCheckboxChange(id: number, checked: boolean) {
  emit("update-schedule-status", id, checked);
}

// 修改点击行处理函数
function handleRowClick(schedule: Schedule) {
  // 取消激活活动
  // if (schedule.status !== "done" && schedule.status !== "cancelled") {
  //   activeId.value = schedule.activityId;
  // } else {
  //   activeId.value = undefined;
  // }
  activeId.value = undefined;
  selectedRowId.value = schedule.id;
  selectedActivityId.value = schedule.activityId;
  selectedTaskId.value = schedule.taskId ?? null;
}

// 快速新增日程
function handleQuickAddSchedule() {
  emit("quick-add-schedule");
}

// 将当前选中待办的意图同步到任务备注
function handleFillCurrentTitle() {
  if (!selectedRowId.value) return;
  const schedule = schedulesForCurrentView.value.find((s) => s.id === selectedRowId.value);
  if (!schedule) return;
  const taskId = selectedTaskId.value;
  if (taskId == null) return;
  const titleForHeader = (schedule.activityTitle ?? "").trim();
  const originalDescription = selectedTask.value?.description ?? "";
  let newDescription = originalDescription;
  const trimmed = originalDescription.trim();
  if (!trimmed || trimmed === "#") {
    // 如果任务描述为空或只有一个 #，写入「# 标题\n」
    newDescription = titleForHeader ? `# ${titleForHeader}\n` : originalDescription;
  } else if (titleForHeader) {
    // 如果已有内容，只替换第一个换行前的内容
    const firstNewlineIndex = originalDescription.indexOf("\n");
    const rest = firstNewlineIndex !== -1 ? originalDescription.slice(firstNewlineIndex) : "\n";
    newDescription = `# ${titleForHeader}${rest}`;
  }
  dataStore.updateTaskById(taskId, {
    description: newDescription,
  });
}

// 表头点击「开始」：给选中行填入当前时间（HH:mm），对应 activityDueRange[0]
function handleFillCurrentTimeStart() {
  if (!selectedRowId.value) return;
  const now = new Date();
  const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  emit("edit-schedule-start", selectedRowId.value, ts);
  // 将当前选中待办的意图同步到任务备注

  if (!selectedRowId.value) return;
  const schedule = schedulesForCurrentView.value.find((s) => s.id === selectedRowId.value);
  if (!schedule) return;
  const taskId = selectedTaskId.value;
  if (taskId == null) return;
  const titleForHeader = (schedule.activityTitle ?? "").trim();
  const originalDescription = selectedTask.value?.description ?? "";
  let newDescription = originalDescription;
  const trimmed = originalDescription.trim();
  if (!trimmed || trimmed === "#") {
    // 如果任务描述为空或只有一个 #，写入「# 标题\n」
    newDescription = titleForHeader ? `# ${titleForHeader}\n` : originalDescription;
  } else if (titleForHeader) {
    // 如果已有内容，只替换第一个换行前的内容
    const firstNewlineIndex = originalDescription.indexOf("\n");
    const rest = firstNewlineIndex !== -1 ? originalDescription.slice(firstNewlineIndex) : "\n";
    newDescription = `# ${titleForHeader}${rest}`;
  }
  dataStore.updateTaskById(taskId, {
    description: newDescription,
  });
}

// 表头点击「结束」：给选中行填入当前时间（HH:mm），对应 doneTime
function handleFillCurrentTimeEnd() {
  if (!selectedRowId.value) return;
  const now = new Date();
  const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  emit("edit-schedule-done", selectedRowId.value, ts);
}

// 编辑相关函数
function startEditing(scheduleId: number, field: "title" | "start" | "done" | "duration" | "location") {
  const schedule = schedulesForCurrentView.value.find((s) => s.id === scheduleId);
  if (!schedule) return;
  editingRowId.value = scheduleId;
  editingField.value = field;
  editingValue.value =
    field === "title"
      ? schedule.activityTitle || ""
      : field === "start"
        ? schedule.activityDueRange?.[0]
          ? timestampToTimeString(schedule.activityDueRange[0])
          : ""
        : field === "duration"
          ? (schedule.activityDueRange?.[1] ?? "")
          : field === "location"
            ? (schedule.location ?? "")
            : schedule.doneTime
              ? timestampToTimeString(schedule.doneTime)
              : "";

  // 单击后激活光标：用 ref 聚焦，与 DayTodo 一致；v-if 挂载后再等一帧
  nextTick(() => {
    nextTick(() => {
      if (field === "title") titleInputRef.value?.focus();
      else if (field === "start") startInputRef.value?.focus();
      else if (field === "done") doneInputRef.value?.focus();
      else if (field === "duration") durationInputRef.value?.focus();
      else if (field === "location") locationInputRef.value?.focus();
    });
  });
}

function saveEdit(schedule: Schedule) {
  if (!editingRowId.value) return;

  // 如果输入框中有 # 开头的文本，清理并关闭 popover
  if (editingValue.value.includes("#") && tagEditor.popoverTargetId.value) {
    editingValue.value = tagEditor.clearTagTriggerText(editingValue.value);
    tagEditor.closePopover();
  }

  if (editingField.value === "title") {
    if (editingValue.value.trim()) {
      emit("edit-schedule-title", schedule.id, editingValue.value.trim());
    }
  }

  if (editingField.value === "done") {
    const normalized = normalizeTimeInput(editingValue.value);
    if (normalized === "") {
      emit("edit-schedule-done", schedule.id, "");
    } else if (typeof normalized === "string") {
      emit("edit-schedule-done", schedule.id, normalized); // 注意这里是 timestring 不是timestamp，是在Home用currentViewdate进行的转化
    }
  }

  if (editingField.value === "start") {
    const normalized = normalizeTimeInput(editingValue.value);
    if (typeof normalized === "string" && normalized !== "") {
      emit("edit-schedule-start", schedule.id, normalized);
    } else if (editingValue.value === "") {
      emit("edit-schedule-start", schedule.id, "");
    }
  }

  if (editingField.value === "duration") {
    // 允许为空（显示为 min），允许数字字符串
    const raw = editingValue.value.trim();
    if (raw === "") {
      emit("edit-schedule-duration", schedule.id, "");
    } else if (/^\d{1,4}$/.test(raw)) {
      emit("edit-schedule-duration", schedule.id, raw);
    }
  }

  if (editingField.value === "location") {
    // 地点允许为空
    emit("edit-schedule-location", schedule.id, editingValue.value.trim());
  }
  cancelEdit();
}

function cancelEdit() {
  // 如果输入框中有 # 开头的文本，清理并关闭 popover
  if (editingValue.value.includes("#") && tagEditor.popoverTargetId.value) {
    editingValue.value = tagEditor.clearTagTriggerText(editingValue.value);
    tagEditor.closePopover();
  }
  editingRowId.value = null;
  editingField.value = null;
  editingValue.value = "";
}

// 规范化时间输入，支持多种格式并返回 HH:mm
function normalizeTimeInput(raw: string): string | "" | null {
  const value = raw.trim();
  if (!value) return "";

  // 带冒号形式，如 7:3 / 07:11
  const colonMatch = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colonMatch) {
    let hours = parseInt(colonMatch[1], 10);
    let minutes = parseInt(colonMatch[2], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return null;
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  // 四位纯数字，如 0711 / 1234
  if (/^\d{4}$/.test(value)) {
    const hours = parseInt(value.slice(0, 2), 10);
    const minutes = parseInt(value.slice(2), 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return null;
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  // 三位纯数字，前 1 位小时，后 2 位分钟，如 711 / 930 / 111
  if (/^\d{3}$/.test(value)) {
    const hours = parseInt(value.slice(0, 1), 10);
    const minutes = parseInt(value.slice(1), 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return null;
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  return null;
}

// 表头按钮：取消当前选中的日程
function handleCancelSelectedSchedule() {
  if (selectedRowId.value == null) return;
  const s = selectedSchedule.value;
  if (!s || s.status === "done" || s.status === "cancelled") return;
  emit("cancel-schedule", selectedRowId.value);
}

// 撤销取消
function handleUncancelSchedule(id: number) {
  emit("uncancel-schedule", id);
}

// Tag 相关函数
function handleTitleInput(schedule: Schedule) {
  tagEditor.handleContentInput(schedule.id, editingValue.value);
}

function handleInputKeydown(event: KeyboardEvent, schedule: Schedule) {
  if (tagEditor.popoverTargetId.value === schedule.id && tagSelectorRef.value) {
    switch (event.key) {
      case "ArrowDown":
        tagSelectorRef.value.navigateDown();
        event.preventDefault();
        break;
      case "ArrowUp":
        tagSelectorRef.value.navigateUp();
        event.preventDefault();
        break;
      case "Enter":
        tagSelectorRef.value.selectHighlighted();
        event.preventDefault();
        break;
      case "Escape":
        tagEditor.closePopover();
        event.preventDefault();
        break;
    }
  }

  // 特殊处理：# 键自动打开 popover
  if ((event.key === "#" || event.key === "@") && !tagEditor.popoverTargetId.value) {
    tagEditor.popoverTargetId.value = schedule.id;
  }
}

function getTitleLongPress(scheduleId: number) {
  let handler = titleLongPressMap.value.get(scheduleId);
  if (!handler) {
    handler = useLongPress({
      delay: 600,
      onLongPress: () => {
        startEditing(scheduleId, "title");
      },
    });
    titleLongPressMap.value.set(scheduleId, handler);
  }
  return handler;
}

function handleTitleTouchStart(e: TouchEvent, schedule: Schedule) {
  const longPress = getTitleLongPress(schedule.id);
  longPress.onLongPressStart(e);
}

function handleTitleTouchEnd(e: TouchEvent, schedule: Schedule) {
  e.stopPropagation();
  const longPress = getTitleLongPress(schedule.id);
  longPress.onLongPressEnd();
  handleRowClick(schedule);
}

function handleTitleTouchCancel(schedule: Schedule) {
  const longPress = getTitleLongPress(schedule.id);
  longPress.onLongPressCancel();
}

function getLocationLongPress(scheduleId: number) {
  let handler = locationLongPressMap.value.get(scheduleId);
  if (!handler) {
    handler = useLongPress({
      delay: 600,
      onLongPress: () => {
        startEditing(scheduleId, "location");
      },
    });
    locationLongPressMap.value.set(scheduleId, handler);
  }
  return handler;
}

function handleLocationTouchStart(e: TouchEvent, schedule: Schedule) {
  const longPress = getLocationLongPress(schedule.id);
  longPress.onLongPressStart(e);
}

function handleLocationTouchEnd(e: TouchEvent, schedule: Schedule) {
  e.stopPropagation();
  const longPress = getLocationLongPress(schedule.id);
  longPress.onLongPressEnd();
  handleRowClick(schedule);
}

function handleLocationTouchCancel(schedule: Schedule) {
  const longPress = getLocationLongPress(schedule.id);
  longPress.onLongPressCancel();
}

function handleTagSelected(tagId: number) {
  if (!tagEditor.popoverTargetId.value) return;
  const schedule = schedulesForCurrentView.value.find((s) => s.id === tagEditor.popoverTargetId.value);
  if (!schedule) return;

  const cleanedTitle = tagEditor.clearTagTriggerText(editingValue.value);
  editingValue.value = cleanedTitle;

  // 通过 activityId 给 Activity 添加标签
  dataStore.addTagToActivity(schedule.activityId, tagId);
  tagEditor.closePopover();
}

function handleTagCreate(tagName: string) {
  if (!tagEditor.popoverTargetId.value) return;
  const schedule = schedulesForCurrentView.value.find((s) => s.id === tagEditor.popoverTargetId.value);
  if (!schedule) return;

  const cleanedTitle = tagEditor.clearTagTriggerText(editingValue.value);
  editingValue.value = cleanedTitle;

  // 通过 activityId 创建并添加标签到 Activity
  dataStore.createAndAddTagToActivity(schedule.activityId, tagName);
  tagEditor.closePopover();
}

function averageValue<T extends { value: number }>(records: T[] | null | undefined): number | string {
  if (!Array.isArray(records) || records.length === 0) return "-";
  let sum = 0,
    count = 0;
  for (const r of records) {
    const v = r?.value;
    if (typeof v === "number" && Number.isFinite(v)) {
      sum += v;
      count++;
    }
  }
  const average = Math.round(sum / count);
  return count === 0 ? "-" : average === 10 ? "x" : average;
}

// 2) 统计中断类型数量（"E" 或 "I"）
// 空、null、undefined 或 [] 返回 null
function countInterruptions(records: { interruptionType: "E" | "I" }[] | null | undefined, type: "E" | "I"): number | string {
  if (!Array.isArray(records) || records.length === 0) return "-";
  let count = 0;
  for (const r of records) if (r?.interruptionType === type) count++;
  return count === 0 ? "-" : count > 10 ? "X" : count;
}
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
  width: 46px;
}

col.col-end {
  width: 46px;
}

col.col-duration {
  width: 24px;
}
col.col-intent {
  width: 55%;
  min-width: 0px;
}
col.col-location {
  width: 45%;
  min-width: 0px;
}

col.col-status {
  width: 60px;
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

td.col-start,
td.col-end,
td.col-duration {
  font-family: Consolas, "Courier New", Courier, monospace;
}

/* 开始/结束表头可点击，悬停为手型 */
th.col-start,
th.col-end {
  cursor: pointer;
}

/* 开始/结束表头无选中行时禁用 */
th.col-start.disabled-toggle,
th.col-end.disabled-toggle {
  cursor: not-allowed;
}

/* 有行选中时表头图标高亮为蓝色，表示可操作 */
th.col-start.header-active .header-icon,
th.col-end.header-active .header-icon {
  color: var(--color-textprimary);
}

.header-icon {
  transform: translateY(3px);
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

tr.cancel-row {
  color: var(--color-text-secondary);
}

tr.empty-row {
  height: 60px;
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

.title-input {
  padding: 0px 0px;
  width: calc(100% - 4px);
  border: 1px solid #40a9ff;
  border-radius: 4px;
  font-size: inherit;
  font-family: inherit;
  outline: none;
  background-color: #ffffff;
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

.duration-input {
  /* 固定时长输入框宽度，避免 focus 时撑开 */
  width: 24px !important;
  max-width: 24px !important;
  min-width: 0 !important;
  box-sizing: border-box;
  padding: 0px 0px;
  font-size: inherit;
}

.location-input {
  padding: 0px 0px;
  width: calc(100% - 4px);
  border: 1px solid #40a9ff;
  border-radius: 4px;
  font-size: inherit;
  font-family: inherit;
  outline: none;
  background-color: #ffffff;
}

.time-input {
  border: 1px solid #40a9ff;
  max-width: 100%;
  border-radius: 4px;
  font-size: inherit;
  font-family: inherit;
  outline: none;
  background-color: #ffffff;
}

/* 勾选 */
:deep(.n-checkbox) {
  --n-check-mark-color: var(--color-text-primary) !important;
  --n-color-checked: transparent !important;
  border-color: var(--color-text-primary);
  border-width: 1.2px;
}

/* 状态信息 */
.status-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}

/* 统计值为内联块，避免撑满 */
.records-stat {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 2px;
  font-family: Consolas, "Courier New", Courier, monospace;
  font-size: 14px;
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

.cancel-button {
  right: -2px;
  transform: translateY(3px);
}

@media (max-width: 430px) {
  thead th {
    border-bottom: 1px solid var(--color-background-dark) !important;
  }

  tbody td {
    border-bottom: 0px !important;
  }

  col.col-check {
    width: 20px;
    text-overflow: clip;
  }

  col.col-start {
    width: 32px;
    font-family: Consolas, "Courier New", Courier, monospace;
  }

  col.col-end {
    width: 32px;
    font-family: Consolas, "Courier New", Courier, monospace;
  }

  col.col-duration {
    width: 24px;
    text-overflow: clip;
  }

  col.col-status {
    width: 40px;
  }

  col.col-intent {
    width: 62%;
    min-width: 0px;
  }

  col.col-location {
    width: 38%;
    min-width: 0px;
  }

  td.col-start,
  td.col-end,
  td.col-duration,
  .time-input {
    font-size: 12px;
    text-overflow: clip;
    font-family: Consolas, "Courier New", Courier, monospace;
  }

  td.col-intent {
    text-overflow: clip !important;
  }

  td.col-intent .ellipsis {
    text-overflow: ellipsis !important;
  }

  .cancel-icon {
    width: 14px !important;
    height: 14px !important;
  }
}

.add-schedule-button {
  cursor: pointer;
  transform: translate(0px, 3px);
}

.cancel-button.header-active {
  color: var(--color-textprimary);
}
.cancel-button.header-active :deep(.n-icon) {
  color: var(--color-textprimary);
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
  animation:
    floatMove1 45s infinite linear,
    fadeIn 1.5s forwards;
  opacity: 0;
}

.cloud-1::before {
  content: "";
  position: absolute;
  width: 50px;
  height: 30px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50px;
  box-shadow:
    15px 5px 0 5px rgba(255, 255, 255, 0.7),
    25px -10px 0 -5px rgba(255, 255, 255, 0.8),
    40px -5px 0 rgba(255, 255, 255, 0.6),
    55px 2px 0 -8px rgba(255, 255, 255, 0.7),
    25px 8px 0 -5px rgba(255, 255, 255, 0.8),
    35px 15px 0 -10px rgba(255, 255, 255, 0.6);
}

.cloud-2 {
  top: 45%;
  left: -6%;
  animation:
    fadeIn 1.5s forwards,
    floatMove2 50s infinite linear;
  animation-delay:
    2s,
    -10s;
  opacity: 0;
}

.cloud-2::before {
  content: "";
  position: absolute;
  width: 40px;
  height: 25px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 40px;
  box-shadow:
    10px 3px 0 3px rgba(255, 255, 255, 0.8),
    20px -8px 0 -3px rgba(255, 255, 255, 0.7),
    32px -3px 0 rgba(255, 255, 255, 0.6),
    42px 1px 0 -5px rgba(255, 255, 255, 0.8),
    20px 6px 0 -3px rgba(255, 255, 255, 0.7);
}

.cloud-3 {
  top: 35%;
  left: -10%;
  animation:
    fadeIn 1.5s forwards,
    floatMove3 40s infinite linear;
  animation-delay:
    1s,
    -25s;
  opacity: 0;
}

.cloud-3::before {
  content: "";
  position: absolute;
  width: 60px;
  height: 35px;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 60px;
  box-shadow:
    18px 6px 0 6px rgba(255, 255, 255, 0.8),
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
  animation:
    fadeIn 3s,
    forwards floatMove1 45s infinite linear;
  opacity: 0;
  animation-delay:
    1s,
    -15s;
}

.cloud-4::before {
  content: "";
  position: absolute;
  width: 50px;
  height: 30px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50px;
  box-shadow:
    15px 5px 0 5px rgba(255, 255, 255, 0.7),
    25px -10px 0 -5px rgba(255, 255, 255, 0.8),
    40px -5px 0 rgba(255, 255, 255, 0.6),
    55px 2px 0 -8px rgba(255, 255, 255, 0.7),
    25px 8px 0 -5px rgba(255, 255, 255, 0.8),
    35px 15px 0 -10px rgba(255, 255, 255, 0.6);
}

.cloud-5 {
  top: 45%;
  left: -6%;
  animation:
    fadeIn 1.5s forwards,
    floatMove3 50s linear infinite;
  animation-delay:
    1s,
    -45s;
  opacity: 0;
}

.cloud-5::before {
  content: "";
  position: absolute;
  width: 40px;
  height: 30px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 40px;
  box-shadow:
    10px 3px 0 3px rgba(255, 255, 255, 0.8),
    20px -8px 0 -3px rgba(255, 255, 255, 0.7),
    32px -3px 0 rgba(255, 255, 255, 0.6),
    42px 1px 0 -5px rgba(255, 255, 255, 0.8),
    20px 6px 0 -3px rgba(255, 255, 255, 0.7);
}

.cloud-6 {
  top: 35%;
  left: -10%;
  animation:
    fadeIn 1.5s forwards,
    floatMove2 50s linear infinite;
  animation-delay:
    1s,
    -5s;
  opacity: 0;
}

.cloud-6::before {
  content: "";
  position: absolute;
  width: 60px;
  height: 35px;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 60px;
  box-shadow:
    18px 6px 0 6px rgba(255, 255, 255, 0.8),
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
.title-input {
  position: relative;
  z-index: 10;
  background-color: #ffffff;
}

.cloud-background span {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
</style>
