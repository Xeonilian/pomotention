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
            @update-schedule-status="updateScheduleStatus"
            @update-todo-status="updateTodoStatus"
            @drop-todo="handleDropTodo"
            @suspend-schedule="handleSuspendSchedule"
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
          @toggle-pomo-type="handleTogglePomoType"
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
import { ref, onMounted, watch, onUnmounted } from "vue";
import { NButton, NPopover } from "naive-ui";
import TimeTableView from "@/views/Home/TimeTableView.vue";
import TodayView from "@/views//Home/TodayView.vue";
import TaskView from "@/views//Home/TaskView.vue";
import ActivityView from "@/views//Home/ActivityView.vue";
import type { Activity } from "@/core/types/Activity";
import type { Block } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import { addOneDayToDate, isToday } from "@/core/utils";
import {
  STORAGE_KEYS,
  WORK_BLOCKS,
  ENTERTAINMENT_BLOCKS,
  POMO_TYPES,
} from "@/core/constants";

// 1 界面控制参数定义
const showLeft = ref(true);
const showMiddleTop = ref(true);
const showRight = ref(true);

// 2 TimeTableView 数据传递
const blocks = ref<Block[]>([]);

// 读取本地数据
onMounted(() => {
  try {
    const local = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
    if (local) {
      blocks.value = JSON.parse(local);
    } else {
      blocks.value = [...WORK_BLOCKS]; // 没有就用默认
    }
  } catch {
    blocks.value = [...WORK_BLOCKS];
  }
});

//  blocks 每次变化就持久化本地
watch(
  blocks,
  (newVal) => {
    localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(newVal));
  },
  { deep: true }
);

/** TimeTableView 发出blocks修改事件，接管更新 */
function onBlocksUpdate(newBlocks: Block[]) {
  blocks.value = [...newBlocks];
}

/** “重置”事件，区分工作/娱乐 */
function onTimeTableReset(type: "work" | "entertainment") {
  blocks.value = type === "work" ? [...WORK_BLOCKS] : [...ENTERTAINMENT_BLOCKS];
  localStorage.removeItem(STORAGE_KEYS.TIMETABLE); // 可选，重置时也清理
}

// 3 ActivityView 和 TodayView 数据管理
// 3.1 数据构造
const activityList = ref<Activity[]>(loadActivities());
const todoList = ref<Todo[]>(loadTodos());
const scheduleList = ref<Schedule[]>(loadSchedules());
const pickedTodoActivity = ref<Activity | null>(null);
const activeId = ref<number | null>(null); // 是Activity中定义的ID

// 加载数据
function loadActivities(): Activity[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY) || "[]");
  } catch {
    return [];
  }
}

function loadTodos(): Todo[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TODO) || "[]");
  } catch {
    return [];
  }
}

function loadSchedules(): Schedule[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULE) || "[]");
  } catch {
    return [];
  }
}

// 保存数据
function saveActivities() {
  localStorage.setItem(
    STORAGE_KEYS.ACTIVITY,
    JSON.stringify(activityList.value)
  );
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todoList.value));
}

function saveSchedules() {
  localStorage.setItem(
    STORAGE_KEYS.SCHEDULE,
    JSON.stringify(scheduleList.value)
  );
}

// 监听数据变化
watch(activityList, saveActivities, { deep: true });
watch(todoList, saveTodos, { deep: true });
watch(scheduleList, saveSchedules, { deep: true });

// 3.2 数据类型转换
// 处理 Activity 到 Todo 的转换
function convertToTodo(activity: Activity): Todo {
  return {
    id: Date.now(),
    activityId: activity.id,
    activityTitle: activity.title,
    estPomo: activity.estPomoI ? [parseInt(activity.estPomoI)] : [],
    status: "ongoing",
    projectName: activity.projectId ? `项目${activity.projectId}` : undefined,
    priority: 0,
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

// 3.3 处理子组件事件
// 3.3.1 增加活动
function handleAddActivity(newActivity: Activity) {
  activityList.value.push(newActivity);
  // 如果是 Schedule 类型且是当天的活动，自动创建 Schedule
  if (newActivity.class === "S") {
    const today = new Date().toISOString().split("T")[0];

    const activityDate = newActivity.id
      ? new Date(newActivity.id).toISOString().split("T")[0]
      : null;
    // onsole.log(today, activityDate);
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

// 3.3.2 删除活动
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

// 3.3.3 将选中的 Activity 转换为 Todo 并添加到列表
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

// 3.3.4 更新当前ActivityView中激活行的ID
function updateActiveId(id: number | null) {
  activeId.value = id;
}

// 3.3.5 同步 Activity 修改到 Todo 和 Schedule
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
        relatedTodo.estPomo = activity.estPomoI
          ? [parseInt(activity.estPomoI)]
          : [];
        relatedTodo.status = activity.status || "";
      }
    });
  },
  { deep: true }
);

// 3.3.6 更新打钩的schedule状态
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
// 3.3.7 更新打钩的todo状态
function updateTodoStatus(id: number, activityId: number, status: string) {
  const validStatus = ["", "done", "delayed", "ongoing", "cancelled"].includes(
    status
  )
    ? status
    : "";

  // 更新 scheduleList
  const todo = todoList.value.find((t) => t.id === id);
  if (todo) {
    todo.status = validStatus as
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

// 3.3.8 更新取消todo的状态
function handleDropTodo(id: number) {
  // 找到对应的 Todo
  const todo = todoList.value.find((todo) => todo.id === id);
  if (todo) {
    // 找到 activityList 中对应的活动
    const activity = activityList.value.find(
      (activity) => activity.id === todo.activityId
    );
    if (activity) {
      // 更新 activity 的状态为 "delayed"
      activity.status = "delayed";
      console.log(`Activity with id ${activity.id} status updated to delayed`);
    } else {
      console.log(`No activity found with activityId ${todo.activityId}`);
    }
  } else {
    console.log(`No todo found with id ${id}`);
  }

  // 从 todoList 中移除对应的 Todo
  todoList.value = todoList.value.filter((todo) => todo.id !== id);
}

// 3.3.9 更新推后一天schedule的状态
function handleSuspendSchedule(id: number) {
  // 找到对应的 Schedule
  const schedule = scheduleList.value.find((schedule) => schedule.id === id);
  if (schedule) {
    // 找到 activityList 中对应的活动
    const activity = activityList.value.find(
      (activity) => activity.id === schedule.activityId
    );
    if (activity) {
      // 更新 activity 的状态为 "delayed"
      activity.status = "delayed";
      console.log(`Activity with id ${activity.id} status updated to delayed`);

      if (activity.dueRange) {
        // 将 dueRange 的时间都加1天
        activity.dueRange = [
          addOneDayToDate(activity.dueRange[0]),
          activity.dueRange[1],
        ];
      } else {
        console.log(`Activity with id ${activity.id} does not have dueRange`);
      }
    } else {
      console.log(`No activity found with activityId ${schedule.activityId}`);
    }
  } else {
    console.log(`No schedule found with id ${id}`);
  }

  // 从 scheduleList 中移除对应的 Schedule
  scheduleList.value = scheduleList.value.filter(
    (schedule) => schedule.id !== id
  );
}

// 3.3.10 更新Schedule的日期改变
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
          //console.log(`${tag} 属于今天（通过 isToday）`);
          // 1. 没有就加，有就更新
          if (scheduleIdx === -1) {
            // 可选：status 自动改 ongoing
            activity.status = "ongoing";
            const sch = convertToSchedule(activity);
            scheduleList.value.push(sch);
            // console.log(`${tag} 新增 schedule:`, sch);
          } else {
            // 已有 schedule，更新主字段
            //console.log(`${tag} Schedule 已存在，准备更新`);
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
            // console.log(`${tag} 更新后 schedule:`, sch);
          }
        } else {
          // 不是今天，应该从 scheduleList 里删除
          // console.log(`${tag} 不属于今天，准备移除 schedule`);
          if (scheduleIdx !== -1) {
            scheduleList.value.splice(scheduleIdx, 1);
            //console.log(`${tag} schedule 已移除`);
          } else {
            console.log(`${tag} 不属于今天，无 schedule 不需操作`);
          }
        }
      } else if (scheduleIdx !== -1) {
        //console.log(`${tag} 非 S 类型，移除 schedule`);
        scheduleList.value.splice(scheduleIdx, 1);
      }
    });

    // 总结最终 scheduleList
    //console.log( "【watch结束】当前 scheduleList:",JSON.parse(JSON.stringify(scheduleList.value)));
  }
);

// 切换Activity的pomoType
const showPomoTypeChangePopover = ref(false);
const pomoTypeChangeMessage = ref("");
const pomoTypeChangeTarget = ref<HTMLElement | null>(null);
function handleTogglePomoType(id: number) {
  // 查找对应的活动
  const activity = activityList.value.find((a) => a.id === id);
  if (!activity) {
    console.log(`没有找到ID为${id}的活动`);
    return;
  }

  // 如果是S类型的活动，不进行操作
  if (activity.class === "S") {
    console.log(`ID为${id}的活动是S类型，不能修改番茄类型`);
    return;
  }

  // 获取当前番茄类型的索引，如果未设置则默认为"🍅"
  const currentType = activity.pomoType || "🍅";
  const currentIndex = POMO_TYPES.indexOf(currentType);

  // 计算下一个类型的索引
  const nextIndex = (currentIndex + 1) % POMO_TYPES.length;
  // 确保新的番茄类型符合 Activity.pomoType 的类型定义
  const newPomoType: "🍅" | "🍇" | "🍒" = POMO_TYPES[nextIndex];

  // 设置 popover 消息并显示
  pomoTypeChangeMessage.value = `番茄类型从${currentType}更改为${newPomoType}`;
  showPomoTypeChangePopover.value = true;

  // 3秒后自动关闭提示
  setTimeout(() => {
    showPomoTypeChangePopover.value = false;
  }, 3000);

  // 更新活动的番茄类型
  activity.pomoType = newPomoType;
}

// 4 TaskView 数据传递

// 5 UI 函数
function buttonStyle(show: boolean) {
  return {
    filter: show ? "none" : "grayscale(100%)",
    opacity: show ? 1 : 0.6,
  };
}

// 6 日期监控
// 日期检查状态变量
type TimeoutType = ReturnType<typeof setTimeout>;
let debounceTimer: TimeoutType | null = null;
let lastCheckedDate: string = new Date().toISOString().split("T")[0];
let debouncedCheckFunction: ((event: Event) => void) | null = null;

// 核心检查函数
function checkDateChange() {
  const currentDate = new Date().toISOString().split("T")[0];
  if (currentDate !== lastCheckedDate) {
    console.log(`日期从 ${lastCheckedDate} 变为 ${currentDate}`);
    processSchedulesForNewDay();
    lastCheckedDate = currentDate;
    return true;
  }
  return false;
}

// 处理新一天的日程
function processSchedulesForNewDay() {
  const today = new Date().toISOString().split("T")[0];

  // 检查 activityList 中的所有活动
  activityList.value.forEach((activity) => {
    // 只处理类型为 "S" 的活动（日程类型）
    if (activity.class === "S" && activity.dueRange) {
      const activityDate = new Date(activity.dueRange[0])
        .toISOString()
        .split("T")[0];

      // 如果活动日期是今天且还没有添加到日程列表中
      if (
        activityDate === today &&
        !scheduleList.value.some((s) => s.activityId === activity.id)
      ) {
        // 将状态设置为 ongoing
        activity.status = "ongoing";
        // 添加到今日日程
        scheduleList.value.push(convertToSchedule(activity));
      }
    }
  });
}

// 设置用户交互检测
function setupUserInteractionCheck() {
  // 创建防抖函数
  debouncedCheckFunction = () => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      checkDateChange();
      debounceTimer = null;
    }, 1000); // 1秒防抖
  };

  // 添加事件监听器
  document.addEventListener("click", debouncedCheckFunction);
  document.addEventListener("keydown", debouncedCheckFunction);
}

// 清理事件监听器
function cleanupListeners() {
  if (debouncedCheckFunction) {
    document.removeEventListener("click", debouncedCheckFunction);
    document.removeEventListener("keydown", debouncedCheckFunction);
    debouncedCheckFunction = null;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

// 在组件挂载时设置
onMounted(() => {
  // 初次检查
  checkDateChange();

  // 设置用户交互检测
  setupUserInteractionCheck();
});

// 在组件卸载时清理
onUnmounted(() => {
  cleanupListeners();
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
