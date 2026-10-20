<!-- 点图标弹出 n-slider（1–10）。桌面跟 trigger；手机/窄屏居中，不跟图标定位 -->
<template>
  <template v-if="useCenteredPanel">
    <button
      type="button"
      class="lr-score-btn"
      :class="{ 'lr-score-btn--on': scored }"
      :title="scored ? `${title} ${modelValue}` : title"
      @click="open = true"
    >
      <n-icon v-if="icon" class="lr-score-btn__icon">
        <component :is="icon" />
      </n-icon>
      <span v-else-if="scored" class="lr-score-btn__num">{{ modelValue }}</span>
      <span v-else class="lr-score-btn__ph">—</span>
    </button>
    <n-modal v-model:show="open" :auto-focus="false" :trap-focus="false" :z-index="10000">
      <div class="lr-score-pop lr-score-pop--modal" @pointerdown.stop>
        <span class="lr-score-pop__label">{{ title }}</span>
        <n-slider :value="draft" :min="1" :max="10" :step="1" @update:value="onSlide" />
        <button type="button" class="lr-score-pop__clear" title="取消" @click="clear">
          <n-icon :size="16"><Dismiss20Regular /></n-icon>
        </button>
      </div>
    </n-modal>
  </template>
  <n-popover v-else v-model:show="open" trigger="click" :placement="placement" to="body" :z-index="10000" :show-arrow="true">
    <template #trigger>
      <button
        type="button"
        class="lr-score-btn"
        :class="{ 'lr-score-btn--on': scored }"
        :title="scored ? `${title} ${modelValue}` : title"
      >
        <n-icon v-if="icon" class="lr-score-btn__icon">
          <component :is="icon" />
        </n-icon>
        <span v-else-if="scored" class="lr-score-btn__num">{{ modelValue }}</span>
        <span v-else class="lr-score-btn__ph">—</span>
      </button>
    </template>
    <div class="lr-score-pop" @pointerdown.stop>
      <span class="lr-score-pop__label">{{ title }}</span>
      <n-slider :value="draft" :min="1" :max="10" :step="1" @update:value="onSlide" />
      <button type="button" class="lr-score-pop__clear" title="取消" @click="clear">
        <n-icon :size="16"><Dismiss20Regular /></n-icon>
      </button>
    </div>
  </n-popover>
</template>
<script setup lang="ts">
import type { Component } from "vue";
import { computed, ref, watch } from "vue";
import { Dismiss20Regular } from "@vicons/fluent";
import { NIcon, NModal, NPopover, NSlider } from "naive-ui";
import { useDevice } from "@/composables/platform/useDevice";

const props = withDefaults(
  defineProps<{
    modelValue?: number | null;
    title: string;
    icon?: Component;
    placement?: "top" | "bottom";
  }>(),
  { placement: "top" },
);
const emit = defineEmits<{ "update:modelValue": [value: number | null] }>();
const { isMobile, width } = useDevice();
/** 与账本弹出同一套：真机手机 + 窄屏预览居中，避免跟 trigger 歪出屏幕 */
const useCenteredPanel = computed(() => isMobile.value || width.value < 768);
const open = ref(false);
const scored = computed(() => props.modelValue != null && Number.isFinite(props.modelValue));
const draft = ref(5);
watch(open, (show) => {
  if (!show) return;
  if (scored.value) {
    draft.value = Number(props.modelValue);
    return;
  }
  draft.value = 5;
  emit("update:modelValue", 5);
});
function onSlide(v: number) {
  draft.value = v;
  emit("update:modelValue", v);
}
function clear() {
  emit("update:modelValue", null);
  open.value = false;
}
</script>
<style scoped>
.lr-score-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.lr-score-btn--on {
  color: var(--color-text-primary);
}
.lr-score-btn__icon {
  display: block;
  width: 28px;
  height: 28px;
  font-size: 28px;
  line-height: 0;
  color: inherit;
}
.lr-score-btn__icon :deep(svg) {
  width: 1em;
  height: 1em;
  display: block;
}
.lr-score-btn__num {
  font-size: 12px;
  font-weight: 400;
  font-family: Consolas, "Courier New", Courier, monospace;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  line-height: 1;
}
.lr-score-btn__ph {
  font-size: 12px;
  font-weight: 400;
  font-family: Consolas, "Courier New", Courier, monospace;
  color: var(--color-text-secondary);
  line-height: 1;
}
.lr-score-pop {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 248px;
  padding: 4px 8px;
  box-sizing: border-box;
}
.lr-score-pop--modal {
  width: min(320px, 92vw);
  margin: 0 auto;
  padding: 12px 16px;
  background: var(--color-background);
  border-radius: 8px;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.16);
}
.lr-score-pop__label {
  flex: 0 0 auto;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  color: var(--color-text-primary);
}
.lr-score-pop__clear {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.lr-score-pop__clear:hover {
  color: var(--color-text-primary);
}
.lr-score-pop :deep(.n-slider) {
  flex: 1 1 auto;
  min-width: 0;
  --n-fill-color: #111;
  --n-fill-color-hover: #111;
  --n-rail-color: #e6e6e6;
  --n-handle-color: #fff;
  --n-dot-border-active: #111;
}
</style>
