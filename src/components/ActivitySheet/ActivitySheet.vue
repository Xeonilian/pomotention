<!-- 
  Component: ActivitySheet.vue
-->

<template>
  <!-- 顶部固定按钮区域 -->
  <div class="activity-buttons-sticky">
    <ActivityButtons
      :activeId="activeId"
      :selectedTaskId="selectedTaskId"
      :selectedClass="selectedActivity?.class"
      :hasParent="selectedActivity?.parentId"
      @pick-activity="pickActivity"
      @add-todo="addTodoRow"
      @add-schedule="addScheduleRow"
      @add-untaetigkeit="addUntaetigkeitRow"
      @delete-active="deleteActiveRow"
      @toggle-pomo-type="togglePomoType"
      @repeat-activity="repeatActivity"
      @convert-activity-to-task="handleConvertToTask"
      @create-child-activity="createChildActivity"
      @increase-child-activity="increaseChildActivity"
    />
  </div>
  <!-- 看板列容器 -->
  <div class="kanban-columns">
    <div v-for="(section, idx) in sections" :key="section.id" class="kanban-column">
      <!-- 活动列表展示区域 -->
      <ActivitySection
        :filterOptions="filterOptions"
        :displaySheet="filteredBySection(section)"
        :getCountdownClass="getCountdownClass"
        :activityId="selectedActivityId"
        :currentFilter="section.filterKey"
        :isAddButton="section.id === 1 && sections.length < 6"
        :isRemoveButton="section.id !== 1"
        :sectionId="section.id"
        :search="section.search"
        :activeId="activeId"
        @add-section="addSection"
        @remove-section="removeSection"
        @focus-row="handleFocusRow"
        @filter="(filterKey) => handleSectionFilter(idx, filterKey)"
        @update:search="(val) => handleSectionSearch(section.id, val)"
        @focus-search="handleFocusSearch"
      />
    </div>
  </div>
  <!-- 错误提示弹窗 -->
  <n-popover v-model:show="showPopover" trigger="manual" placement="top-end" style="width: 200px">
    <template #trigger>
      <div style="position: fixed; bottom: 20px; right: 20px; width: 1px; height: 1px"></div>
    </template>
    {{ popoverMessage }}
  </n-popover>
</template>

<script setup lang="ts">
// ========================
// 依赖导入
// ========================
import { ref, computed, onMounted } from "vue";
import ActivityButtons from "@/components/ActivitySheet/ActivityButtons.vue";
import ActivitySection from "@/components/ActivitySheet/ActivitySection.vue";
import type { Activity, ActivitySectionConfig } from "@/core/types/Activity";
import { NPopover } from "naive-ui";
import { taskService } from "@/services/taskService";
import { useSettingStore } from "@/stores/useSettingStore";
import { Task } from "@/core/types/Task";
import { useDataStore } from "@/stores/useDataStore";
import { storeToRefs } from "pinia";

const dataStore = useDataStore();
const {
  activeId,
  selectedTaskId,
  selectedActivityId,
  selectedActivity,
  activeActivities,
  activityById,
  todoByActivityId,
  scheduleByActivityId,
} = storeToRefs(dataStore);
const dateService = dataStore.dateService;

// ========================
// Emits 定义
// ========================
const emit = defineEmits<{
  (e: "pick-activity", activity: Activity): void; // 选择活动待办
  (e: "add-activity", activity: Activity): void; // 添加新活动
  (e: "delete-activity", id: number | null | undefined): void; // 删除活动
  (e: "update-active-id", id: number | null | undefined): void; // 更新选中活动ID
  (e: "toggle-pomo-type", id: number | null | undefined): void; // 切换番茄钟类型
  (e: "repeat-activity", id: number | null | undefined): void; // 重复选中的活动
  (e: "create-child-activity", id: number | null | undefined): void; // 构建选中活动的子活动
  (
    e: "convert-activity-to-task",
    payload: {
      task: Task;
      activityId: number | null | undefined;
    }
  ): void;
  (e: "increase-child-activity", id: number | null | undefined): void; // 取消子项（名称含义建议确认）
}>();

// ========================
// 响应式数据
// ========================
// 筛选选项配置
const filterOptions = [
  { label: "全部活动", key: "all" },
  { label: "今日到期", key: "today" },
  { label: "内外打扰", key: "interrupt" },
  { label: "待办活动", key: "todo" },
  { label: "预约活动", key: "schedule" },
  { label: "取消活动", key: "cancelled" },
];

// Kanban多个section参数管理
const settingStore = useSettingStore();

onMounted(() => {
  if (settingStore.settings.kanbanSetting.length !== 6) {
    // 版本切换校正一次
    settingStore.resetSettings(["kanbanSetting"]);
  }
});
// 响应式可直接用
const sections = computed(() => settingStore.settings.kanbanSetting.filter((s) => s.show));

// 错误提示弹窗相关
const showPopover = ref(false);
const popoverMessage = ref("");

function addSection() {
  const visibleCount = settingStore.settings.kanbanSetting.filter((s) => s.show).length;
  if (visibleCount >= 6) return;

  // 找到第一个隐藏的section（id从小到大）
  const nextHidden = settingStore.settings.kanbanSetting.find((s) => !s.show);
  if (nextHidden) {
    nextHidden.show = true;
  }

  // 重新计算宽度
  const newVisibleCount = settingStore.settings.kanbanSetting.filter((s) => s.show).length;
  settingStore.settings.rightWidth = 250 * newVisibleCount;
}

function removeSection(id: number) {
  if (id === 1) return; // id=1不能隐藏

  const section = settingStore.settings.kanbanSetting.find((s) => s.id === id);
  if (section) {
    section.show = false;
  }

  // 重新计算宽度
  const visibleCount = settingStore.settings.kanbanSetting.filter((s) => s.show).length;
  if (visibleCount === 1) {
    settingStore.settings.rightWidth = 300;
  } else {
    settingStore.settings.rightWidth = 250 * visibleCount;
  }
}

// ========================
// 计算属性
// ========================
// 根据筛选条件过滤活动列表
function filteredBySection(section: ActivitySectionConfig) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 如果filterKey有（不为null），直接switch分支
  if (section.filterKey) {
    switch (section.filterKey) {
      case "all":
        return activeActivities.value.filter((item) => item.status !== "cancelled");
      case "cancelled":
        return activeActivities.value.filter((item) => item.status === "cancelled");
      case "today":
        return activeActivities.value.filter((item) => {
          if (item.class === "T") {
            if (!item.dueDate) return true; // 允许没有日期的项目在今日到期显示
            if (!item.dueDate && item.parentId) return false; // 不允许没有日期的子项目在今日到期显示
            const due = new Date(item.dueDate);
            due.setHours(0, 0, 0, 0);
            return due.getTime() === now.getTime();
          } else if (item.class === "S") {
            if (!item.dueRange || !item.dueRange[0]) return true; // 允许没有日期的项目在今日到期显示
            const start = new Date(item.dueRange[0]);
            start.setHours(0, 0, 0, 0);
            return start.getTime() === now.getTime();
          }
          return false;
        });
      case "interrupt":
        return activeActivities.value.filter((item) => !!item.interruption && item.status !== "cancelled");
      case "todo":
        return activeActivities.value.filter((item) => item.class === "T" && item.status !== "cancelled");
      case "schedule":
        return activeActivities.value.filter((item) => item.class === "S" && item.status !== "cancelled");
      default:
        break;
    }
  }

  // 没有 filterKey，再看search
  if (section.search) {
    const keyword = section.search.trim().toLowerCase();
    return activeActivities.value.filter((item) => item.status !== "cancelled" && item.title && item.title.toLowerCase().includes(keyword));
  }

  // 什么条件都没有，返回空
  return [];
}

// 活动筛选，由 section 单独管理
function handleSectionFilter(idx: number, filterKey: string) {
  const option = filterOptions.find((opt) => opt.key === filterKey);
  if (option) {
    sections.value[idx].filterKey = filterKey;
    sections.value[idx].search = option.label; // 输入框内容显示label
  }
}

// 搜索
function handleSectionSearch(id: number, val: string) {
  const section = sections.value.find((s) => s.id === id);
  if (section) {
    section.search = val;
    console.log(val);
    // 支持用label和key来判断
    const match = filterOptions.find(
      (opt) => opt.label.trim().toLowerCase() === val.trim().toLowerCase() || opt.key.trim().toLowerCase() === val.trim().toLowerCase()
    );
    section.filterKey = match ? match.key : null;
  }
}

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
  if (activeId.value == null) {
    showErrorPopover("请选择一个活动！");
    return;
  }

  // 2. 查找todo中是否有对应的活动
  const relatedTodo = todoByActivityId.value.get(activeId.value);
  if (relatedTodo) {
    showErrorPopover("【" + relatedTodo.idFormated + "】启动待办");
    dateService.navigateTo(new Date(relatedTodo.id));
    emit("update-active-id", activeId.value);
    return;
  }
  const relatedSchedule = scheduleByActivityId.value.get(activeId.value);

  if (relatedSchedule) {
    if (relatedSchedule.activityDueRange[0]) {
      dateService.navigateTo(new Date(relatedSchedule.activityDueRange[0]));
      emit("update-active-id", activeId.value);
    } else {
      showErrorPopover("预约尚未设置时间！");
    }

    return;
  }

  const picked = activityById.value.get(activeId.value);
  if (!picked) return;

  // 4. 触发事件并重置选中状态
  emit("pick-activity", picked);
}

// 添加新的预约活动
function addScheduleRow() {
  emit("add-activity", {
    id: Date.now(),
    class: "S",
    title: "",
    dueRange: [null, ""],
    status: "",
    parentId: null,
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  });
}

// 添加新的无所事事
function addUntaetigkeitRow() {
  emit("add-activity", {
    id: Date.now(),
    class: "S",
    title: "",
    dueRange: [Date.now(), ""],
    status: "",
    isUntaetigkeit: true,
    parentId: null,
    synced: false,
    deleted: false,
    lastModified: Date.now(),
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
    dueDate: Date.now(), // 默认今天
    parentId: null,
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  });
}

// 删除当前选中的活动
function deleteActiveRow() {
  if (activeId.value !== null) {
    emit("delete-activity", activeId.value);
  }
}

// 处理行聚焦事件
function handleFocusRow(id: number) {
  emit("update-active-id", id);
}

function handleFocusSearch() {
  emit("update-active-id", null);
}

// 切换番茄钟类型
function togglePomoType() {
  if (activeId.value !== null) {
    emit("toggle-pomo-type", activeId.value);
  }
}

// 重复选中的活动
function repeatActivity() {
  if (activeId.value !== null) {
    emit("repeat-activity", activeId.value);
  }
}

// 构建选中活动的子活动
function createChildActivity() {
  if (activeId.value !== null) {
    emit("create-child-activity", activeId.value);
  }
}

// 恢复选中活动的子活动
function increaseChildActivity() {
  if (activeId.value !== null) {
    emit("increase-child-activity", activeId.value);
  }
}

// 根据截止日期计算倒计时样式类名
function getCountdownClass(dueDate: number | undefined | null): string {
  if (!dueDate) return "";

  const now = new Date();
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - now.setHours(0, 0, 0, 0)) / 86400000);

  if (diff === 0) return "countdown-0"; // 今日到期
  if (diff === 1) return "countdown-1"; // 明日到期
  if (diff === 2) return "countdown-2"; // 后天到期
  if (diff < 0) return "countdown-boom"; // 已过期
  return "";
}

function handleConvertToTask() {
  if (activeId.value == null) return;
  const activity = activityById.value.get(activeId.value);
  if (!activity) return;

  if (activity.taskId) {
    popoverMessage.value = "该活动已转换为任务";
    showPopover.value = true;
    setTimeout(() => (showPopover.value = false), 2000);
    return;
  }

  console.log("convert", activity.id);

  // 1) 生成任务（不持久化）
  const task = taskService.createTaskFromActivity(activity.id, activity.title);

  // 3) 只 emit，不在子组件里直接操作父层列表
  emit("convert-activity-to-task", {
    task,
    activityId: activity.id,
  });

  // 4) 反馈 UI
  popoverMessage.value = "已转换为任务";
  showPopover.value = true;
  setTimeout(() => (showPopover.value = false), 2000);
}
</script>

<style scoped>
/* 顶部固定按钮容器样式 */
.activity-buttons-sticky {
  position: sticky;
  height: 45px;
}

.kanban-columns {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: stretch;
  height: calc(100% - 45px);
}
.kanban-column {
  flex: 1 0 0;
  min-width: 240px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
