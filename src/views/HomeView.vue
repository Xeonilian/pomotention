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
          :todayTodos="todayTodos"
          :todaySchedules="todaySchedules"
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
      <div class="middle">
        <div class="middle-top" :style="{ height: topHeight + 'px' }">
          <!-- 今日待办 -->
          <div class="today-header">
            <div class="today-info">
              <span class="today-status">{{ dateService.currentDate }}</span>

              <span class="global-pomo"
                ><span class="today-pomo">🍅 {{ todayPomoCount }}/</span
                ><span class="total-pomo">{{ globalRealPomo }}</span></span
              >
            </div>
            <div class="button-group">
              <n-button
                size="small"
                circle
                secondary
                strong
                type="warning"
                :title="showPomoSeq ? '变为番茄' : '变为序列'"
                @click="showPomoSeq = !showPomoSeq"
                :disabled="!showPomodoroView || timerStore.isActive"
              >
                {{ showPomoSeq ? "🍕" : "🍅" }}
              </n-button>
              <n-button
                @click="showPomodoroView = !showPomodoroView"
                size="small"
                circle
                secondary
                strong
                type="warning"
                :style="buttonStyle(showPomodoroView)"
                title="切换番茄钟视图"
                >⏰</n-button
              >
              <n-button
                size="small"
                circle
                secondary
                strong
                type="info"
                @click="showLeft = !showLeft"
                :style="buttonStyle(showLeft)"
                title="切换日程视图"
                >🗓️</n-button
              >
              <!-- <n-button
                size="small"
                circle
                secondary
                strong
                type="info"
                @click="showMiddleBottom = !showMiddleBottom"
                :style="buttonStyle(showMiddleBottom)"
                title="切换执行视图"
                :disabled="timerStore.isActive"
                >🖊️</n-button
              > -->

              <n-button
                size="small"
                circle
                secondary
                strong
                type="info"
                @click="showRight = !showRight"
                :style="buttonStyle(showRight)"
                title="切换活动视图"
                >📋</n-button
              >

              <n-button
                size="small"
                circle
                secondary
                strong
                @click="dateService.goToPreviousDay"
                :disabled="!dateService.canGoToPreviousDay"
                title="上一天"
              >
                <template #icon>
                  <DocumentArrowLeft20Regular />
                </template>
              </n-button>
              <n-button
                size="small"
                circle
                secondary
                strong
                @click="dateService.goToNextDay"
                :disabled="!dateService.canGoToNextDay"
                title="下一天"
              >
                <template #icon>
                  <DocumentArrowRight20Regular />
                </template>
              </n-button>
            </div>
          </div>
          <TodayView
            :todayTodos="todayTodos"
            :todaySchedules="todaySchedules"
            :activeId="activeId"
            @update-schedule-status="onUpdateScheduleStatus"
            @update-todo-status="onUpdateTodoStatus"
            @suspend-todo="onSuspendTodo"
            @suspend-schedule="onSuspendSchedule"
            @update-todo-est="onUpdateTodoEst"
            @update-todo-pomo="onUpdateTodoPomo"
            @convert-to-task="onConvertToTask"
            @select-task="onSelectTask"
          />
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
          @pick-activity-todo="onPickActivity"
          @add-activity="onAddActivity"
          @delete-activity="onDeleteActivity"
          @update-active-id="onUpdateActiveId"
          @toggle-pomo-type="onTogglePomoType"
        />
        <!-- 使用 Naive UI 的 popover -->
        <n-popover
          v-if="showPomoTypeChangePopover"
          :show="showPomoTypeChangePopover"
          trigger="manual"
          pplacement="bottom-end"
          @update:show="showPomoTypeChangePopover = $event"
        >
          <template #trigger>
            <div
              ref="pomoTypeChangeTarget"
              style="position: fixed; right: 20px; bottom: 20px"
            ></div>
          </template>
          <div style="padding: 0px 0px">
            {{ pomoTypeChangeMessage }}
          </div>
        </n-popover>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ------------------------ 导入依赖 ------------------------
import { ref, onMounted, watch, onUnmounted, computed } from "vue";
import { NButton, NPopover } from "naive-ui";
import { useTimerStore } from "@/stores/useTimerStore";
import { usePomoStore } from "@/stores/usePomoStore";
import { taskService } from "@/services/taskService";
import TimeTableView from "@/views/Home/TimeTableView.vue";
import TodayView from "@/views/Home/TodayView.vue";
import TaskView from "@/views/Home/TaskView.vue";
import ActivityView from "@/views/Home/ActivityView.vue";
import type { Activity } from "@/core/types/Activity";
import type { Block } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import { convertToSchedule, convertToTodo } from "@/core/utils/convertActivity";
import { WORK_BLOCKS, ENTERTAINMENT_BLOCKS } from "@/core/constants";
import {
  loadActivities,
  loadTodos,
  loadSchedules,
  loadTimeBlocks,
  saveActivities,
  saveTodos,
  saveSchedules,
  saveTimeBlocks,
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
  isToday,
  updateTodoPomo,
} from "@/services/todayService";
import { createDateCheckService } from "@/services/dateCheckService";
import {
  DocumentArrowLeft20Regular,
  DocumentArrowRight20Regular,
} from "@vicons/fluent";
import { useDateService } from "@/services/dateService";
import { useResize } from "@/composables/useResize";

// ======================== 响应式状态与初始化 ========================

const timerStore = useTimerStore();
const pomoStore = usePomoStore();
const dateService = useDateService();

// -- 基础UI状态
const showLeft = ref(true);
const showMiddleBottom = ref(true); // 取消隐藏下部分
const showRight = ref(true);
const showPomodoroView = ref(true); // 控制是否显示 PomodoroView
const showPomoTypeChangePopover = ref(false);
const pomoTypeChangeMessage = ref("");
const pomoTypeChangeTarget = ref<HTMLElement | null>(null);
const showPomoSeq = ref(true);

// -- 核心数据
const activityList = ref<Activity[]>(loadActivities());
const todoList = ref<Todo[]>(loadTodos());
const scheduleList = ref<Schedule[]>(loadSchedules());
const pickedTodoActivity = ref<Activity | null>(null); // 选中活动
const activeId = ref<number | null>(null); // 当前激活活动id

// 计算当天的番茄钟数
const todayPomoCount = computed(() => pomoStore.todayPomoCount);

// 计算全局realPomo（历史 + 当天）
const globalRealPomo = computed(() => pomoStore.globalRealPomo);

// 监听todoList变化，更新全局计数
watch(
  todoList,
  (newTodos) => {
    const todayTodos = newTodos.filter((todo) => isToday(todo.id));
    // console.log("更新今日待办列表:", todayTodos);
    pomoStore.setTodayTodos(todayTodos);

    // 更新每个todo的番茄钟计数
    todayTodos.forEach((todo) => {
      if (todo.realPomo && todo.realPomo.length > 0) {
        pomoStore.updateGlobalPomoCount(todo);
      }
    });
  },
  { deep: true, immediate: true } // 添加 immediate: true 确保首次加载时执行
);

// 监听单个todo的番茄钟变化
watch(
  () => todoList.value.map((todo) => todo.realPomo),
  () => {
    console.log("检测到番茄钟变化");
    const todayTodos = todoList.value.filter((todo) => isToday(todo.id));
    pomoStore.setTodayTodos(todayTodos);

    todayTodos.forEach((todo) => {
      if (todo.realPomo && todo.realPomo.length > 0) {
        pomoStore.updateGlobalPomoCount(todo);
      }
    });
  },
  { deep: true }
);

// 监听日期变化
watch(
  () => dateService.currentDate,
  (newDate) => {
    console.log("日期变化:", newDate);
    // 更新今日待办列表
    const todayTodos = todoList.value.filter((todo) => isToday(todo.id));
    pomoStore.setTodayTodos(todayTodos);

    // 更新每个todo的番茄钟计数
    todayTodos.forEach((todo) => {
      if (todo.realPomo && todo.realPomo.length > 0) {
        pomoStore.updateGlobalPomoCount(todo);
      }
    });
  }
);

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

// ======================== 2. Today（当天）数据相关 ========================

/** 今日的 Todo */
const todayTodos = computed(() =>
  todoList.value.filter((todo) => {
    dateService.currentDate; // 依赖今日，日期变自动刷新
    return isToday(todo.id);
  })
);
/** 今日的 Schedule */
const todaySchedules = computed(() =>
  scheduleList.value.filter((schedule) => {
    dateService.currentDate;
    return isToday(schedule.id);
  })
);

// ======================== 3. Activity 相关 ========================

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

/** 标记当前活跃活动id，用于高亮和交互 */
function onUpdateActiveId(id: number | null) {
  activeId.value = id;
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

// ======================== 4. Today/任务相关操作 ========================

/** Todo 更新状态（勾选） */
function onUpdateTodoStatus(id: number, activityId: number, status: string) {
  updateTodoStatus(todoList.value, activityList.value, id, activityId, status);
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
}

/** 更新待办事项的实际番茄钟完成情况 */
function onUpdateTodoPomo(id: number, realPomo: number[]) {
  console.log("更新番茄钟完成情况:", { id, realPomo });
  updateTodoPomo(todoList.value, id, realPomo);
  saveTodos(todoList.value);

  // 确保更新全局计数
  const todo = todoList.value.find((t) => t.id === id);
  if (todo && isToday(todo.id)) {
    console.log("触发全局计数更新");
    pomoStore.updateGlobalPomoCount(todo);
  }
}

/** Todo 推迟处理 */
function onSuspendTodo(id: number) {
  handleSuspendTodo(todoList.value, activityList.value, id);
}

/** Schedule 推迟一天 */
function onSuspendSchedule(id: number) {
  handleSuspendSchedule(scheduleList.value, activityList.value, id);
}

/** Schedule 勾选完成 */
function onUpdateScheduleStatus(
  id: number,
  activityId: number,
  status: string
) {
  updateScheduleStatus(
    scheduleList.value,
    activityList.value,
    id,
    activityId,
    status
  );
}

/** Schedule 转换为任务 */
function onConvertToTask(id: number) {
  const schedule = scheduleList.value.find((s) => s.id === id);
  if (schedule) {
    taskService.createTaskFromSchedule(
      schedule.id.toString(),
      schedule.activityTitle,
      schedule.projectName
    );
  }
}

// ======================== 5. 数据联动 Watchers ========================

/** 自动保存数据 */
watch(activityList, (value) => saveActivities(value), { deep: true });
watch(todoList, (value) => saveTodos(value), { deep: true });
watch(scheduleList, (value) => saveSchedules(value), { deep: true });

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
        // 只在 estPomo 不存在时才设置初始值
        if (!relatedTodo.estPomo || relatedTodo.estPomo.length === 0) {
          relatedTodo.estPomo =
            activity.pomoType === "🍒"
              ? [4]
              : activity.estPomoI
              ? [parseInt(activity.estPomoI)]
              : [];
        }
        relatedTodo.status = activity.status || "";
        relatedTodo.pomoType = activity.pomoType;
        relatedTodo.dueDate = activity.dueDate;
      }
    });
  },
  { deep: true }
);

/** 活动due范围变化时，补全/移除 scheduleList */
watch(
  () => activityList.value.map((a) => a.dueRange && a.dueRange[0]),
  () => {
    activityList.value.forEach((activity) => {
      const tag = `【activity: ${activity.title} (id:${activity.id})】`;
      const due = activity.dueRange && activity.dueRange[0];
      const scheduleIdx = scheduleList.value.findIndex(
        (s) => s.activityId === activity.id
      );
      if (activity.class === "S" && due) {
        const dueMs = typeof due === "string" ? Date.parse(due) : Number(due);
        if (isToday(dueMs)) {
          // 新增或更新schedule
          if (scheduleIdx === -1) {
            activity.status = "ongoing";
            const sch = convertToSchedule(activity);
            scheduleList.value.push(sch);
          } else {
            // 更新主字段
            const sch = scheduleList.value[scheduleIdx];
            sch.activityTitle = activity.title;
            sch.activityDueRange = activity.dueRange
              ? [...activity.dueRange]
              : [0, "0"];
            sch.status = activity.status || "";
            sch.projectName = activity.projectId
              ? `项目${activity.projectId}`
              : undefined;
            sch.location = activity.location || "";
          }
        } else if (scheduleIdx !== -1) {
          // 非今日，移除schedule
          scheduleList.value.splice(scheduleIdx, 1);
          activity.status = "";
          console.log(`${tag} 由于不再属于今天，A.status 已置空`);
        }
      } else if (scheduleIdx !== -1) {
        // 非S类型移除schedule
        scheduleList.value.splice(scheduleIdx, 1);
        console.log(`${tag} 非 S 类型，移除 schedule`);
      }
    });
  }
);

// ======================== 6. 辅助UI函数 ========================

/** 按钮的禁用与高亮效果 */
function buttonStyle(show: boolean, isPomoButton = false) {
  return {
    filter: show ? "none" : "grayscale(100%)",
    opacity: show ? 1 : 0.6,
    cursor: isPomoButton && timerStore.isActive ? "not-allowed" : "pointer",
    backgroundColor:
      isPomoButton && timerStore.isActive ? "#e0e0e0" : undefined,
  };
}

// ======================== 7. 日期监控服务 ========================

/**
 * 校验日期变化，变动时刷新当前日期及 blocks，并同步相关UI
 * 注意：日期变化回调可进一步加入其他刷新逻辑
 */
const dateCheckService = createDateCheckService({
  activityList,
  scheduleList,
  todoList,
  convertToSchedule,
  convertToTodo,
  onDateChange(date) {
    // 日期变时：刷新 blocks 并刷新 currentDate 触发 UI 自动更新
    allBlocks.value[currentType.value] = [
      ...allBlocks.value[currentType.value],
    ];
    dateService.updateCurrentDate();
    console.log("当前日期变化:", date);
  },
});

// ======================== 8. 生命周期 Hook ========================

onMounted(() => {
  dateCheckService.checkDateChange();
  dateCheckService.setupUserInteractionCheck();
  dateService.updateCurrentDate(); // 初始化日期显示
});

onUnmounted(() => {
  dateCheckService.cleanupListeners();
});

// ======================== 9. 使用 composable ========================
const { size: topHeight, startResize: startVerticalResize } = useResize(
  280,
  "vertical",
  100,
  window.innerHeight - 200
);
const { size: leftWidth, startResize: startLeftResize } = useResize(
  200,
  "horizontal",
  200,
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

// 添加选中的任务ID状态
const selectedTaskId = ref<number | null>(null);

// 添加选择任务处理函数
function onSelectTask(taskId: number | null) {
  selectedTaskId.value = taskId;
}
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
  background: #fafafa;
  overflow: auto;
}

.left {
  background: #ffffff;
  padding: 5px 10px 15px 10px;
  box-sizing: border-box;
  overflow-y: hidden;
  margin-right: 0;
}

.right {
  background: #ffffff;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
  margin-left: 0;
}

.middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0px;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 400px;
}

.middle-top {
  background: #ffffff;
  margin-bottom: 8px;
  overflow: auto;
  padding: 4px;
  box-sizing: border-box;
}

.middle-bottom {
  background: #ffffff;
  overflow: auto;
  padding: 4px;
  box-sizing: border-box;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.today-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 8px 8px 0px;
}

.today-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.today-status {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.global-pomo {
  display: inline-flex;
  align-items: center;
  font-size: 16px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 12px;
}

.today-pomo {
  color: #2080f0;
  font-weight: 500;
}

.total-pomo {
  color: #666;
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
</style>
