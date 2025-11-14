<!-- 
  Component: ActivitySection.vue 

-->
<template>
  <div class="section-container">
    <!-- 筛选区 -->
    <div class="section-header">
      <n-input
        :placeholder="currentFilterLabel"
        title="请输入筛选条件..."
        :value="props.search"
        @update:value="(val) => $emit('update:search', val)"
        @focus="$emit('focus-search')"
      >
        <template #prefix>
          <n-dropdown :options="filterOptions" @select="(key) => $emit('filter', key)">
            <n-button text type="default" title="筛选活动">
              <template #icon>
                <n-icon><DocumentTableSearch24Regular /></n-icon>
              </template>
            </n-button>
          </n-dropdown>
        </template>
      </n-input>

      <n-button v-if="isAddButton" type="default" title="增加一列" @click="$emit('add-section', props.sectionId)">
        <template #icon>
          <n-icon><Add16Regular /></n-icon>
        </template>
      </n-button>
      <n-button v-if="isRemoveButton" type="default" secondary strong title="删除本列" @click="$emit('remove-section', props.sectionId)">
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
        :class="{
          'highlight-line': item.id === activityId || item.id === props.activeId,
        }"
      >
        <div class="activity-content">
          <n-input
            v-model:value="item.title"
            :ref="(el) => setRowInputRef(el as InputInst | null, item.id)"
            type="text"
            :placeholder="item.isUntaetigkeit ? '无所事事' : '任务描述'"
            style="flex: 1"
            @input="handleTitleInput(item, $event)"
            @keydown="handleInputKeydown($event, item)"
            @focus="handleNoFocus(item.id)"
            :class="{
              'force-hover': dragHandler.hoveredRowId.value === item.id,
              'child-activity': item.parentId,
            }"
          >
            <template #prefix>
              <div
                class="icon-drag-area"
                @mousedown="onDragStart($event, item)"
                @mouseenter="dragHandler.handleIconMouseEnter(item.id)"
                @mouseleave="dragHandler.handleIconMouseLeave()"
                :title="item.status !== 'cancelled' ? '拖拽调整顺序' : '不支持顺序修改'"
              >
                <n-icon v-if="item.isUntaetigkeit" :color="'var(--color-blue)'"><Cloud24Regular /></n-icon>
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
                >
                  <Chat24Regular />
                </n-icon>
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
                >
                  <VideoPersonCall24Regular />
                </n-icon>
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
                >
                  <ApprovalsApp24Regular />
                </n-icon>
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
                >
                  <CalendarCheckmark20Regular />
                </n-icon>
              </div>
            </template>
            <template #suffix>
              <n-icon
                v-if="!item.tagIds"
                text
                color="var(--color-text-secondary)"
                @click="handleTagIconClick($event, item.id)"
                class="icon-tag"
                title="添加标签"
              >
                <Tag16Regular />
              </n-icon>
              <n-icon
                v-else
                text
                color="var(--color-blue)"
                @click="handleTagIconClick($event, item.id)"
                class="icon-tag"
                title="Alt+点击=切换显示 | 点击=管理标签"
              >
                <Tag16Regular />
              </n-icon>
            </template>
          </n-input>
          <n-popover
            :show="tagEditor.popoverTargetId.value === item.id"
            @update:show="(show) => !show && (tagEditor.popoverTargetId.value = null)"
            placement="bottom-start"
            :trap-focus="false"
            trigger="manual"
            :show-arrow="false"
            style="padding: 0; border-radius: 6px"
            :to="false"
          >
            <template #trigger>
              <span style="position: absolute; pointer-events: none"></span>
            </template>
            <TagSelector
              :ref="
                (el) => {
                  if (tagEditor.popoverTargetId.value === item.id) tagSelectorRef = el;
                }
              "
              :search-term="tagEditor.tagSearchTerm.value"
              :allow-create="true"
              @select-tag="(tagId: any) => handleTagSelected(item, tagId)"
              @create-tag="(tagName: any) => handleTagCreate(item, tagName)"
              @close-selector="tagEditor.popoverTargetId.value = null"
            />
          </n-popover>

          <!-- 地点 -->
          <n-input
            v-if="item.class === 'S'"
            v-model:value="item.location"
            style="max-width: 50px"
            @focus="handleNoFocus(item.id)"
            placeholder="地点"
            :class="{ 'force-hover': dragHandler.hoveredRowId.value === item.id }"
            @update:value="
              () => {
                item.synced = false;
                item.lastModified = Date.now();
              }
            "
            @click.stop
          />

          <!-- 时间或番茄钟 -->
          <n-input
            v-if="item.class === 'T'"
            maxlength="1"
            :value="getInputValue(item)"
            :placeholder="item.pomoType"
            :title="`输入估计${item.pomoType || '🍅'}数量`"
            style="max-width: 32px"
            class="pomo-input"
            :disabled="item.pomoType === '🍒'"
            @update:value="(val) => onInputUpdate(item, val)"
            @focus="handleNoFocus(item.id)"
            :class="{
              'pomo-red': item.pomoType === '🍅',
              'pomo-purple': item.pomoType === '🍇',
              'pomo-green': item.pomoType === '🍒',
              'input-center': true,
              'force-hover': dragHandler.hoveredRowId.value === item.id,
            }"
          />
          <n-input
            v-else
            style="max-width: 32px; font-size: 14px; margin: 0 auto"
            :value="item.dueRange ? item.dueRange[1] : ''"
            @update:value="
              (val) => {
                item.dueRange ? (item.dueRange[1] = val) : (item.dueRange = [Date.now(), val]);
                item.synced = false;
                item.lastModified = Date.now();
              }
            "
            @focus="handleNoFocus(item.id)"
            title="持续时间(分钟)"
            placeholder="min"
            class="input-center input-min"
            :class="{ 'force-hover': dragHandler.hoveredRowId.value === item.id }"
          />

          <!-- 日期选择 -->
          <n-date-picker
            v-if="item.class === 'T'"
            v-model:value="item.dueDate"
            type="date"
            clearable
            style="max-width: 63px"
            format="MM/dd"
            @focus="handleNoFocus(item.id)"
            title="死线日期"
            :class="getCountdownClass(item.dueDate)"
            @update:value="
              () => {
                item.synced = false;
                item.lastModified = Date.now();
              }
            "
          />
          <n-date-picker
            v-else
            :value="item.dueRange ? item.dueRange[0] : 0"
            @update:value="
              (val) => {
                item.dueRange ? (item.dueRange[0] = val) : (item.dueRange = [Date.now(), '']);
                item.synced = false;
                item.lastModified = Date.now();
              }
            "
            type="datetime"
            style="max-width: 63px"
            clearable
            format="HH:mm"
            @focus="handleNoFocus(item.id)"
            title="约定时间"
            :class="getCountdownClass(item.dueRange && item.dueRange[0])"
          />
        </div>

        <!-- tag显示 -->
        <div
          v-if="item.tagIds && item.tagIds.length > 0 && settingStore.settings.kanbanSetting[props.sectionId].showTags"
          class="tag-content"
          :class="{ 'child-activity-tag': item.parentId }"
        >
          <TagRenderer
            :tag-ids="item.tagIds"
            :isCloseable="true"
            @remove-tag="handleRemoveTag(item.id, $event)"
            class="tagRenderer-container"
          />
        </div>
      </div>
    </div>
  </div>
  <!-- 弹出tag管理 -->
  <n-modal v-model:show="showTagManager" @after-leave="handleTagManagerClose">
    <n-card style="width: 420px">
      <TagManager v-model="tagIdsProxy" />
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref, onMounted } from "vue";
import { NInput, NDatePicker, NIcon, NDropdown, NPopover, NButton, NCard, NModal } from "naive-ui";
import {
  VideoPersonCall24Regular,
  ApprovalsApp24Regular,
  CalendarCheckmark20Regular,
  Cloud24Regular,
  Chat24Regular,
  DocumentTableSearch24Regular,
  Add16Regular,
  Subtract16Regular,
  Tag16Regular,
} from "@vicons/fluent";
import type { Activity } from "@/core/types/Activity";
import { useSettingStore } from "@/stores/useSettingStore";
import { useActivityTagEditor } from "@/composables/useActivityTagEditor";
import { useActivityDrag } from "@/composables/useActivityDrag";
import TagManager from "../TagSystem/TagManager.vue";
import TagRenderer from "../TagSystem/TagRenderer.vue";
import TagSelector from "../TagSystem/TagSelector.vue";
import type { InputInst } from "naive-ui";

// ======================== Props & Emits ========================
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
  activeId: number | null | undefined;
}>();

const emit = defineEmits<{
  "focus-row": [id: number];
  filter: [key: string];
  "add-section": [id: number];
  "remove-section": [id: number];
  "update:search": [value: string];
  "focus-search": [];
}>();

// ======================== Stores ========================
const settingStore = useSettingStore();

// ======================== 排序逻辑 ========================
const sortedDisplaySheet = computed(() => {
  const activities = props.displaySheet.filter((activity: Activity) => activity.status !== "done").slice();

  const activityMap = new Map<number, Activity[]>();
  const rootActivities: Activity[] = [];

  // 构建父子关系
  activities.forEach((item) => {
    if (item.parentId === null || item.parentId === undefined) {
      rootActivities.push(item);
    } else {
      if (!activityMap.has(item.parentId)) {
        activityMap.set(item.parentId, []);
      }
      activityMap.get(item.parentId)!.push(item);
    }
  });

  const getRank = (id: number) => settingStore.settings.activityRank[id] ?? Number.MAX_SAFE_INTEGER;

  // 排序
  rootActivities.sort((a, b) => getRank(a.id) - getRank(b.id));

  for (const children of activityMap.values()) {
    children.sort((a, b) => getRank(a.id) - getRank(b.id));
  }

  // DFS 展平
  const result: Activity[] = [];
  function dfs(activity: Activity) {
    result.push(activity);
    const children = activityMap.get(activity.id);
    if (children) {
      children.forEach(dfs);
    }
  }
  rootActivities.forEach(dfs);

  return result;
});

// ======================== Composables ========================
const tagEditor = useActivityTagEditor();
const dragHandler = useActivityDrag(() => sortedDisplaySheet.value);

// ======================== 本地状态 ========================
const noFocus = ref(false);
const rowInputMap = ref(new Map<number, InputInst>());
const showTagManager = ref(false);
const tagSelectorRef = ref<any>(null);

// ======================== 计算属性 ========================
const currentFilterLabel = computed(() => {
  const match = props.filterOptions.find((o) => o.key === props.currentFilter);
  return match?.label ?? "";
});

const tagIdsProxy = computed({
  get: () => tagEditor.tempTagIds.value,
  set: (v) => (tagEditor.tempTagIds.value = v),
});
// ======================== 初始化 ========================
onMounted(() => {
  settingStore.settings.kanbanSetting[props.sectionId].showTags ??= true;
});

// ======================== 输入框引用管理 ========================
function setRowInputRef(el: InputInst | null, id: number) {
  if (el) rowInputMap.value.set(id, el);
  else rowInputMap.value.delete(id);
}

function handleNoFocus(id: number) {
  noFocus.value = true;
  emit("focus-row", id);
}

// ======================== 焦点管理 ========================
watch(
  () => props.activeId,
  async (id) => {
    if (noFocus.value) {
      noFocus.value = false;
      return;
    }

    if (id === undefined) return;

    let targetFocusId = null;

    if (id === null) {
      const list = sortedDisplaySheet.value;
      const last = list[list.length - 1];
      if (last && last.id !== null && last.id !== undefined) {
        targetFocusId = last.id;
      } else {
        noFocus.value = false;
        return;
      }
    } else {
      targetFocusId = id;
    }

    if (targetFocusId === null) return;

    await nextTick();
    const inst = rowInputMap.value.get(targetFocusId);
    if (!inst) return;

    if (typeof inst.focus === "function") {
      inst.focus();
      noFocus.value = false;
    } else {
      inst.inputElRef?.focus?.();
    }
  }
);

// ======================== 拖拽处理 ========================
function onDragStart(event: MouseEvent, item: Activity) {
  dragHandler.startDrag(event, item);
}

// ======================== 标签操作 ========================
function handleTagIconClick(event: MouseEvent, activityId: number) {
  if (event.altKey) {
    event.preventDefault();
    const setting = settingStore.settings.kanbanSetting[props.sectionId];
    setting.showTags = !setting.showTags;
  } else {
    tagEditor.openTagManager(activityId);
    showTagManager.value = true;
  }
}

function handleTagManagerClose() {
  tagEditor.saveAndCloseTagManager();
  showTagManager.value = false;
}

function handleRemoveTag(activityId: number, tagId: number) {
  tagEditor.quickRemoveTag(activityId, tagId);
}

// ======================== 标题输入处理 ========================
function handleTitleInput(activity: Activity, newTitle: string) {
  tagEditor.handleTitleInput(activity.id, newTitle);
  activity.synced = false;
  activity.lastModified = Date.now();
  // 注意：这里暂时保留了 v-model，所以不需要手动更新
  // 如果要改成单向数据流，需要通过 dataStore 更新
}

function handleTagSelected(activity: Activity, tagId: number) {
  const cleanedTitle = tagEditor.selectTagFromPopover(activity.id, tagId, activity.title);

  // 更新标题
  activity.title = cleanedTitle;
  activity.synced = false;
  activity.lastModified = Date.now();
}

function handleTagCreate(activity: Activity, tagName: string) {
  const cleanedTitle = tagEditor.createTagFromPopover(activity.id, tagName, activity.title);

  // 更新标题
  activity.title = cleanedTitle;
  activity.synced = false;
  activity.lastModified = Date.now();
}

function handleInputKeydown(event: KeyboardEvent, activity: Activity) {
  if (tagEditor.shouldShowPopoverFor(activity.id) && tagSelectorRef.value) {
    switch (event.key) {
      case "ArrowDown":
        tagSelectorRef.value.navigateDown();
        event.preventDefault();
        break;
      case "ArrowUp":
        tagSelectorRef.value.navigateUp();
        event.preventDefault();
        break;
      case "Enter":
        tagSelectorRef.value.selectHighlighted();
        event.preventDefault();
        break;
      case "Escape":
        tagEditor.closePopover();
        event.preventDefault();
        break;
    }
  }

  // 特殊处理：# 键自动打开 popover
  if (event.key === "#" && !tagEditor.popoverTargetId.value) {
    tagEditor.popoverTargetId.value = activity.id;
  }
}

// ======================== 其他输入处理 ========================
function getInputValue(item: Activity): string {
  if (item.pomoType === "🍒") return "4";
  return typeof item.estPomoI === "string" ? item.estPomoI : "";
}

function onInputUpdate(item: Activity, value: string) {
  if (item.pomoType === "🍒") {
    item.estPomoI = "4";
    return;
  }
  item.estPomoI = value;
  item.synced = false;
  item.lastModified = Date.now();
}
</script>

<style scoped>
.section-container {
  border: 2px solid var(--color-background-light);
  border-radius: 6px;
  padding: 2px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
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
  align-items: center;
  padding: 1px 0;
  gap: 0px;
  width: 100%;
}

.activity-content .child-activity {
  position: relative;
  margin-left: 20px;
}

.activity-content .child-activity::before {
  content: "";
  position: absolute;
  left: -12px; /* inside the 20px margin */
  top: 1em; /* vertically centered */
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  color: var(--color-text-secondary);
}
.activity-content {
  display: flex;
  flex-direction: row;
}
.tag-content {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
}
.child-activity-tag {
  margin-left: 20px;
}

.tagRenderer-container {
  margin-top: 2px;
  display: flex;
  flex-wrap: wrap;
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
  padding-left: 4px;
  padding-right: 4px;
}

.input-min :deep(.n-input__input) {
  font-size: 12px;
}

:deep(.n-input .n-input__suffix) {
  margin: 0px;
}

:deep(.n-input .n-input__prefix) {
  margin: 0px;
}

.input-min :deep(.n-input__placeholder) {
  font-size: 12px;
}

.countdown-0 :deep(.n-input) {
  background: var(--color-red-light-transparent);
}

.countdown-1 :deep(.n-input) {
  background: var(--color-background-light-transparent);
}
.countdown-2 :deep(.n-input) {
  background: var(--color-background-transparent);
}

.countdown-boom :deep(.n-input) {
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
  background-color: var(--color-yellow-light);
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

.n-modal-mask {
  background-color: rgba(0, 0, 0, 0.1) !important;
}
</style>
