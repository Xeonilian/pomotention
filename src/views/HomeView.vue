<!-- 
  Component: HomeView.vue 
  Description: 界面控制，数据管理
  Parent: App.vue
-->

<template>
  <div class="home-content">
    <!-- 左侧面板 (日程表) -->
    <div
      v-if="uiStore.showSchedulePanel"
      class="left"
      :style="{ width: leftWidth + 'px' }"
    >
      <TimeTableView
        :blocks="viewBlocks"
        :current-type="currentType"
        :todayTodos="todosForAppDate"
        :todaySchedules="schedulesForAppDate"
        @update-blocks="onBlocksUpdate"
        @reset-schedule="onTimeTableReset"
        @change-type="onTypeChange"
        :appDateTimestamp="dateService.appDateTimestamp.value"
      />
    </div>

    <!-- 左侧面板调整大小手柄 -->
    <div
      v-if="uiStore.showSchedulePanel"
      class="resize-handle-horizontal"
      @mousedown="startLeftResize"
    ></div>

    <!-- 中间内容区域 -->
    <div
      class="middle"
      :class="{
        'middle-alone':
          !uiStore.showSchedulePanel && !uiStore.showActivityPanel,
      }"
    >
      <!-- 今日视图 -->
      <div
        v-if="uiStore.showTodayPanel"
        class="middle-top"
        :style="
          uiStore.showTaskPanel
            ? { height: topHeight + 'px' }
            : { height: '100%' }
        "
        :class="{ 'not-today': !isViewingToday }"
      >
        <!-- 今日待办的头部和控件 -->
        <div class="today-header">
          <div class="today-info">
            <span class="today-status">{{ dateService.displayDate }}</span>
            <span class="global-pomo">
              <span class="today-pomo">🍅 {{ currentDatePomoCount }}/</span>
              <span class="total-pomo">{{ globalRealPomo }}</span>
            </span>
          </div>
          <div class="button-group">
            <n-date-picker
              v-model:value="queryDate"
              type="date"
              placeholder="回车到今天"
              @keyup.enter="onDateSet('today')"
              @update:value="onDateSet('query')"
              style="width: 92px"
              class="search-date"
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
              title="上一天"
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
              title="下一天"
            >
              <template #icon>
                <n-icon>
                  <Next24Regular />
                </n-icon>
              </template>
            </n-button>
          </div>
        </div>
        <!-- 今日视图容器 -->
        <div class="today-view-container">
          <TodayView
            :selectedRowId="selectedRowId"
            :todayTodos="todosForAppDate"
            :todaySchedules="schedulesForAppDate"
            :activeId="activeId"
            @update-schedule-status="onUpdateScheduleStatus"
            @update-todo-status="onUpdateTodoStatus"
            @suspend-todo="onSuspendTodo"
            @cancel-todo="onCancelTodo"
            @repeat-todo="onRepeatTodo"
            @suspend-schedule="onSuspendSchedule"
            @cancel-schedule="onCancelSchedule"
            @repeat-schedule="onRepeatSchedule"
            @update-todo-est="onUpdateTodoEst"
            @update-todo-pomo="onUpdateTodoPomo"
            @select-task="onSelectTask"
            @select-activity="onSelectActivity"
            @select-row="onSelectRow"
            @edit-schedule-title="handleEditScheduleTitle"
            @edit-todo-title="handleEditTodoTitle"
            @edit-todo-start="handleEditTodoStart"
            @edit-todo-done="handleEditTodoDone"
            @edit-schedule-done="handleEditScheduleDone"
          />
        </div>
      </div>
      <!-- 任务视图调整大小手柄 -->
      <div
        v-if="uiStore.showTaskPanel"
        class="resize-handle"
        @mousedown="startVerticalResize"
      ></div>
      <!-- 任务视图 -->
      <div
        v-if="uiStore.showTaskPanel"
        class="middle-bottom"
        :style="{ height: `calc(100% - ${topHeight}px - 8px)` }"
      >
        <TaskView
          :selectedTaskId="selectedTaskId"
          :selectedTask="selectedTask"
          @activity-updated="onActivityUpdated"
          @interruption-update="onInterruptionUpdated"
        />
      </div>
    </div>
    <!-- 右侧面板调整大小手柄 -->
    <div
      v-if="uiStore.showActivityPanel"
      class="resize-handle-horizontal"
      @mousedown="startRightResize"
    ></div>
    <!-- 右侧面板 (活动清单) -->
    <div
      v-if="uiStore.showActivityPanel"
      class="right"
      :style="{ width: rightWidth + 'px' }"
    >
      <ActivityView
        :activities="activityList"
        :activeId="activeId"
        :todos="todoList"
        :selectedActivityId="selectedActivityId"
        @pick-activity-todo="onPickActivity"
        @add-activity="onAddActivity"
        @delete-activity="onDeleteActivity"
        @update-active-id="onUpdateActiveId"
        @toggle-pomo-type="onTogglePomoType"
        @repeat-activity="onRepeatActivity"
        @go-to-todo="goToTodo"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// ------------------------ 导入依赖 ------------------------
import { ref, onMounted, watch, computed } from "vue";
import { NButton, NIcon } from "naive-ui";
import { usePomoStore } from "@/stores/usePomoStore";
import TimeTableView from "@/views/Home/TimeTableView.vue";
import TodayView from "@/views/Home/TodayView.vue";
import TaskView from "@/views/Home/TaskView.vue";
import ActivityView from "@/views/Home/ActivityView.vue";
import type { Activity } from "@/core/types/Activity";
import type { Block } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import { Task } from "@/core/types/Task";
import { WORK_BLOCKS, ENTERTAINMENT_BLOCKS } from "@/core/constants";
import {
  loadActivities,
  loadTodos,
  loadSchedules,
  loadTimeBlocks,
  loadTasks,
  saveActivities,
  saveTodos,
  saveSchedules,
  saveTimeBlocks,
  saveTasks,
  removeTimeBlocksStorage,
} from "@/services/storageService";
import {
  handleAddActivity,
  handleDeleteActivity,
  passPickedActivity,
  togglePomoType,
} from "@/services/activityService";
import {
  updateScheduleStatus,
  updateTodoStatus,
  handleSuspendTodo,
  handleSuspendSchedule,
  updateTodoPomo,
} from "@/services/todayService";
import {
  Previous24Regular,
  Next24Regular,
  Search24Regular,
} from "@vicons/fluent";
import { useResize } from "@/composables/useResize";
import { getTimestampForTimeString, addDays } from "@/core/utils";
import { unifiedDateService } from "@/services/unifiedDateService";
import { useUIStore } from "@/stores/useUIStore";

// ======================== 响应式状态与初始化 ========================

// -- 基础UI状态
const uiStore = useUIStore();
const showPomoTypeChangePopover = ref(false);
const pomoTypeChangeMessage = ref("");
const pomoTypeChangeTarget = ref<HTMLElement | null>(null);
const queryDate = ref<number | null>(null);

// -- 核心数据
const activityList = ref<Activity[]>(loadActivities());
const todoList = ref<Todo[]>(loadTodos());
const scheduleList = ref<Schedule[]>(loadSchedules());
const taskList = ref<Task[]>(loadTasks());
const pickedTodoActivity = ref<Activity | null>(null); // 选中活动

// 添加选中的任务ID状态
const activeId = ref<number | null>(null); // 当前从ActivityView选中的activity.id
const selectedTaskId = ref<number | null>(null); // 当前从Todo选中的todo.taskId
const selectedActivityId = ref<number | null>(null); // 当前从Todo选中的todo.activityId
// 在现有的状态定义区域添加
const selectedRowId = ref<number | null>(null); // todo.id 或者 schedule.id
const selectedTask = computed(() => {
  if (selectedTaskId.value && taskList.value) {
    return (
      taskList.value.find((task) => task.id === selectedTaskId.value) || null
    );
  }
  return null;
});

// ======================== 0. UI 更新相关 ========================

const pomoStore = usePomoStore();

const dateService = unifiedDateService({
  activityList,
  scheduleList,
  todoList,
});

// 计算当天的番茄钟数
const currentDatePomoCount = computed(() => {
  const dateString = dateService.appDateKey.value;
  return pomoStore.getPomoCountByDate(dateString);
});

// 计算全局realPomo（历史 + 当天）
const globalRealPomo = computed(() => pomoStore.globalRealPomo);

// 计算当前日期
const isViewingToday = dateService.isViewingToday;

// 计算筛选的当天todo
const todosForAppDate = computed(() => {
  // 获取 appDate 当天零点的时间戳
  const startOfDay = dateService.appDateTimestamp.value;
  // 计算 appDate 第二天零点的时间戳，作为筛选范围的上限（不包含）
  const endOfDay = addDays(startOfDay, 1);

  if (!todoList.value) return [];

  // todo.id 是创建时的时间戳，筛选出 id 在 [startOfDay, endOfDay) 区间内的 todo
  return todoList.value.filter(
    (todo) => todo.id >= startOfDay && todo.id < endOfDay
  );
});

// 计算筛选当天的schedule
const schedulesForAppDate = computed(() => {
  // 获取 appDate 当天零点的时间戳
  const startOfDay = dateService.appDateTimestamp.value;
  // 计算 appDate 第二天零点的时间戳，作为筛选范围的上限（不包含）
  const endOfDay = addDays(startOfDay, 1);

  if (!scheduleList.value) return [];
  return scheduleList.value.filter(
    (schedule) =>
      schedule.activityDueRange[0] >= startOfDay &&
      schedule.activityDueRange[0] < endOfDay
  );

  // schedule.id 是一个时间戳，筛选比今天的起始日期大的
});

/**
 * 监听【经过筛选后】的当天 todo 列表的变化。
 * 当这个列表本身、或者其中任何 todo 的 realPomo 属性变化时，
 * 就更新 Pomo Store 中对应日期的数据。
 */
watch(
  todosForAppDate,
  (currentTodos) => {
    const dateKey = dateService.appDateKey.value;
    pomoStore.setTodosForDate(dateKey, currentTodos);
    // console.log(`[HomeView] Pomo store updated for date: ${dateKey}`);
  },
  { deep: true, immediate: true } // immediate 确保初始化时执行一次
);

/**
 * 监听 appDate 的变化，用于处理需要清空选中状态等副作用。
 */
watch(
  () => dateService.appDateTimestamp.value, // 监听时间戳更可靠
  () => {
    selectedRowId.value = null;
    selectedActivityId.value = null;
    // ... 清理其他选中状态 ...
    console.log(`[HomeView] App date changed, activity selection cleared.`);
  }
);

/** 自动保存数据 */
watch(activityList, (value) => saveActivities(value), { deep: true });
watch(todoList, (value) => saveTodos(value), { deep: true });
watch(scheduleList, (value) => saveSchedules(value), { deep: true });
watch(taskList, (value) => saveTasks(value), { deep: true });

// ======================== 1. TimeTable 相关 ========================

// -- 时间表数据和类型
const currentType = ref<"work" | "entertainment">("work");
const allBlocks = ref({
  work: loadTimeBlocks("work", [...WORK_BLOCKS]),
  entertainment: loadTimeBlocks("entertainment", [...ENTERTAINMENT_BLOCKS]),
});
const viewBlocks = computed(() => allBlocks.value[currentType.value]);

/** 切换时间表类型（工作/娱乐） */
function onTypeChange(newType: "work" | "entertainment") {
  currentType.value = newType;
}

/** 编辑时间块后的处理 */
function onBlocksUpdate(newBlocks: Block[]) {
  allBlocks.value[currentType.value] = [...newBlocks]; // 保持引用变
  saveTimeBlocks(currentType.value, newBlocks);
}

/** 恢复默认时间块 */
function onTimeTableReset(type: "work" | "entertainment") {
  allBlocks.value[type] =
    type === "work" ? [...WORK_BLOCKS] : [...ENTERTAINMENT_BLOCKS];
  removeTimeBlocksStorage(type);
  saveTimeBlocks(type, allBlocks.value[type]);
}

// ======================== 2. Activity 相关 ========================

/** 新增活动 */
function onAddActivity(newActivity: Activity) {
  handleAddActivity(activityList.value, scheduleList.value, newActivity);
}

/** 删除活动及其关联的 todo/schedule */
function onDeleteActivity(id: number) {
  handleDeleteActivity(
    activityList.value,
    todoList.value,
    scheduleList.value,
    id
  );
}

/** 选中活动，将其转为 todo 并作为 picked */
function onPickActivity(activity: Activity) {
  pickedTodoActivity.value = passPickedActivity(
    activityList.value,
    todoList.value,
    activity
  );
}

/** 标记当前活跃活动清单id，用于高亮和交互 */
function onUpdateActiveId(id: number | null) {
  activeId.value = id;
  selectedActivityId.value = null; // 避免多重高亮
  const todo = todoList.value.find((t) => t.activityId === id);
  const schedule = scheduleList.value.find((s) => s.activityId === id);
  selectedTaskId.value = todo?.taskId || schedule?.taskId || null; //用id在todoList ScheduleList里面搜索TaskId，等于搜到的值
  selectedRowId.value = null; // 这个id是today里的
}

/** 修改番茄类型时的提示处理 */
function onTogglePomoType(id: number, event?: Event) {
  const target = (event?.target as HTMLElement) || null;
  const result = togglePomoType(activityList.value, id);
  if (result) {
    pomoTypeChangeMessage.value = `番茄类型从${result.oldType}更改为${result.newType}`;
    pomoTypeChangeTarget.value = target;
    showPomoTypeChangePopover.value = true;
    setTimeout(() => (showPomoTypeChangePopover.value = false), 3000);
  }
}

/** 重复当前的活动 */
function onRepeatActivity(id: number) {
  // 找到Activity
  const selectActivity = activityList.value.find((a) => a.id === id);

  if (selectActivity) {
    const newActivity = {
      ...selectActivity, // 使用展开运算符复制 activity 的所有属性
      id: Date.now(), // 设置新的 id
      status: "" as
        | ""
        | "delayed"
        | "ongoing"
        | "cancelled"
        | "done"
        | "suspended"
        | undefined, // 如果需要清空状态，可以在这里设置
    };
    handleAddActivity(activityList.value, scheduleList.value, newActivity);
  }
}
// ======================== 3. Today/任务相关操作 ========================
/** Todo 更新状态（勾选） */
function onUpdateTodoStatus(id: number, isChecked: boolean) {
  const todo = todoList.value.find((t) => t.id === id);

  // 如果找不到对应的 Schedule，则打印错误并直接返回，防止后续代码出错
  if (!todo) {
    console.error(
      `[onUpdateTodoStatus] 错误：无法在 todoList 中找到 id 为 ${id} 的项目。`
    );
    return;
  }

  // 2. 根据 isChecked 状态，决定新的 status 和 doneTime
  const newStatus = isChecked ? "done" : "";
  let doneTime: number | undefined;

  if (isChecked) {
    if (isViewingToday.value) {
      const date = new Date(dateService.appDateTimestamp.value);

      const now = new Date();
      date.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      doneTime = date.getTime();
    }
  } else {
    doneTime = undefined;
  }

  updateTodoStatus(
    todoList.value,
    activityList.value,
    id,
    todo.activityId,
    doneTime,
    newStatus
  );
}

/** 更新待办事项的番茄钟估计 */
function onUpdateTodoEst(id: number, estPomo: number[]) {
  // 更新 todoList 中的数据
  const todo = todoList.value.find((t) => t.id === id);
  if (todo) {
    todo.estPomo = estPomo;
    // 保存到本地存储
    saveTodos(todoList.value);
  }
  const activity = activityList.value.find((a) => a.id === todo?.activityId);
  if (activity && estPomo && estPomo.length === 1) {
    activity.estPomoI = estPomo[0].toString();
  }
}

/** 更新待办事项的实际番茄钟完成情况 */
function onUpdateTodoPomo(id: number, realPomo: number[]) {
  updateTodoPomo(todoList.value, id, realPomo);
  saveTodos(todoList.value);
  // watch监听器会自动检测变化并更新store
}

/** Todo 推迟处理 */
function onSuspendTodo(id: number) {
  handleSuspendTodo(todoList.value, activityList.value, id);
}

/** Todo 取消 */
function onCancelTodo(id: number) {
  // 更新 todoList 中的数据
  const todo = todoList.value.find((t) => t.id === id);
  if (todo) {
    todo.status = "cancelled";
    const activity = activityList.value.find((a) => a.id === todo.activityId);
    if (!activity) {
      console.warn(`未找到 activityId 为 ${todo.activityId} 的 activity`);
      return;
    }
    activity.status = "cancelled";
  }
}

/** Todo 变为 Activity **/
function onRepeatTodo(id: number) {
  const todo = todoList.value.find((t) => t.id === id);
  if (todo) {
    const activity = activityList.value.find((a) => a.id === todo.activityId);
    if (!activity) {
      console.warn(`未找到 activityId 为 ${todo.activityId} 的 activity`);
      return;
    }
    const newActivity = {
      ...activity, // 使用展开运算符复制 activity 的所有属性
      id: Date.now(), // 设置新的 id
      status: "" as
        | ""
        | "delayed"
        | "ongoing"
        | "cancelled"
        | "done"
        | "suspended"
        | undefined, // 如果需要清空状态，可以在这里设置
    };
    activityList.value.push(newActivity);
  }
}

/** Schedule 推迟一天 */
function onSuspendSchedule(id: number) {
  handleSuspendSchedule(scheduleList.value, activityList.value, id);
}

/** Schedule 取消 */
function onCancelSchedule(id: number) {
  // 更新 ScheduleList 中的数据
  const schedule = scheduleList.value.find((s) => s.id === id);
  if (schedule) {
    schedule.status = "cancelled";
    const activity = activityList.value.find(
      (a) => a.id === schedule.activityId
    );
    if (!activity) {
      console.warn(`未找到 activityId 为 ${schedule.activityId} 的 activity`);
      return;
    }
    activity.status = "cancelled";
  }
}

/** Schedule 变为 Activity **/
function onRepeatSchedule(id: number) {
  const schedule = scheduleList.value.find((s) => s.id === id);
  if (schedule) {
    const activity = activityList.value.find(
      (a) => a.id === schedule.activityId
    );
    if (!activity) {
      console.warn(`未找到 activityId 为 ${schedule.activityId} 的 activity`);
      return;
    }
    const newActivity = {
      ...activity, // 使用展开运算符复制 activity 的所有属性
      id: Date.now(), // 设置新的 id
      status: "" as
        | ""
        | "delayed"
        | "ongoing"
        | "cancelled"
        | "done"
        | "suspended"
        | undefined, // 如果需要清空状态，可以在这里设置
    };
    activityList.value.push(newActivity);
  }
}

/** Schedule 勾选完成 */
function onUpdateScheduleStatus(id: number, isChecked: boolean) {
  // 1. 根据 ID 安全地查找目标 Schedule
  const schedule = scheduleList.value.find((s) => s.id === id);

  // 如果找不到对应的 Schedule，则打印错误并直接返回，防止后续代码出错
  if (!schedule) {
    console.error(
      `[onUpdateScheduleStatus] 错误：无法在 scheduleList 中找到 id 为 ${id} 的项目。`
    );
    return;
  }

  // 2. 根据 isChecked 状态，决定新的 status 和 doneTime
  const newStatus = isChecked ? "done" : "";
  let doneTime: number | undefined;

  if (isChecked) {
    if (dateService.isViewingToday.value) {
      const date = new Date(dateService.appDateTimestamp.value);

      const now = new Date();
      date.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      doneTime = date.getTime();
    }
  } else {
    doneTime = undefined;
  }

  updateScheduleStatus(
    scheduleList.value,
    activityList.value,
    id,
    schedule.activityId,
    doneTime,
    newStatus
  );
}

/** 修改日期切换按钮的处理函数 */
function onDateSet(direction: "prev" | "next" | "today" | "query") {
  clearSelectedRow();
  switch (direction) {
    case "prev":
      dateService.navigateDate("prev");
      break;
    case "next":
      dateService.navigateDate("next");
      break;
    case "today":
      dateService.navigateDate("today");
      break;
    case "query":
      if (queryDate.value) dateService.navigateDate(new Date(queryDate.value));
      queryDate.value = null;
      break;
  }
}

function goToTodo(todoId: number) {
  dateService.navigateDate(new Date(todoId));
}

// 从Today选择任务处理函数
function onSelectTask(taskId: number | null) {
  selectedTaskId.value = taskId;
  activeId.value = null;
}

// 从Today选择活动处理函数
function onSelectActivity(activityId: number | null) {
  selectedActivityId.value = activityId;
}

// 选中行
function onSelectRow(id: number | null) {
  selectedRowId.value = id;
}

// 清除Today选中行的函数
function clearSelectedRow() {
  selectedTaskId.value = null;
  activeId.value = null;
  selectedRowId.value = null;
}

// 编辑title，Schedule.id，同步Activity
function handleEditScheduleTitle(id: number, newTitle: string) {
  const schedule = scheduleList.value.find((s) => s.id === id);
  if (!schedule) {
    console.warn(`未找到 id 为 ${id} 的 schedule`);
    return;
  }
  schedule.activityTitle = newTitle;
  const activity = activityList.value.find((a) => a.id === schedule.activityId);
  if (!activity) {
    console.warn(`未找到 activityId 为 ${schedule.activityId} 的 activity`);
    return;
  }
  activity.title = newTitle;
  console.log(
    `已更新 schedule ${id} 和 activity ${schedule.activityId} 的标题为: ${newTitle}`
  );

  // 找到task 并重新赋值
  const taskIndex = taskList.value.findIndex((t) => t.sourceId === schedule.id);
  if (taskIndex !== -1) {
    console.log(taskIndex);
    taskList.value[taskIndex] = {
      ...taskList.value[taskIndex],
      activityTitle: newTitle,
    };
  }
}

// 编辑title，todo.id，同步Activity
function handleEditTodoTitle(id: number, newTitle: string) {
  // 找到todo
  const todo = todoList.value.find((t) => t.id === id);
  if (!todo) {
    console.warn(`未找到 id 为 ${id} 的 todo`);
    return;
  }
  todo.activityTitle = newTitle;

  // 找到activity
  const activity = activityList.value.find((a) => a.id === todo.activityId);
  if (!activity) {
    return;
  }
  activity.title = newTitle; //

  // 找到task 并重新赋值
  const taskIndex = taskList.value.findIndex((t) => t.id === todo.id);
  if (taskIndex !== -1) {
    taskList.value[taskIndex] = {
      ...taskList.value[taskIndex],
      activityTitle: newTitle,
    };
  }
}

// 编辑时间
function handleEditTodoStart(id: number, newTm: string) {
  // 获取当前查看日期的时间戳
  const viewingDayTimestamp = dateService.appDateTimestamp.value;
  const todo = todoList.value.find((t) => t.id === id);
  if (!todo) {
    console.warn(`未找到 id 为 ${id} 的 todo`);
    return;
  }
  todo.startTime = getTimestampForTimeString(newTm, viewingDayTimestamp);
}

function handleEditTodoDone(id: number, newTm: string) {
  // 获取当前查看日期的时间戳
  const viewingDayTimestamp = dateService.appDateTimestamp.value;
  const todo = todoList.value.find((t) => t.id === id);
  if (!todo) {
    console.warn(`未找到 id 为 ${id} 的 todo`);
    return;
  }
  todo.doneTime = getTimestampForTimeString(newTm, viewingDayTimestamp);
}

function handleEditScheduleDone(id: number, newTm: string) {
  // 获取当前查看日期的时间戳
  const viewingDayTimestamp = dateService.appDateTimestamp.value;
  const schedule = scheduleList.value.find((s) => s.id === id);
  if (!schedule) {
    console.warn(`未找到 id 为 ${id} 的 schedule`);
    return;
  }
  schedule.doneTime = getTimestampForTimeString(newTm, viewingDayTimestamp);
}

// ======================== 4. Task/执行相关操作 ========================
// 在script部分添加处理函数
function onActivityUpdated() {
  // 重新加载活动列表
  activityList.value = loadActivities();
  // 重新加载待办事项列表
  todoList.value = loadTodos();
  // 重新加载日程列表
  scheduleList.value = loadSchedules();
}

function onInterruptionUpdated(interruption: Schedule) {
  // 日志输出查看具体值
  console.log("interruption object:", interruption);

  // 确保 interruption 是有效的 Schedule 对象
  if (interruption && typeof interruption === "object") {
    scheduleList.value.push(interruption);
    console.log("push", interruption.activityTitle);
    console.log("Updated schedule list:", scheduleList.value);
    saveSchedules(scheduleList.value);
  } else {
    console.error("Invalid interruption object:", interruption);
  }
}
// ======================== 5. 数据联动 Watchers ========================
/** 活动变化时联动 Todo/Schedule 属性同步 */
watch(
  activityList,
  (newVal) => {
    newVal.forEach((activity) => {
      // 同步Schedule
      const relatedSchedule = scheduleList.value.find(
        (s) => s.activityId === activity.id
      );
      if (relatedSchedule) {
        relatedSchedule.activityTitle = activity.title;
        relatedSchedule.activityDueRange = activity.dueRange
          ? [activity.dueRange[0], activity.dueRange[1]]
          : [0, "0"];
        relatedSchedule.status = activity.status || "";
        relatedSchedule.location = activity.location || "";
      }
      // 同步Todo
      const relatedTodo = todoList.value.find(
        (todo) => todo.activityId === activity.id
      );
      if (relatedTodo) {
        relatedTodo.activityTitle = activity.title;
        if (activity.pomoType === "🍒") {
          // 只要变成樱桃，无条件重置为4个番茄
          relatedTodo.estPomo = [4];
        } else {
          // 非樱桃类型时，才考虑 estPomoI
          if (!relatedTodo.estPomo || relatedTodo.estPomo.length === 0) {
            // 没有estPomo则按estPomoI初始化
            relatedTodo.estPomo = activity.estPomoI
              ? [parseInt(activity.estPomoI)]
              : [];
          }
          // 只要有estPomoI，覆盖第一个元素
          if (activity.estPomoI) {
            relatedTodo.estPomo[0] = parseInt(activity.estPomoI);
          }
        }
        relatedTodo.status = activity.status || "";
        relatedTodo.pomoType = activity.pomoType;
        relatedTodo.dueDate = activity.dueDate;
      }
    });
  },
  { deep: true }
);

/** 活动due范围变化时仅更新状态 */
watch(
  () => activityList.value.map((a) => a.dueRange && a.dueRange[0]),
  () => {
    const now = Date.now();
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    activityList.value.forEach((activity) => {
      if (!activity.dueRange || !activity.dueRange[0]) return;
      if (activity.status === "done") return;
      const dueMs =
        typeof activity.dueRange[0] === "string"
          ? Date.parse(activity.dueRange[0])
          : Number(activity.dueRange[0]);

      // 只更新活动状态
      if (dueMs >= startOfDay && dueMs <= endOfDay) {
        // 截止日期是今天
        activity.status = "ongoing";
      } else if (dueMs < now) {
        // 截止日期已过
        activity.status = "cancelled";
      } else {
        // 截止日期还未到
        activity.status = "";
      }
    });
  }
);

// ======================== 8. 生命周期 Hook ========================
onMounted(() => {
  // 主动检查一次日期变更
  dateService.navigateDate("today");
});

// ======================== 9. 页面尺寸调整  ========================
const { size: topHeight, startResize: startVerticalResize } = useResize(
  280,
  "vertical",
  100,
  280
);
const { size: leftWidth, startResize: startLeftResize } = useResize(
  150,
  "horizontal",
  150,
  240,
  false // 左侧面板
);
const { size: rightWidth, startResize: startRightResize } = useResize(
  480,
  "horizontal",
  300,
  600,
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
  min-width: 150px;
}

.right {
  padding: 8px;
  box-sizing: border-box;
  overflow: auto;
  margin-left: 0;
  background: var(--color-background);
}

.middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0px;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 450px;
  max-width: 900px;
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

.today-header {
  position: sticky;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 8px 4px 0px;
  flex-shrink: 0;
}

.today-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: "Courier New", Courier, monospace;
  font-weight: bold;
}

.today-status {
  font-size: 18px;
  font-family: "Courier New", Courier, monospace;
  color: var(--color-text);
  border-radius: 12px;
  padding: 0px 8px 0px 8px;
  margin: 2px;
}
.today-view-container {
  flex: 1;
  overflow: auto;
  min-height: 0; /* 重要：允许 flex 子项收缩 */
}
.middle-top.not-today .today-header {
  background: var(--color-background);
}

.middle-top.not-today .today-status {
  font-size: 18px;
  font-family: "Courier New", Courier, monospace;
  color: var(--color-text);
  border-radius: 12px;
  padding: 0px 8px 0px 8px;
  margin: 2px;
  background: var(--color-blue-light);
}

.middle-top.not-today .global-pomo {
  background: var(--color-background-light);
}

.middle-top.not-today .today-pomo {
  color: var(--color-text);
  /* display: none; */
}

.middle-top.not-today .total-pomo {
  color: var(--color-text);
  /* display: none; */
}

.middle-bottom {
  background: var(--color-background);
  overflow: auto;
  padding: 4px;
  box-sizing: border-box;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.global-pomo {
  display: inline-flex;
  align-items: center;
  font-size: 16px;
  color: var(--color-text);
  background: var(--color-background-light-transparent);
  padding: 2px 8px;
  border-radius: 12px;
  font-family: "Courier New", Courier, monospace;
}

.today-pomo {
  color: var(--color-blue);
  font-weight: 500;
  font-family: "Courier New", Courier, monospace;
  font-weight: bold;
}

.total-pomo {
  color: var(--color-text);
  font-weight: bold;
}

.button-group {
  display: flex;
  gap: 2px;
  padding: 0px;
  align-items: center;
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
