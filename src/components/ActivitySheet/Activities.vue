<!-- 
  Component: Activities.vue 
  Description: 
  用于展示活动列表，包括任务和预约。支持编辑活动信息，并根据活动的截止日期或预约时间显示不同颜色背景。
  新增拖拽排序功能，用户可以通过拖拽图标区域调整活动顺序。

  Props:
  - displaySheet: 活动数组，包含任务和预约的详细信息。
  - getCountdownClass: 函数，根据日期返回颜色类名。

  Emits:
  - focus-row: 当用户聚焦某行时，发射事件并传入行的 ID。

  Parent: ActivityView.vue

  Usage:
  <Activities :displaySheet="activitySheet" :getCountdownClass="getCountdownClass" @focus-row="handleFocusRow" />
-->
<template>
  <div class="filter-bar-1">
    <n-dropdown
      :options="filterOptions"
      @select="(key) => $emit('filter', key)"
    >
      <n-button
        strong
        secondary
        circle
        type="default"
        size="small"
        title="筛选活动"
      >
        <template #icon>
          <n-icon><DocumentTableSearch24Regular /></n-icon>
        </template>
      </n-button>
    </n-dropdown>
    <n-input />

    <n-button text type="default" title="增加一列">
      <template #icon>
        <n-icon><Add16Regular /></n-icon>
      </template>
    </n-button>
  </div>
  <div v-for="item in sortedDisplaySheet" :key="item.id">
    <div
      v-if="item.status !== 'done'"
      class="activity-row"
      :class="{ 'highlight-line': item.id === activityId }"
    >
      <n-input
        v-model:value="item.title"
        type="text"
        :placeholder="item.isUntaetigkeit ? '无所事事' : '任务描述'"
        style="flex: 2"
        @focus="$emit('focus-row', item.id)"
        :class="{ 'force-hover': hoveredRowId === item.id }"
      >
        <template #prefix>
          <div
            class="icon-drag-area"
            @mousedown="startDrag($event, item)"
            @mouseenter="handleIconMouseEnter(item.id)"
            @mouseleave="handleIconMouseLeave"
            :title="
              item.status !== 'cancelled' ? '拖拽调整顺序' : '不支持顺序修改'
            "
          >
            <n-icon v-if="item.isUntaetigkeit" :color="'var(--color-blue)'"
              ><Cloud24Regular
            /></n-icon>
            <n-icon
              v-if="item.interruption === 'I'"
              :color="
                item.status === 'ongoing'
                  ? 'var(--color-red)'
                  : item.status === 'delayed'
                  ? 'var(--color-blue)'
                  : item.status === 'suspended'
                  ? 'var(--color-orange)'
                  : item.status === 'cancelled'
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-secondary)'
              "
              ><Chat24Regular
            /></n-icon>
            <n-icon
              v-else-if="item.interruption === 'E'"
              :color="
                item.status === 'ongoing'
                  ? 'var(--color-red)'
                  : item.status === 'delayed'
                  ? 'var(--color-blue)'
                  : item.status === 'suspended'
                  ? 'var(--color-orange)'
                  : item.status === 'cancelled'
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-secondary)'
              "
              ><VideoPersonCall24Regular
            /></n-icon>
            <n-icon
              v-else-if="item.class === 'T'"
              :color="
                item.status === 'ongoing'
                  ? 'var(--color-red)'
                  : item.status === 'delayed'
                  ? 'var(--color-blue)'
                  : item.status === 'suspended'
                  ? 'var(--color-orange)'
                  : item.status === 'cancelled'
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-secondary)'
              "
              ><ApprovalsApp24Regular
            /></n-icon>
            <n-icon
              v-else-if="item.class === 'S' && !item.isUntaetigkeit"
              :color="
                item.status === 'ongoing'
                  ? 'var(--color-red)'
                  : item.status === 'delayed'
                  ? 'var(--color-blue)'
                  : item.status === 'suspended'
                  ? 'var(--color-orange)'
                  : item.status === 'cancelled'
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-secondary)'
              "
              ><Accessibility24Regular
            /></n-icon>
          </div>
        </template>
      </n-input>
      <n-input
        v-if="item.class === 'S'"
        v-model:value="item.location"
        style="max-width: 90px"
        @focus="$emit('focus-row', item.id)"
        placeholder="地点"
        :class="{ 'force-hover': hoveredRowId === item.id }"
      />
      <n-input
        v-if="item.class === 'T'"
        :value="getInputValue(item)"
        :placeholder="item.pomoType"
        style="max-width: 32px"
        class="pomo-input"
        :title="`输入估计${item.pomoType || '🍅'}数量`"
        :class="{
          'pomo-red': item.pomoType === '🍅',
          'pomo-purple': item.pomoType === '🍇',
          'pomo-green': item.pomoType === '🍒',
          'input-center': true, // 新增
          'input-clear-disabled': item.pomoType === '🍒',
          'force-hover': hoveredRowId === item.id,
        }"
        :disabled="item.pomoType === '🍒'"
        @update:value="(val) => onInputUpdate(item, val)"
        @focus="$emit('focus-row', item.id)"
      />
      <n-input
        v-else
        style="max-width: 32px; font-size: 14px; margin: 0 auto"
        :value="item.dueRange ? item.dueRange[1] : ''"
        @update:value="
          (val) =>
            item.dueRange
              ? (item.dueRange[1] = val)
              : (item.dueRange = [Date.now(), val])
        "
        @focus="$emit('focus-row', item.id)"
        title="持续时间(分钟)"
        placeholder="min"
        class="input-center input-min"
        :class="{ 'force-hover': hoveredRowId === item.id }"
      />

      <n-date-picker
        v-if="item.class === 'T'"
        v-model:value="item.dueDate"
        type="date"
        clearable
        style="max-width: 70px"
        format="MM/dd"
        @focus="$emit('focus-row', item.id)"
        title="死线日期"
        :class="getCountdownClass(item.dueDate)"
      />
      <n-date-picker
        v-else
        :value="item.dueRange ? item.dueRange[0] : 0"
        @update:value="
          (val) =>
            item.dueRange
              ? (item.dueRange[0] = val)
              : (item.dueRange = [Date.now(), ''])
        "
        type="datetime"
        style="max-width: 70px"
        clearable
        format="HH:mm"
        @focus="$emit('focus-row', item.id)"
        title="约定时间"
        :class="getCountdownClass(item.dueRange && item.dueRange[0])"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { NInput, NDatePicker, NIcon, NDropdown, NGrid } from "naive-ui";
import {
  VideoPersonCall24Regular,
  ApprovalsApp24Regular,
  Accessibility24Regular,
  Cloud24Regular,
  Chat24Regular,
  DocumentTableSearch24Regular,
  Add16Regular,
} from "@vicons/fluent";
import type { Activity } from "@/core/types/Activity";
import { useSettingStore } from "@/stores/useSettingStore";

// 接收发射数据
const props = defineProps<{
  displaySheet: Activity[];
  filterOptions: any[];
  getCountdownClass: (dueDate: number | undefined | null) => string;
  activityId: number | null;
  currentFilter: string;
}>();

defineEmits<{
  "focus-row": [id: number];
  filter: [key: string];
}>();

const settingStore = useSettingStore();

// 拖拽相关状态
const isDragging = ref(false);
const draggedItem = ref<Activity | null>(null);
const dragStartY = ref(0);

// 新增：用于模拟 hover 效果的行 id
const hoveredRowId = ref<number | null>(null);

// 排序：先按自定义排序，再按类型排序
const sortedDisplaySheet = computed(() => {
  // 只保留未取消的活动
  const activities = props.displaySheet.slice();

  // 应用自定义排序
  activities.sort((a, b) => {
    const rankA =
      settingStore.settings.activityRank[a.id] ?? Number.MAX_SAFE_INTEGER;
    const rankB =
      settingStore.settings.activityRank[b.id] ?? Number.MAX_SAFE_INTEGER;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // 如果排序相同，按类型排序：T类型优先
    if (a.class === "T" && b.class !== "T") return -1;
    if (a.class !== "T" && b.class === "T") return 1;
    return 0;
  });

  return activities;
});

// 开始拖拽
function startDrag(event: MouseEvent, item: Activity) {
  event.preventDefault();
  event.stopPropagation();

  // 检查是否点击在输入框上
  const target = event.target as HTMLElement;
  const isInputElement = target.closest("input, textarea, .n-input__input");

  if (isInputElement) {
    return;
  }

  isDragging.value = true;
  draggedItem.value = item;
  dragStartY.value = event.clientY;

  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);
}

// 拖拽移动
function handleDragMove(event: MouseEvent) {
  if (!isDragging.value || !draggedItem.value) return;

  const deltaY = event.clientY - dragStartY.value;
  const threshold = 30; // 拖拽阈值

  if (Math.abs(deltaY) < threshold) return;

  const currentIndex = sortedDisplaySheet.value.findIndex(
    (item) => item.id === draggedItem.value!.id
  );

  if (currentIndex === -1) return;

  const newIndex =
    deltaY > 0
      ? Math.min(currentIndex + 1, sortedDisplaySheet.value.length - 1)
      : Math.max(currentIndex - 1, 0);

  if (newIndex !== currentIndex) {
    updateActivityRank(currentIndex, newIndex);
    dragStartY.value = event.clientY;
  }
}

// 拖拽结束
function handleDragEnd() {
  isDragging.value = false;
  draggedItem.value = null;

  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);
}

// 更新活动排序
function updateActivityRank(fromIndex: number, toIndex: number) {
  // 只对未取消的活动排序
  const activities = sortedDisplaySheet.value;
  const newRank: Record<number, number> = {
    ...settingStore.settings.activityRank,
  };

  activities.forEach((activity, index) => {
    // 跳过取消的活动
    if (activity.status === "cancelled") return;
    if (index === fromIndex) {
      newRank[activity.id] = toIndex;
    } else if (index === toIndex) {
      newRank[activity.id] = fromIndex;
    } else {
      newRank[activity.id] = index;
    }
  });

  settingStore.settings.activityRank = newRank;
}

// 获取输入显示字符串
function getInputValue(item: Activity): string {
  if (item.pomoType === "🍒") return "4";
  return typeof item.estPomoI === "string" ? item.estPomoI : "";
}

// 响应用户输入
function onInputUpdate(item: Activity, value: string) {
  if (item.pomoType === "🍒") {
    item.estPomoI = "4";
    return;
  }
  item.estPomoI = value;
}

// 在 template 里用到
function handleIconMouseEnter(id: number) {
  hoveredRowId.value = id;
}
function handleIconMouseLeave() {
  hoveredRowId.value = null;
}
</script>

<style scoped>
filter-content-1 {
  background-color: rgb(250, 215, 215) !important;
}

.filter-bar-1 {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 8px;
}

.activity-row {
  display: flex;
  align-items: center;
  padding: 1px 0;
  gap: 0px;
  width: 100%;
}

.icon-drag-area {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  padding: 2px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.icon-drag-area:hover {
  background-color: var(--color-blue-light);
}

.icon-drag-area:active {
  cursor: grabbing;
  background-color: var(--color-red-light);
}

.input-min :deep(.n-input-wrapper) {
  padding-left: 0px !important;
  padding-right: 0px !important;
}
:deep(.n-input .n-input-wrapper) {
  padding-left: 6px;
  padding-right: 6px;
}

.input-min :deep(.n-input__input) {
  font-size: 12px;
}

:deep(.n-input .n-input__suffix) {
  margin: 0px;
}

.input-min :deep(.n-input__placeholder) {
  font-size: 12px;
}
.delayed {
  background: var(--color-orange-transparent);
}
.countdown-yellow :deep(.n-input) {
  background: var(--color-yellow-transparent);
}
.countdown-orange :deep(.n-input) {
  background: var(--color-orange-light-transparent);
}
.countdown-deeporange :deep(.n-input) {
  background: var(--color-orange-dark-transparent);
}
.countdown-red :deep(.n-input) {
  background: var(--color-red-light-transparent);
}
.countdown-blue :deep(.n-input) {
  background: var(--color-blue-light-transparent);
}
.pomo-input :deep(.n-input__placeholder) {
  opacity: 0.45; /* 50% 透明度 */
  font-size: 10px;
}
.pomo-red {
  background: var(--color-background) !important;
}
.pomo-purple {
  background: var(--color-purple-light-transparent) !important;
}
.pomo-green {
  background: var(--color-green-light-transparent) !important;
}

/* 文本居中 */
.input-center :deep(.n-input__input) {
  text-align: center;
  color: var(--color-text-primary) !important;
  opacity: 1 !important;
}

/* 禁用也要高对比度且和普通同色 */
.input-clear-disabled :deep(.n-input__input-el[disabled]) {
  color: var(--color-text-primary) !important;
  opacity: 1 !important;
  -webkit-text-fill-color: var(--color-text-primary) !important;
}

.highlight-line {
  background-color: var(--color-yellow);
}

/* 强制 n-input 显示 hover 效果 */
.force-hover :deep(.n-input) {
  border-color: var(--n-border-hover) !important;
  box-shadow: var(--n-box-shadow-focus) !important;
  background-color: var(--n-color-hover) !important;
}
.force-hover :deep(.n-input__input) {
  background-color: var(--n-color-hover) !important;
}
</style>
