<!-- 
  Component: HomeView.vue 
  Description: 界面控制，数据管理
  Parent: App.vue
-->

<template>
  <div class="home-content">
    <!-- 左侧面板 (日程表) -->
    <div v-if="settingStore.settings.showSchedule" class="left" :style="{ width: leftWidth + 'px' }">
      <TimeTable @timetable-edit="onTimetableEdit" />
    </div>

    <!-- 左侧面板调整大小手柄 -->
    <div
      v-if="settingStore.settings.showSchedule"
      class="resize-handle-horizontal"
      style="touch-action: none"
      @pointerdown="startLeftResize"
    ></div>

    <!-- 中间内容区域 -->
    <div
      class="middle"
      :class="{
        'middle-alone': !settingStore.settings.showSchedule && !settingStore.settings.showActivity && !settingStore.settings.showAi,
      }"
    >
      <!-- 今日视图 -->
      <div
        v-if="settingStore.settings.showPlanner"
        class="middle-top"
        :style="settingStore.settings.showTask ? { height: topHeight + 'px' } : { height: '100%' }"
      >
        <!-- 任务计划的头部和控件 -->
        <div class="planner-header" @click.stop="cleanSelection">
          <div class="planner-header-left">
            <!-- 年入口：仅显示年份，点击进入年视图；在年视图时也只显示年份 -->
            <div class="day-info">
              <template v-if="settingStore.settings.viewSet !== 'year'">
                <span @click="onYearJump" class="day-status" title="进入年视图">
                  {{ settingStore.settings.showSchedule && isMobile ? dateService.displayYearInfo.slice(2) : dateService.displayYearInfo }}
                </span>
              </template>
              <template v-else>
                <span @click="onDayJump" class="day-status" title="进入日视图">
                  {{ dateService.displayYearInfo }}
                </span>
                <span @click="onDateSet('today')" class="global-pomo">
                  <span class="today-pomo">🍅{{ currentDatePomoCount }}</span>
                  <span class="total-pomo">/{{ globalRealPomo }}</span>
                </span>
              </template>
            </div>
            <div
              v-if="settingStore.settings.viewSet === 'day'"
              class="day-info"
              :class="{
                yesterday: isViewDateYesterday,
                tomorrow: isViewDateTomorrow,
              }"
            >
              <span @click="onWeekJump" class="day-status">{{ dateService.displayDateInfo }}</span>
              <span @click="onDateSet('today')" class="global-pomo">
                <span class="today-pomo">🍅{{ currentDatePomoCount }}</span>
                <span class="total-pomo">/{{ globalRealPomo }}</span>
              </span>
            </div>
            <div v-if="settingStore.settings.viewSet === 'week'" class="day-info">
              <span @click="onMonthJump" class="day-status">&nbsp;{{ dateService.displayWeekInfo }}</span>
              <span @click="onDateSet('today')" class="global-pomo">
                <span class="total-pomo">🍅{{ globalRealPomo }}</span>
              </span>
            </div>
            <div v-if="settingStore.settings.viewSet === 'month'" class="day-info">
              <span @click="onWeekJump" class="day-status">&nbsp;{{ dateService.displayMonthInfo }}</span>
              <span @click="onDateSet('today')" class="global-pomo">
                <span class="total-pomo">🍅{{ globalRealPomo }}</span>
              </span>
            </div>
          </div>
          <div
            class="marquee"
            :class="{ 'marquee-empty': settingStore.settings.marquee === '' }"
            v-if="!isEditing"
            @click="startEdit"
            title="点击编辑跑马灯"
          >
            <n-marquee v-if="settingStore.settings.marquee !== ''" class="marquee__inner">
              {{ settingStore.settings.marquee }}&nbsp;
            </n-marquee>
          </div>
          <input
            v-else
            v-model="editValue"
            class="marquee marquee-input"
            @keydown.enter="saveEdit"
            @keydown.esc="cancelEdit"
            @blur="cancelEdit"
            ref="inputRef"
          />
          <div class="button-group">
            <!-- 标签筛选：无筛选时打开 TagSelector；有筛选时一键清除 -->
            <n-popover
              v-model:show="showHomeTagSelector"
              trigger="manual"
              placement="bottom"
              :show-arrow="false"
              :style="{ '--n-padding': '0px' }"
            >
              <template #trigger>
                <n-button
                  ref="homeTagFilterBtnRef"
                  size="small"
                  text
                  :type="dataStore.filterTagIds.length > 0 ? 'info' : 'default'"
                  :title="dataStore.filterTagIds.length > 0 ? '清除标签筛选' : '标签筛选'"
                  @click.stop="handleHomeTagFilterButtonClick"
                >
                  <template #icon>
                    <n-icon>
                      <TagOff20Regular v-if="dataStore.filterTagIds.length > 0" />
                      <TagSearch20Regular v-else />
                    </n-icon>
                  </template>
                </n-button>
              </template>

              <TagSelector
                :search-term="tagEditor.tagSearchTerm.value"
                :allow-create="true"
                @select-tag="handleTagSelectForFilter"
                @close-selector="showHomeTagSelector = false"
              />
            </n-popover>

            <n-button
              title="重复活动"
              v-if="!isMobile"
              @click="onRepeatActivity"
              text
              type="info"
              size="small"
              :disabled="selectedRowId === null && activeId === null"
            >
              <template #icon>
                <n-icon><ArrowRepeatAll24Regular /></n-icon>
              </template>
            </n-button>
            <n-button
              v-if="!isMobile"
              :type="selectedRowId === null ? 'default' : 'info'"
              size="small"
              text
              @click="onIcsExport"
              title="导出 ICS / 二维码"
              :disabled="selectedRowId === null"
            >
              <template #icon>
                <n-icon>
                  <QrCode24Regular />
                </n-icon>
              </template>
            </n-button>
            <n-date-picker
              v-if="!isMobile"
              v-model:value="queryDate"
              type="date"
              placeholder="日期选择"
              @update:value="onDateSet('query')"
              class="search-date"
              placement="bottom"
              @click="onDateSet('today')"
              title="输入示例：2026-01-01"
            >
              <template #date-icon></template>
            </n-date-picker>
            <n-button v-if="!isMobile" size="small" text @click.stop="onViewSet()" title="切换视图">
              <template #icon>
                <n-icon color="var(--color-text-primary)">
                  <CalendarSettings20Regular />
                </n-icon>
              </template>
            </n-button>
            <n-button
              size="small"
              text
              @click="onDateSet('prev')"
              :title="
                settingStore.settings.viewSet === 'day'
                  ? '上一天'
                  : settingStore.settings.viewSet === 'week'
                    ? '上一周'
                    : settingStore.settings.viewSet === 'year'
                      ? '上一年'
                      : '上一月'
              "
            >
              <template #icon>
                <n-icon>
                  <ChevronLeft20Regular />
                </n-icon>
              </template>
            </n-button>

            <n-button
              size="small"
              text
              @click="onDateSet('next')"
              :title="
                settingStore.settings.viewSet === 'day'
                  ? '下一天'
                  : settingStore.settings.viewSet === 'week'
                    ? '下一周'
                    : settingStore.settings.viewSet === 'year'
                      ? '下一年'
                      : '下一月'
              "
            >
              <template #icon>
                <n-icon>
                  <ChevronRight20Regular />
                </n-icon>
              </template>
            </n-button>
          </div>
        </div>
        <!-- 今日视图容器 -->
        <div class="planner-view-container">
          <DayPlanner
            v-if="settingStore.settings.showPlanner && settingStore.settings.viewSet === 'day'"
            @update-schedule-status="onUpdateScheduleStatus"
            @cancel-schedule="onCancelSchedule"
            @uncancel-schedule="onUncancelSchedule"
            @edit-schedule-done="handleEditScheduleDone"
            @edit-schedule-title="handleEditScheduleTitle"
            @edit-schedule-start="handleEditScheduleStart"
            @edit-schedule-duration="handleEditScheduleDuration"
            @edit-schedule-location="handleEditScheduleLocation"
            @update-todo-status="onUpdateTodoStatus"
            @suspend-todo="onSuspendTodo"
            @cancel-todo="onCancelTodo"
            @uncancel-todo="onUncancelTodo"
            @update-todo-est="onUpdateTodoEst"
            @update-todo-pomo="onUpdateTodoPomo"
            @batch-update-priorities="onUpdateTodoPriority"
            @edit-todo-title="handleEditTodoTitle"
            @edit-todo-start="handleEditTodoStart"
            @edit-todo-done="handleEditTodoDone"
            @quick-add-todo="onQuickAddTodo"
            @quick-add-schedule="onQuickAddSchedule"
            @toggle-pomo-type="handleTogglePomoTypeTodoId"
          />
          <WeekPlanner
            v-if="settingStore.settings.showPlanner && settingStore.settings.viewSet === 'week'"
            @item-change="onItemChange"
            @date-select="onDateSelect"
            @date-select-day-view="onDateSelectDayView"
          />
          <MonthPlanner
            v-if="settingStore.settings.showPlanner && settingStore.settings.viewSet === 'month'"
            @item-change="onItemChange"
            @date-select="onDateSelect"
            @date-select-day-view="onDateSelectDayView"
          />
          <YearPlanner
            v-if="settingStore.settings.showPlanner && settingStore.settings.viewSet === 'year'"
            :key="dateService.displayYearInfo"
            @date-select-day-view="onDateSelectDayView"
            @navigate-to-month="onYearNavigateToMonth"
            @navigate-to-week="onYearNavigateToWeek"
          />
        </div>
      </div>
      <!-- 任务视图调整大小手柄 -->
      <div
        v-if="settingStore.settings.showTask && settingStore.settings.showPlanner"
        class="resize-handle"
        style="touch-action: none"
        @pointerdown="startVerticalResize"
      ></div>
      <!-- 任务视图 -->
      <div v-if="settingStore.settings.showTask" class="middle-bottom">
        <div class="task-container">
          <TaskTracker @task-record-editing="setTaskRecordEditing" />
        </div>
      </div>
    </div>

    <!-- 右侧面板调整大小手柄 -->
    <div
      v-if="settingStore.settings.showActivity || settingStore.settings.showAi"
      class="resize-handle-horizontal"
      style="touch-action: none"
      @pointerdown="startRightResize"
    ></div>

    <!-- 右侧面板 (活动清单) -->
    <div v-if="settingStore.settings.showActivity" class="right" :style="{ width: rightWidth + 'px' }">
      <ActivitySheet
        @pick-activity="onPickActivity"
        @add-activity="onAddActivity"
        @delete-activity="onDeleteActivity"
        @update-active-id="onUpdateActiveId"
        @toggle-pomo-type="onTogglePomoType"
        @create-child-activity="onCreateChildActivity"
        @increase-child-activity="onIncreaseChildActivity"
      />
    </div>
    <div v-if="settingStore.settings.showAi" class="right" :style="{ width: rightWidth + 'px' }">
      <!-- AI 对话对话框 -->
      <AIChatDialog />
    </div>
  </div>
  <MobileHomeFab
    v-if="isMobile"
    :task-record-editing="taskRecordEditing"
    @notify="showErrorPopover"
    @update-active-id="onUpdateActiveId"
    @pick-activity="onPickActivity"
    @delete-activity="onDeleteActivity"
    @create-child-activity="onCreateChildActivity"
    @increase-child-activity="onIncreaseChildActivity"
    @quick-add-todo="onQuickAddTodo"
    @quick-add-schedule="onQuickAddSchedule"
    @add-activity="onAddActivity"
    @reset-to-present="onMobileFabResetToPresent"
    @cancel-planner-row="onMobileFabCancelPlannerRow"
    @suspend-planner-row="onMobileFabSuspendPlannerRow"
  />
  <!-- 错误提示弹窗 -->
  <n-popover v-model:show="showPopover" trigger="manual" placement="top-end" style="width: 200px">
    <template #trigger>
      <div style="position: fixed; bottom: 20px; right: 20px; width: 1px; height: 1px"></div>
    </template>
    {{ popoverMessage }}
  </n-popover>
  <IcsExportModal v-if="icsModalVisible" :visible="icsModalVisible" :qrText="icsQRText" @close="icsModalVisible = false" />
</template>

<script setup lang="ts">
// ------------------------ 导入依赖 ------------------------
import { ref, onMounted, onUnmounted, computed, nextTick, defineAsyncComponent } from "vue";
import type { Component } from "vue";
import { storeToRefs } from "pinia";
import { onBeforeRouteLeave } from "vue-router";

import type { Activity } from "@/core/types/Activity";
import { getTimestampForTimeString } from "@/core/utils";
import { ViewType } from "@/core/constants";
import { useResize } from "@/composables/useResize";
import IcsExportModal from "@/components/IcsExportModal.vue";
import MobileHomeFab from "@/components/MobileHomeFab/MobileHomeFab.vue";
import {
  CalendarSettings20Regular,
  QrCode24Regular,
  ArrowRepeatAll24Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
} from "@vicons/fluent";
import { TagOff20Regular, TagSearch20Regular } from "@vicons/fluent";

import {
  handleAddActivity,
  handleDeleteActivity,
  handleRestoreActivity,
  passPickedActivity,
  togglePomoType,
} from "@/services/activityService";
import { updateScheduleStatus, updateTodoStatus, handleSuspendTodo } from "@/services/plannerService";
import { handleExportOrQR, type DataRow } from "@/services/icsService";
import { taskService } from "@/services/taskService";

import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";
import { useActivityTagEditor } from "@/composables/useActivityTagEditor";
import { autoSyncDebounced, uploadAllDebounced } from "@/core/utils/autoSync";
import { useDevice } from "@/composables/useDevice";

// ======================== 响应式状态与初始化 ========================
// 不直接import Naive和以下组建加速启动
const { isMobile } = useDevice();
const TimeTable = defineAsyncComponent(() => import("@/components/TimeTable/TimeTable.vue"));
const DayPlanner = defineAsyncComponent(() => import("@/components/DayPlanner/DayPlanner.vue"));
const WeekPlanner = defineAsyncComponent(() => import("@/components/WeekPlanner/WeekPlanner.vue"));
const MonthPlanner = defineAsyncComponent(() => import("@/components/MonthPlanner/MonthPlanner.vue"));
const YearPlanner = defineAsyncComponent(() => import("@/components/YearPlanner/YearPlanner.vue"));
const TaskTracker = defineAsyncComponent(() => import("@/components/TaskTracker/TaskTracker.vue"));
const ActivitySheet = defineAsyncComponent(() => import("@/components/ActivitySheet/ActivitySheet.vue"));
const AIChatDialog = defineAsyncComponent(() => import("@/components/AiChat/AiChatDialog.vue"));
const TagSelector = defineAsyncComponent<Component>(() => import("@/components/TagSystem/TagSelector.vue"));

// -- 基础UI状态
const settingStore = useSettingStore();
const dataStore = useDataStore();
const tagEditor = useActivityTagEditor();

const showHomeTagSelector = ref(false);
const homeTagFilterBtnRef = ref<HTMLElement | null>(null);

const queryDate = ref<number | null>(null);
const showPopover = ref(false);
const popoverMessage = ref("");
/** TaskRecord 编辑中：供移动端 FAB 隐藏等 */
const taskRecordEditing = ref(false);
function setTaskRecordEditing(v: boolean) {
  taskRecordEditing.value = v;
}

// 使用 storeToRefs 获取状态和计算属性
const {
  activityList,
  todoList,
  scheduleList,
  taskList,
  activeId,
  selectedTaskId,
  selectedActivityId,
  selectedRowId,
  activityById,
  todoById,
  scheduleById,
  todoByActivityId,
  scheduleByActivityId,
  taskByActivityId,
  childrenOfActivity,
  todosForCurrentViewWithTags,
  schedulesForCurrentView,
  todosForCurrentViewWithTaskRecords,
} = storeToRefs(dataStore);

const dateService = dataStore.dateService;

const { saveAllDebounced, cleanSelection } = dataStore;
// ======================== 0. UI 更新相关 ========================

import { usePomodoroStats } from "@/composables/usePomodoroStats";

// 新系统（测试用）
const { currentDatePomoCount, globalRealPomo } = usePomodoroStats();

// 计算当前日期 不赋值在UI计算class就会失效，但是UI输出的值是正确的
const isViewDateToday = computed(() => dateService.isViewDateToday);

const isViewDateYesterday = computed(() => dateService.isViewDateYesterday);
const isViewDateTomorrow = computed(() => dateService.isViewDateTomorrow);
const appDateTimestamp = computed(() => dateService.appDateTimestamp);

// 进入年视图（点击头部年份）
const onYearJump = () => {
  settingStore.settings.viewSet = "year";
  settingStore.settings.topHeight = 490;
};

const onDayJump = () => {
  settingStore.settings.viewSet = "day";
  settingStore.settings.topHeight = isMobile.value ? 305 : 300;
};

// 年视图中点击月份标题 → 进入月视图并定位到该月
const onYearNavigateToMonth = (monthStartTs: number) => {
  settingStore.settings.viewSet = "month";
  settingStore.settings.topHeight = isMobile.value ? 525 : 610;
  dateService.navigateTo(monthStartTs);
};

// 年视图中点击周编号 → 进入周视图并定位到该周
const onYearNavigateToWeek = (weekStartTs: number) => {
  settingStore.settings.viewSet = "week";
  settingStore.settings.topHeight = isMobile.value ? 490 : 510;
  dateService.navigateTo(weekStartTs);
};

// weekplanner month 引起变化日期
const onMonthJump = () => {
  settingStore.settings.viewSet = "month";
  settingStore.settings.topHeight = isMobile.value ? 525 : 610;
};

const onWeekJump = () => {
  settingStore.settings.viewSet = "week";
  settingStore.settings.topHeight = isMobile.value ? 490 : 510;
};

// 选择进入日视图的具体日期
const onDateSelectDayView = (day: number) => {
  settingStore.settings.viewSet = "day";
  settingStore.settings.topHeight = 300;
  dateService.setAppDate(day);
  dataStore.setSelectedDate(day);
  // 进入具体日期后，清除选中状态
  selectedActivityId.value = null; // ActivitySheet 选中的 activity.id
  selectedTaskId.value = null; // Planner 选中的 .taskId
  selectedRowId.value = null; // Planner todo.id 或 schedule.id 用于重复
};

// 选择周月视图的这一天timetable会加载这天信息
const onDateSelect = (day: number) => {
  dateService.setAppDate(day);
  dataStore.setSelectedDate(day);
  selectedActivityId.value = null;
  selectedTaskId.value = null;
  // 不清除selectedRowId.value，因为周月视图里需要选中todo.id 或 schedule.id 用于重复
};

// week和month planner 引起选中的任务行
const onItemChange = (id: number, activityId?: number, taskId?: number) => {
  selectedRowId.value = null;
  activeId.value = undefined;
  selectedActivityId.value = null;
  if (activityId) {
    selectedActivityId.value = activityId;
    selectedRowId.value = id;
    const todo = todoById.value.get(id);
    const schedule = scheduleById.value.get(id);

    if (todo?.status !== "done" && todo?.status !== "cancelled" && schedule?.status !== "done" && schedule?.status !== "cancelled") {
      activeId.value = activityId;
    }
  } else {
    selectedActivityId.value = null;
    activeId.value = undefined;
  }
  if (taskId) {
    selectedTaskId.value = taskId;
    selectedRowId.value = id;
  } else {
    selectedTaskId.value = null;
  }
};

// 离开页面兜底（Tauri 桌面端同样可用）
window.addEventListener("beforeunload", () => {
  try {
    saveAllDebounced.flush();
  } catch {}
});

/**  显示错误提示弹窗 */
function showErrorPopover(message: string) {
  popoverMessage.value = message;
  showPopover.value = true;
  // 3秒后自动隐藏
  setTimeout(() => {
    showPopover.value = false;
  }, 3000);
}

function handleHomeTagFilterButtonClick() {
  if (dataStore.filterTagIds.length > 0) {
    dataStore.clearFilterTags();
    showHomeTagSelector.value = false;
    return;
  }

  tagEditor.popoverTargetId.value = "home-tag-filter";
  tagEditor.tagSearchTerm.value = "";
  showHomeTagSelector.value = true;
}

function handleTagSelectForFilter(tagId: number) {
  dataStore.toggleFilterTagId(tagId);
  showHomeTagSelector.value = false;
}

/**  marquee 功能*/
const isEditing = ref(false);
const editValue = ref("");
const inputRef = ref();
function startEdit() {
  editValue.value = settingStore.settings.marquee;
  isEditing.value = true;
  // 输入框自动聚焦
  nextTick(() => {
    inputRef.value && inputRef.value.focus();
  });
}

function saveEdit() {
  settingStore.settings.marquee = editValue.value;
  isEditing.value = false;
}

function cancelEdit() {
  isEditing.value = false;
}

// ======================== 2. Activity 相关 ========================

/** 新增活动 */
function onAddActivity(newActivity: Activity) {
  activeId.value = null;
  activityList.value.push(newActivity);

  if (newActivity.class === "S") {
    handleAddActivity(scheduleList.value, newActivity, {
      activityById: activityById.value,
    });
  }

  // 自动转换为任务
  const task = taskService.createTaskFromActivity(newActivity.id, newActivity.title);
  taskList.value = [...taskList.value, task];

  // 回写 activity.taskId
  newActivity.taskId = task.id;
  newActivity.synced = false;
  newActivity.lastModified = Date.now();

  // 更新相关的 todo 和 schedule 的 taskId（如果有的话）
  const todo = todoByActivityId.value.get(newActivity.id);
  if (todo) todo.taskId = task.id;
  const schedule = scheduleByActivityId.value.get(newActivity.id);
  if (schedule) schedule.taskId = task.id;

  // 同步 UI 选中
  activeId.value = newActivity.id;
  selectedActivityId.value = newActivity.id;
  selectedTaskId.value = task.id;

  saveAllDebounced();
}

// 快速新增待办
function onQuickAddTodo() {
  const newActivity: Activity = {
    id: Date.now(),
    class: "T",
    title: "",
    estPomoI: "",
    pomoType: "🍅",
    status: "ongoing",
    dueDate: appDateTimestamp.value, // 使用当前视图日期
    parentId: null,
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  };

  activityList.value.push(newActivity);

  // 创建关联的 task
  const task = taskService.createTaskFromActivity(newActivity.id, newActivity.title);
  taskList.value = [...taskList.value, task];

  // 回写 activity.taskId
  newActivity.taskId = task.id;
  newActivity.synced = false;
  newActivity.lastModified = Date.now();

  // 创建 todo
  const { newTodo } = passPickedActivity(newActivity, appDateTimestamp.value, isViewDateToday.value);

  // 确保 newTodo.id 是有效数字（防御性检查）
  if (typeof newTodo.id !== "number" || isNaN(newTodo.id)) {
    console.error("Invalid todo.id generated, using Date.now() as fallback. Original id:", newTodo.id);
    newTodo.id = Date.now();
  }

  newTodo.taskId = task.id; // 关联 task
  todoList.value = [...todoList.value, newTodo];

  // 同步 UI 选中
  activeId.value = newActivity.id;
  selectedActivityId.value = newActivity.id;
  selectedTaskId.value = task.id;
  selectedRowId.value = newTodo.id;

  saveAllDebounced();
}

// 快速新增日程
function onQuickAddSchedule(isUntaetigkeit: boolean) {
  const newActivity: Activity = {
    id: Date.now(),
    class: "S",
    title: "",
    estPomoI: "",
    pomoType: "🍅",
    status: "",
    dueRange: [isViewDateToday.value ? Date.now() : dateService.combineDateAndTime(appDateTimestamp.value, Date.now()), "30"], // 使用当前视图日期
    parentId: null,
    isUntaetigkeit: isUntaetigkeit,
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  };
  activityList.value.push(newActivity);

  // 创建关联的 task
  const task = taskService.createTaskFromActivity(newActivity.id, newActivity.title);
  taskList.value = [...taskList.value, task];

  // 回写 activity.taskId
  newActivity.taskId = task.id;
  newActivity.synced = false;
  newActivity.lastModified = Date.now();

  // 创建新的 schedule，使用 appDateTimestamp（选中的日期）
  if (newActivity.class === "S") {
    const newSchedule = handleAddActivity(scheduleList.value, newActivity, { activityById: activityById.value });
    if (newSchedule) {
      selectedRowId.value = newSchedule.id;
    }
  }

  selectedActivityId.value = newActivity.id;
  activeId.value = newActivity.id;
  saveAllDebounced();
}

/** 删除或恢复活动及其关联的 todo/schedule */
function onDeleteActivity(id: number | null | undefined) {
  if (id == null) return;

  // 获取活动信息
  const activity = activityById.value.get(id);
  if (!activity) return;

  // 根据 deleted 状态决定删除还是恢复
  if (activity.deleted) {
    // 恢复活动
    const result = handleRestoreActivity(activityList.value, todoList.value, scheduleList.value, taskList.value, id, {
      activityById: activityById.value,
      childrenByParentId: childrenOfActivity.value,
    });

    if (result) {
      activeId.value = null;
      selectedTaskId.value = null;
      saveAllDebounced();
    }
  } else {
    // 删除活动
    const result = handleDeleteActivity(activityList.value, todoList.value, scheduleList.value, taskList.value, id, {
      activityById: activityById.value,
      childrenByParentId: childrenOfActivity.value,
    });
    if (!result) {
      showErrorPopover("请先清空子项目再删除！");
      return;
    }

    // 清理设置：删除 collapsedActivityIds 和 activityRank 中的相关记录
    delete settingStore.settings.collapsedActivityIds[id];
    delete settingStore.settings.activityRank[id];

    // 找到被删除的 activity，标记为未同步
    const deletedActivity = activityList.value.find((a) => a.id === id);
    if (deletedActivity) {
      deletedActivity.synced = false;
      deletedActivity.lastModified = Date.now();
    }

    activeId.value = null;
    selectedTaskId.value = null;
    saveAllDebounced();
  }
}

/** 选中活动，将其转为 todo 并作为 picked */
function onPickActivity(activity: Activity) {
  activity.status = "ongoing";
  const { newTodo } = passPickedActivity(activity, appDateTimestamp.value, isViewDateToday.value);
  todoList.value = [...todoList.value, newTodo];
  selectedActivityId.value = activity.id;
  selectedRowId.value = newTodo.id;
  saveAllDebounced();
}

/** 激活红色高亮可以编辑文字 */
function onUpdateActiveId(id: number | null | undefined) {
  activeId.value = id;
  selectedActivityId.value = null; // 避免多重高亮

  const activity = id != null ? activityById.value.get(id) : undefined;
  const todo = id != null ? todoByActivityId.value.get(id) : undefined;
  const schedule = id != null ? scheduleByActivityId.value.get(id) : undefined;

  // 与活动关联的 todo/schedule 行，与看板选中一致（无关联则为 null）
  selectedRowId.value = todo?.id ?? schedule?.id ?? null;
  // 如果存在 taskId，就赋给 selectedTaskId，否则置空
  selectedTaskId.value = activity?.taskId || todo?.taskId || schedule?.taskId || null;
  // console.log("selectedTaskId.value", selectedTaskId.value);

  saveAllDebounced();
}

/** 修改番茄类型时的提示处理（不清 globalIndex，切换类型后位置不变） */
function onTogglePomoType(id: number | null | undefined) {
  if (id == null) return;
  const result = togglePomoType(id, { activityById: activityById.value });
  if (result) {
    showErrorPopover("活动的类型已切换！");
  }
  activeId.value = id;
  saveAllDebounced();
}

function handleTogglePomoTypeTodoId(id: number | null | undefined) {
  if (id == null) return;
  const todo = todoById.value.get(id);
  if (todo) {
    const result = togglePomoType(todo.activityId, { activityById: activityById.value });
    if (result) {
      showErrorPopover("活动的类型已切换！");
    }
    saveAllDebounced();
  }
}

/** 重复当前的活动 */
function onRepeatActivity() {
  if (selectedRowId.value == null && activeId.value == null) return;
  if (selectedRowId.value != null) {
    // 找到对应的 todo 或 schedule
    const todo = todoById.value.get(selectedRowId.value);
    const schedule = scheduleById.value.get(selectedRowId.value);

    // 通过 todo/schedule 找到 activity
    const sourceActivityId = todo?.activityId || schedule?.activityId;
    if (!sourceActivityId) return;

    const sourceActivity = activityById.value.get(sourceActivityId);
    if (!sourceActivity) return;

    // 创建新的 activity（复制原 activity）
    const newActivity: Activity = {
      ...sourceActivity,
      id: Date.now(),
      status: "" as any,
      title: sourceActivity.title + " re",
      tagIds: sourceActivity.tagIds,
      taskId: undefined,
      synced: false,
      deleted: false,
      lastModified: Date.now(),
      ...(sourceActivity.dueRange && {
        dueRange: [dateService.combineDateAndTime(appDateTimestamp.value, sourceActivity.dueRange[0]), sourceActivity.dueRange[1]] as [
          number | null,
          string,
        ],
      }),
    };
    activityList.value.push(newActivity);

    // 创建关联的 task
    const task = taskService.createTaskFromActivity(newActivity.id, newActivity.title);
    taskList.value = [...taskList.value, task];
    newActivity.taskId = task.id;
    newActivity.synced = false;
    newActivity.lastModified = Date.now();

    // 创建新的 todo，使用 appDateTimestamp（选中的日期）
    if (newActivity.class === "T") {
      newActivity.status = "ongoing";
      newActivity.dueDate = appDateTimestamp.value;
      newActivity.synced = false;
      newActivity.lastModified = Date.now();
      const { newTodo } = passPickedActivity(newActivity, appDateTimestamp.value, isViewDateToday.value);
      newTodo.taskId = task.id; // 关联 task
      todoList.value = [...todoList.value, newTodo];
    } else {
      handleAddActivity(scheduleList.value, newActivity, { activityById: activityById.value });
    }

    // 同步 UI 选中
    activeId.value = newActivity.id;
    selectedActivityId.value = newActivity.id;
    selectedTaskId.value = task.id;
  } else if (activeId.value != null) {
    const activity = activityById.value.get(activeId.value);
    if (!activity) return;
    const newActivity: Activity = {
      ...activity,
      id: Date.now(),
      status: "ongoing",
      title: activity.title + " re",
      tagIds: activity.tagIds,
      taskId: undefined,
      synced: false,
      lastModified: Date.now(),
    };
    activityList.value.push(newActivity);
    const task = taskService.createTaskFromActivity(newActivity.id, newActivity.title);
    taskList.value = [...taskList.value, task];
    newActivity.taskId = task.id;
    newActivity.synced = false;
    newActivity.lastModified = Date.now();
    activeId.value = newActivity.id;
    selectedActivityId.value = newActivity.id;
    selectedTaskId.value = task.id;
  }
  saveAllDebounced();
}

/** 创建子活动 */
function onCreateChildActivity(id: number | null | undefined) {
  if (id == null) return;
  // 找到Activity
  const selectActivity = activityById.value.get(id);

  if (selectActivity && !selectActivity.parentId) {
    const newActivity = {
      ...selectActivity, // 使用展开运算符复制 activity 的所有属性
      id: Date.now(), // 设置新的 id
      status: "" as "" | "delayed" | "ongoing" | "cancelled" | "done" | "suspended" | undefined, // 如果需要清空状态，可以在这里设置
      parentId: id,
      synced: false,
      deleted: false,
      lastModified: Date.now(),
    };
    activityList.value.push(newActivity);

    const task = taskService.createTaskFromActivity(newActivity.id, newActivity.title);
    taskList.value = [...taskList.value, task];

    // 回写 activity.taskId
    newActivity.taskId = task.id;
    newActivity.synced = false;
    newActivity.lastModified = Date.now();
    activeId.value = newActivity.id;
  }
  saveAllDebounced();
}

function onIncreaseChildActivity(id: number | null | undefined) {
  if (id == null) return;
  // 找到Activity
  const selectActivity = activityById.value.get(id);
  if (selectActivity) {
    selectActivity.parentId = null;
    selectActivity.synced = false;
    selectActivity.lastModified = Date.now();
  }
  saveAllDebounced();
}

// ======================== 3. Planner/任务相关操作 ========================
const icsModalVisible = ref(false);
const icsQRText = ref("");

// 视图数据汇总
// 将你现有视图数据，映射为 DataRow[]
const viewSet = computed(() => settingStore.settings.viewSet as "day" | "week" | "month" | "year");

const datasetsForCurrentView = computed<DataRow[]>(() => {
  if (viewSet.value === "day") {
    return [
      ...(schedulesForCurrentView.value ?? []).map((s) => ({
        type: "S" as const,
        item: s,
      })),
      ...(todosForCurrentViewWithTaskRecords.value ?? []).map((t) => ({
        type: "T" as const,
        item: t,
      })),
    ];
  } else if (viewSet.value === "week") {
    return [
      ...(schedulesForCurrentView.value ?? []).map((s) => ({
        type: "S" as const,
        item: s,
      })),
      ...(todosForCurrentViewWithTags.value ?? []).map((t) => ({
        type: "T" as const,
        item: t,
      })),
    ];
  } else {
    return [
      ...(schedulesForCurrentView.value ?? []).map((s) => ({
        type: "S" as const,
        item: s,
      })),
      ...(todosForCurrentViewWithTags.value ?? []).map((t) => ({
        type: "T" as const,
        item: t,
      })),
    ];
  }
});

async function onIcsExport() {
  const res = await handleExportOrQR(datasetsForCurrentView.value as DataRow[], selectedRowId.value, {
    idGetter: (item: any) => String(item?.id ?? item?._id ?? item?.uuid ?? ""),
  });

  if (res.ok) {
    if (res.mode === "qr") {
      icsQRText.value = res.qrText;
      icsModalVisible.value = true;
    } else {
      // 文件保存成功
      showErrorPopover(`已保存到 ${res.path}`);
    }
  } else {
    switch (res.reason) {
      case "cancelled":
        showErrorPopover("已取消保存");
        break;
      case "empty":
        showErrorPopover("当前无可导出的数据");
        break;
      case "not_found":
        showErrorPopover("未找到所选条目");
        break;
      default:
        showErrorPopover(`导出失败：${res.detail ?? "未知错误"}`);
        break;
    }
  }
}

/** Todo 更新状态（勾选） */
function onUpdateTodoStatus(id: number, isChecked: boolean) {
  const todo = todoById.value.get(id);
  if (!todo) {
    console.error(`[onUpdateTodoStatus] 错误：无法在 todoList 中找到 id 为 ${id} 的项目。`);
    return;
  }

  // 根据 isChecked 状态，决定新的 status 和 doneTime
  const newStatus = isChecked ? "done" : "";
  let doneTime: number | undefined;

  if (isViewDateToday.value && isChecked) {
    // 只有在任务之前没有完成时间的情况下，才设置新的完成时间
    if (todo.doneTime == undefined) {
      const now = new Date();
      doneTime = now.getTime();
    }
  }
  updateTodoStatus(id, doneTime, newStatus);
  saveAllDebounced();
}

/** 更新待办事项的番茄钟估计 */
function onUpdateTodoEst(id: number, estPomo: number[]) {
  // 更新 todoList 中的数据
  const todo = todoById.value.get(id);
  if (todo) {
    todo.estPomo = estPomo;
    todo.synced = false;
    todo.lastModified = Date.now();
  }
  const activity = todo?.activityId != null ? activityById.value.get(todo.activityId) : undefined;
  if (activity && estPomo) {
    const newEstPomoI = estPomo[0] ? estPomo[0].toString() : undefined;
    if (activity.estPomoI !== newEstPomoI) {
      activity.estPomoI = newEstPomoI;
      activity.synced = false;
      activity.lastModified = Date.now();
    }
  }
  saveAllDebounced();
}

/** 更新待办事项的实际番茄钟完成情况 */
function onUpdateTodoPomo(id: number, realPomo: number[]) {
  const todo = todoById.value.get(id);
  if (todo) {
    todo.realPomo = realPomo;
    todo.synced = false;
    todo.lastModified = Date.now();
  }
  saveAllDebounced();
}

function onUpdateTodoPriority(updates: Array<{ id: number; priority: number }>) {
  if (!Array.isArray(updates) || updates.length === 0) return;

  // 逐个更新 todo.priority
  for (const { id, priority } of updates) {
    const todo = todoById.value.get(id);
    if (todo) {
      todo.priority = priority;
      todo.synced = false;
      todo.lastModified = Date.now();
    }
  }
  saveAllDebounced();
}

/** Todo 推迟处理 */
function onSuspendTodo(id: number) {
  handleSuspendTodo(id);
  saveAllDebounced();
}

/** Todo 取消 */
function onCancelTodo(id: number) {
  // 更新 todoList 中的数据
  const todo = todoById.value.get(id);
  if (todo) {
    todo.synced = false;
    todo.lastModified = Date.now();
    todo.status = "cancelled";
    const activity = activityById.value.get(todo.activityId);
    if (!activity) {
      console.warn(`未找到 activityId 为 ${todo.activityId} 的 activity`);
      return;
    }
    activity.status = "cancelled";
    activity.synced = false;
    activity.lastModified = Date.now();
    const childActivities = childrenOfActivity.value.get(activity.id) ?? [];
    for (const child of childActivities) {
      child.status = "cancelled";
      child.synced = false;
      child.lastModified = Date.now();
    }
  }
  saveAllDebounced();
}

/** Todo 撤销取消（同时联动 Activity） */
function onUncancelTodo(id: number) {
  const todo = todoById.value.get(id);
  if (!todo) return;

  // 只对 cancelled 状态生效，避免误触影响其它状态
  if (todo.status !== "cancelled") return;

  todo.status = "";
  todo.synced = false;
  todo.lastModified = Date.now();

  const activity = activityById.value.get(todo.activityId);
  if (!activity) {
    console.warn(`未找到 activityId 为 ${todo.activityId} 的 activity`);
    saveAllDebounced();
    return;
  }

  // 撤销取消：恢复为默认状态（与新增/普通活动一致）
  activity.status = "" as any;
  activity.synced = false;
  activity.lastModified = Date.now();

  // 子活动同步撤销取消
  const childActivities = childrenOfActivity.value.get(activity.id) ?? [];
  for (const child of childActivities) {
    if (child.status === "cancelled") {
      child.status = "" as any;
      child.synced = false;
      child.lastModified = Date.now();
    }
  }

  saveAllDebounced();
}

/** 移动端 FAB：回到当下（日期/日视图 + 清筛选；onDateSet('today') 已清选中） */
function onMobileFabResetToPresent() {
  dataStore.clearFilterTags();
  onDateSet("today");
  settingStore.settings.viewSet = "day";
  settingStore.settings.topHeight = isMobile.value ? 305 : 300;
}

/** 移动端 FAB：与 Day 表头 cancel 一致 */
function onMobileFabCancelPlannerRow() {
  const id = selectedRowId.value;
  if (id == null) return;
  if (todoById.value.has(id)) onCancelTodo(id);
  else if (scheduleById.value.has(id)) onCancelSchedule(id);
}

/** 移动端 FAB：与 Day 表头 suspend 一致（仅 todo 行） */
function onMobileFabSuspendPlannerRow() {
  const id = selectedRowId.value;
  if (id == null) return;
  const todo = todoById.value.get(id);
  if (todo) {
    onSuspendTodo(todo.id);
    activeId.value = todo?.activityId;
    selectedActivityId.value = todo?.activityId;
  }
}

/** Schedule 取消 */
function onCancelSchedule(id: number) {
  // 更新 ScheduleList 中的数据
  const schedule = scheduleById.value.get(id);
  if (schedule) {
    schedule.status = "cancelled";
    schedule.synced = false;
    schedule.lastModified = Date.now();
    const activity = activityById.value.get(schedule.activityId);
    if (!activity) {
      console.warn(`未找到 activityId 为 ${schedule.activityId} 的 activity`);
      return;
    }
    activity.status = "cancelled";
    activity.synced = false;
    activity.lastModified = Date.now();
  }
  saveAllDebounced();
}

/** Schedule 撤销取消（同时联动 Activity） */
function onUncancelSchedule(id: number) {
  const schedule = scheduleById.value.get(id);
  if (!schedule) return;
  if (schedule.status !== "cancelled") return;

  schedule.status = "";
  schedule.synced = false;
  schedule.lastModified = Date.now();

  const activity = activityById.value.get(schedule.activityId);
  if (!activity) {
    console.warn(`未找到 activityId 为 ${schedule.activityId} 的 activity`);
    saveAllDebounced();
    return;
  }

  activity.status = "" as any;
  activity.synced = false;
  activity.lastModified = Date.now();

  saveAllDebounced();
}

/** Schedule 勾选完成 */
function onUpdateScheduleStatus(id: number, isChecked: boolean) {
  const schedule = scheduleById.value.get(id);
  if (!schedule) {
    console.error(`[onUpdateScheduleStatus] 错误：无法在 scheduleList 中找到 id 为 ${id} 的项目。`);
    return;
  }

  // 2. 根据 isChecked 状态，决定新的 status 和 doneTime
  const newStatus = isChecked ? "done" : "";
  let doneTime: number | undefined;

  if (isViewDateToday.value && isChecked) {
    // 只有在任务之前没有完成时间的情况下，才设置新的完成时间
    if (schedule.doneTime == undefined) {
      const now = new Date();
      doneTime = now.getTime();
      schedule.synced = false;
      schedule.lastModified = Date.now();
    }
  }
  updateScheduleStatus(id, doneTime, newStatus);
  saveAllDebounced();
}

/** 修改日期切换按钮的处理函数 */
function onDateSet(direction: "prev" | "next" | "today" | "query") {
  let day: number;
  switch (direction) {
    case "prev":
      day = dateService.navigateByView("prev");
      dataStore.setSelectedDate(day);
      break;
    case "next":
      day = dateService.navigateByView("next");
      dataStore.setSelectedDate(day);
      break;
    case "today":
      day = dateService.navigateByView("today");
      dataStore.setSelectedDate(day);
      dateService.setAppDate(day);
      selectedActivityId.value = null;
      selectedTaskId.value = null;
      activeId.value = undefined;
      selectedRowId.value = null;
      break;
    case "query":
      if (queryDate.value) {
        day = dateService.navigateTo(new Date(queryDate.value));
        dataStore.setSelectedDate(day);
        dateService.setAppDate(day);
      }
      queryDate.value = null;
      break;
  }
}

// 切换视图
function onViewSet() {
  const order: readonly ViewType[] = ["day", "week", "month", "year"] as const;
  const cur = settingStore.settings.viewSet as ViewType;
  const idx = order.indexOf(cur);
  const next = order[(idx + 1) % order.length];
  settingStore.settings.viewSet = next;
  if (cur === "week") {
    settingStore.settings.topHeight = 610;
  } else if (cur === "day") {
    settingStore.settings.topHeight = 610;
  } else if (cur === "month") {
    settingStore.settings.topHeight = 480;
  } else if (cur === "year") {
    settingStore.settings.topHeight = 300;
  }
}

// 编辑title，Schedule.id，同步Activity
function handleEditScheduleTitle(id: number, newTitle: string) {
  const schedule = scheduleById.value.get(id);
  if (!schedule) {
    console.warn(`未找到 id 为 ${id} 的 schedule`);
    return;
  }
  schedule.activityTitle = newTitle;

  const activity = activityById.value.get(schedule.activityId);
  if (!activity) {
    console.warn(`未找到 activityId 为 ${schedule.activityId} 的 activity`);
    return;
  }
  activity.title = newTitle;
  activity.synced = false;
  activity.lastModified = Date.now();

  // 找到task 并重新赋值
  const relatedTask = taskByActivityId.value.get(schedule.activityId);
  if (relatedTask) {
    relatedTask.activityTitle = newTitle;
  }
  saveAllDebounced();
}

// 编辑title，todo.id，同步Activity
function handleEditTodoTitle(id: number, newTitle: string) {
  // 找到todo
  const todo = todoById.value.get(id);
  if (!todo) {
    console.warn(`未找到 id 为 ${id} 的 todo`);
    return;
  }
  todo.activityTitle = newTitle;

  // 找到activity
  const activity = activityById.value.get(todo.activityId);
  if (!activity) {
    return;
  }
  activity.title = newTitle;
  activity.synced = false;
  activity.lastModified = Date.now();

  // 找到task 并重新赋值
  const relatedTask = taskByActivityId.value.get(todo.activityId);
  if (relatedTask) {
    relatedTask.activityTitle = newTitle;
  }
  saveAllDebounced();
}

// 编辑开始时间：只更新时:分，不改变日期（基于原 activityDueRange[0] 的日期）
function handleEditScheduleStart(id: number, newTm: string) {
  const schedule = scheduleById.value.get(id);
  if (!schedule) {
    console.warn(`未找到 id 为 ${id} 的 schedule`);
    return;
  }

  const activity = activityById.value.get(schedule.activityId);

  if (newTm === "") {
    // 清空开始时间
    schedule.activityDueRange[0] = null;
    schedule.synced = false;
    schedule.lastModified = Date.now();
    if (activity?.dueRange) {
      activity.dueRange[0] = null;
      activity.synced = false;
      activity.lastModified = Date.now();
    }
    saveAllDebounced();
    return;
  }

  // 基准日期：优先用原 startTs，否则用当前视图日期（只作为日期基准）
  const baseTs = schedule.activityDueRange?.[0] ?? dateService.appDateTimestamp.value;
  const [hh, mm] = newTm.split(":").map((n) => Number(n));
  const base = new Date(Number(baseTs));
  base.setHours(hh, mm, 0, 0);
  const nextTs = base.getTime();

  // 更新 schedule
  if (!schedule.activityDueRange) schedule.activityDueRange = [null, "0"];
  schedule.activityDueRange[0] = nextTs;
  schedule.synced = false;
  schedule.lastModified = Date.now();

  // 同步 activity.dueRange[0]
  if (activity) {
    if (!activity.dueRange) activity.dueRange = [nextTs, schedule.activityDueRange[1] ?? "0"];
    else activity.dueRange[0] = nextTs;
    activity.synced = false;
    activity.lastModified = Date.now();
  }

  saveAllDebounced();
}

// 编辑时间
function handleEditTodoStart(id: number, newTm: string) {
  // 获取当前查看日期的时间戳

  const todo = todoById.value.get(id);
  if (!todo) {
    console.warn(`未找到 id 为 ${id} 的 todo`);
    return;
  }
  todo.startTime = getTimestampForTimeString(newTm, appDateTimestamp.value);
  todo.synced = false;
  todo.lastModified = Date.now();

  const task = taskByActivityId.value.get(todo.activityId);
  if (task) {
    if (task.description?.trim() === "#") {
      task.description = `# ${todo.activityTitle}`;
      task.synced = false;
      task.lastModified = Date.now();
    }
  }

  saveAllDebounced();
}

function handleEditTodoDone(id: number, newTm: string) {
  // 获取当前查看日期的时间戳
  const todo = todoById.value.get(id);
  if (!todo) {
    console.warn(`未找到 id 为 ${id} 的 todo`);
    return;
  }
  if (newTm === "") {
    todo.doneTime = undefined;
  } else {
    todo.doneTime = getTimestampForTimeString(newTm, appDateTimestamp.value);
  }
  todo.synced = false;
  todo.lastModified = Date.now();
  saveAllDebounced();
}

function handleEditScheduleDone(id: number, newTm: string) {
  // 获取当前查看日期的时间戳
  const schedule = scheduleById.value.get(id);
  if (!schedule) {
    console.warn(`未找到 id 为 ${id} 的 schedule`);
    return;
  }
  if (newTm === "") {
    schedule.doneTime = undefined;
  } else {
    schedule.doneTime = getTimestampForTimeString(newTm, appDateTimestamp.value);
  }
  saveAllDebounced();
}

// 编辑时长：Schedule.activityDueRange[1]（同时同步 Activity.dueRange[1]）
function handleEditScheduleDuration(id: number, newDurationMin: string) {
  const schedule = scheduleById.value.get(id);
  if (!schedule) {
    console.warn(`未找到 id 为 ${id} 的 schedule`);
    return;
  }

  // 更新 schedule
  if (!schedule.activityDueRange) schedule.activityDueRange = [null, "0"];
  schedule.activityDueRange[1] = newDurationMin;
  schedule.synced = false;
  schedule.lastModified = Date.now();

  // 同步到 activity（watcher 也会回写到 schedule，这里直接写保证联动一致）
  const activity = activityById.value.get(schedule.activityId);
  if (activity) {
    if (!activity.dueRange) activity.dueRange = [schedule.activityDueRange[0] ?? null, newDurationMin];
    else activity.dueRange[1] = newDurationMin;
    activity.synced = false;
    activity.lastModified = Date.now();
  }

  saveAllDebounced();
}

// 编辑地点：Schedule.location（同时同步 Activity.location）
function handleEditScheduleLocation(id: number, newLocation: string) {
  const schedule = scheduleById.value.get(id);
  if (!schedule) {
    console.warn(`未找到 id 为 ${id} 的 schedule`);
    return;
  }

  schedule.location = newLocation;
  schedule.synced = false;
  schedule.lastModified = Date.now();

  const activity = activityById.value.get(schedule.activityId);
  if (activity) {
    activity.location = newLocation;
    activity.synced = false;
    activity.lastModified = Date.now();
  }

  saveAllDebounced();
}

// ======================== 8. 生命周期 Hook ========================
onMounted(() => {
  // console.log("HomeView mounted");
  dateService.setupSystemDateWatcher();
  dateService.navigateByView("today");
});

onUnmounted(() => {
  dateService.cleanupSystemDateWatcher();
  autoSyncDebounced.flush(); //立即执行
});

function handleHomeTagSelectorPointerDownCapture(e: PointerEvent) {
  if (!showHomeTagSelector.value) return;
  const path = (typeof e.composedPath === "function" ? e.composedPath() : []) as Array<EventTarget>;
  const clickedTrigger = homeTagFilterBtnRef.value != null && path.includes(homeTagFilterBtnRef.value);
  const clickedInsidePopover = path.some((node) => {
    if (!(node instanceof HTMLElement)) return false;
    return node.classList.contains("n-popover") || node.classList.contains("tag-selector");
  });

  if (!clickedTrigger && !clickedInsidePopover) {
    showHomeTagSelector.value = false;
  }
}

watch(
  showHomeTagSelector,
  (next) => {
    if (next) {
      window.addEventListener("pointerdown", handleHomeTagSelectorPointerDownCapture, true);
    } else {
      window.removeEventListener("pointerdown", handleHomeTagSelectorPointerDownCapture, true);
    }
  },
  { immediate: true },
);

//  路由切换前保存（Vue Router）
onBeforeRouteLeave(() => {
  console.log("路由切换前保存");
  uploadAllDebounced.flush();
});
// ======================== 9. 页面尺寸调整  ========================

const leftWidth = computed({
  get: () => settingStore.settings.leftWidth,
  set: (v) => (settingStore.settings.leftWidth = v),
});

// 日程表进入/退出编辑时左栏目标宽度（与 TimeTable 约定）
function onTimetableEdit(editing: boolean) {
  leftWidth.value = editing ? 200 : 80;
}
const rightWidth = computed({
  get: () => settingStore.settings.rightWidth,
  set: (v) => (settingStore.settings.rightWidth = v),
});
const topHeight = computed({
  get: () => settingStore.settings.topHeight,
  set: (v) => (settingStore.settings.topHeight = v),
});

const { startResize: startVerticalResize } = useResize(topHeight, "vertical", 0, 670);
const { startResize: startLeftResize } = useResize(
  leftWidth,
  "horizontal",
  75,
  320,
  false, // 左侧面板（max 需 ≥ 日程表编辑宽度 TIMETABLE_LEFT_EDIT）
);
const { startResize: startRightResize } = useResize(
  rightWidth,
  "horizontal",
  50,
  1600,
  true, // 右侧面板
);
</script>

<style scoped>
.home-content {
  display: flex;
  background: var(--color-background-light-light);
  justify-content: center;
  overflow: hidden;
  height: 100%;
  flex-direction: row;
}

.left {
  padding: 5px 10px 0px 10px;
  box-sizing: border-box;
  overflow: hidden;
  margin-right: 0;
  background: var(--color-background);
  /* flex 子项默认会 shrink，不写则 store 里 leftWidth=200 也会被压成很窄 */
  flex-shrink: 0;
  min-width: 0px;
}

.right {
  padding: 8px 8px 0px 8px;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
  margin-left: 0;
  background: var(--color-background);
  min-width: 90px;
}

.middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0px;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0px;
  margin: 0;
}

.middle-alone {
  margin: 0 auto;
}

.middle-top {
  background: var(--color-background);
  padding: 4px;
  box-sizing: border-box;
  flex-direction: column;
  display: flex;
  flex-shrink: 0;
}

.planner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  margin: 8px 8px 4px 0px;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.planner-header-left {
  display: flex;
  align-items: center;
  margin-left: 2px;
}

.marquee {
  flex: 1;
  margin-left: 8px;
  min-width: 0;
  font-size: 16px;
  color: var(--color-text);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  outline: none;
}

.marquee-input {
  border: 1px solid var(--color-blue);
  outline: none;
}
.marquee-empty:before {
  content: "💡";
}
.search-date {
  max-width: 100px !important;
}

/* 禁止随父级 flex 收缩，保持按钮组尺寸 */
.button-group {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
  background-color: var(--color-background);
  z-index: 5;
  margin-right: 6px;
  order: 999;
}

@media (max-width: 430px) {
  .button-group {
    gap: 6px;
  }
  .global-pomo {
    margin-left: 2px !important;
  }
}

.day-info {
  display: flex;
  align-items: center;
  min-width: 0;
  z-index: 2;
  font-weight: 600;
  background-color: var(--color-background);
}

.day-status {
  font-size: 18px;
  font-family: Consolas, "Courier New", Courier, Monaco, "Liberation Mono", "Menlo", monospace;
  color: var(--color-text);

  cursor: pointer;
  background-color: var(--color-background);
}

/* .day-info.tomorrow .day-status {
  box-shadow: 0px -1px 1px 1px var(--color-red-light) inset;
}

.day-info.yesterday .day-status {
  box-shadow: 0px -1px 1px 1px var(--color-blue-light) inset;
} */

.global-pomo {
  display: inline-flex;
  align-items: center;
  font-size: 16px;
  color: var(--color-text);
  background: var(--color-background-light-transparent);
  padding: 2px 4px;
  border-radius: 12px;
  font-family: Consolas, "Courier New", Courier, monospace;
  font-weight: 500;
  margin-left: 16px;
}

.today-pomo {
  color: var(--color-blue);
  font-family: Consolas, "Courier New", Courier, monospace;
  font-weight: 500;
}

.middle-bottom {
  flex: 1;
  min-height: 0;
  background: var(--color-background);
  padding: 4px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.task-container {
  background: var(--color-background);
  flex: 1;
  overflow: auto;
  min-height: 0; /* 重要：允许 flex 子项收缩 */
  display: flex;
  flex-direction: column;
  height: 100%;
}

.planner-view-container {
  flex: 1;
  overflow: auto;
  min-height: 0; /* 重要：允许 flex 子项收缩 */
  display: flex;
  flex-direction: column;
  height: 100%;
}

.resize-handle {
  height: 1px;
  background: var(--color-background-dark);
  cursor: ns-resize;
  position: relative;
  margin: 0;
}

.resize-handle:hover {
  background: var(--color-blue);
  height: 4px;
}

/* .resize-handle::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 4px;
  background: #ccc;
  border-radius: 2px;
} */

.resize-handle-horizontal {
  width: 1px;
  background: var(--color-background-dark);
  cursor: ew-resize;
  position: relative;
  margin: 0;
}

.resize-handle-horizontal:hover {
  background: var(--color-blue);
  width: 4px;
}

/* .resize-handle-horizontal::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 30px;
  background: #ccc;
  border-radius: 2px;
} */

.search-date :deep(.n-input) {
  --n-height: 25px !important;
  font-size: 12px;
  padding-top: 1px;
  padding-bottom: 1px;
}

.search-date :deep(.n-input-wrapper) {
  padding-left: 6px;
  padding-right: 6px;
}

@media (max-width: 650px) {
  .marquee {
    display: none;
  }

  .marquee-input {
    display: block;
  }

  .today-pomo,
  .total-pomo {
    font-size: 14px;
    padding-left: 0;
    padding-right: 0;
  }

  .left {
    padding: 5px 2px 0px 8px !important;
  }
  .right {
    padding: 5px 6px 0px 6px !important;
    width: 100% !important;
  }

  .resize-handle-horizontal,
  .resize-handle {
    display: none;
  }
}
</style>
