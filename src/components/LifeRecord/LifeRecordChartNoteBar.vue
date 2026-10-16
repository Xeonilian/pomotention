<!-- 图模式备注条：空时同色淡底；有字去掉底色。梦可点高。 -->
<template>
  <div
    class="lr-note-bar lr-chart__el"
    :class="[
      `lr-note-bar--${tone}`,
      {
        'lr-note-bar--empty': !hasText,
        'lr-note-bar--expanded': expanded,
      },
    ]"
  >
    <textarea
      v-if="expandable"
      ref="fieldRef"
      class="lr-note-bar__field"
      :value="modelValue"
      :placeholder="placeholder"
      rows="4"
      @focus="onFocus"
      @input="onInput"
      @blur="onBlur"
    />
    <input
      v-else
      ref="fieldRef"
      class="lr-note-bar__field"
      :value="modelValue"
      :placeholder="placeholder"
      @focus="onFocus"
      @input="onInput"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, ref } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder: string;
    tone: "eat" | "toilet" | "sleep";
    expandable?: boolean;
  }>(),
  { expandable: false },
);
const emit = defineEmits<{
  "update:modelValue": [value: string];
  activate: [];
  expand: [];
  collapse: [];
}>();

const fieldRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
const innerOpen = ref(false);
const hasText = computed(() => props.modelValue.trim().length > 0);
const expanded = computed(() => props.expandable && innerOpen.value);

function onFocus() {
  emit("activate");
  if (props.expandable && !innerOpen.value) {
    innerOpen.value = true;
    emit("expand");
  }
}
function onInput(e: Event) {
  emit("update:modelValue", (e.target as HTMLInputElement | HTMLTextAreaElement).value);
}
function onBlur() {
  if (!props.expandable) return;
  innerOpen.value = false;
  emit("collapse");
}

defineExpose({
  focus() {
    if (props.expandable && !innerOpen.value) {
      innerOpen.value = true;
      emit("expand");
    }
    void nextTick(() => fieldRef.value?.focus({ preventScroll: true }));
  },
});
</script>
<style scoped>
.lr-note-bar {
  left: 50%;
  top: calc(50% + var(--f) + 28px);
  width: calc(var(--a) + var(--c) + var(--icon-size));
  min-height: 28px;
  transform: translate(-50%, 0);
  border-radius: 6px;
  box-sizing: border-box;
  overflow: hidden;
}
.lr-note-bar--expanded {
  min-height: 88px;
}
.lr-note-bar--empty.lr-note-bar--eat {
  background: oklch(0.82 0.18 22 / 0.28);
}
.lr-note-bar--empty.lr-note-bar--toilet {
  background: oklch(0.78 0.04 280 / 0.22);
}
.lr-note-bar--empty.lr-note-bar--sleep {
  background: oklch(0.92 0.1 95 / 0.32);
}
.lr-note-bar__field {
  display: block;
  width: 100%;
  height: 28px;
  margin: 0;
  padding: 4px 8px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  resize: none;
  font-style: italic;
}
.lr-note-bar__field::placeholder {
  font-style: italic;
}
.lr-note-bar:not(.lr-note-bar--expanded) .lr-note-bar__field {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lr-note-bar--expanded .lr-note-bar__field {
  height: 88px;
  text-align: left;
  line-height: 1.4;
  white-space: pre-wrap;
}
</style>
