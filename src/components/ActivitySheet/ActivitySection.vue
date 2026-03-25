<!-- 
  Component: ActivitySection.vue 
-->
<template>
  <div class="section-container">
    <!-- 筛选区 -->
    <div class="section-header">
      <n-input
        ref="searchInputRef"
        :placeholder="currentFilterLabel"
        title="请输入筛选条件..."
        :value="props.search"
        @update:value="(val) => $emit('update:search', val)"
        @focus="
          () => {
            isSearchFocused = true;
            $emit('focus-search');
          }
        "
        @blur="() => (isSearchFocused = false)"
        class="input-focus-none search-input"
      >
        <template #prefix>
          <n-dropdown :options="filterOptions" @select="(key) => $emit('filter', key)">
            <n-button text type="default" title="筛选活动" @pointerdown.stop @mousedown.prevent.stop @touchstart.stop>
              <template #icon>
                <n-icon><DocumentTableSearch24Regular /></n-icon>
              </template>
            </n-button>
          </n-dropdown>
        </template>
      </n-input>

      <n-button
        v-if="isAddButton"
        large
        type="default"
        title="增加一列"
        quaternary
        class="section-button"
        @click="$emit('add-section', props.sectionId)"
      >
        <template #icon>
          <n-icon><ColumnArrowRight20Regular /></n-icon>
        </template>
      </n-button>
      <n-button
        v-if="isRemoveButton"
        large
        type="default"
        title="删除本列"
        quaternary
        @click="$emit('remove-section', props.sectionId)"
        class="section-button"
      >
        <template #icon>
          <n-icon><TableDeleteColumn20Regular /></n-icon>
        </template>
      </n-button>
    </div>

    <!-- 内容区 -->
    <div class="section-content-container">
      <div v-for="item in sortedDisplaySheet" :key="item.id">
        <div
          v-if="item.status !== 'done' && shouldShowItem(item)"
          class="activity-row"
          :data-row-id="item.id"
          :class="{
            // Planner 用 selectedActivityId（activityId）；看板点击后 onUpdateActiveId 会清 activityId、只保留 activeId，需两者任一命中才能与选中态一致
            'highlight-line': item.id === activityId || item.id === activeId,
            'is-dragging-row': dragHandler.draggedItem.value?.id === item.id,
          }"
        >
          <div class="activity-content">
            <span
              v-if="item.parentId"
              class="child-activity-dot"
              @click.stop="handleCollapseParent(item.parentId)"
              title="点击收起父项"
            ></span>
            <n-input
              v-model:value="item.title"
              :ref="(el) => setRowInputRef(el as InputInst | null, item.id)"
              type="text"
              :readonly="isMobile && !titleEditAllowed[item.id]"
              :placeholder="item.isUntaetigkeit ? '无所事事' : '任务描述'"
              style="flex: 1"
              @input="handleTitleInput(item, $event)"
              @keydown="handleInputKeydown($event, item)"
              @focus="handleTitleInputFocus(item)"
              @blur="handleTitleBlur(item)"
              @touchstart.stop="handleTitleTouchStart($event, item)"
              @touchend.stop="handleTitleTouchEnd($event, item)"
              @touchcancel.stop="handleTitleTouchCancel(item)"
              :class="{
                'force-hover': dragHandler.hoveredRowId.value === item.id,
                'child-activity': item.parentId,
              }"
              class="input-focus-none"
            >
              <template #prefix>
                <div
                  class="icon-drag-area"
                  :class="{ 'has-children': hasChildren(item.id), 'is-collapsed': collapsedParentIds[item.id] }"
                  style="touch-action: none; cursor: grab"
                  @pointerdown.prevent.stop="onDragStart($event, item)"
                  @mousedown.prevent.stop
                  @touchstart.stop
                  :title="getDragAreaTitle(item)"
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
                  text
                  :color="item.tagIds ? 'var(--color-blue)' : 'var(--color-text-secondary)'"
                  @click="handleTagIconClick()"
                  @pointerdown.stop
                  @mousedown.prevent.stop
                  @touchstart.stop
                  class="icon-tag"
                  title="显示/隐藏标签"
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
              :style="{ '--n-space': '30px' }"
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
              class="input-focus-none"
              @focus="handleFocusRow(item.id)"
              @blur="handleBlur"
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
              :ref="(el) => setPomoInputRef(el as InputInst | null, item.id)"
              maxlength="1"
              :value="getInputValue(item)"
              :placeholder="item.pomoType"
              :title="pomoInputTitle"
              style="max-width: 32px"
              class="pomo-input input-focus-none"
              :readonly="item.pomoType === '🍒'"
              @update:value="(val) => onInputUpdate(item, val)"
              @focus="handlePomoInputFocus(item)"
              @blur="handleBlur"
              @mousedown.stop="(e: MouseEvent) => handlePomoInputMouseDown(e, item)"
              @touchstart.stop="(e: TouchEvent) => handlePomoInputTouchStart(e, item)"
              @touchend.stop="(e: TouchEvent) => handlePomoInputTouchEnd(e, item)"
              @touchcancel.stop="handlePomoInputTouchCancel(item)"
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
              @focus="handleFocusRow(item.id)"
              @blur="handleBlur"
              title="持续时间(分钟)"
              placeholder="min"
              class="input-center input-min input-focus-none"
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
              @focus="handleFocusRow(item.id)"
              @blur="handleBlur"
              title="死线日期"
              :class="getCountdownClass(item.dueDate)"
              placeholder="日期"
              @update:value="
                () => {
                  item.synced = false;
                  item.lastModified = Date.now();
                }
              "
              class="input-focus-none"
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
              @focus="handleFocusRow(item.id)"
              @blur="handleBlur"
              title="约定时间"
              :class="getCountdownClass(item.dueRange && item.dueRange[0])"
              placeholder="时间"
              class="input-focus-none"
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
              :display-length="3"
              size="tiny"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- 弹出tag管理 -->
  <TagManager
    v-model="tagIdsProxy"
    :show="showTagManager"
    @update:show="showTagManager = $event"
    @after-leave="handleTagManagerClose"
    :activityId="activityId"
    class="mobile-dialog-top"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, onMounted, reactive } from "vue";
import { NInput, NDatePicker, NIcon, NDropdown, NPopover, NButton } from "naive-ui";
import {
  VideoPersonCall24Regular,
  ApprovalsApp24Regular,
  CalendarCheckmark20Regular,
  Cloud24Regular,
  Chat24Regular,
  DocumentTableSearch24Regular,
  ColumnArrowRight20Regular,
  TableDeleteColumn20Regular,
  Tag16Regular,
} from "@vicons/fluent";
import type { Activity } from "@/core/types/Activity";
import { useSettingStore } from "@/stores/useSettingStore";
import { useActivityTagEditor } from "@/composables/useActivityTagEditor";
import { useActivityDrag } from "@/composables/useActivityDrag";
import { useDevice } from "@/composables/useDevice";
import { togglePomoType } from "@/services/activityService";
import TagManager from "../TagSystem/TagManager.vue";
import TagRenderer from "../TagSystem/TagRenderer.vue";
import TagSelector from "../TagSystem/TagSelector.vue";
import type { InputInst } from "naive-ui";

// ======================== Props & Emits ========================
const props = defineProps<{
  displaySheet: Activity[];
  filterOptions: any[];
  getCountdownClass: (dueDate: number | undefined | null) => string;
  /** Planner 等：selectedActivityId */
  activityId: number | null;
  /** 看板当前选中活动的 id，与 activityId 择一或同时用于避免双重高亮时的展示 */
  activeId?: number | null | undefined;
  currentFilter: string | null;
  isAddButton: boolean;
  isRemoveButton: boolean;
  sectionId: number;
  search: string;
}>();

const emit = defineEmits<{
  "focus-row": [id: number];
  filter: [key: string];
  "add-section": [id: number];
  "remove-section": [id: number];
  "update:search": [value: string];
  "focus-search": [];
}>();

const isSearchFocused = ref(false);
const searchInputRef = ref<InputInst | null>(null);

// 失焦筛选框（移动端标题单击仅 emit focus-row 时 DOM 焦点常仍在筛选框，需单独处理）
function blurSearchInput() {
  isSearchFocused.value = false;
  const inst = searchInputRef.value;
  if (!inst) return;
  if (typeof inst.blur === "function") inst.blur();
  else inst.inputElRef?.blur?.();
}

// ======================== Composables ========================
const { isTouchSupported } = useDevice();

// ======================== Stores ========================
const settingStore = useSettingStore();
const { isMobile } = useDevice();
// 移动端进入编辑时暂存原 topHeight，退出时恢复
const savedTopHeight = ref<number | null>(null);

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
const rowInputMap = ref(new Map<number, InputInst>());
const pomoInputMap = ref(new Map<number, InputInst>());
const showTagManager = ref(false);
const tagSelectorRef = ref<any>(null);

// 双击检测（桌面 mousedown）
const pomoDoubleClickTimers = ref(new Map<number, number>());
const DOUBLE_CLICK_DELAY = 300; // 双击检测延迟（毫秒）

// 触摸：双击切换类型，单击延迟后聚焦改数量（与标题列节奏一致）
const pomoTapTimers = ref(new Map<number, number>());
const pomoLastTapInfo = ref<{ id: number; time: number } | null>(null);

// 标记是否应该聚焦（用于双击后进入编辑）
const pomoShouldFocus = ref(new Map<number, boolean>());

// 移动端标题：双击后才允许编辑；单击仅 emit focus-row 同步选中（双击仅用两次 touchend 间隔判定，不用延时器，避免 touchstart 取消定时器后状态卡死）
const titleEditAllowed = reactive<Record<number, boolean>>({});
const titleLastTapInfo = ref<{ id: number; time: number } | null>(null);

// 防抖：防止快速重复切换
const pomoToggleTimers = ref(new Map<number, number>());
const TOGGLE_DEBOUNCE = 100; // 防抖延迟（毫秒）

// 番茄输入框标题提示
const pomoInputTitle = computed(() => "单击修改数量 | 双击切换类型");

// 点击/拖拽检测状态
const clickDragState = ref<{
  startX: number;
  startY: number;
  item: Activity | null;
  target: HTMLElement | null;
  pointerId: number | null;
  originalEvent: PointerEvent | null; // 保存原始的 pointerdown 事件
} | null>(null);
const DRAG_THRESHOLD = 5; // 拖拽阈值：移动超过5px才算拖拽

// 收起状态：使用 settingStore 持久化存储（Record<number, boolean> 格式）
const collapsedParentIds = computed(() => settingStore.settings.collapsedActivityIds);

// ======================== 计算属性 ========================
const currentFilterLabel = computed(() => {
  const match = props.filterOptions.find((o) => o.key === props.currentFilter);
  return match?.label ?? "";
});

const tagIdsProxy = computed({
  get: () => tagEditor.tempTagIds.value,
  set: (v) => (tagEditor.tempTagIds.value = v),
});

// 构建 activityById Map 用于快速查找
const activityById = computed(() => {
  const map = new Map<number, Activity>();
  props.displaySheet.forEach((activity) => {
    map.set(activity.id, activity);
  });
  return map;
});

// 检查 activity 是否有子项
function hasChildren(activityId: number): boolean {
  return props.displaySheet.some((activity) => activity.parentId === activityId && activity.status !== "done");
}

// 检查 item 是否应该显示（递归检查父项链是否被收起）
function shouldShowItem(item: Activity): boolean {
  // 根项始终显示
  if (!item.parentId) return true;

  // 递归检查父项链
  let currentParentId: number | null = item.parentId;
  const visited = new Set<number>(); // 防止循环引用

  while (currentParentId !== null && currentParentId !== undefined) {
    // 防止循环引用
    if (visited.has(currentParentId)) break;
    visited.add(currentParentId);

    // 如果父项被收起，则不显示
    if (collapsedParentIds.value[currentParentId]) {
      return false;
    }

    // 继续向上查找
    const parent = activityById.value.get(currentParentId);
    if (!parent) break;
    currentParentId = parent.parentId;
  }

  return true;
}

// ======================== 初始化 ========================
onMounted(() => {
  settingStore.settings.kanbanSetting[props.sectionId].showTags ??= true;
});

// ======================== 输入框引用管理 ========================
function setRowInputRef(el: InputInst | null, id: number) {
  if (el) {
    rowInputMap.value.set(id, el);
  } else {
    rowInputMap.value.delete(id);
    delete titleEditAllowed[id];
  }
}

function focusTitleInput(id: number) {
  nextTick(() => {
    const input = rowInputMap.value.get(id);
    if (input) {
      if (typeof input.focus === "function") {
        input.focus();
      } else {
        input.inputElRef?.focus?.();
      }
    }
  });
}

// 切换到其它活动行时结束其它行的标题编辑（v-model 已同步，blur 仅退出编辑态）
function blurTitleEditsExcept(keepActivityId: number | null) {
  const ids = Object.keys(titleEditAllowed)
    .map(Number)
    .filter((i) => titleEditAllowed[i]);
  for (const aid of ids) {
    if (keepActivityId !== null && aid === keepActivityId) continue;
    delete titleEditAllowed[aid];
    const inst = rowInputMap.value.get(aid);
    if (inst) {
      if (typeof inst.blur === "function") inst.blur();
      else inst.inputElRef?.blur?.();
    }
  }
}

function handleTitleInputFocus(item: Activity) {
  if (isMobile.value && !titleEditAllowed[item.id]) {
    nextTick(() => {
      rowInputMap.value.get(item.id)?.blur();
    });
    return;
  }
  handleFocusRow(item.id);
}

function handleTitleBlur(item: Activity) {
  if (isMobile.value) {
    delete titleEditAllowed[item.id];
  }
  handleBlur();
}

function handleTitleTouchStart(e: TouchEvent, _item: Activity) {
  if (!isMobile.value) return;
  e.preventDefault();
}

function handleTitleTouchEnd(e: TouchEvent, item: Activity) {
  if (!isMobile.value) return;
  e.preventDefault();
  const id = item.id;

  const now = Date.now();
  const last = titleLastTapInfo.value;
  if (last && last.id === id && now - last.time < DOUBLE_CLICK_DELAY) {
    titleLastTapInfo.value = null;
    blurTitleEditsExcept(id);
    blurSearchInput();
    titleEditAllowed[id] = true;
    focusTitleInput(id);
    return;
  }

  titleLastTapInfo.value = { id, time: now };
  handleFocusRow(id);
}

function handleTitleTouchCancel(item: Activity) {
  if (!isMobile.value) return;
  // 取消下滑动等导致无 touchend 时，清掉该行上的“上一击”记录，避免下次点击被误判为双击
  if (titleLastTapInfo.value?.id === item.id) {
    titleLastTapInfo.value = null;
  }
}

function clearPomoTapTimer(id: number) {
  const t = pomoTapTimers.value.get(id);
  if (t) {
    clearTimeout(t);
    pomoTapTimers.value.delete(id);
  }
}

function setPomoInputRef(el: InputInst | null, id: number) {
  if (el) {
    pomoInputMap.value.set(id, el);
  } else {
    pomoInputMap.value.delete(id);
    clearPomoTapTimer(id);
    pomoDoubleClickTimers.value.delete(id);
  }
}

function handleFocusRow(id: number) {
  blurSearchInput();
  blurTitleEditsExcept(id);
  emit("focus-row", id);
}

// PC 上首行即 return，无实际效果；savedTopHeight 在本组件内从未赋值，移动端恢复分支亦不会执行
function handleBlur() {
  if (!isMobile.value) return;
  if (savedTopHeight.value === null) return;
  // 失焦时恢复顶部区域高度
  settingStore.settings.topHeight = savedTopHeight.value;
  savedTopHeight.value = null;
}

// ======================== 拖拽处理 ========================
function onDragStart(event: PointerEvent, item: Activity) {
  // 只允许左键 (0) 或 触摸
  if (event.button !== 0 && event.pointerType === "mouse") return;

  // 已删除的活动不支持拖拽
  if (item.deleted) return;

  // 检查输入框逻辑
  const target = event.target as HTMLElement;
  const isInputElement = target.closest("input, textarea, .n-input__input");
  if (isInputElement) return;

  // 如果有子项，先检测是点击还是拖拽
  if (hasChildren(item.id)) {
    event.preventDefault();
    event.stopPropagation();

    clickDragState.value = {
      startX: event.clientX,
      startY: event.clientY,
      item,
      target,
      pointerId: event.pointerId,
      originalEvent: event, // 保存原始的 pointerdown 事件
    };

    // 锁定指针捕获
    target.setPointerCapture(event.pointerId);

    // 绑定移动和结束事件
    target.addEventListener("pointermove", handleClickDragMove);
    target.addEventListener("pointerup", handleClickDragEnd);
    target.addEventListener("pointercancel", handleClickDragEnd);
    return;
  }

  // 没有子项，直接执行拖拽逻辑
  dragHandler.startDrag(event, item);
}

function handleClickDragMove(event: PointerEvent) {
  if (!clickDragState.value) return;

  const state = clickDragState.value;
  if (!state.target || !state.item || !state.originalEvent) return;

  const dx = Math.abs(event.clientX - state.startX);
  const dy = Math.abs(event.clientY - state.startY);
  const distance = Math.hypot(dx, dy);

  // 如果移动距离超过阈值，开始拖拽
  if (distance > DRAG_THRESHOLD) {
    // 保存状态
    const savedTarget = state.target;
    const savedItem = state.item;
    const savedOriginalEvent = state.originalEvent;
    const savedPointerId = state.pointerId;

    // 清理点击检测状态
    clickDragState.value = null;

    // 移除点击检测的事件监听
    savedTarget.removeEventListener("pointermove", handleClickDragMove);
    savedTarget.removeEventListener("pointerup", handleClickDragEnd);
    savedTarget.removeEventListener("pointercancel", handleClickDragEnd);
    if (savedPointerId !== null) {
      savedTarget.releasePointerCapture(savedPointerId);
    }

    // 使用原始的 pointerdown 事件开始拖拽
    dragHandler.startDrag(savedOriginalEvent, savedItem);
  }
}

function handleClickDragEnd(event: PointerEvent) {
  if (!clickDragState.value) return;

  const state = clickDragState.value;
  if (!state.target || !state.item) return;

  const dx = Math.abs(event.clientX - state.startX);
  const dy = Math.abs(event.clientY - state.startY);
  const distance = Math.hypot(dx, dy);

  // 清理状态
  clickDragState.value = null;
  state.target.removeEventListener("pointermove", handleClickDragMove);
  state.target.removeEventListener("pointerup", handleClickDragEnd);
  state.target.removeEventListener("pointercancel", handleClickDragEnd);
  if (state.pointerId !== null) {
    state.target.releasePointerCapture(state.pointerId);
  }

  // 如果移动距离小于阈值，执行点击展开/收起
  if (distance <= DRAG_THRESHOLD) {
    const collapsed = settingStore.settings.collapsedActivityIds;
    if (collapsed[state.item.id]) {
      // 展开：删除记录
      delete collapsed[state.item.id];
    } else {
      // 收起：添加记录
      collapsed[state.item.id] = true;
    }
  }
}

// 获取拖拽区域的 title 提示
function getDragAreaTitle(item: Activity): string {
  if (item.deleted) {
    return "已删除的活动不支持顺序修改";
  }

  if (item.status === "cancelled") {
    return "不支持顺序修改";
  }

  const hasChild = hasChildren(item.id);
  if (hasChild) {
    return "点击=展开/收起 | 拖拽调整顺序";
  }

  return "拖拽调整顺序";
}

// 点击子项点点收起父项
function handleCollapseParent(parentId: number) {
  const collapsed = settingStore.settings.collapsedActivityIds;
  collapsed[parentId] = true;
}

// ======================== 标签操作 ========================
function handleTagIconClick() {
  const setting = settingStore.settings.kanbanSetting[props.sectionId];
  setting.showTags = !setting.showTags;
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
  if ((event.key === "#" || event.key === "@") && !tagEditor.popoverTargetId.value) {
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

// ======================== 番茄输入框交互处理 ========================
// 聚焦到番茄输入框
function focusPomoInput(id: number) {
  pomoShouldFocus.value.set(id, true);
  const input = pomoInputMap.value.get(id);
  if (input) {
    nextTick(() => {
      if (typeof input.focus === "function") {
        input.focus();
      } else {
        input.inputElRef?.focus?.();
      }
      pomoShouldFocus.value.delete(id);
    });
  }
}

// 聚焦事件处理：只有在允许聚焦时才处理
function handlePomoInputFocus(item: Activity) {
  if (pomoShouldFocus.value.get(item.id)) {
    // 允许聚焦：正常处理
    handleFocusRow(item.id);
  } else {
    // 不允许聚焦：立即失焦（可能是通过 Tab 键或其他方式聚焦的）
    const input = pomoInputMap.value.get(item.id);
    if (input) {
      input.blur();
    }
  }
}

// 切换番茄类型（带防抖）
function handleTogglePomoType(item: Activity) {
  // 清除已有的防抖定时器
  const existingTimer = pomoToggleTimers.value.get(item.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // 设置防抖定时器
  const timer = window.setTimeout(() => {
    togglePomoType(item.id, { activityById: activityById.value });
    pomoToggleTimers.value.delete(item.id);
  }, TOGGLE_DEBOUNCE);

  pomoToggleTimers.value.set(item.id, timer);
}

// 鼠标按下（桌面端双击切换类型，单击延迟后聚焦改数量）
function handlePomoInputMouseDown(e: MouseEvent, item: Activity) {
  e.preventDefault();
  e.stopPropagation();

  const timer = pomoDoubleClickTimers.value.get(item.id);
  if (timer) {
    clearTimeout(timer);
    pomoDoubleClickTimers.value.delete(item.id);
    pomoShouldFocus.value.set(item.id, true);
    handleTogglePomoType(item);
    return;
  }

  if (!isTouchSupported) {
    const newTimer = window.setTimeout(() => {
      pomoDoubleClickTimers.value.delete(item.id);
      focusPomoInput(item.id);
    }, DOUBLE_CLICK_DELAY);
    pomoDoubleClickTimers.value.set(item.id, newTimer);
  } else {
    focusPomoInput(item.id);
  }
}

function handlePomoInputTouchStart(e: TouchEvent, item: Activity) {
  e.preventDefault();
  e.stopPropagation();
  clearPomoTapTimer(item.id);
}

function handlePomoInputTouchEnd(e: TouchEvent, item: Activity) {
  e.preventDefault();
  e.stopPropagation();
  const id = item.id;
  const now = Date.now();
  const last = pomoLastTapInfo.value;
  if (last && last.id === id && now - last.time < DOUBLE_CLICK_DELAY) {
    clearPomoTapTimer(id);
    pomoLastTapInfo.value = null;
    pomoShouldFocus.value.set(id, true);
    handleTogglePomoType(item);
    focusPomoInput(item.id);
    return;
  }
  pomoLastTapInfo.value = { id, time: now };
  clearPomoTapTimer(id);
  const t = window.setTimeout(() => {
    pomoLastTapInfo.value = null;
    pomoTapTimers.value.delete(id);
    focusPomoInput(item.id);
  }, DOUBLE_CLICK_DELAY);
  pomoTapTimers.value.set(id, t);
}

function handlePomoInputTouchCancel(item: Activity) {
  clearPomoTapTimer(item.id);
}
</script>

<style scoped>
.section-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: hidden;
  overflow-x: hidden;
  margin-left: 4px;
  margin-right: 2px;
}

.section-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  margin-bottom: 4px;
  overflow: hidden;
}

.section-header :deep(.n-input__input-el) {
  font-weight: bold;
}

.section-content-container {
  /* 预留纵向滚动条槽位，避免 overflow 时出现滚动条导致行内 flex 宽度被挤变窄 */
  scrollbar-gutter: stable;
  overflow-y: auto;
  overflow-x: hidden;
}

.activity-row {
  align-items: center;
  padding: 1px 0;
  gap: 0px;
  width: 100%;
  touch-action: pan-y;
}

.is-dragging-row {
  /* 确保它在视觉上浮起（可选） */
  z-index: 999;
  position: relative;
}

/* 确保普通行在手机上不会拦截滚动，除了 handle 区域 */
.activity-row {
  touch-action: pan-y;
}

.activity-content {
  position: relative;
}

.activity-content .child-activity {
  margin-left: 20px;
}

.child-activity-dot {
  position: absolute;
  left: 8px; /* inside the 20px margin */
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background: var(--color-text-secondary);
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s;
  z-index: 1;
}

.child-activity-dot:hover {
  background: var(--color-text-primary);
}
.activity-content {
  display: flex;
  flex-direction: row;
}
.tag-content {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  justify-content: left;
  padding: 2px;
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
  margin-right: 1px;
  transition: background-color 0.2s;
  position: relative;
}

.icon-drag-area:hover {
  background-color: var(--color-blue-light);
}

.icon-drag-area:active {
  cursor: grabbing;
  background-color: var(--color-red-light);
}

.icon-drag-area.has-children::before {
  content: "";
  position: absolute;
  left: -11px;
  bottom: -14px;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  transform: rotate(-135deg);
  transform-origin: 50% 50%;
  z-index: 1;
  cursor: pointer;
  background: var(--color-background-dark);
  display: block;
}

.icon-drag-area.has-children.is-collapsed::before {
  background: var(--color-background-dark-dark);
}

.icon-drag-area.has-children > * {
  position: relative;
  z-index: 1;
}

.icon-drag-area.has-children:hover::after {
  content: "";
  position: absolute;
  inset: 0;
  background-color: var(--color-blue-light);
  border-radius: 10px;
  z-index: 0;
  pointer-events: none;
  opacity: 0.7;
}

.icon-drag-area.has-children:active::after {
  content: "";
  position: absolute;
  inset: 0;
  background-color: var(--color-red-light);
  border-radius: 10px;
  z-index: 0;
  pointer-events: none;
  opacity: 0.7;
}

.icon-tag {
  display: flex;
  padding: 2px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.icon-tag:hover {
  cursor: pointer;
  background-color: var(--color-background-light);
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
  --n-box-shadow-focus: none !important;
  --n-border-hover: 1px solid var(--color-blue) !important;
}

.countdown-1 :deep(.n-input) {
  background: var(--color-background-light-transparent);
  --n-box-shadow-focus: none !important;
  --n-border-hover: 1px solid var(--color-blue) !important;
}
.countdown-2 :deep(.n-input) {
  background: var(--color-background-transparent);
  --n-box-shadow-focus: none !important;
  --n-border-hover: 1px solid var(--color-blue) !important;
}

.countdown-boom :deep(.n-input) {
  background: var(--color-blue-light-transparent);
  --n-box-shadow-focus: none !important;
  --n-border-hover: 1px solid var(--color-blue) !important;
}
.pomo-input :deep(.n-input__placeholder) {
  opacity: 0.45; /* 50% 透明度 */
  font-size: 10px;
}
.pomo-red {
  background: var(--color-background) !important;
}
/* .pomo-purple {
  background: var(--color-purple-light-transparent) !important;
}
.pomo-green {
  background: var(--color-green-light-transparent) !important;
} */

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
  background-color: var(--color-yellow-light) !important;
}

/* 选中行：内部控件背景透明，行黄底能透出（与 .countdown-* 用透明底一致） */
.highlight-line :deep(.n-input) {
  background: transparent !important;
  --n-box-shadow-focus: none !important;
  --n-border-hover: 1px solid var(--color-blue) !important;
}
.highlight-line :deep(.n-input-wrapper) {
  background: transparent !important;
}
.highlight-line :deep(.n-date-picker) {
  background: transparent !important;
  --n-box-shadow-focus: none !important;
}
.highlight-line :deep(.n-date-picker .n-input) {
  background: transparent !important;
}

/* 一个给n-date-picker 一个给n-input */
.input-focus-none :deep(.n-input) {
  --n-box-shadow-focus: none !important;
  --n-border-hover: none !important;
}

:deep(.n-input.input-focus-none) {
  --n-box-shadow-focus: none !important;
  --n-border-hover: none !important;
}

:deep(.n-button.section-button) {
  --n-border: none !important;
  --n-icon-size: 20px !important;
  --n-padding: 4px !important;
}

.search-input :deep(.n-input) {
  height: 34px !important;
  max-height: 34px !important;
}

.search-input :deep(.n-input-wrapper) {
  height: 34px !important;
  min-height: 34px !important;
}

.search-input :deep(.n-input__input-el) {
  height: 34px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  line-height: normal !important;
}

/* iPhone Safari：锁定输入区基线，避免清空后再输入时文字与光标下沉 */
@supports (-webkit-touch-callout: none) {
  .search-input :deep(.n-input),
  .search-input :deep(.n-input-wrapper) {
    height: 34px !important;
    min-height: 34px !important;
  }

  .search-input :deep(.n-input__input) {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .search-input :deep(.n-input__input-el) {
    height: 100% !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    font-size: 16px !important;
    line-height: 1.2 !important;
    text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
  }
}
</style>
