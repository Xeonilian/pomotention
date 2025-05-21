<!-- 
  Component: HomeView.vue 
  Description: 界面控制，数据管理
  Parent: App.vue
-->

<template>
  <div class="home-content">
    <div class="content">
      <div v-if="showLeft" class="left">
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
      <div class="middle">
        <div v-if="showMiddleTop" class="middle-top">
          <!-- 今日待办 -->
          <div class="today-info">
            <span>今日日期：{{ currentDate }}</span>
          </div>
          <TodayView
            :todayTodos="todayTodos"
            :todaySchedules="todaySchedules"
            :activeId="activeId"
            @update-schedule-status="onUpdateScheduleStatus"
            @update-todo-status="onUpdateTodoStatus"
            @drop-todo="onDropTodo"
            @suspend-schedule="onSuspendSchedule"
          />
        </div>
        <div class="middle-bottom">
          <div class="button-group">
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
            <n-button
              size="small"
              circle
              secondary
              strong
              type="info"
              @click="showMiddleTop = !showMiddleTop"
              :style="buttonStyle(showMiddleTop)"
              title="切换待办视图"
              >🖊️</n-button
            >
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
              type="info"
              title="番茄序列"
              @click="showPomoSeq = !showPomoSeq"
              :style="buttonStyle(showPomoSeq)"
            >
              🍅
            </n-button>
          </div>
          <TaskView :showPomoSeq="showPomoSeq" />
        </div>
      </div>
      <div v-if="showRight" class="right">
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
} from "@/services/todayService";
import { createDateCheckService } from "@/services/dateCheckService";

// ======================== 响应式状态与初始化 ========================

// -- 基础UI状态
const showLeft = ref(true);
const showMiddleTop = ref(true);
const showRight = ref(true);
const showPomoTypeChangePopover = ref(false);
const pomoTypeChangeMessage = ref("");
const pomoTypeChangeTarget = ref<HTMLElement | null>(null);
const showPomoSeq = ref(true);

// -- 核心数据
const currentDate = ref(new Date().toISOString().split("T")[0]);
const activityList = ref<Activity[]>(loadActivities());
const todoList = ref<Todo[]>(loadTodos());
const scheduleList = ref<Schedule[]>(loadSchedules());
const pickedTodoActivity = ref<Activity | null>(null); // 选中活动
const activeId = ref<number | null>(null); // 当前激活活动id

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
    currentDate.value; // 依赖今日，日期变自动刷新
    return isToday(todo.id);
  })
);
/** 今日的 Schedule */
const todaySchedules = computed(() =>
  scheduleList.value.filter((schedule) => {
    currentDate.value;
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

/** Todo 推迟处理 */
function onDropTodo(id: number) {
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
        relatedTodo.estPomo =
          activity.pomoType === "🍒"
            ? [4]
            : activity.estPomoI
            ? [parseInt(activity.estPomoI)]
            : [];
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
function buttonStyle(show: boolean) {
  return {
    filter: show ? "none" : "grayscale(100%)",
    opacity: show ? 1 : 0.6,
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
    currentDate.value = new Date().toISOString().split("T")[0];
    console.log("当前日期变化:", date);
  },
});

// ======================== 8. 生命周期 Hook ========================

onMounted(() => {
  dateCheckService.checkDateChange();
  dateCheckService.setupUserInteractionCheck();
});

onUnmounted(() => {
  dateCheckService.cleanupListeners();
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
  background: #fafafa;
  overflow: auto;
}

.button-group {
  display: flex;
  gap: 8px;
  padding: 0px;
  justify-content: flex-end;
}

.left {
  width: 240px;
  background: #e1eaf3;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: hidden; /*BUG*/
  margin-right: 8px;
}

.right {
  width: 480px;
  background: #f0e9d8;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
  margin-left: 8px;
}

.middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0px;
  box-sizing: border-box;
  background: #fff;
  overflow: hidden;
}

.middle-top {
  height: 40%;
  background: #f7f2f0;
  margin-bottom: 12px;
  overflow: auto;
  padding: 8px;
  box-sizing: border-box;
}

.middle-bottom {
  flex: 1;
  background: #f7f2f0;
  overflow: auto;
  padding: 8px;
  box-sizing: border-box;
  height: 60%;
}
</style>
