<!-- 
  Component: HomeView.vue 
  Description: 界面控制，数据管理
  Parent: App.vue
-->

<template>
  <div class="home-content">
    <div class="content">
      <div v-if="showLeft" class="left" :style="{ width: leftWidth + 'px' }">
        <!-- 日程表 -->
        <TimeTableView
          :blocks="viewBlocks"
          :current-type="currentType"
          :todayTodos="currentViewDateTodos"
          :todaySchedules="currentViewDateSchedules"
          @update-blocks="onBlocksUpdate"
          @reset-schedule="onTimeTableReset"
          @change-type="onTypeChange"
        />
      </div>
      <div
        v-if="showLeft"
        class="resize-handle-horizontal"
        @mousedown="startLeftResize"
      ></div>
      <div class="middle" :class="{ 'middle-alone': !showLeft && !showRight }">
        <div
          v-if="showTodayView"
          class="middle-top"
          :style="
            showMiddleBottom ? { height: topHeight + 'px' } : { height: '100%' }
          "
          :class="{ 'not-today': !isCurrentDay }"
        >
          <!-- 今日待办 -->
          <div class="today-header">
            <div class="today-info">
              <span class="today-status">{{ dateService.currentDate }}</span>
              <span class="global-pomo">
                <span class="today-pomo">🍅 {{ currentDatePomoCount }}/</span>
                <span class="total-pomo">{{ globalRealPomo }}</span>
              </span>
            </div>
            <div class="button-group">
              <n-button
                size="small"
                circle
                secondary
                strong
                @click="onDateChange('prev')"
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
                @click="onDateChange('today')"
                title="回到今天"
              >
                <template #icon>
                  <n-icon>
                    <CalendarToday20Regular />
                  </n-icon>
                </template>
              </n-button>
              <n-button
                size="small"
                circle
                secondary
                strong
                @click="onDateChange('next')"
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
          <div class="today-view-container">
            <TodayView
              :selectedRowId="selectedRowId"
              :todayTodos="currentViewDateTodos"
              :todaySchedules="currentViewDateSchedules"
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
        <div
          v-if="showMiddleBottom"
          class="resize-handle"
          @mousedown="startVerticalResize"
        ></div>
        <div
          v-if="showMiddleBottom"
          class="middle-bottom"
          :style="{ height: `calc(100% - ${topHeight}px - 8px)` }"
        >
          <TaskView
            :showPomoSeq="showPomoSeq"
            :showPomodoroView="showPomodoroView"
            :selectedTaskId="selectedTaskId"
            :selectedTask="selectedTask"
            @activity-updated="onActivityUpdated"
            @toggle-pomo-seq="showPomoSeq = !showPomoSeq"
          />
        </div>
      </div>
      <div
        v-if="showRight"
        class="resize-handle-horizontal"
        @mousedown="startRightResize"
      ></div>
      <div v-if="showRight" class="right" :style="{ width: rightWidth + 'px' }">
        <!-- 活动清单 -->
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
        />
      </div>
    </div>
    <!-- 添加可拖动的 PomodoroView -->
    <div class="draggable-container" ref="draggableContainer">
      <PomodoroView
        v-if="showPomodoroView"
        :showPomoSeq="showPomoSeq"
        @toggle-pomo-seq="showPomoSeq = !showPomoSeq"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// ------------------------ 导入依赖 ------------------------
import { ref, onMounted, watch, onUnmounted, computed } from "vue";
import { NButton, NIcon } from "naive-ui";
import { usePomoStore } from "@/stores/usePomoStore";
import TimeTableView from "@/views/Home/TimeTableView.vue";
import TodayView from "@/views/Home/TodayView.vue";
import TaskView from "@/views/Home/TaskView.vue";
import ActivityView from "@/views/Home/ActivityView.vue";
import PomodoroView from "@/views/Home/PomodoroView.vue";
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
  convertToSchedule,
} from "@/services/activityService";
import {
  updateScheduleStatus,
  updateTodoStatus,
  handleSuspendTodo,
  handleSuspendSchedule,
  updateTodoPomo,
} from "@/services/todayService";
import { createDateCheckService } from "@/services/dateCheckService";
import {
  Previous24Regular,
  Next24Regular,
  CalendarToday20Regular,
} from "@vicons/fluent";
import { useDateService } from "@/services/dateService";
import { useResize } from "@/composables/useResize";
import { getTimestampForTimeString } from "@/core/utils";

// ======================== 响应式状态与初始化 ========================
const pomoStore = usePomoStore();
const dateService = useDateService();
// 获取当前查看日期的时间戳
const viewingDayTimestamp = dateService.selectedDate.value.getTime();

// -- 基础UI状态
const showLeft = ref(true);
const showMiddleBottom = ref(true); // 取消隐藏下部分
const showRight = ref(true);
const showPomodoroView = ref(true); // 控制是否显示 PomodoroView
const showPomoTypeChangePopover = ref(false);
const pomoTypeChangeMessage = ref("");
const pomoTypeChangeTarget = ref<HTMLElement | null>(null);
const showPomoSeq = ref(false);
const showTodayView = ref(true);

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

// 计算当天的番茄钟数
const currentDatePomoCount = computed(() => {
  const dateString = dateService.getCurrentDateStr();
  return pomoStore.getPomoCountByDate(dateString);
});

// 计算全局realPomo（历史 + 当天）
const globalRealPomo = computed(() => pomoStore.globalRealPomo);

// 计算当前日期
const isCurrentDay = computed(() => {
  const today = new Date();
  const selected = dateService.selectedDate.value;
  return today.toDateString() === selected.toDateString();
});

// 日期监控服务定义
/**
 * 校验日期变化，变动时刷新当前日期及 blocks，并同步相关UI
 * 注意：日期变化回调可进一步加入其他刷新逻辑
 */
const dateCheckService = createDateCheckService({
  activityList,
  scheduleList,
  todoList,
  convertToSchedule,
  onDateChange() {
    // 日期变时：刷新 blocks 并刷新 currentDate 触发 UI 自动更新
    allBlocks.value[currentType.value] = [
      ...allBlocks.value[currentType.value],
    ];
    dateService.updateCurrentDate();
  },
});

// 1. 监听：todos的realPomo数组变化（番茄钟完成情况变化）
watch(
  () => todoList.value.map((todo) => todo.realPomo),
  () => {
    // 当任何todo的realPomo变化时，重新计算当前日期的番茄钟总数
    updateCurrentDateTodos();
  },
  { deep: true }
);

// 2. 监听：当前视图日期变化（用户切换日期）
watch(
  () => dateService.currentViewDate.value,
  () => {
    // 日期切换时的处理：
    // - 检查日期变化（可能触发一些全局状态更新）
    // - 清除当前选中的任务
    // - 更新新日期的todos到store
    dateCheckService.checkDateChange();
    clearSelectedRow();
    updateCurrentDateTodos();
  },
  { immediate: true }
);

// 3. 监听：选择日期变化（通常与currentViewDate同步，但单独处理UI状态）
watch(
  () => dateService.selectedDate.value,
  () => {
    // 选择日期变化时只需要清除选中状态
    // todos更新由上面的currentViewDate监听器处理
    clearSelectedRow();
  },
  { immediate: true }
);

// 4. 监听：todoList整体变化（新增、删除todo）
watch(
  todoList,
  () => {
    // 当todoList发生变化时（新增/删除todo），更新当前日期的todos
    updateCurrentDateTodos();
  },
  { deep: true, immediate: true }
);

// 通用函数：更新当前日期的todos到store
function updateCurrentDateTodos() {
  const dateString = dateService.getCurrentDateStr();
  const currentTodos = todoList.value.filter((todo) => {
    return dateService.isSelectedDate(todo.id);
  });
  pomoStore.setTodosForDate(dateString, currentTodos);
}

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
  selectedRowId.value = null; // 这个id是activity的
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
/** 今日的 Todo */
const currentViewDateTodos = computed(() =>
  todoList.value.filter((todo) => {
    return dateService.isSelectedDate(todo.id);
  })
);

/** 今日的 Schedule */
const currentViewDateSchedules = computed(() =>
  scheduleList.value.filter((schedule) => {
    return dateService.isSelectedDate(schedule.activityDueRange[0]);
  })
);

/** Todo 更新状态（勾选） */
function onUpdateTodoStatus(
  id: number,
  activityId: number,
  doneTime: number | undefined,
  status: string
) {
  updateTodoStatus(
    todoList.value,
    activityList.value,
    id,
    activityId,
    doneTime,
    status
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
function onUpdateScheduleStatus(
  id: number,
  activityId: number,
  doneTime: number | undefined,
  status: string
) {
  updateScheduleStatus(
    scheduleList.value,
    activityList.value,
    id,
    activityId,
    doneTime,
    status
  );
}

/** 修改日期切换按钮的处理函数 */
function onDateChange(direction: "prev" | "next" | "today") {
  clearSelectedRow(); // 先清除选中状态
  switch (direction) {
    case "prev":
      dateService.goToPreviousDay();
      break;
    case "next":
      dateService.goToNextDay();
      break;
    case "today":
      dateService.resetToToday();
      break;
  }
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
  activity.title = newTitle; // #BUG

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
  const todo = todoList.value.find((t) => t.id === id);
  if (!todo) {
    console.warn(`未找到 id 为 ${id} 的 todo`);
    return;
  }
  todo.startTime = getTimestampForTimeString(newTm, viewingDayTimestamp);
}

function handleEditTodoDone(id: number, newTm: string) {
  const todo = todoList.value.find((t) => t.id === id);
  if (!todo) {
    console.warn(`未找到 id 为 ${id} 的 todo`);
    return;
  }
  todo.doneTime = getTimestampForTimeString(newTm, viewingDayTimestamp);
}

function handleEditScheduleDone(id: number, newTm: string) {
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

/** 变化时联动 Todo/Schedule 属性同步 */

// ======================== 8. 生命周期 Hook ========================
onMounted(() => {
  // 主动检查一次日期变更
  dateCheckService.checkDateChange();
  dateCheckService.setupUserInteractionCheck();
  dateService.updateCurrentDate(); // 初始化日期显示

  if (draggableContainer.value) {
    draggableContainer.value.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // 设置初始位置在页面正中偏下方
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const elementWidth = draggableContainer.value.offsetWidth;
    const elementHeight = draggableContainer.value.offsetHeight;

    const initialX = (windowWidth - elementWidth) * 0.35; // 正中间
    const initialY = (windowHeight - elementHeight) * 0.8; // 偏下方

    draggableContainer.value.style.left = `${initialX}px`;
    draggableContainer.value.style.top = `${initialY}px`;
  }
  window.addEventListener("view-toggle", handleViewToggle);
});

onUnmounted(() => {
  dateCheckService.cleanupListeners();
  if (draggableContainer.value) {
    draggableContainer.value.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }
  window.removeEventListener("view-toggle", handleViewToggle);
});

// ======================== 9. 页面尺寸调整  ========================
const { size: topHeight, startResize: startVerticalResize } = useResize(
  280,
  "vertical",
  100,
  window.innerHeight - 200
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
  320,
  600,
  true // 右侧面板
);

// 添加拖动相关代码
const draggableContainer = ref<HTMLElement | null>(null);
let isDragging = false;
let startX = 0;
let startY = 0;
let initialX = 0;
let initialY = 0;

function handleMouseDown(e: MouseEvent) {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  if (draggableContainer.value) {
    const rect = draggableContainer.value.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging || !draggableContainer.value) return;

  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;

  // 获取视窗尺寸
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // 获取元素尺寸
  const elementWidth = draggableContainer.value.offsetWidth;
  const elementHeight = draggableContainer.value.offsetHeight;

  // 计算新位置
  let newX = initialX + deltaX;
  let newY = initialY + deltaY;

  // 限制X轴范围
  newX = Math.max(0, Math.min(newX, windowWidth - elementWidth));
  // 限制Y轴范围
  newY = Math.max(0, Math.min(newY, windowHeight - elementHeight));

  draggableContainer.value.style.left = `${newX}px`;
  draggableContainer.value.style.top = `${newY}px`;
}

function handleMouseUp() {
  isDragging = false;
}
// ======================== 9.  页面视图隐藏显示控制 ========================
function handleViewToggle(event: Event) {
  const customEvent = event as CustomEvent<{ key: string }>;
  const { key } = customEvent.detail;
  switch (key) {
    case "pomodoro":
      showPomodoroView.value = !showPomodoroView.value;
      break;
    case "schedule":
      showLeft.value = !showLeft.value;
      break;
    case "activity":
      showRight.value = !showRight.value;
      break;
    case "task":
      showMiddleBottom.value = !showMiddleBottom.value;
      break;
    case "today":
      showTodayView.value = !showTodayView.value;
      break;
  }
}

// 暴露方法给父组件
defineExpose({
  handleViewToggle,
});
</script>

<style scoped>
.home-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  flex: 1;
}

.content {
  flex: 1;
  display: flex;
  background: var(--color-background-light-light);
  overflow: auto;
  justify-content: center;
  overflow-x: hidden; /* 隐藏水平滚动条，但可能裁剪内容 */
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
  padding: 16px;
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
  max-width: 800px;
  margin: 0;
}

.middle-alone {
  margin: 0 auto;
  max-width: 900px;
}

.middle-top {
  background: var(--color-background);
  margin-bottom: 8px;
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
  margin: 8px 8px 8px 0px;
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
  height: 100%;
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
  gap: 8px;
  padding: 0px;
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

.draggable-container {
  position: fixed;
  z-index: 1000;
  cursor: move;
  user-select: none;
  background: rgba(255, 255, 255, 0);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(255, 255, 255, 0.1);
  transition: box-shadow 0.3s ease;
  padding: 0px;
}

.draggable-container:hover {
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15);
}
</style>
