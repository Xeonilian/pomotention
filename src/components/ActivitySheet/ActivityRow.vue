<!-- 单行活动：标题列与番茄列交互在本组件内 -->
<template>
  <div
    class="activity-row"
    :data-row-id="item.id"
    :class="{
      'highlight-line': isHighlighted,
      'is-dragging-row': isDraggingRow,
    }"
  >
    <div class="activity-content">
      <span
        v-if="item.parentId"
        class="child-activity-dot"
        @click.stop="$emit('collapse-parent', item.parentId!)"
        title="点击收起父项"
      ></span>
      <n-input
        :ref="setTitleInputRef"
        :value="item.title"
        type="text"
        :readonly="isMobile && !titleEditAllowed"
        :placeholder="item.isUntaetigkeit ? '无所事事' : '任务描述'"
        style="flex: 1"
        @update:value="onTitleValueUpdate"
        @keydown="handleInputKeydown"
        @focus="handleTitleInputFocus"
        @blur="handleTitleBlur"
        @touchstart.stop="handleTitleTouchStart"
        @touchend.stop="handleTitleTouchEnd"
        @touchcancel.stop="handleTitleTouchCancel"
        :class="{
          'force-hover': isHoveredRow,
          'child-activity': item.parentId,
        }"
        class="input-focus-none"
      >
        <template #prefix>
          <div
            class="icon-drag-area"
            :class="{ 'has-children': hasChildrenFlag, 'is-collapsed': isCollapsed }"
            style="touch-action: none; cursor: grab"
            @pointerdown.prevent.stop="$emit('drag-start', $event)"
            @mousedown.prevent.stop
            @touchstart.stop
            :title="dragAreaTitle"
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
            class="icon-tag"
            title="显示/隐藏本行标签"
            @click.stop="handleTagIconClick"
            @pointerdown.stop
            @mousedown.prevent.stop
            @touchstart.stop
            @touchend.stop
            @touchcancel.stop
          >
            <Tag16Regular />
          </n-icon>
        </template>
      </n-input>
      <TagPickerPopover
        ref="tagPickerRef"
        :show="tagPopoverOpen"
        @update:show="
          (open: boolean) => {
            if (!open) tagEditor.closePopover();
          }
        "
        v-model:search-term="tagSearchTermWritable"
        input-mode="external"
        placement="bottom-end"
        :teleport-disabled="true"
        :popover-style="{ '--n-space': '0px' }"
        @select-tag="handleTagSelected"
        @create-tag="handleTagCreate"
      >
        <template #trigger>
          <span style="position: absolute; pointer-events: none"></span>
        </template>
      </TagPickerPopover>

      <!-- 地点 -->
      <n-input
        v-if="item.class === 'S'"
        v-model:value="item.location"
        style="max-width: 50px"
        class="input-focus-none"
        @focus="notifyRowFocused(item.id)"
        @blur="onSectionFieldBlur"
        placeholder="地点"
        :class="{ 'force-hover': isHoveredRow }"
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
        :ref="setPomoInputRef"
        maxlength="1"
        :value="pomoDisplayValue"
        :placeholder="item.pomoType"
        :title="pomoInputTitleText"
        style="max-width: 32px"
        class="pomo-input input-focus-none"
        :readonly="item.pomoType === '🍒'"
        @update:value="onInputUpdate"
        @focus="handlePomoInputFocus"
        @blur="onSectionFieldBlur"
        @mousedown.stop="handlePomoInputMouseDown"
        @touchstart.stop="handlePomoInputTouchStart"
        @touchend.stop="handlePomoInputTouchEnd"
        @touchcancel.stop="handlePomoInputTouchCancel"
        :class="{
          'pomo-red': item.pomoType === '🍅',
          'pomo-purple': item.pomoType === '🍇',
          'pomo-green': item.pomoType === '🍒',
          'input-center': true,
          'force-hover': isHoveredRow,
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
        @focus="notifyRowFocused(item.id)"
        @blur="onSectionFieldBlur"
        title="持续时间(分钟)"
        placeholder="min"
        class="input-center input-min input-focus-none"
        :class="{ 'force-hover': isHoveredRow }"
      />

      <!-- 日期选择 -->
      <n-date-picker
        v-if="item.class === 'T'"
        v-model:value="item.dueDate"
        type="date"
        clearable
        style="max-width: 63px"
        format="MM/dd"
        @focus="notifyRowFocused(item.id)"
        @blur="onSectionFieldBlur"
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
        @focus="notifyRowFocused(item.id)"
        @blur="onSectionFieldBlur"
        title="约定时间"
        :class="getCountdownClass(item.dueRange && item.dueRange[0])"
        placeholder="时间"
        class="input-focus-none"
      />
    </div>

    <!-- tag显示 -->
    <div
      v-if="item.tagIds && item.tagIds.length > 0 && showTagStrip"
      class="tag-content"
      :class="{ 'child-activity-tag': item.parentId }"
    >
      <TagRenderer
        :tag-ids="item.tagIds"
        :isCloseable="true"
        @remove-tag="handleRemoveTag"
        class="tagRenderer-container"
        :display-length="3"
        size="tiny"
      />
    </div>
  </div>
</template>

<script lang="ts">
import type { InjectionKey, Ref } from "vue";
import { useActivityTagEditor } from "@/composables/useActivityTagEditor";

/** ActivitySection provide → ActivityRow inject */
export type ActivitySectionRowInject = {
  tagEditor: ReturnType<typeof useActivityTagEditor>;
  blurSearchInput: () => void;
  notifyRowFocused: (rowId: number) => void;
  scrollTitleRowIntoView: (rowId: number) => void;
  registerTitleEditBlur: (rowId: number, blur: () => void) => () => void;
  blurOtherTitleEditingRows: (exceptRowId: number) => void;
  isMobile: Ref<boolean>;
  isTouchSupported: boolean;
  onSectionFieldBlur: () => void;
};

export const activitySectionRowInjectKey: InjectionKey<ActivitySectionRowInject> = Symbol(
  "activitySectionRowInject",
);
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref } from "vue";
import { NInput, NDatePicker, NIcon } from "naive-ui";
import {
  VideoPersonCall24Regular,
  ApprovalsApp24Regular,
  CalendarCheckmark20Regular,
  Cloud24Regular,
  Chat24Regular,
  Tag16Regular,
} from "@vicons/fluent";
import type { Activity } from "@/core/types/Activity";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";
import { storeToRefs } from "pinia";
import { togglePomoType } from "@/services/activityService";
import TagRenderer from "../TagSystem/TagRenderer.vue";
import TagPickerPopover from "../TagSystem/TagPickerPopover.vue";
import type { InputInst } from "naive-ui";

const props = defineProps<{
  item: Activity;
  activityId: number | null;
  activeId?: number | null | undefined;
  isDraggingRow: boolean;
  isHoveredRow: boolean;
  hasChildrenFlag: boolean;
  isCollapsed: boolean;
  showTagStrip: boolean;
  getCountdownClass: (dueDate: number | undefined | null) => string;
  dragAreaTitle: string;
}>();

defineEmits<{
  "collapse-parent": [parentId: number];
  "drag-start": [event: PointerEvent];
}>();

const ctx = inject(activitySectionRowInjectKey)!;
const tagEditor = ctx.tagEditor;
const isMobile = ctx.isMobile;
const notifyRowFocused = (rowId: number) => ctx.notifyRowFocused(rowId);
const onSectionFieldBlur = () => ctx.onSectionFieldBlur();

const settingStore = useSettingStore();
const dataStore = useDataStore();
const { activityById } = storeToRefs(dataStore);

const titleInputRef = ref<InputInst | null>(null);
const pomoInputRef = ref<InputInst | null>(null);
const tagPickerRef = ref<InstanceType<typeof TagPickerPopover> | null>(null);

const titleEditAllowed = ref(false);

const tagSearchTermWritable = computed({
  get: () => tagEditor.tagSearchTerm.value,
  set: (v: string) => {
    tagEditor.tagSearchTerm.value = v;
  },
});

const tagPopoverOpen = computed(() => tagEditor.popoverTargetId.value === props.item.id);

const pomoInputTitleText = "单击修改数量 | 双击切换类型";

const DOUBLE_CLICK_DELAY = 300;
const TOGGLE_DEBOUNCE = 100;

const pomoDoubleClickTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const pomoTapTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const pomoLastTapAt = ref<number>(0);
const pomoShouldFocus = ref(false);
const pomoToggleTimer = ref<ReturnType<typeof setTimeout> | null>(null);

function setTitleInputRef(el: unknown) {
  titleInputRef.value = (el as InputInst | null) ?? null;
}

function setPomoInputRef(el: unknown) {
  pomoInputRef.value = (el as InputInst | null) ?? null;
}

let unregisterTitleBlur: (() => void) | undefined;
onMounted(() => {
  unregisterTitleBlur = ctx.registerTitleEditBlur(props.item.id, () => {
    titleEditAllowed.value = false;
    const inst = titleInputRef.value;
    if (!inst) return;
    if (typeof inst.blur === "function") inst.blur();
    else inst.inputElRef?.blur?.();
  });
});
onUnmounted(() => unregisterTitleBlur?.());

function focusTitleInput() {
  nextTick(() => {
    const inst = titleInputRef.value;
    if (!inst) return;
    const el = (inst as { inputElRef?: HTMLInputElement | null }).inputElRef;
    if (el?.focus) {
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    } else if (typeof inst.focus === "function") {
      try {
        (inst.focus as (o?: FocusOptions) => void)({ preventScroll: true });
      } catch {
        inst.focus();
      }
    }
    ctx.scrollTitleRowIntoView(props.item.id);
  });
}

function onTitleValueUpdate(v: string) {
  props.item.title = v;
  tagEditor.handleTitleInput(props.item.id, String(v ?? ""));
  props.item.synced = false;
  props.item.lastModified = Date.now();
}

function handleTitleInputFocus() {
  if (isMobile.value && !titleEditAllowed.value) {
    nextTick(() => {
      const inst = titleInputRef.value;
      if (!inst) return;
      if (typeof inst.blur === "function") inst.blur();
      else inst.inputElRef?.blur?.();
    });
    return;
  }
  notifyRowFocused(props.item.id);
  if (isMobile.value && titleEditAllowed.value) {
    ctx.scrollTitleRowIntoView(props.item.id);
  }
}

function handleTitleBlur() {
  if (isMobile.value) titleEditAllowed.value = false;
  onSectionFieldBlur();
}

function handleTitleTouchStart(e: TouchEvent) {
  if (!isMobile.value) return;
  const t = e.target;
  if (t instanceof Element && t.closest(".icon-tag")) return;
  e.preventDefault();
}

function handleTitleTouchEnd(e: TouchEvent) {
  if (!isMobile.value) return;
  const t = e.target;
  if (t instanceof Element && t.closest(".icon-tag")) return;
  e.preventDefault();
  ctx.blurOtherTitleEditingRows(props.item.id);
  ctx.blurSearchInput();
  titleEditAllowed.value = true;
  focusTitleInput();
}

function handleTitleTouchCancel() {
  if (!isMobile.value) return;
}

function handleInputKeydown(event: KeyboardEvent) {
  if (tagEditor.shouldShowPopoverFor(props.item.id) && tagPickerRef.value) {
    tagPickerRef.value.handleHostKeydown(event);
  }

  if (isMobile.value && event.key === "Enter") {
    event.preventDefault();
    const input = titleInputRef.value;
    if (input) {
      if (typeof input.blur === "function") input.blur();
      else input.inputElRef?.blur?.();
    }
    return;
  }

  if ((event.key === "#" || event.key === "@") && !tagEditor.popoverTargetId.value) {
    tagEditor.popoverTargetId.value = props.item.id;
  }
}

function handleTagIconClick() {
  const map = settingStore.settings.activityRowTagStripVisible;
  const cur = map[props.item.id] !== false;
  if (cur) map[props.item.id] = false;
  else delete map[props.item.id];
}

function handleTagSelected(tagId: number) {
  const cleanedTitle = tagEditor.selectTagFromPopover(props.item.id, tagId, props.item.title);
  props.item.title = cleanedTitle;
  props.item.synced = false;
  props.item.lastModified = Date.now();
}

function handleTagCreate(tagName: string) {
  const cleanedTitle = tagEditor.createTagFromPopover(props.item.id, tagName, props.item.title);
  props.item.title = cleanedTitle;
  props.item.synced = false;
  props.item.lastModified = Date.now();
}

function handleRemoveTag(tagId: number) {
  tagEditor.quickRemoveTag(props.item.id, tagId);
}

const isHighlighted = computed(() => props.item.id === props.activityId || props.item.id === props.activeId);

const pomoDisplayValue = computed(() => {
  const item = props.item;
  if (item.pomoType === "🍒") return "4";
  return typeof item.estPomoI === "string" ? item.estPomoI : "";
});

function onInputUpdate(value: string) {
  const item = props.item;
  if (item.pomoType === "🍒") {
    item.estPomoI = "4";
    return;
  }
  item.estPomoI = value;
  item.synced = false;
  item.lastModified = Date.now();
}

function clearPomoTapTimer() {
  const t = pomoTapTimer.value;
  if (t) {
    clearTimeout(t);
    pomoTapTimer.value = null;
  }
}

function focusPomoInput() {
  pomoShouldFocus.value = true;
  const input = pomoInputRef.value;
  if (input) {
    nextTick(() => {
      if (typeof input.focus === "function") input.focus();
      else input.inputElRef?.focus?.();
      pomoShouldFocus.value = false;
    });
  }
}

function handlePomoInputFocus() {
  if (pomoShouldFocus.value) {
    notifyRowFocused(props.item.id);
  } else {
    const input = pomoInputRef.value;
    if (input) input.blur();
  }
}

function handleTogglePomoType() {
  if (pomoToggleTimer.value) clearTimeout(pomoToggleTimer.value);
  pomoToggleTimer.value = setTimeout(() => {
    togglePomoType(props.item.id, { activityById: activityById.value });
    pomoToggleTimer.value = null;
  }, TOGGLE_DEBOUNCE);
}

function handlePomoInputMouseDown(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  const timer = pomoDoubleClickTimer.value;
  if (timer) {
    clearTimeout(timer);
    pomoDoubleClickTimer.value = null;
    pomoShouldFocus.value = true;
    handleTogglePomoType();
    return;
  }

  if (!ctx.isTouchSupported) {
    pomoDoubleClickTimer.value = setTimeout(() => {
      pomoDoubleClickTimer.value = null;
      focusPomoInput();
    }, DOUBLE_CLICK_DELAY);
  } else {
    focusPomoInput();
  }
}

function handlePomoInputTouchStart(e: TouchEvent) {
  e.preventDefault();
  e.stopPropagation();
  clearPomoTapTimer();
}

function handlePomoInputTouchEnd(e: TouchEvent) {
  e.preventDefault();
  e.stopPropagation();
  const now = Date.now();
  if (now - pomoLastTapAt.value < DOUBLE_CLICK_DELAY) {
    clearPomoTapTimer();
    pomoLastTapAt.value = 0;
    pomoShouldFocus.value = true;
    handleTogglePomoType();
    focusPomoInput();
    return;
  }
  pomoLastTapAt.value = now;
  clearPomoTapTimer();
  pomoTapTimer.value = setTimeout(() => {
    pomoTapTimer.value = null;
    pomoLastTapAt.value = 0;
    focusPomoInput();
  }, DOUBLE_CLICK_DELAY);
}

function handlePomoInputTouchCancel() {
  clearPomoTapTimer();
}
</script>

<style scoped>
.activity-row {
  align-items: center;
  padding: 1px 0;
  gap: 0px;
  width: 100%;
  touch-action: pan-y;
}

.is-dragging-row {
  z-index: 999;
  position: relative;
}

.activity-content {
  position: relative;
  display: flex;
  flex-direction: row;
}

.activity-content .child-activity {
  margin-left: 20px;
}

.child-activity-dot {
  position: absolute;
  left: 8px;
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
  opacity: 0.45;
  font-size: 10px;
}
.pomo-red {
  background: var(--color-background) !important;
}

.input-center :deep(.n-input__input) {
  text-align: center;
  color: var(--color-text-primary) !important;
  opacity: 1 !important;
}

.input-clear-disabled :deep(.n-input__input-el[disabled]) {
  color: var(--color-text-primary) !important;
  opacity: 1 !important;
  -webkit-text-fill-color: var(--color-text-primary) !important;
}

.highlight-line {
  background-color: var(--color-yellow-light) !important;
}

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

.input-focus-none :deep(.n-input) {
  --n-box-shadow-focus: none !important;
  --n-border-hover: none !important;
}

:deep(.n-input.input-focus-none) {
  --n-box-shadow-focus: none !important;
  --n-border-hover: none !important;
}
</style>
