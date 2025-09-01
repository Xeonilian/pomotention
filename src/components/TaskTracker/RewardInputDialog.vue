<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="记录愉悦值"
    :on-after-leave="handleCancel"
    @keyup.enter="handleConfirm"
    @after-enter="focusSlider"
  >
    <n-space vertical>
      <n-slider
        v-model:value="rewardValue"
        :min="1"
        :max="10"
        :step="1"
        :marks="marks"
        ref="sliderRef"
      />
      <n-space justify="space-between">
        <n-text>当前愉悦值: {{ rewardValue }}</n-text>
        <n-button @click="showHelp = true">
          <template #icon>
            <n-icon><Beach24Regular /></n-icon>
          </template>
        </n-button>
      </n-space>
      <n-input
        v-model:value="description"
        placeholder="请输入内容"
        maxlength="40"
        show-count
      />
    </n-space>
    <template #action>
      <n-button @click="handleCancel">取消</n-button>

      <n-button type="primary" @click="handleConfirm">确认</n-button>
    </template>
  </n-modal>

  <n-modal v-model:show="showHelp" preset="dialog" title="愉悦值说明">
    <n-space vertical>
      <n-text>1-2: 并没有什么成就感</n-text>
      <n-text>3-4: 愉悦感较低</n-text>
      <n-text>5-6: 一般般，任务完成有点开心</n-text>
      <n-text>7-8: 任务完成很开心</n-text>
      <n-text>9-10: 极大满足，非常愉悦和成就</n-text>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { Beach24Regular } from "@vicons/fluent";
import { NModal, NSlider, NSpace, NText, NButton, NIcon } from "naive-ui";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "confirm", value: { value: number; description?: string }): void;
}>();

const rewardValue = ref(5);
const showHelp = ref(false);
const description = ref("");

const sliderRef = ref<any>(null);

async function focusSlider() {
  await nextTick();
  if (sliderRef.value?.focus) {
    sliderRef.value.focus();
  } else {
    const el: HTMLElement | null = sliderRef.value?.$el ?? sliderRef.value;
    el?.querySelector<HTMLElement>(
      '[tabindex], input, button, [role="slider"]'
    )?.focus();
  }
}

// 用于modal显示双向绑定
const showModal = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const marks = {
  1: "1",
  5: "5",
  10: "10",
};

const handleConfirm = () => {
  emit("confirm", {
    value: rewardValue.value,
    description: description.value.trim(),
  });
  description.value = "";
  emit("update:show", false);
};

const handleCancel = () => {
  description.value = "";
  emit("update:show", false);
};
</script>
