<!-- 
  Component: ActivityView.vue
  Description: 展示和管理活动列表，仅负责 UI 交互
  Props:
    - activities: Activity[] - 活动数据列表
  Emits:
    - pick-activity-todo: 传递选中的活动
    - add-activity: 请求新增活动
    - delete-activity: 请求删除活动
  Parent: HomeView.vue 
-->

<template>
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
  <ActivitySheet
    :displaySheet="filteredActivities"
    :getCountdownClass="getCountdownClass"
    @focus-row="handleFocusRow"
  />
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import ActivityButtons from "@/components/ActivitySheet/ActivityButtons.vue";
import ActivitySheet from "@/components/ActivitySheet/Activities.vue";
import type { Activity } from "@/core/types/Activity";

const props = defineProps<{
  activities: Activity[];
  activeId: number | null;
}>();

const emit = defineEmits<{
  "pick-activity-todo": [activity: Activity];
  "add-activity": [activity: Activity];
  "delete-activity": [id: number];
  "update-active-id": [id: number | null];
  "toggle-pomo-type": [id: number];
}>();

const filterOptions = [
  { label: "今日到期", key: "today" },
  { label: "内外打扰", key: "interrupt" },
  { label: "显示全部", key: "all" },
  { label: "待办任务", key: "todo" },
  { label: "预约任务", key: "schedule" },
];

// 获取当前选中活动的 class
const selectedActivity = computed(() => {
  return props.activities.find((a) => a.id === props.activeId);
});
const currentFilter = ref<string>("all");

// 2 pickActivity 可以进行父到子通信，或 emit 给更高级
function pickActivity() {
  // 1. 检查是否有选中的活动
  if (props.activeId === null) return;

  // 2. 查找对应的活动
  const picked = props.activities.find((a) => a.id === props.activeId);
  if (!picked) return;

  // 3. 检查活动类是否为 'T'，否则不允许选择
  if (picked.class !== "T") {
    console.warn("只能选择类为 T 的活动");
    emit("update-active-id", null);
    return;
  }

  // 4. 触发事件并重置选中状态
  emit("pick-activity-todo", picked);
  emit("update-active-id", null);
}
// 3 筛选3功能及下拉
function handleFilter(key: string) {
  currentFilter.value = key;
}

const filteredActivities = computed(() => {
  if (currentFilter.value === "all") {
    return props.activities;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return props.activities.filter((item) => {
    if (currentFilter.value === "today") {
      if (item.class === "T") {
        if (!item.dueDate) return false;
        const due = new Date(item.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === now.getTime();
      } else if (item.class === "S") {
        if (!item.dueRange || !item.dueRange[0]) return false;
        const start = new Date(item.dueRange[0]);
        start.setHours(0, 0, 0, 0);
        return start.getTime() === now.getTime();
      }
    } else if (currentFilter.value === "interrupt") {
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

// 4 增加预约活动
function addScheduleRow() {
  emit("add-activity", {
    id: Date.now(),
    class: "S",
    title: "",
    dueRange: [Date.now(), ""],
    status: "",
  });
}

// 5 增加任务活动
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

// 6 删除任务
function deleteActiveRow() {
  if (props.activeId !== null) emit("delete-activity", props.activeId);
}

// 7 获取激活的行
function handleFocusRow(id: number) {
  emit("update-active-id", id);
}

// 8 基于日期显示颜色
function getCountdownClass(dueDate: number | undefined | null): string {
  if (!dueDate) return "";
  const now = new Date();
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - now.setHours(0, 0, 0, 0)) / 86400000);

  if (diff === 0) return "countdown-red";
  if (diff === 1) return "countdown-deeporange";
  if (diff === 2) return "countdown-orange";
  if (diff === 3) return "countdown-yellow";
  if (diff < 0) return "countdown-blue";
  return "";
}

function togglePomoType() {
  if (props.activeId !== null) emit("toggle-pomo-type", props.activeId);
}
</script>

<style scoped>
.activity-buttons-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  margin: 0 auto 10px auto; /* 水平居中+下方间距 */
  background-color: rgb(245, 245, 245);
  border-radius: 15px; /* 建议用像素，百分号效果容易变形 */
  width: 220px;
  height: 40px;
  display: flex; /* 加flex布局 */
  align-items: center; /* 垂直居中（高度方向） */
  justify-content: center; /* 水平居中内部内容 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* 如需要阴影 */
}
</style>
