<!-- 
  Component: HomeView.vue 
  Description: 界面控制，数据管理
  Parent: App.vue
-->

<template>
  <div class="home-content">
    <!-- 左侧面板 (日程表) -->
    <div
      v-if="settingStore.settings.showSchedule"
      class="left"
      :style="{ width: leftWidth + 'px' }"
    >
      <TimeTable
        :blocks="viewBlocks"
        :current-type="currentType"
        :todayTodos="todosForAppDate"
        :todaySchedules="schedulesForAppDate"
        :dayStart="dateService.appDateTimestamp.value"
        @update-blocks="onBlocksUpdate"
        @reset-schedule="onTimeTableReset"
        @change-type="onTypeChange"
      />
    </div>

    <!-- 左侧面板调整大小手柄 -->
    <div
      v-if="settingStore.settings.showSchedule"
      class="resize-handle-horizontal"
      @mousedown="startLeftResize"
    ></div>

    <!-- 中间内容区域 -->
    <div
      class="middle"
      :class="{
        'middle-alone':
          !settingStore.settings.showSchedule &&
          !settingStore.settings.showActivity,
      }"
    >
      <!-- 今日视图 -->
      <div
        v-if="settingStore.settings.showPlanner"
        class="middle-top"
        :style="
          settingStore.settings.showTask
            ? { height: topHeight + 'px' }
            : { height: '100%' }
        "
      >
        <!-- 今日活动的头部和控件 -->
        <div class="planner-header">
          <div
            v-if="settingStore.settings.viewSet === 'day'"
            class="day-info"
            :class="{
              yesterday: isViewDateYesterday,
              tomorrow: isViewDateTomorrow,
            }"
          >
            <span class="day-status">{{ dateService.displayDateInfo }}</span>
            <span class="global-pomo">
              <span class="today-pomo">🍅{{ currentDatePomoCount }}/</span>
              <span class="total-pomo">{{ globalRealPomo }}</span>
            </span>
          </div>
          <div v-if="settingStore.settings.viewSet === 'week'" class="day-info">
            <span class="day-status">{{ dateService.displayWeekInfo }}</span>
            <span class="global-pomo">
              <span class="total-pomo">🍅{{ globalRealPomo }}</span>
            </span>
          </div>
          <div
            v-if="settingStore.settings.viewSet === 'month'"
            class="day-info"
          >
            <span class="day-status">{{ dateService.displayMonthInfo }}</span>
            <span class="global-pomo">
              <span class="total-pomo">🍅{{ globalRealPomo }}</span>
            </span>
          </div>
          <div class="button-group">
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
              :title="
                settingStore.settings.viewSet === 'day'
                  ? '上一天'
                  : settingStore.settings.viewSet === 'week'
                  ? '上一周'
                  : '上一月'
              "
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
              :title="
                settingStore.settings.viewSet === 'day'
                  ? '下一天'
                  : settingStore.settings.viewSet === 'week'
                  ? '下一周'
                  : '下一月'
              "
            >
              <template #icon>
                <n-icon>
                  <Next24Regular />
                </n-icon>
              </template>
            </n-button>

            <n-button
              size="small"
              circle
              secondary
              strong
              @click="onViewSet()"
              title="切换视图"
            >
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
            v-if="
              settingStore.settings.showPlanner &&
              settingStore.settings.viewSet === 'day'
            "
            :selectedRowId="selectedRowId"
            :activeId="activeId"
            :dayTodos="todosForCurrentView"
            :daySchedules="schedulesForCurrentView"
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
            @convert-todo-to-task="onConvertTodoToTask"
            @convert-schedule-to-task="onConvertScheduleToTask"
          />
          <WeekPlanner
            v-if="
              settingStore.settings.showPlanner &&
              settingStore.settings.viewSet === 'week'
            "
            :weekTodos="todosForCurrentView"
            :weekSchedules="schedulesForCurrentView"
            :weekStartTs="dateService.weekStartTs.value"
            :dayStartTs="dateService.appDateTimestamp.value"
            :selectedRowId="selectedRowId"
            :activeId="activeId"
            @date-change="onDateChange"
            @item-change="onItemChange"
          />
          <MonthPlanner
            v-if="
              settingStore.settings.showPlanner &&
              settingStore.settings.viewSet === 'month'
            "
            :monthTodos="todosForCurrentView"
            :monthSchedules="schedulesForCurrentView"
            :monthStartTs="dateService.monthStartTs.value"
            :dayStartTs="dateService.appDateTimestamp.value"
            :selectedRowId="selectedRowId"
            :activeId="activeId"
            @date-change="onDateChange"
            @item-change="onItemChange"
          />
        </div>
      </div>
      <!-- 任务视图调整大小手柄 -->
      <div
        v-if="settingStore.settings.showTask"
        class="resize-handle"
        @mousedown="startVerticalResize"
      ></div>
      <!-- 任务视图 -->
      <div
        v-if="settingStore.settings.showTask"
        class="middle-bottom"
        :style="{ height: `calc(100% - ${topHeight}px - 8px)` }"
      >
        <TaskTracker
          :selectedTaskId="selectedTaskId"
          :selectedTask="selectedTask"
          :selectedTagIds="selectedTagIds"
          @interruption-record="onInterruptionRecord"
          @activetaskId="onActiveTaskId"
          @update-task-description="onUpdateTaskDescription"
        />
      </div>
    </div>
    <!-- 右侧面板调整大小手柄 -->
    <div
      v-if="settingStore.settings.showActivity"
      class="resize-handle-horizontal"
      @mousedown="startRightResize"
    ></div>
    <!-- 右侧面板 (活动清单) -->
    <div
      v-if="settingStore.settings.showActivity"
      class="right"
      :style="{ width: rightWidth + 'px' }"
    >
      <ActivitySheet
        :activities="activityList"
        :activeId="activeId"
        :todos="todoList"
        :schedules="scheduleList"
        :selectedActivityId="selectedActivityId"
        :selectedTaskId="selectedTaskId"
        @pick-activity="onPickActivity"
        @add-activity="onAddActivity"
        @delete-activity="onDeleteActivity"
        @update-active-id="onUpdateActiveId"
        @toggle-pomo-type="onTogglePomoType"
        @repeat-activity="onRepeatActivity"
        @create-child-activity="onCreateChildActivity"
        @increase-child-activity="onIncreaseChildActivity"
        @go-to-todo="goToTodo"
        @go-to-schedule="goToSchedule"
        @convert-activity-to-task="onConvertActivityToTask"
      />
    </div>
  </div>
  <!-- 错误提示弹窗 -->
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
// ------------------------ 导入依赖 ------------------------
import { ref, onMounted, watch, computed } from "vue";
import { NButton, NIcon, NPopover } from "naive-ui";
import { usePomoStore } from "@/stores/usePomoStore";
import TimeTable from "@/components/TimeTable/TimeTable.vue";
import DayPlanner from "@/components/DayPlanner/DayPlanner.vue";
import WeekPlanner from "@/components/WeekPlanner/WeekPlanner.vue";
import MonthPlanner from "@/components/MonthPlanner/MonthPlanner.vue";
import TaskTracker from "@/components/TaskTracker/TaskTracker.vue";
import ActivitySheet from "@/components/ActivitySheet/ActivitySheet.vue";
import type { Activity } from "@/core/types/Activity";
import type { Block } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import {
  Task,
  InterruptionCommittedPayload,
  InterruptionRecord,
} from "@/core/types/Task";
import { WORK_BLOCKS, ENTERTAINMENT_BLOCKS, ViewType } from "@/core/constants";
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
} from "@/services/localStorageService";
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
  CalendarSettings20Regular,
} from "@vicons/fluent";
import { useResize } from "@/composables/useResize";
import {
  getTimestampForTimeString,
  addDays,
  getDateKey,
  debounce,
} from "@/core/utils";
import { unifiedDateService } from "@/services/unifiedDateService";
import { useSettingStore } from "@/stores/useSettingStore";
// ======================== 响应式状态与初始化 ========================

// -- 基础UI状态
const settingStore = useSettingStore();
const queryDate = ref<number | null>(null);
const showPopover = ref(false);
const popoverMessage = ref("");

// -- 核心数据
const activityList = ref<Activity[]>(loadActivities());
const todoList = ref<Todo[]>(loadTodos());
const scheduleList = ref<Schedule[]>(loadSchedules());
const taskList = ref<Task[]>(loadTasks());

// id 索引
const activityById = computed(() => {
  const m = new Map<number, Activity>();
  for (const a of activityList.value) m.set(a.id, a);
  return m;
});

const todoByActivityId = computed(() => {
  const m = new Map<number, Todo>();
  for (const t of todoList.value)
    if (t.activityId != null) m.set(t.activityId, t);
  return m;
});

const scheduleByActivityId = computed(() => {
  const m = new Map<number, Schedule>();
  for (const s of scheduleList.value)
    if (s.activityId != null) m.set(s.activityId, s);
  return m;
});

const taskById = computed(() => {
  const m = new Map<number, Task>();
  for (const t of taskList.value) m.set(t.id, t);
  return m;
});

const taskBySourceId = computed(() => {
  const m = new Map<number, Task>();
  for (const t of taskList.value) m.set(t.sourceId, t);
  return m;
});

const todoById = computed(() => {
  const m = new Map<number, Todo>();
  for (const t of todoList.value) m.set(t.id, t);
  return m;
});
const scheduleById = computed(() => {
  const m = new Map<number, Schedule>();
  for (const s of scheduleList.value) m.set(s.id, s);
  return m;
});

// HACK 可能不需要
const childrenOfActivity = computed(() => {
  const m = new Map<number, Activity[]>();
  for (const a of activityList.value) {
    if (!a.parentId) continue;
    if (!m.has(a.parentId)) m.set(a.parentId, []);
    m.get(a.parentId)!.push(a);
  }
  return m;
});

// 添加选中的任务ID状态
const activeId = ref<number | null>(null); // 当前从ActivitySheet选中的activity.id
const selectedTaskId = ref<number | null>(null); // 当前从Todo选中的todo.taskId
const selectedActivityId = ref<number | null>(null); // 当前从Todo选中的todo.activityId
const selectedRowId = ref<number | null>(null); // todo.id 或者 schedule.id

// 选中的Task
const selectedTask = computed(() => {
  const id = selectedTaskId.value;
  if (id == null) return null;
  return taskById.value.get(id) ?? null;
});
// 选中的tagIds
const selectedTagIds = computed(() => {
  // 1) 优先根据 activeId
  if (activeId.value != null) {
    const act = activityById.value.get(activeId.value);
    if (act) return act.tagIds ?? null;
  }

  // 2) 再根据 selectedRowId（todo 或 schedule）
  const rowId = selectedRowId.value;
  if (rowId == null) return null;

  // 2.1 todo
  const todo = todoList.value.find((t) => t.id === rowId);
  if (todo?.activityId != null) {
    const act = activityById.value.get(todo.activityId);
    if (act) return act.tagIds ?? null;
  }

  // 2.2 schedule
  const schedule = scheduleList.value.find((s) => s.id === rowId);
  if (schedule?.activityId != null) {
    const act = activityById.value.get(schedule.activityId);
    if (act) return act.tagIds ?? null;
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

// 计算当前日期 不赋值在UI计算class就会失效，但是UI输出的值是正确的
const isViewDateToday = dateService.isViewDateToday;
const isViewDateYesterday = dateService.isViewDateYesterday;
const isViewDateTomorrow = dateService.isViewDateTomorrow;

// 计算筛选的当前视图范围内的 todo
const todosForCurrentView = computed(() => {
  const { start, end } = dateService.visibleRange.value;

  if (!todoList.value) return [];
  return todoList.value.filter((todo) => todo.id >= start && todo.id < end);
});

// 计算筛选当前视图范围内的 schedule
const schedulesForCurrentView = computed(() => {
  const { start, end } = dateService.visibleRange.value;

  if (!scheduleList.value) return [];
  return scheduleList.value.filter((schedule) => {
    const date = schedule.activityDueRange?.[0];

    if (date == null) return false;
    return date >= start && date < end;
  });
});

// 计算筛选的todo
const todosForAppDate = computed(() => {
  const startOfDay = dateService.appDateTimestamp.value;
  const endOfDay = addDays(startOfDay, 1);

  if (!todoList.value) return [];
  return todoList.value.filter(
    (todo) => todo.id >= startOfDay && todo.id < endOfDay
  );
});

// 计算筛选的schedule
const schedulesForAppDate = computed(() => {
  const startOfDay = dateService.appDateTimestamp.value;
  const endOfDay = addDays(startOfDay, 1);

  if (!scheduleList.value) return [];
  return scheduleList.value.filter((schedule) => {
    const date = schedule.activityDueRange?.[0];

    if (date == null) return false;
    return date >= startOfDay && date < endOfDay;
  });
});

// weekplanner 引起变化日期
const onDateChange = (day: number) => {
  dateService.setAppDate(day);
  selectedActivityId.value = null;
  selectedTaskId.value = null;
  activeId.value = null;
};

// weekplanner 引起变化日期
const onItemChange = (activityId?: number, taskId?: number) => {
  if (activityId) {
    selectedActivityId.value = activityId;
  } else {
    selectedActivityId.value = null;
  }
  if (taskId) {
    selectedTaskId.value = taskId;
  } else {
    selectedTaskId.value = null;
  }
};
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
const saveAllNow = () => {
  try {
    console.log("save all now");
    saveActivities(activityList.value);
    saveTodos(todoList.value);
    saveSchedules(scheduleList.value);
    saveTasks(taskList.value);
  } catch (e) {
    console.error("save failed", e);
  }
};
const saveAllDebounced = debounce(saveAllNow, 800);

watch([activityList, todoList, scheduleList, taskList], () => {
  console.log("watch debounce save");
  saveAllDebounced();
});

// 离开页面兜底（Tauri 桌面端同样可用）
window.addEventListener("beforeunload", () => {
  try {
    console.log("watch flush save");
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
  saveAllDebounced();
}

/** 删除活动及其关联的 todo/schedule */
function onDeleteActivity(id: number) {
  const result = handleDeleteActivity(
    activityList.value,
    todoList.value,
    scheduleList.value,
    id
  );
  if (!result) showErrorPopover("请先清空子项目再删除！");
  activeId.value = null;
  saveAllDebounced();
}

/** 选中活动，将其转为 todo 并作为 picked */
function onPickActivity(activity: Activity) {
  passPickedActivity(
    activityList.value,
    todoList.value,
    activity,
    dateService.appDateTimestamp.value,
    dateService.isViewDateToday.value
  );
  saveAllDebounced();
}

// 同步UI选中
function onConvertActivityToTask(payload: {
  task: Task;
  activityId: number;
  todoId?: number;
}) {
  const { task, activityId, todoId } = payload;
  console.log("onConvertActivityToTask", activityId, task.id);

  // 1) 推入任务列表（替换引用，便于浅 watch 或立即响应）
  taskList.value = [...taskList.value, task];

  // 2) 回写 activity.taskId
  const aIdx = activityList.value.findIndex((a) => a.id === activityId);
  if (aIdx !== -1) {
    const updated = { ...activityList.value[aIdx], taskId: task.id };
    const cloned = [...activityList.value];
    cloned[aIdx] = updated;
    activityList.value = cloned;
  }

  // 3) 回写 todo.taskId（如果存在）
  if (todoId != null) {
    const tIdx = todoList.value.findIndex((t) => t.id === todoId);
    if (tIdx !== -1) {
      const updated = { ...todoList.value[tIdx], taskId: task.id };
      const cloned = [...todoList.value];
      cloned[tIdx] = updated;
      todoList.value = cloned;
    } else {
      // 若只知道按 activityId 关联：
      const ttIdx = todoList.value.findIndex(
        (t) => t.activityId === activityId
      );
      if (ttIdx !== -1) {
        const updated = { ...todoList.value[ttIdx], taskId: task.id };
        const cloned = [...todoList.value];
        cloned[ttIdx] = updated;
        todoList.value = cloned;
      }
    }
  }

  // 4) 同步 UI 选中（如果你希望）
  activeId.value = activityId;
  selectedTaskId.value = task.id;

  // 5) 一次性保存
  saveAllDebounced();
}

function onConvertTodoToTask(id: number, taskId: number) {
  console.log("onConvertTodoToTask", id, taskId);
  const todo = todoList.value.find((t) => t.id === id);
  if (todo) {
    const activity = activityList.value.find((a) => a.id === todo.activityId);
    if (activity) {
      selectedTaskId.value = taskId;
      activeId.value = activity.id;
    }
  }
  saveAllDebounced();
}

function onConvertScheduleToTask(id: number, taskId: number) {
  console.log("onConvertScheduleToTask", id, taskId);
  const schedule = scheduleList.value.find((s) => s.id === id);
  if (schedule) {
    const activity = activityList.value.find(
      (a) => a.id === schedule.activityId
    );
    if (activity) {
      selectedTaskId.value = taskId;
      activeId.value = activity.id;
    }
  }
  saveAllDebounced();
}

/** 标记当前活跃活动清单id，用于高亮和交互 */
function onUpdateActiveId(id: number | null) {
  activeId.value = id;
  selectedActivityId.value = null; // 避免多重高亮
  const activity = activityList.value.find((a) => a.id === id);
  const todo = todoList.value.find((t) => t.activityId === id);
  const schedule = scheduleList.value.find((s) => s.activityId === id);
  selectedTaskId.value =
    activity?.taskId || todo?.taskId || schedule?.taskId || null; //用id在todoList ScheduleList里面搜索TaskId，等于搜到的值
  // console.log("selectedTaskId.value", selectedTaskId.value);
  selectedRowId.value = null; // 这个id是today里的
  saveAllDebounced();
}

/** 修改番茄类型时的提示处理 */
function onTogglePomoType(id: number) {
  const todo = todoList.value.find((t) => t.activityId === id);
  if (todo) todo.positionIndex = undefined; // 先取消当前TimeTable的位置
  const result = togglePomoType(activityList.value, id);
  if (result) showErrorPopover("活动的类型已切换！");
  saveAllDebounced();
}

/** 重复当前的活动 */
function onRepeatActivity(id: number) {
  // 找到Activity
  const selectActivity = activityList.value.find((a) => a.id === id);

  if (selectActivity) {
    const newActivity = {
      ...selectActivity, // 使用展开运算符复制 activity 的所有属性
      id: Date.now(), // 设置新的 id
      status: "" as any,
      tagIds: undefined,
      taskId: undefined,
      ...(selectActivity.dueRange && {
        dueRange: [null, selectActivity.dueRange[1]] as [number | null, string],
      }),
    };
    handleAddActivity(activityList.value, scheduleList.value, newActivity);
  }
  saveAllDebounced();
}

/** 创建子活动 */
function onCreateChildActivity(id: number) {
  // 找到Activity
  const selectActivity = activityList.value.find((a) => a.id === id);

  if (selectActivity && !selectActivity.parentId) {
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
      tagIds: undefined,
      parentId: id,
      taskId: undefined,
    };
    handleAddActivity(activityList.value, scheduleList.value, newActivity);
  }
  saveAllDebounced();
}

function onIncreaseChildActivity(id: number) {
  // 找到Activity
  const selectActivity = activityList.value.find((a) => a.id === id);
  if (selectActivity) selectActivity.parentId = null;
  saveAllDebounced();
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
    if (isViewDateToday.value) {
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
  saveAllDebounced();
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
  saveAllDebounced();
}

/** 更新待办事项的实际番茄钟完成情况 */
function onUpdateTodoPomo(id: number, realPomo: number[]) {
  updateTodoPomo(todoList.value, id, realPomo);
  saveAllDebounced();
}

/** Todo 推迟处理 */
function onSuspendTodo(id: number) {
  handleSuspendTodo(todoList.value, activityList.value, id);
  saveAllDebounced();
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
    const childActivities = activityList.value.filter(
      (a) => a.parentId === activity.id
    );
    childActivities.forEach((child) => {
      child.status = "cancelled";
    });
  }
  saveAllDebounced();
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
        | undefined,
      dueDate: null,
    };
    activityList.value.push(newActivity);
  }
  saveAllDebounced();
}

/** Schedule 推迟一天 */
function onSuspendSchedule(id: number) {
  handleSuspendSchedule(scheduleList.value, activityList.value, id);
  saveAllDebounced();
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
  saveAllDebounced();
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
    const newActivity: Activity = {
      ...activity, // 使用展开运算符复制 activity 的所有属性
      id: Date.now(), // 设置新的 id
      status: "" as any,
      ...(activity.dueRange && {
        dueRange: [null, activity.dueRange[1]] as [number | null, string], // 保持类型安全
        // tagIds: undefined,
      }),
    };
    activityList.value.push(newActivity);
  }
  saveAllDebounced();
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
    if (dateService.isViewDateToday.value) {
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
  saveAllDebounced();
}

/** 修改日期切换按钮的处理函数 */
function onDateSet(direction: "prev" | "next" | "today" | "query") {
  clearSelectedRow();
  switch (direction) {
    case "prev":
      const rdate = dateService.navigateByView("prev");
      dateService.setAppDate(rdate);
      console.log(dateService.appDateTimestamp.value);
      break;
    case "next":
      const ndate = dateService.navigateByView("next");
      console.log(ndate);
      dateService.setAppDate(dateService.appDateTimestamp.value);
      break;
    case "today":
      const tdate = dateService.navigateByView("today");
      dateService.setAppDate(tdate);
      break;
    case "query":
      if (queryDate.value) {
        // 传入选中的日期；服务内部会按当前 viewType 锚定到日/周一/月初
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
}

function goToTodo(todoId: number) {
  dateService.navigateTo(new Date(todoId));
}

function goToSchedule(scheduleId: number) {
  console.log(getDateKey(scheduleId));

  dateService.navigateTo(new Date(scheduleId));
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
  saveAllDebounced();
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
  saveAllDebounced();
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
  if (newTm === "") {
    todo.doneTime = undefined;
  } else {
    todo.doneTime = getTimestampForTimeString(newTm, viewingDayTimestamp);
  }
  saveAllDebounced();
}

function handleEditScheduleDone(id: number, newTm: string) {
  // 获取当前查看日期的时间戳
  const viewingDayTimestamp = dateService.appDateTimestamp.value;
  const schedule = scheduleList.value.find((s) => s.id === id);
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

// ======================== 4. Task/执行相关操作 ========================
function onUpdateTaskDescription(payload: {
  taskId: number;
  description: string;
}) {
  const { taskId, description } = payload;
  const idx = taskList.value.findIndex((t) => t.id === taskId);
  if (idx === -1) return;

  // 替换引用，确保响应式与浅 watch 都能触发
  const cloned = [...taskList.value];
  cloned[idx] = { ...cloned[idx], description };
  taskList.value = cloned;

  // 统一持久化
  saveAllDebounced();
}

function onInterruptionRecord(payload: InterruptionCommittedPayload) {
  console.log("[interruption] record:", payload);

  {
    const idx = taskList.value.findIndex((t) => t.id === payload.taskId);
    if (idx !== -1) {
      const task = taskList.value[idx];

      const existsIndex = task.interruptionRecords.findIndex(
        (r) => r.id === payload.record.id
      );

      let nextInterruptionRecords: InterruptionRecord[];

      if (existsIndex !== -1) {
        // 标准化已存在的那一项，确保使用 class 字段
        const old = task.interruptionRecords[existsIndex] as any;
        const normalized: InterruptionRecord = {
          id: old.id ?? payload.record.id,
          class: ("class" in old
            ? old.class
            : payload.record.interruptionType) as "E" | "I",
          description: old.description ?? payload.record.description,
          activityType: old.activityType ?? payload.activity?.class ?? null,
        };

        nextInterruptionRecords = [...task.interruptionRecords];
        nextInterruptionRecords[existsIndex] = normalized;
      } else {
        nextInterruptionRecords = [
          ...task.interruptionRecords,
          {
            id: payload.record.id,
            class: payload.record.interruptionType,
            description: payload.record.description,
            activityType: payload.activity?.class ?? null,
          },
        ];
      }

      const nextTask: Task = {
        ...task,
        interruptionRecords: nextInterruptionRecords,
      };
      const nextTasks = [...taskList.value];
      nextTasks[idx] = nextTask;
      taskList.value = nextTasks;
    } else {
      console.warn("[interruption] task not found by id:", payload.taskId);
    }
  }

  if (payload.activity) {
    const exists = activityList.value.some(
      (a) => a.id === payload.activity!.id
    );
    if (!exists) {
      activityList.value = [...activityList.value, payload.activity];
      console.log("[activity] pushed:", payload.activity.title);
    }
  }

  if (payload.schedule) {
    const exists = scheduleList.value.some(
      (s) => s.id === payload.schedule!.id
    );
    if (!exists) {
      scheduleList.value = [...scheduleList.value, payload.schedule];
      console.log("[schedule] pushed:", payload.schedule.activityTitle);
    }
  }

  saveAllDebounced();
}

// 选择task时高亮对应的todo/activity/schedule
function onActiveTaskId(taskId: number | null) {
  if (!taskId) {
    // 如果没有 taskId，清空
    selectedRowId.value = null;
    selectedActivityId.value = null;
    return;
  }

  // 找到当前任务
  const task = taskList.value.find((t) => t.id === taskId);
  if (!task) {
    // 如果找不到任务，清空
    selectedRowId.value = null;
    selectedActivityId.value = null;
    return;
  }

  // 根据 task 的 source 判断
  if (task.source === "activity") {
    const activity = activityList.value.find((a) => a.id === task.sourceId);
    if (activity) {
      selectedActivityId.value = activity.id; // 找到活动
    }
  } else if (task.source === "todo") {
    const todo = todoList.value.find((t) => t.id === task.sourceId);
    if (todo) {
      selectedActivityId.value = todo.activityId; // 获取关联的 activityId
    }
  } else if (task.source === "schedule") {
    const schedule = scheduleList.value.find((s) => s.id === task.sourceId);
    if (schedule) {
      selectedActivityId.value = schedule.activityId; // 获取关联的 activityId
    }
  }
}

// ======================== 5. 数据联动 Watchers ========================
/** Activity 活动变化时联动 Todo/Schedule 属性同步 */
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
          : [null, "0"];
        relatedSchedule.status = activity.status || "";
        relatedSchedule.location = activity.location || "";
        relatedSchedule.taskId = activity.taskId;
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
          if (!activity.estPomoI) relatedTodo.estPomo = undefined;
          // 只要有estPomoI，覆盖第一个元素
          if (activity.estPomoI && relatedTodo.estPomo) {
            relatedTodo.estPomo[0] = parseInt(activity.estPomoI);
          }
        }
        relatedTodo.status = activity.status || "";
        relatedTodo.pomoType = activity.pomoType;
        if (activity.dueDate) relatedTodo.dueDate = activity.dueDate;
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
      } else if (dueMs < now && activity.status != "cancelled") {
        // 截止日期已过
        activity.status = "delayed";
      } else {
        // 截止日期还未到
        if (activity.status != "cancelled") activity.status = "";
      }
    });
  }
);

// ======================== 8. 生命周期 Hook ========================
onMounted(() => {
  // 主动检查一次日期变更
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

const { startResize: startVerticalResize } = useResize(
  topHeight,
  "vertical",
  0,
  500
);
const { startResize: startLeftResize } = useResize(
  leftWidth,
  "horizontal",
  60,
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
  min-width: 120px;
}

.right {
  padding: 8px;
  box-sizing: border-box;
  overflow: auto;
  margin-left: 0;
  background: var(--color-background);
  min-width: 120px;
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
  position: sticky;
  display: flex;
  align-items: center;
  margin: 8px 8px 4px 0px;
  flex-shrink: 0;
  white-space: nowrap; /* 防止内部的 span 换行 */
  overflow: hidden; /* 如果内容实在太多，隐藏超出部分 */
  text-overflow: ellipsis; /* 用省略号表示被隐藏的文本 */
  min-width: 0;
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
}

.day-info {
  display: flex;
  align-items: center;
  font-family: "Courier New", Courier, monospace;
  font-weight: bold;
  flex: 1 1 auto;
  min-width: 0;
}

.day-status {
  font-size: 18px;
  font-family: "Courier New", Courier, monospace;
  color: var(--color-text);
  border-radius: 12px;
  padding: 0px 8px 0px 8px;
  margin: 2px;
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

.day-info.tomorrow .day-status {
  background: var(--color-red-light);
}

.day-info.yesterday .day-status {
  background: var(--color-blue-light);
}

.day-status {
  font-size: 18px;
  font-family: "Courier New", Courier, monospace;
  color: var(--color-text);
  border-radius: 12px;
  padding: 0px 8px 0px 8px;
  margin: 2px;
}

.global-pomo {
  background: var(--color-background-light);
  color: var(--color-text);
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
