<!-- 
  Component: ActivitySection.vue 

-->
<template>
  <div class="section-container">
    <!-- 筛选区 -->
    <div class="section-header">
      <n-input
        placeholder="请输入筛选条件..."
        :value="props.search"
        @update:value="(val) => $emit('update:search', val)"
      >
        <template #prefix>
          <n-dropdown
            :options="filterOptions"
            @select="(key) => $emit('filter', key)"
          >
            <n-button text type="default" title="筛选活动">
              <template #icon>
                <n-icon><DocumentTableSearch24Regular /></n-icon>
              </template>
            </n-button>
          </n-dropdown>
        </template>
      </n-input>

      <n-button
        v-if="isAddButton"
        type="default"
        title="增加一列"
        @click="$emit('add-section', props.sectionId)"
      >
        <template #icon>
          <n-icon><Add16Regular /></n-icon>
        </template>
      </n-button>
      <n-button
        v-if="isRemoveButton"
        type="default"
        secondary
        strong
        title="删除本列"
        @click="$emit('remove-section', props.sectionId)"
      >
        <template #icon>
          <n-icon><Subtract16Regular /></n-icon>
        </template>
      </n-button>
    </div>

    <!-- 内容区 -->
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
              @mouseenter="handleIconMoveMouseEnter(item.id)"
              @mouseleave="handleIconMoveMouseLeave"
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
          <template #suffix>
            <n-icon
              v-if="!item.tagIds"
              text
              color="var(--color-blue)"
              @click="
                showTagManager = true;
                editingTagId = item.id;
              "
              class="icon-tag"
              title="添加标签"
              ><Tag16Regular
            /></n-icon>
            <n-icon
              v-else
              text
              color="var(--color-blue)"
              @click="handleTagIconClick($event, item)"
              class="icon-tag"
              title="Alt+点击=切换显示 | 点击=管理标签"
              ><Tag16Filled
            /></n-icon>
          </template>
        </n-input>
        <n-modal
          v-model:show="showTagManager"
          @after-leave="onTagManagerClosed"
          role="dialog"
          aria-modal="true"
        >
          <n-card style="width: 420px">
            <TagManager v-model="tempTagIds" />
          </n-card>
        </n-modal>
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
      <div
        v-if="item.tagIds && item.tagIds.length > 0 && showTags"
        class="tag-render-container"
      >
        <TagRenderer
          :tag-ids="item.tagIds"
          @remove-tag="handleRemoveTag(item, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { NInput, NDatePicker, NIcon, NDropdown } from "naive-ui";
import {
  VideoPersonCall24Regular,
  ApprovalsApp24Regular,
  Accessibility24Regular,
  Cloud24Regular,
  Chat24Regular,
  DocumentTableSearch24Regular,
  Add16Regular,
  Subtract16Regular,
  Tag16Filled,
  Tag16Regular,
} from "@vicons/fluent";
import type { Activity } from "@/core/types/Activity";
import { useSettingStore } from "@/stores/useSettingStore";
import TagManager from "./TagManager.vue";
import { useTagStore } from "@/stores/useTagStore";
import TagRenderer from "./TagRenderer.vue";

// 接收发射数据
const props = defineProps<{
  displaySheet: Activity[];
  filterOptions: any[];
  getCountdownClass: (dueDate: number | undefined | null) => string;
  activityId: number | null;
  currentFilter: string | null;
  isAddButton: boolean;
  isRemoveButton: boolean;
  sectionId: number;
  search: string;
}>();

defineEmits<{
  "focus-row": [id: number];
  filter: [key: string];
  "add-section": [id: number];
  "remove-section": [id: number];
  "update:search": [value: string];
}>();

const settingStore = useSettingStore();
const showTagManager = ref(false);
const showTags = ref(true);
const editingTagId = ref(0);
const { allTags, setTagCount } = useTagStore();

const tempTagIds = ref<number[]>([]); // 临时编辑tagIds

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

// 在拖拽里用到
function handleIconMoveMouseEnter(id: number) {
  hoveredRowId.value = id;
}
function handleIconMoveMouseLeave() {
  hoveredRowId.value = null;
}

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

// Tag相关
function handleTagIconClick(event: MouseEvent, item: Activity) {
  if (event.altKey) {
    // --- Alt+Click 逻辑 ---
    // 阻止任何可能发生的默认行为（比如文本选择）
    event.preventDefault();

    // 切换 showTags 的值 (true -> false, false -> true)
    showTags.value = !showTags.value;
  } else {
    // --- 普通点击逻辑 (你之前的代码) ---
    // 如果没有按 Alt 键，就执行常规的打开标签管理器的操作
    showTagManager.value = true;
    editingTagId.value = item.id;
    tempTagIds.value = [...(item.tagIds || [])];
  }
}
// 保存Tags
function onTagManagerClosed() {
  // 只在弹窗关闭时才同步
  const activity = props.displaySheet.find(
    (act) => act.id === editingTagId.value
  );

  if (activity) {
    const existingTagIds = activity.tagIds || [];
    const mergedTagIds = [...new Set([...existingTagIds, ...tempTagIds.value])];

    // 计算实际新增的 tagIds
    const newlyAddedTagIds = mergedTagIds.filter(
      (id) => !existingTagIds.includes(id)
    );

    // 更新 activity
    activity.tagIds = mergedTagIds;

    // 只为新增的 tags 更新 count
    newlyAddedTagIds.forEach((tagId) => {
      const tag = allTags.find((t) => t.id === tagId);
      if (tag) {
        setTagCount(tagId, tag.count + 1);
      }
    });
  }

  // 清空临时数据
  tempTagIds.value = [];
}

// 处理删除标签
// 修改标签删除逻辑
function handleRemoveTag(item: Activity, tagId: number) {
  if (item.tagIds) {
    // ✅ 创建新数组确保引用更新
    item.tagIds = item.tagIds.filter((id) => id !== tagId);

    // ✅ 将count更新逻辑移至store内
    useTagStore().decrementTagCount(tagId);
  }
}
</script>

<style scoped>
.section-container {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  padding: 2px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 4px;
}
.section-header :deep(.n-input__input-el) {
  font-weight: bold;
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

.icon-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  padding: 2px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.icon-tag:hover {
  cursor: pointer;
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

.tag-render-container {
  display: flex;
}
.n-modal-mask {
  background-color: rgba(0, 0, 0, 0.1) !important;
}
</style>
