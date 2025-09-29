<!-- 
  Component: HomeView.vue 
  Description: 界面控制，数据管理
  Parent: App.vue
-->

<template>
  <div class="home-content">
    <!-- 左侧面板 (日程表) -->
    <div v-if="settingStore.settings.showSchedule" class="left" :style="{ width: leftWidth + 'px' }">
      <TimeTable />
    </div>

    <!-- 左侧面板调整大小手柄 -->
    <div v-if="settingStore.settings.showSchedule" class="resize-handle-horizontal" @mousedown="startLeftResize"></div>

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
          <div
            v-if="settingStore.settings.viewSet === 'day'"
            class="day-info"
            :class="{
              yesterday: isViewDateYesterday,
              tomorrow: isViewDateTomorrow,
            }"
          >
            <span @click="onMonthJump" class="day-status">{{ dateService.displayDateInfo }}</span>
            <span class="global-pomo">
              <span class="today-pomo">🍅{{ currentDatePomoCount }}/</span>
              <span class="total-pomo">{{ globalRealPomo }}</span>
            </span>
          </div>
          <div v-if="settingStore.settings.viewSet === 'week'" class="day-info">
            <span @click="onMonthJump" class="day-status">{{ dateService.displayWeekInfo }}</span>
            <span class="global-pomo">
              <span class="total-pomo">🍅{{ globalRealPomo }}</span>
            </span>
          </div>
          <div v-if="settingStore.settings.viewSet === 'month'" class="day-info">
            <span class="day-status">{{ dateService.displayMonthInfo }}</span>
            <span class="global-pomo">
              <span class="total-pomo">🍅{{ globalRealPomo }}</span>
            </span>
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
            <n-button
              size="small"
              :type="selectedRowId === null ? 'default' : 'info'"
              circle
              quaternary
              strong
              @click="onIcsExport"
              title="导出 ICS / 二维码"
            >
              <template #icon>
                <n-icon>
                  <QrCode24Regular />
                </n-icon>
              </template>
            </n-button>
            <n-date-picker
              v-model:value="queryDate"
              type="date"
              placeholder="点击到今天"
              @update:value="onDateSet('query')"
              style="width: 92px"
              class="search-date"
              @click="onDateSet('today')"
              title="输入示例：2025-01-01"
            >
              <template #date-icon>
                <n-icon :size="18" :component="Search24Regular" />
              </template>
            </n-date-picker>

            <n-button
              size="small"
              circle
              secondary
              strong
              @click="onDateSet('prev')"
              :title="settingStore.settings.viewSet === 'day' ? '上一天' : settingStore.settings.viewSet === 'week' ? '上一周' : '上一月'"
            >
              <template #icon>
                <n-icon>
                  <Previous24Regular />
                </n-icon>
              </template>
            </n-button>

            <n-button
              size="small"
              circle
              secondary
              strong
              @click="onDateSet('next')"
              :title="settingStore.settings.viewSet === 'day' ? '下一天' : settingStore.settings.viewSet === 'week' ? '下一周' : '下一月'"
            >
              <template #icon>
                <n-icon>
                  <Next24Regular />
                </n-icon>
              </template>
            </n-button>

            <n-button size="small" circle secondary strong @click="onViewSet()" title="切换视图">
              <template #icon>
                <n-icon>
                  <CalendarSettings20Regular />
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
            @update-todo-status="onUpdateTodoStatus"
            @suspend-todo="onSuspendTodo"
            @cancel-todo="onCancelTodo"
            @cancel-schedule="onCancelSchedule"
            @update-todo-est="onUpdateTodoEst"
            @update-todo-pomo="onUpdateTodoPomo"
            @batch-update-priorities="onUpdateTodoPriority"
            @edit-schedule-title="handleEditScheduleTitle"
            @edit-todo-title="handleEditTodoTitle"
            @edit-todo-start="handleEditTodoStart"
            @edit-todo-done="handleEditTodoDone"
            @edit-schedule-done="handleEditScheduleDone"
            @convert-todo-to-task="onConvertTodoToTask"
            @convert-schedule-to-task="onConvertScheduleToTask"
          />
          <WeekPlanner
            v-if="settingStore.settings.showPlanner && settingStore.settings.viewSet === 'week'"
            @date-change="onDateChange"
            @date-jump="onDateJump"
            @item-change="onItemChange"
          />
          <MonthPlanner
            v-if="settingStore.settings.showPlanner && settingStore.settings.viewSet === 'month'"
            @date-change="onDateChange"
            @item-change="onItemChange"
            @date-jump="onDateJump"
          />
        </div>
      </div>
      <!-- 任务视图调整大小手柄 -->
      <div
        v-if="settingStore.settings.showTask && settingStore.settings.showPlanner"
        class="resize-handle"
        @mousedown="startVerticalResize"
      ></div>
      <!-- 任务视图 -->
      <div v-if="settingStore.settings.showTask" class="middle-bottom" :style="{ height: `calc(100% - ${topHeight}px - 8px)` }">
        <TaskTracker />
      </div>
    </div>

    <!-- 右侧面板调整大小手柄 -->
    <div
      v-if="settingStore.settings.showActivity || settingStore.settings.showAi"
      class="resize-handle-horizontal"
      @mousedown="startRightResize"
    ></div>

    <!-- 右侧面板 (活动清单) -->
    <div v-if="settingStore.settings.showActivity" class="right" :style="{ width: rightWidth + 'px' }">
      <ActivitySheet
        @pick-activity="onPickActivity"
        @add-activity="onAddActivity"
        @delete-activity="onDeleteActivity"
        @update-active-id="onUpdateActiveId"
        @toggle-pomo-type="onTogglePomoType"
        @repeat-activity="onRepeatActivity"
        @create-child-activity="onCreateChildActivity"
        @increase-child-activity="onIncreaseChildActivity"
        @convert-activity-to-task="onConvertActivityToTask"
      />
    </div>
    <div v-if="settingStore.settings.showAi" class="right" :style="{ width: rightWidth + 'px' }">
      <!-- AI 对话对话框 -->
      <AIChatDialog :visible="settingStore.settings.showAi" @close="settingStore.settings.showAi = false" />
    </div>
  </div>
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
import { ref, onMounted, computed } from "vue";
import { defineAsyncComponent } from "vue";
import { storeToRefs } from "pinia";

import type { Activity } from "@/core/types/Activity";
import { Task } from "@/core/types/Task";
import { getTimestampForTimeString } from "@/core/utils";
import { ViewType } from "@/core/constants";
import { useResize } from "@/composables/useResize";
import IcsExportModal from "@/components/IcsExportModal.vue";
import { Previous24Regular, Next24Regular, Search24Regular, CalendarSettings20Regular, QrCode24Regular } from "@vicons/fluent";

import { handleAddActivity, handleDeleteActivity, passPickedActivity, togglePomoType } from "@/services/activityService";
import { updateScheduleStatus, updateTodoStatus, handleSuspendTodo } from "@/services/plannerService";
import { handleExportOrQR, type DataRow } from "@/services/icsService";

import { usePomoStore } from "@/stores/usePomoStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";

// ======================== 响应式状态与初始化 ========================
// 不直接import Naive和以下组建加速启动
const TimeTable = defineAsyncComponent(() => import("@/components/TimeTable/TimeTable.vue"));
const DayPlanner = defineAsyncComponent(() => import("@/components/DayPlanner/DayPlanner.vue"));
const WeekPlanner = defineAsyncComponent(() => import("@/components/WeekPlanner/WeekPlanner.vue"));
const MonthPlanner = defineAsyncComponent(() => import("@/components/MonthPlanner/MonthPlanner.vue"));
const TaskTracker = defineAsyncComponent(() => import("@/components/TaskTracker/TaskTracker.vue"));
const ActivitySheet = defineAsyncComponent(() => import("@/components/ActivitySheet/ActivitySheet.vue"));
const AIChatDialog = defineAsyncComponent(() => import("@/components/AiChat/AiChatDialog.vue"));

// -- 基础UI状态
const settingStore = useSettingStore();
const dataStore = useDataStore();
const pomoStore = usePomoStore();

const queryDate = ref<number | null>(null);
const showPopover = ref(false);
const popoverMessage = ref("");

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
  taskById,
  todoByActivityId,
  scheduleByActivityId,
  tasksBySource,
  childrenOfActivity,
  todosForCurrentViewWithTags,
  schedulesForCurrentViewWithTags,
  schedulesForCurrentView,
  todosForCurrentViewWithTaskRecords,
} = storeToRefs(dataStore);

const dateService = dataStore.dateService;

const { saveAllDebounced, cleanSelection } = dataStore;
// ======================== 0. UI 更新相关 ========================

// 计算当天的番茄钟数
const currentDatePomoCount = computed(() => {
  const dateString = dateService.appDateKey;
  return pomoStore.getPomoCountByDate(dateString);
});

// 计算全局realPomo（历史 + 当天）
const globalRealPomo = computed(() => pomoStore.globalRealPomo);

// 计算当前日期 不赋值在UI计算class就会失效，但是UI输出的值是正确的
const isViewDateToday = computed(() => dateService.isViewDateToday);
const isViewDateYesterday = computed(() => dateService.isViewDateYesterday);
const isViewDateTomorrow = computed(() => dateService.isViewDateTomorrow);

// weekplanner month 引起变化日期
const onMonthJump = () => {
  settingStore.settings.viewSet = "month";
  settingStore.settings.topHeight = 610;
};

const onDateJump = (day: number) => {
  settingStore.settings.viewSet = "day";
  settingStore.settings.topHeight = 300;
  dateService.setAppDate(day);
  dataStore.setSelectedDate(day);
};

const onDateChange = (day: number) => {
  dateService.setAppDate(day);
  dataStore.setSelectedDate(day);
  selectedActivityId.value = null;
  selectedTaskId.value = null;
  activeId.value = undefined;
  selectedRowId.value = null;
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
  handleAddActivity(scheduleList.value, newActivity, {
    activityById: activityById.value,
  });
  activeId.value = newActivity.id;
  saveAllDebounced();
}

/** 删除活动及其关联的 todo/schedule */
function onDeleteActivity(id: number | null | undefined) {
  if (id == null) return;
  const result = handleDeleteActivity(activityList.value, todoList.value, scheduleList.value, taskList.value, id, {
    activityById: activityById.value,
    childrenByParentId: childrenOfActivity.value,
  });
  if (!result) showErrorPopover("请先清空子项目再删除！");
  activeId.value = null; //
  saveAllDebounced();
}

/** 选中活动，将其转为 todo 并作为 picked */
function onPickActivity(activity: Activity) {
  activity.status = "ongoing";
  const { newTodo } = passPickedActivity(activity, dateService.appDateTimestamp, dateService.isViewDateToday);
  todoList.value = [...todoList.value, newTodo];
  selectedActivityId.value = activity.id;
  saveAllDebounced();
}

// 同步UI选中
function onConvertActivityToTask(payload: { task: Task; activityId: number | null | undefined }) {
  const { task, activityId } = payload;
  if (activityId == null) return;

  // 1) 推入任务列表（替换引用，便于浅 watch 或立即响应）
  taskList.value = [...taskList.value, task];

  // 2) 回写 activity.taskId
  const activity = activityById.value.get(activityId);
  if (activity) {
    activity.taskId = task.id;
    const todo = todoByActivityId.value.get(activityId);
    if (todo) todo.taskId = task.id;
    const schedule = scheduleByActivityId.value.get(activityId);
    if (schedule) schedule.taskId = task.id;
  }

  // 3) 同步 UI 选中（如果你希望）
  activeId.value = activityId;
  selectedActivityId.value = activityId;
  selectedTaskId.value = task.id;

  // 4) 一次性保存
  saveAllDebounced();
}

/** 激活红色高亮可以编辑文字 */
function onUpdateActiveId(id: number | null | undefined) {
  activeId.value = id;
  selectedActivityId.value = null; // 避免多重高亮
  selectedRowId.value = null; // 这个id是today里的

  const activity = id != null ? activityById.value.get(id) : undefined;
  const todo = id != null ? todoByActivityId.value.get(id) : undefined;
  const schedule = id != null ? scheduleByActivityId.value.get(id) : undefined;

  // 如果存在 taskId，就赋给 selectedTaskId，否则置空
  selectedTaskId.value = activity?.taskId || todo?.taskId || schedule?.taskId || null;
  // console.log("selectedTaskId.value", selectedTaskId.value);

  saveAllDebounced();
}

/** 修改番茄类型时的提示处理 */
function onTogglePomoType(id: number | null | undefined) {
  if (id == null) return;
  const todo = todoByActivityId.value.get(id);
  if (todo) {
    todo.globalIndex = undefined;
  } // 先取消当前TimeTable的位置
  const result = togglePomoType(id, { activityById: activityById.value });
  if (result) {
    showErrorPopover("活动的类型已切换！");
  }
  activeId.value = id;
}

/** 重复当前的活动 */
function onRepeatActivity(id: number | null | undefined) {
  if (id == null) return;

  // 找到Activity
  const selectActivity = activityById.value.get(id);

  if (selectActivity) {
    const newActivity = {
      ...selectActivity, // 使用展开运算符复制 activity 的所有属性
      id: Date.now(), // 设置新的 id
      status: "" as any,
      tagIds: selectActivity.tagIds,
      taskId: undefined,
      ...(selectActivity.dueRange && {
        dueRange: [null, selectActivity.dueRange[1]] as [number | null, string],
      }),
    };
    activityList.value.push(newActivity);
    handleAddActivity(scheduleList.value, newActivity, {
      activityById: activityById.value,
    });
    activeId.value = newActivity.id;
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
      tagIds: undefined,
      parentId: id,
      taskId: undefined,
    };
    activityList.value.push(newActivity);
    handleAddActivity(scheduleList.value, newActivity, {
      activityById: activityById.value,
    });
    activeId.value = newActivity.id;
  }
  saveAllDebounced();
}

function onIncreaseChildActivity(id: number | null | undefined) {
  if (id == null) return;
  // 找到Activity
  const selectActivity = activityById.value.get(id);
  if (selectActivity) selectActivity.parentId = null;
  saveAllDebounced();
}

// ======================== 3. Planner/任务相关操作 ========================
const icsModalVisible = ref(false);
const icsQRText = ref("");

// 视图数据汇总
// 将你现有视图数据，映射为 DataRow[]
const viewSet = computed(() => settingStore.settings.viewSet as "day" | "week" | "month");

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
      ...(schedulesForCurrentViewWithTags.value ?? []).map((s) => ({
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
      ...(schedulesForCurrentViewWithTags.value ?? []).map((s) => ({
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
}

/** 更新待办事项的番茄钟估计 */
function onUpdateTodoEst(id: number, estPomo: number[]) {
  // 更新 todoList 中的数据
  const todo = todoById.value.get(id);
  if (todo) {
    todo.estPomo = estPomo;
  }
  const activity = todo?.activityId != null ? activityById.value.get(todo.activityId) : undefined;
  if (activity && estPomo) {
    if (estPomo[0]) {
      activity.estPomoI = estPomo[0].toString();
    } else {
      activity.estPomoI = undefined;
    }
  }
  saveAllDebounced();
}

/** 更新待办事项的实际番茄钟完成情况 */
function onUpdateTodoPomo(id: number, realPomo: number[]) {
  const todo = todoById.value.get(id);
  if (todo) {
    todo.realPomo = realPomo;
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
    todo.status = "cancelled";
    const activity = activityById.value.get(todo.activityId);
    if (!activity) {
      console.warn(`未找到 activityId 为 ${todo.activityId} 的 activity`);
      return;
    }
    activity.status = "cancelled";
    const childActivities = childrenOfActivity.value.get(activity.id) ?? [];
    for (const child of childActivities) {
      child.status = "cancelled";
    }
  }
  saveAllDebounced();
}

/** Schedule 取消 */
function onCancelSchedule(id: number) {
  // 更新 ScheduleList 中的数据
  const schedule = scheduleById.value.get(id);
  if (schedule) {
    schedule.status = "cancelled";
    const activity = activityById.value.get(schedule.activityId);
    if (!activity) {
      console.warn(`未找到 activityId 为 ${schedule.activityId} 的 activity`);
      return;
    }
    activity.status = "cancelled";
  }
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
    }
  }
  updateScheduleStatus(id, doneTime, newStatus);
}

function onConvertTodoToTask(payload: { task: Task; todoId: number }) {
  const { task, todoId } = payload;
  taskList.value = [...taskList.value, task];
  const todo = todoById.value.get(todoId);
  if (todo) {
    todo.taskId = task.id;
    const activity = activityById.value.get(todo.activityId);
    if (activity) {
      selectedTaskId.value = task.id;
      activeId.value = activity.id;
    }
  }
  // 3) 同步 UI 选中
  selectedTaskId.value = task.id;
  saveAllDebounced();
}

function onConvertScheduleToTask(payload: { task: Task; scheduleId: number }) {
  const { task, scheduleId } = payload;
  console.log("home", task.id);

  // 1) 推入任务列表（替换引用，便于浅 watch 或立即响应）
  taskList.value = [...taskList.value, task];
  // 2) 回写 schedule.taskId
  const schedule = scheduleById.value.get(scheduleId);
  if (schedule) {
    schedule.taskId = task.id;

    const activity = activityById.value.get(schedule.activityId);
    if (activity) {
      activity.taskId = task.id;
    }
  }
  // 3) 同步 UI 选中
  selectedTaskId.value = task.id;
  saveAllDebounced();
}

/** 修改日期切换按钮的处理函数 */
function onDateSet(direction: "prev" | "next" | "today" | "query") {
  switch (direction) {
    case "prev":
      dateService.navigateByView("prev");

      break;
    case "next":
      dateService.navigateByView("next");
      break;
    case "today":
      dateService.navigateByView("today");
      break;
    case "query":
      if (queryDate.value) {
        dateService.navigateTo(new Date(queryDate.value));
      }
      queryDate.value = null;
      break;
  }
}

// 切换视图
function onViewSet() {
  const order: readonly ViewType[] = ["day", "week", "month"] as const;
  const cur = settingStore.settings.viewSet as ViewType;
  const idx = order.indexOf(cur);
  const next = order[(idx + 1) % order.length];
  settingStore.settings.viewSet = next;
  if (cur === "week") {
    settingStore.settings.topHeight = 610;
  } else if (cur === "day") {
    settingStore.settings.topHeight = 300;
  } else if (cur === "month") {
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
  console.log(`已更新 schedule ${id} 和 activity ${schedule.activityId} 的标题为: ${newTitle}`);

  // 找到task 并重新赋值
  const relatedTasks = tasksBySource.value.schedule.get(id);
  if (relatedTasks && relatedTasks.length > 0) {
    const task = relatedTasks[0];
    task.activityTitle = newTitle;
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
  activity.title = newTitle; //

  // 找到task 并重新赋值
  const task = taskById.value.get(todo.id);
  if (task) {
    task.activityTitle = newTitle;
  }
  saveAllDebounced();
}

// 编辑时间
function handleEditTodoStart(id: number, newTm: string) {
  // 获取当前查看日期的时间戳
  const viewingDayTimestamp = dateService.appDateTimestamp;
  const todo = todoById.value.get(id);
  if (!todo) {
    console.warn(`未找到 id 为 ${id} 的 todo`);
    return;
  }
  todo.startTime = getTimestampForTimeString(newTm, viewingDayTimestamp);
}

function handleEditTodoDone(id: number, newTm: string) {
  // 获取当前查看日期的时间戳
  const viewingDayTimestamp = dateService.appDateTimestamp;
  const todo = todoById.value.get(id);
  if (!todo) {
    console.warn(`未找到 id 为 ${id} 的 todo`);
    return;
  }
  if (newTm === "") {
    todo.doneTime = undefined;
  } else {
    todo.doneTime = getTimestampForTimeString(newTm, viewingDayTimestamp);
  }
  saveAllDebounced();
}

function handleEditScheduleDone(id: number, newTm: string) {
  // 获取当前查看日期的时间戳
  const viewingDayTimestamp = dateService.appDateTimestamp;
  const schedule = scheduleById.value.get(id);
  if (!schedule) {
    console.warn(`未找到 id 为 ${id} 的 schedule`);
    return;
  }
  if (newTm === "") {
    schedule.doneTime = undefined;
  } else {
    schedule.doneTime = getTimestampForTimeString(newTm, viewingDayTimestamp);
  }
  saveAllDebounced();
}

// ======================== 8. 生命周期 Hook ========================
onMounted(() => {
  dataStore.loadAllData();

  dateService.navigateByView("today");
});

// ======================== 9. 页面尺寸调整  ========================

const leftWidth = computed({
  get: () => settingStore.settings.leftWidth,
  set: (v) => (settingStore.settings.leftWidth = v),
});
const rightWidth = computed({
  get: () => settingStore.settings.rightWidth,
  set: (v) => (settingStore.settings.rightWidth = v),
});
const topHeight = computed({
  get: () => settingStore.settings.topHeight,
  set: (v) => (settingStore.settings.topHeight = v),
});

const { startResize: startVerticalResize } = useResize(topHeight, "vertical", 0, 610);
const { startResize: startLeftResize } = useResize(
  leftWidth,
  "horizontal",
  10,
  400,
  false // 左侧面板
);
const { startResize: startRightResize } = useResize(
  rightWidth,
  "horizontal",
  50,
  1600,
  true // 右侧面板
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
  padding: 5px 10px 15px 10px;
  box-sizing: border-box;
  overflow: hidden;
  margin-right: 0;
  background: var(--color-background);
  min-width: 90px;
}

.right {
  padding: 8px;
  box-sizing: border-box;
  overflow: auto;
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
  max-width: 900px;
}

.middle-top {
  background: var(--color-background);
  padding: 4px;
  box-sizing: border-box;
  flex-direction: column;
  display: flex;
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

@media (max-width: 650px) {
  .marquee {
    display: none;
  }
}

.marquee-input {
  border: 1px solid var(--color-blue);
  outline: none;
}
.marquee-empty:before {
  content: "💡";
}

.button-group {
  display: flex;
  gap: 2px;
  padding: 1px;
  align-items: center;
  flex-shrink: 0;
  flex-grow: 0;
  background-color: var(--color-background);
  margin-left: auto;
  z-index: 5;
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
  border-radius: 12px;
  padding: 0px 8px 0px 8px;
  margin: 2px;
  cursor: pointer;
  background-color: var(--color-background);
}

.global-pomo {
  display: inline-flex;
  align-items: center;
  font-size: 16px;
  color: var(--color-text);
  background: var(--color-background-light-transparent);
  padding: 2px 8px;
  border-radius: 12px;
  font-family: Consolas, "Courier New", Courier, monospace;
  font-weight: 500;
}

.today-pomo {
  color: var(--color-blue);
  font-family: Consolas, "Courier New", Courier, monospace;
  font-weight: 500;
}

.day-info.tomorrow .day-status {
  background: var(--color-background-light-transparent);
  box-shadow: -4px 0px 0px 0px var(--color-red-light) inset;
}

.day-info.yesterday .day-status {
  background: var(--color-background-light-transparent);
  box-shadow: 4px 0px 0px 0px var(--color-blue-light) inset;
}

.middle-bottom {
  background: var(--color-background);
  overflow: auto;
  padding: 4px;
  box-sizing: border-box;
  flex: 1;
  display: flex;
  flex-direction: column;
  z-index: 2;
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
  height: 8px;
  background: #f0f0f0;
  cursor: ns-resize;
  position: relative;
  margin: 0;
}

.resize-handle:hover {
  background: #e0e0e0;
}

.resize-handle::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 4px;
  background: #ccc;
  border-radius: 2px;
}

.resize-handle-horizontal {
  width: 8px;
  background: #f0f0f0;
  cursor: ew-resize;
  position: relative;
  margin: 0;
}

.resize-handle-horizontal:hover {
  background: #e0e0e0;
}

.resize-handle-horizontal::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 30px;
  background: #ccc;
  border-radius: 2px;
}

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
</style>
