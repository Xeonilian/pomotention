<template>
  <n-popover
    v-model:show="show"
    trigger="manual"
    :placement="placement"
    :show-arrow="showArrow"
    :trap-focus="false"
    :to="teleportTo"
    :z-index="zIndex"
    :style="mergedPopoverStyle"
  >
    <template #trigger>
      <span ref="triggerWrapRef" class="tag-picker__trigger">
        <slot name="trigger" />
      </span>
    </template>
    <div
      ref="panelRef"
      class="tag-picker-panel"
      @pointerdown="onPanelPointerInteraction"
      @mousedown="onPanelPointerInteraction"
      @touchstart="onPanelPointerInteraction"
    >
      <!-- 内置搜索：Home 筛选等；#/@ 场景用 external，搜索由宿主输入同步 -->
      <n-input
        v-if="inputMode === 'internal'"
        ref="filterInputRef"
        v-model:value="searchTerm"
        size="small"
        clearable
        :placeholder="internalInputPlaceholder"
        class="tag-picker-panel__search tag-picker-panel__search--quiet"
        @keydown="handleHostKeydown"
      />
      <!-- 列表滚动统一在外层 + scrollbar-gutter，避免 internal/external 下滚动条与行宽错位 -->
      <div class="tag-picker-panel__list-shell">
        <TagSelector
          ref="tagSelectorRef"
          :search-term="searchTerm"
          :allow-create="allowCreate"
          embed-in-scroll-parent
          @select-tag="(id: number) => emit('select-tag', id)"
          @create-tag="(name: string) => emit('create-tag', name)"
          @close-selector="onCloseSelector"
        />
      </div>
    </div>
  </n-popover>
</template>

<script setup lang="ts">
// 统一标签浮层：内外部搜索、键盘、外部点击；列表仍用 TagSelector
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import type { InputInst, PopoverProps } from "naive-ui";
import TagSelector from "./TagSelector.vue";

const show = defineModel<boolean>("show", { required: true });
const searchTerm = defineModel<string>("searchTerm", { required: true });

const props = withDefaults(
  defineProps<{
    /** internal：弹层内 n-input；external：仅列表，词由宿主 #/@ 同步 */
    inputMode?: "internal" | "external";
    allowCreate?: boolean;
    placement?: PopoverProps["placement"];
    showArrow?: boolean;
    zIndex?: number;
    /** 为 true 时不 teleport（与 Activity 行内一致） */
    teleportDisabled?: boolean;
    /** 合并进 n-popover 的 style */
    popoverStyle?: Record<string, string | number>;
    internalInputPlaceholder?: string;
    /** DayTodo：点选标签时阻止标题 blur 误触 save */
    panelPointerGuard?: () => void;
    /** DayTodo：Enter 选中前标记，避免 keyup 触发 saveEdit */
    onEnterBeforeSelect?: () => void;
  }>(),
  {
    inputMode: "external",
    allowCreate: true,
    placement: "bottom-start",
    showArrow: false,
    teleportDisabled: false,
    internalInputPlaceholder: "筛选标签…",
  },
);

const emit = defineEmits<{
  "select-tag": [id: number];
  "create-tag": [name: string];
}>();

const teleportTo = computed(() => (props.teleportDisabled ? false : undefined));

const mergedPopoverStyle = computed(() => ({
  padding: 0,
  borderRadius: "6px",
  ...props.popoverStyle,
}));

const triggerWrapRef = ref<HTMLSpanElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const tagSelectorRef = ref<InstanceType<typeof TagSelector> | null>(null);
const filterInputRef = ref<InputInst | null>(null);

function onCloseSelector() {
  show.value = false;
}

function onPanelPointerInteraction(e: Event) {
  if (!props.panelPointerGuard) return;
  props.panelPointerGuard();
  e.stopPropagation();
}

function handleHostKeydown(event: KeyboardEvent) {
  if (!show.value || !tagSelectorRef.value) return;
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
      props.onEnterBeforeSelect?.();
      tagSelectorRef.value.selectHighlighted();
      event.preventDefault();
      break;
    case "Escape":
      show.value = false;
      event.preventDefault();
      break;
    default:
      break;
  }
}

defineExpose({
  /** 宿主 n-input 上委托，与内置输入共用一套方向键/Enter/Escape */
  handleHostKeydown,
});

watch(show, (open) => {
  if (open && props.inputMode === "internal") {
    nextTick(() => filterInputRef.value?.focus());
  }
});

function handlePointerDownCapture(e: PointerEvent) {
  if (!show.value) return;
  const path = (typeof e.composedPath === "function" ? e.composedPath() : []) as EventTarget[];
  const inPanel = panelRef.value != null && path.some((n) => n instanceof Node && panelRef.value!.contains(n));
  const inTrigger = triggerWrapRef.value != null && path.some((n) => n instanceof Node && triggerWrapRef.value!.contains(n));
  if (!inPanel && !inTrigger) {
    show.value = false;
  }
}

watch(
  show,
  (next) => {
    if (next) {
      window.addEventListener("pointerdown", handlePointerDownCapture, true);
    } else {
      window.removeEventListener("pointerdown", handlePointerDownCapture, true);
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  window.removeEventListener("pointerdown", handlePointerDownCapture, true);
});
</script>

<style scoped>
.tag-picker__trigger {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

/* 与 TagSelector.vue 列表宽度一致，避免 internal 模式下 input 撑破浮层 */
.tag-picker-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 160px;
  max-width: 160px;
  min-width: 0;
  box-sizing: border-box;
}

.tag-picker-panel__search {
  padding: 4px 4px 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  /* 与 __list-shell 同预留右侧槽位，否则 input 会对齐到滚动条外缘 */
  scrollbar-gutter: stable;
}

.tag-picker-panel__search :deep(.n-input-wrapper) {
  width: 100%;
}

/* internal 搜索：去掉焦点外发光环（主题里的 --n-box-shadow-focus） */
:deep(.n-input.tag-picker-panel__search--quiet),
:deep(.n-input-wrapper.tag-picker-panel__search--quiet) {
  --n-box-shadow-focus: none !important;
  --n-border: none !important;
  --n-border-focus: none !important;
}

.tag-picker-panel__list-shell {
  max-height: 240px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

</style>
