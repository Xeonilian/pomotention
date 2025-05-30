<!-- 
  Component: ActivityView.vue
  Description: 展示和管理活动列表，仅负责 UI 交互
  Props:
    - activities: Activity[] - 活动数据列表
    - activeId: number | null - 当前选中的活动ID
    - todos: Todo[] - 待办事项列表
  Emits:
    - pick-activity-todo: 传递选中的活动
    - add-activity: 请求新增活动
    - delete-activity: 请求删除活动
    - update-active-id: 更新当前选中的活动ID
    - toggle-pomo-type: 切换番茄钟类型
  Parent: HomeView.vue 
-->

<template>
  <!-- 顶部固定按钮区域 -->
  <div class="activity-buttons-sticky">
    <ActivityButtons
      :filterOptions="filterOptions"
      :activeId="activeId"
      :selectedClass="selectedActivity?.class"
      @pick-activity-todo="pickActivity"
      @filter="handleFilter"
      @add-todo="addTodoRow"
      @add-schedule="addScheduleRow"
      @delete-active="deleteActiveRow"
      @toggle-pomo-type="togglePomoType"
    />
  </div>

  <!-- 活动列表展示区域 -->
  <ActivitySheet
    :displaySheet="filteredActivities"
    :getCountdownClass="getCountdownClass"
    @focus-row="handleFocusRow"
    :activityId="selectedActivityId"
  />

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
// ========================
// 依赖导入
// ========================
import { ref, computed } from "vue";
import ActivityButtons from "@/components/ActivitySheet/ActivityButtons.vue";
import ActivitySheet from "@/components/ActivitySheet/Activities.vue";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import { addOneDayToDate } from "@/core/utils";
import { NPopover } from "naive-ui";

// ========================
// Props 定义
// ========================
const props = defineProps<{
  activities: Activity[]; // 活动数据列表
  activeId: number | null; // 当前选中的活动ID
  todos: Todo[]; // 待办事项列表
  selectedActivityId: number | null;
}>();

// ========================
// Emits 定义
// ========================
const emit = defineEmits<{
  "pick-activity-todo": [activity: Activity]; // 选择活动待办
  "add-activity": [activity: Activity]; // 添加新活动
  "delete-activity": [id: number]; // 删除活动
  "update-active-id": [id: number | null]; // 更新选中活动ID
  "toggle-pomo-type": [id: number]; // 切换番茄钟类型
}>();

// ========================
// 响应式数据
// ========================
// 筛选选项配置
const filterOptions = [
  { label: "今日到期", key: "today" },
  { label: "内外打扰", key: "interrupt" },
  { label: "显示全部", key: "all" },
  { label: "待办任务", key: "todo" },
  { label: "预约任务", key: "schedule" },
];

// 当前筛选条件
const currentFilter = ref<string>("all");

// 错误提示弹窗相关
const showPopover = ref(false);
const popoverMessage = ref("");

// ========================
// 计算属性
// ========================
// 获取当前选中活动的详细信息
const selectedActivity = computed(() => {
  return props.activities.find((a) => a.id === props.activeId);
});

// 根据筛选条件过滤活动列表
const filteredActivities = computed(() => {
  if (currentFilter.value === "all") {
    return props.activities;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return props.activities.filter((item) => {
    if (currentFilter.value === "today") {
      // 筛选今日到期的活动
      if (item.class === "T") {
        // 任务类型：检查截止日期
        if (!item.dueDate) return false;
        const due = new Date(item.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === now.getTime();
      } else if (item.class === "S") {
        // 预约类型：检查开始日期
        if (!item.dueRange || !item.dueRange[0]) return false;
        const start = new Date(item.dueRange[0]);
        start.setHours(0, 0, 0, 0);
        return start.getTime() === now.getTime();
      }
    } else if (currentFilter.value === "interrupt") {
      // 筛选有打扰标记的活动
      return !!item.interruption;
    } else if (currentFilter.value === "todo") {
      // 只显示任务（class 为 T）
      return item.class === "T";
    } else if (currentFilter.value === "schedule") {
      // 只显示预约（class 为 S）
      return item.class === "S";
    }
    return false;
  });
});

// ========================
// 方法函数
// ========================

// 显示错误提示弹窗
function showErrorPopover(message: string) {
  popoverMessage.value = message;
  showPopover.value = true;
  // 3秒后自动隐藏
  setTimeout(() => {
    showPopover.value = false;
  }, 3000);
}

// 选择活动处理函数，提示
function pickActivity() {
  // 1. 检查是否有选中的活动
  if (props.activeId === null) {
    showErrorPopover("请选择一个活动！");
    return;
  }

  // 2. 查找todo中是否有对应的活动
  const picked = props.todos.find((t) => t.activityId === props.activeId);
  if (picked) {
    showErrorPopover("该活动已经启动待办");
    return;
  }

  // 4. 触发事件并重置选中状态
  emit("update-active-id", null);
}

// 处理筛选条件变化
function handleFilter(key: string) {
  currentFilter.value = key;
}

// 添加新的预约活动
function addScheduleRow() {
  emit("add-activity", {
    id: Date.now(),
    class: "S",
    title: "",
    dueRange: [addOneDayToDate(Date.now()), ""], // HACK: 默认明天开始
    status: "",
  });
}

// 添加新的待办任务
function addTodoRow() {
  emit("add-activity", {
    id: Date.now(),
    class: "T",
    title: "",
    estPomoI: "",
    pomoType: "🍅",
    status: "",
  });
}

// 删除当前选中的活动
function deleteActiveRow() {
  if (props.activeId !== null) {
    emit("delete-activity", props.activeId);
  }
}

// 处理行聚焦事件
function handleFocusRow(id: number) {
  emit("update-active-id", id);
}

// 切换番茄钟类型
function togglePomoType() {
  if (props.activeId !== null) {
    emit("toggle-pomo-type", props.activeId);
  }
}

// 根据截止日期计算倒计时样式类名
function getCountdownClass(dueDate: number | undefined | null): string {
  if (!dueDate) return "";

  const now = new Date();
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - now.setHours(0, 0, 0, 0)) / 86400000);

  if (diff === 0) return "countdown-red"; // 今日到期
  if (diff === 1) return "countdown-deeporange"; // 明日到期
  if (diff === 2) return "countdown-orange"; // 后天到期
  if (diff === 3) return "countdown-yellow"; // 三天后到期
  if (diff < 0) return "countdown-blue"; // 已过期
  return "";
}
</script>

<style scoped>
/* 顶部固定按钮容器样式 */
.activity-buttons-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  margin: 0 auto 10px auto; /* 水平居中+下方间距 */
  background-color: var(--color-background-light-light);
  border-radius: 15px; /* 建议用像素，百分号效果容易变形 */
  width: 220px;
  height: 40px;
  display: flex; /* 加flex布局 */
  align-items: center; /* 垂直居中（高度方向） */
  justify-content: center; /* 水平居中内部内容 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* 如需要阴影 */
}
</style>
