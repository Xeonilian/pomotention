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
          :blocks="blocks"
          @update-blocks="onBlocksUpdate"
          @reset-schedule="onTimeTableReset"
        />
      </div>
      <div class="middle">
        <div v-if="showMiddleTop" class="middle-top">
          <!-- 今日待办 -->
          <TodayView
            :todoList="todoList"
            :scheduleList="scheduleList"
            :activeId="activeId"
            @update-active-id="updateActiveId"
            @update-schedule-status="updateScheduleStatus"
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
          @pick-activity-todo="passPickedActivity"
          @add-activity="handleAddActivity"
          @delete-activity="handleDeleteActivity"
          @update-active-id="updateActiveId"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { NButton } from "naive-ui";
import TimeTableView from "@/views/Home/TimeTableView.vue";
import TodayView from "@/views//Home/TodayView.vue";
import TaskView from "@/views//Home/TaskView.vue";
import ActivityView from "@/views//Home/ActivityView.vue";
import type { Activity } from "@/core/types/Activity";
import { getTimestampForTimeString } from "@/core/utils";
import type { Block } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";

// 1 界面控制参数定义
const showLeft = ref(true);
const showMiddleTop = ref(true);
const showRight = ref(true);

// 2 TimeTableView 数据传递
const STORAGE_KEY_TIMETABLE = "myScheduleBlocks";
// 默认日程数据
const workBlocks: Block[] = [
  {
    id: "1",
    category: "living",
    start: getTimestampForTimeString("06:00"),
    end: getTimestampForTimeString("09:00"),
  },
  {
    id: "2",
    category: "working",
    start: getTimestampForTimeString("09:00"),
    end: getTimestampForTimeString("12:00"),
  },
  {
    id: "3",
    category: "living",
    start: getTimestampForTimeString("12:00"),
    end: getTimestampForTimeString("13:00"),
  },
  {
    id: "4",
    category: "working",
    start: getTimestampForTimeString("13:00"),
    end: getTimestampForTimeString("15:00"),
  },
  {
    id: "5",
    category: "living",
    start: getTimestampForTimeString("15:00"),
    end: getTimestampForTimeString("15:15"),
  },
  {
    id: "6",
    category: "working",
    start: getTimestampForTimeString("15:15"),
    end: getTimestampForTimeString("17:40"),
  },
  {
    id: "7",
    category: "living",
    start: getTimestampForTimeString("17:40"),
    end: getTimestampForTimeString("18:10"),
  },
  {
    id: "8",
    category: "working",
    start: getTimestampForTimeString("18:10"),
    end: getTimestampForTimeString("19:40"),
  },
  {
    id: "9",
    category: "living",
    start: getTimestampForTimeString("19:40"),
    end: getTimestampForTimeString("20:00"),
  },
  {
    id: "10",
    category: "working",
    start: getTimestampForTimeString("20:00"),
    end: getTimestampForTimeString("24:00"),
  },
];

const entertainmentBlocks: Block[] = [
  {
    id: "1",
    category: "sleeping",
    start: getTimestampForTimeString("00:00"),
    end: getTimestampForTimeString("09:00"),
  },
  {
    id: "2",
    category: "living",
    start: getTimestampForTimeString("09:00"),
    end: getTimestampForTimeString("22:00"),
  },
  {
    id: "3",
    category: "sleeping",
    start: getTimestampForTimeString("22:00"),
    end: getTimestampForTimeString("24:00"),
  },
];

const blocks = ref<Block[]>([]);

// 读取本地数据
onMounted(() => {
  try {
    const local = localStorage.getItem(STORAGE_KEY_TIMETABLE);
    if (local) {
      blocks.value = JSON.parse(local);
    } else {
      blocks.value = [...workBlocks]; // 没有就用默认
    }
  } catch {
    blocks.value = [...workBlocks];
  }
});

//  blocks 每次变化就持久化本地
watch(
  blocks,
  (newVal) => {
    localStorage.setItem(STORAGE_KEY_TIMETABLE, JSON.stringify(newVal));
  },
  { deep: true }
);

/** TimeTableView 发出blocks修改事件，接管更新 */
function onBlocksUpdate(newBlocks: Block[]) {
  blocks.value = [...newBlocks];
}

/** “重置”事件，区分工作/娱乐 */
function onTimeTableReset(type: "work" | "entertainment") {
  blocks.value = type === "work" ? [...workBlocks] : [...entertainmentBlocks];
  localStorage.removeItem(STORAGE_KEY_TIMETABLE); // 可选，重置时也清理
}

// 3 ActivityView 和 TodayView 数据管理
const STORAGE_KEY_ACTIVITY = "activitySheet";
const STORAGE_KEY_TODO = "todayTodo";
const STORAGE_KEY_SCHEDULE = "todaySchedule";

const activityList = ref<Activity[]>(loadActivities());
const todoList = ref<Todo[]>(loadTodos());
const scheduleList = ref<Schedule[]>(loadSchedules());
const pickedTodoActivity = ref<Activity | null>(null);
const activeId = ref<number | null>(null); // 是Activity中定义的ID

// 加载数据
function loadActivities(): Activity[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVITY) || "[]");
  } catch {
    return [];
  }
}

function loadTodos(): Todo[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_TODO) || "[]");
  } catch {
    return [];
  }
}

function loadSchedules(): Schedule[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_SCHEDULE) || "[]");
  } catch {
    return [];
  }
}

// 保存数据
function saveActivities() {
  localStorage.setItem(
    STORAGE_KEY_ACTIVITY,
    JSON.stringify(activityList.value)
  );
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY_TODO, JSON.stringify(todoList.value));
}

function saveSchedules() {
  localStorage.setItem(
    STORAGE_KEY_SCHEDULE,
    JSON.stringify(scheduleList.value)
  );
}

// 监听数据变化
watch(activityList, saveActivities, { deep: true });
watch(todoList, saveTodos, { deep: true });
watch(scheduleList, saveSchedules, { deep: true });

// 处理 Activity 到 Todo 的转换
function convertToTodo(activity: Activity): Todo {
  return {
    id: Date.now(),
    activityId: activity.id,
    activityTitle: activity.title,
    estPomo: activity.estPomoI ? [parseInt(activity.estPomoI)] : [],
    status: "ongoing",
    projectName: activity.projectId ? `项目${activity.projectId}` : undefined,
  };
}

// 处理 Activity 到 Schedule 的转换
function convertToSchedule(activity: Activity): Schedule {
  return {
    id: Date.now(),
    activityId: activity.id,
    activityTitle: activity.title,
    activityDueRange: [activity.dueRange![0], activity.dueRange![1]],
    status: "ongoing",
    projectName: activity.projectId ? `项目${activity.projectId}` : undefined,
    location: activity.location || "",
  };
}

// 处理子组件事件
function handleAddActivity(newActivity: Activity) {
  activityList.value.push(newActivity);
  // 如果是 Schedule 类型且是当天的活动，自动创建 Schedule
  if (newActivity.class === "S") {
    const today = new Date().toISOString().split("T")[0];

    const activityDate = newActivity.id
      ? new Date(newActivity.id).toISOString().split("T")[0]
      : null;
    console.log(today, activityDate);
    if (activityDate === today) {
      // 更新 activityList 中对应的 activity 的 status 为 "ongoing"
      const activityToUpdate = activityList.value.find(
        (a) => a.id === newActivity.id
      );
      if (activityToUpdate) {
        activityToUpdate.status = "ongoing";
      }
      scheduleList.value.push(convertToSchedule(newActivity));
    }
  }
}

function handleDeleteActivity(id: number) {
  // 删除 Activity 时也删除关联的 Todo
  todoList.value = todoList.value.filter((todo) => todo.activityId !== id);
  // 删除对应的 Schedule
  scheduleList.value = scheduleList.value.filter(
    (schedule) => schedule.activityId !== id
  );

  // 删除 Activity
  activityList.value = activityList.value.filter(
    (activity) => activity.id !== id
  );
}

// 将选中的 Activity 转换为 Todo 并添加到列表
function passPickedActivity(activity: Activity) {
  // 更新 activityList 中对应的 activity 的 status 为 "ongoing"
  const activityToUpdate = activityList.value.find((a) => a.id === activity.id);
  if (activityToUpdate) {
    activityToUpdate.status = "ongoing";
  }
  const existingTodo = todoList.value.find(
    (todo) => todo.activityId === activity.id
  );
  if (!existingTodo) {
    todoList.value.push(convertToTodo(activity));
  }
  pickedTodoActivity.value = activity;
}

// 更新激活ID
function updateActiveId(id: number | null) {
  activeId.value = id;
}

// 同步 Activity 修改到 Todo 和 Schedule #HACK
watch(
  activityList,
  (newActivities) => {
    newActivities.forEach((activity) => {
      const relatedTodo = todoList.value.find(
        (todo) => todo.activityId === activity.id
      );
      if (relatedTodo) {
        relatedTodo.activityTitle = activity.title;
        relatedTodo.estPomo = activity.estPomoI
          ? [parseInt(activity.estPomoI)]
          : [];
        relatedTodo.status = activity.status || "";
      }

      const relatedSchedule = scheduleList.value.find(
        (schedule) => schedule.activityId === activity.id
      );
      if (relatedSchedule) {
        relatedSchedule.activityTitle = activity.title;
        relatedSchedule.activityDueRange = activity.dueRange
          ? [activity.dueRange[0], activity.dueRange[1]]
          : [0, 0];
        relatedSchedule.status = activity.status || "";
      }
    });
  },
  { deep: true }
);

function updateScheduleStatus(id: number, activityId: number, status: string) {
  const validStatus = ["", "done", "delayed", "ongoing", "cancelled"].includes(
    status
  )
    ? status
    : "";

  // 更新 scheduleList
  const schedule = scheduleList.value.find((s) => s.id === id);
  if (schedule) {
    schedule.status = validStatus as
      | ""
      | "done"
      | "delayed"
      | "ongoing"
      | "cancelled";
  }

  // 更新 activityList
  const activity = activityList.value.find((a) => a.id === activityId);
  if (activity) {
    activity.status = validStatus as
      | ""
      | "done"
      | "delayed"
      | "ongoing"
      | "cancelled";
  }
}

// 5 TaskView 数据传递

// 6 UI 函数
function buttonStyle(show: boolean) {
  return {
    filter: show ? "none" : "grayscale(100%)",
    opacity: show ? 1 : 0.6,
  };
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
