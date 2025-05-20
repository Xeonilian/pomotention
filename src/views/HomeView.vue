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
          </div>
          <TaskView />
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
// imports
import { ref, onMounted, watch, onUnmounted, computed } from "vue";
import { NButton, NPopover } from "naive-ui";
import TimeTableView from "@/views/Home/TimeTableView.vue";
import TodayView from "@/views//Home/TodayView.vue";
import TaskView from "@/views//Home/TaskView.vue";
import ActivityView from "@/views//Home/ActivityView.vue";
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

// Activity 相关导入
import {
  handleAddActivity,
  handleDeleteActivity,
  passPickedActivity,
  togglePomoType,
} from "@/services/activityService";

// Today 相关导入
import {
  updateScheduleStatus,
  updateTodoStatus,
  handleSuspendTodo,
  handleSuspendSchedule,
  isToday,
} from "@/services/todayService";
// 日期监控
import { createDateCheckService } from "@/services/dateCheckService";

// 1 参数定义数据初始化
const showLeft = ref(true);
const showMiddleTop = ref(true);
const showRight = ref(true);
const showPomoTypeChangePopover = ref(false);
const pomoTypeChangeMessage = ref("");
const pomoTypeChangeTarget = ref<HTMLElement | null>(null);

// 初始化数据
const activityList = ref<Activity[]>(loadActivities());
const todoList = ref<Todo[]>(loadTodos());
const scheduleList = ref<Schedule[]>(loadSchedules());
const pickedTodoActivity = ref<Activity | null>(null); // 当前选中的活动
const activeId = ref<number | null>(null); // 当前激活的活动ID
const todayTodos = computed(() =>
  todoList.value.filter((todo) => isToday(todo.id))
);

const todaySchedules = computed(() =>
  scheduleList.value.filter((schedule) => isToday(schedule.id))
);

// 监听变化自动保存
watch(activityList, (value) => saveActivities(value), { deep: true });
watch(todoList, (value) => saveTodos(value), { deep: true });
watch(scheduleList, (value) => saveSchedules(value), { deep: true });

// 2 加载TimeTable数据 ----------------------------------------------------------
// 当前类型
const currentType = ref<"work" | "entertainment">("work");

// 两套时间表
const allBlocks = ref({
  work: loadTimeBlocks("work", [...WORK_BLOCKS]),
  entertainment: loadTimeBlocks("entertainment", [...ENTERTAINMENT_BLOCKS]),
});
// 当前视图展示的 blocks
const viewBlocks = computed(() => allBlocks.value[currentType.value]);

/** 切换时间表类型 */
function onTypeChange(newType: "work" | "entertainment") {
  currentType.value = newType;
}

/** 编辑时间块后的回调 */
function onBlocksUpdate(newBlocks: Block[]) {
  allBlocks.value[currentType.value] = [...newBlocks];
  // 同步保存到本地
  saveTimeBlocks(currentType.value, newBlocks);
}

/** 恢复默认时间块 */
function onTimeTableReset(type: "work" | "entertainment") {
  allBlocks.value[type] =
    type === "work" ? [...WORK_BLOCKS] : [...ENTERTAINMENT_BLOCKS];
  // 删除旧的数据，并保存新数据
  removeTimeBlocksStorage(type);
  saveTimeBlocks(type, allBlocks.value[type]);
}

// 3 Activity处理子组件事件------------------------------
function onAddActivity(newActivity: Activity) {
  handleAddActivity(activityList.value, scheduleList.value, newActivity);
}

function onDeleteActivity(id: number) {
  handleDeleteActivity(
    activityList.value,
    todoList.value,
    scheduleList.value,
    id
  );
}

function onPickActivity(activity: Activity) {
  const result = passPickedActivity(
    activityList.value,
    todoList.value,
    activity
  );
  pickedTodoActivity.value = result;
}

function onUpdateActiveId(id: number | null) {
  activeId.value = id;
}

function onTogglePomoType(id: number, event?: Event) {
  const target = (event?.target as HTMLElement) || null;
  const result = togglePomoType(activityList.value, id);

  if (result) {
    pomoTypeChangeMessage.value = `番茄类型从${result.oldType}更改为${result.newType}`;
    pomoTypeChangeTarget.value = target;
    showPomoTypeChangePopover.value = true;

    setTimeout(() => {
      showPomoTypeChangePopover.value = false;
    }, 3000);
  }
}

// 同步 Activity 修改到 Todo 和 Schedule （除了时间）
watch(
  activityList,
  (newVal) => {
    // 只用 find
    newVal.forEach((activity) => {
      // 同步 Schedule
      const relatedSchedule = scheduleList.value.find(
        (schedule) => schedule.activityId === activity.id
      );
      if (relatedSchedule) {
        relatedSchedule.activityTitle = activity.title;
        relatedSchedule.activityDueRange = activity.dueRange
          ? [activity.dueRange[0], activity.dueRange[1]]
          : [0, "0"];
        relatedSchedule.status = activity.status || "";
        relatedSchedule.location = activity.location || "";
      }
      // 同步 Todo
      const relatedTodo = todoList.value.find(
        (todo) => todo.activityId === activity.id
      );
      if (relatedTodo) {
        relatedTodo.activityTitle = activity.title;
        // 判断是不是樱桃
        if (activity.pomoType === "🍒") {
          relatedTodo.estPomo = [4];
        } else {
          relatedTodo.estPomo = activity.estPomoI
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

// 更新Schedule的日期改变
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
          // 1. 没有就加，有就更新
          if (scheduleIdx === -1) {
            activity.status = "ongoing";
            const sch = convertToSchedule(activity);
            scheduleList.value.push(sch);
          } else {
            // 已有 schedule，更新主字段
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
        } else {
          // 不是今天，应该从 scheduleList 里删除
          if (scheduleIdx !== -1) {
            scheduleList.value.splice(scheduleIdx, 1);
            activity.status = "";
            console.log(`${tag} 由于不再属于今天，A.status 已自动置空`);
          }
        }
      } else if (scheduleIdx !== -1) {
        // 非 S 类型，移除 schedule
        console.log(`${tag} 非 S 类型，移除 schedule`);
        scheduleList.value.splice(scheduleIdx, 1);
      }
    });

    // 总结最终 scheduleList
    // console.log(
    //   "【watch结束】当前 scheduleList:",
    //   JSON.parse(JSON.stringify(scheduleList.value))
    // );
  }
);

// 4 Today 相关函数------------------------------------
// 更新打钩的 todo 状态 - 使用 todayService 中的函数
function onUpdateTodoStatus(id: number, activityId: number, status: string) {
  updateTodoStatus(todoList.value, activityList.value, id, activityId, status);
}

// 更新取消 todo 的状态 - 使用 todayService 中的函数
function onDropTodo(id: number) {
  handleSuspendTodo(todoList.value, activityList.value, id);
}

// 更新推后一天 schedule 的状态 - 使用 todayService 中的函数
function onSuspendSchedule(id: number) {
  handleSuspendSchedule(scheduleList.value, activityList.value, id);
}

// 更新打钩的 schedule 状态 - 使用 todayService 中的函数
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

// 5 TaskView 数据传递

// 6 UI 函数
function buttonStyle(show: boolean) {
  return {
    filter: show ? "none" : "grayscale(100%)",
    opacity: show ? 1 : 0.6,
  };
}

// 7 日期监控
// 初始化service
const dateCheckService = createDateCheckService({
  activityList,
  scheduleList,
  todoList,
  convertToSchedule,
  convertToTodo,
});

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
