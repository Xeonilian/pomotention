<!-- 
  Component: TimeTableView.vue 
  Description: 从Home收取数据并分发，按钮
  Props:
  Children:
    - TimeTableEditor.vue
    - TimeBlocks.vue
 Parent: HomeView.vue
-->

<template>
  <div class="schedule-container">
    <!-- 1 按钮 -->
    <div class="schedule-view-button-container">
      <!-- 设置按钮 -->
      <n-button
        @click="toggleDisplay"
        secondary
        round
        strong
        type="default"
        class="schedule-button"
        >{{ buttonText }}</n-button
      >
      <n-button
        secondary
        circle
        type="info"
        :title="
          currentType === 'work' ? '切换到娱乐时间表' : '切换到工作时间表'
        "
        @click="toggleType"
      >
        {{ currentType === "work" ? "💼" : "🏕️" }}
      </n-button>
      <n-popconfirm
        @positive-click="emitReset(currentType)"
        negative-text="取消"
        positive-text="确定"
      >
        <template #trigger>
          <n-button
            secondary
            circle
            type="info"
            title="复位为默认时间表"
            style="margin-right: 8px"
          >
            <n-icon size="20">
              <ArrowReset48Filled />
            </n-icon>
          </n-button>
        </template>
        <span>确定要将当前时间表复位为默认吗？</span>
      </n-popconfirm>
    </div>
    <!-- 2 编辑区 -->
    <div v-if="showEditor" class="schedule-editor">
      <TimeTableEditor :blocks="props.blocks" @update-blocks="emitUpdate" />
    </div>
    <!-- 3 显示区 -->
    <div v-else class="schedule-time-block" ref="container">
      <TimeBlocks
        :blocks="props.blocks"
        :scheduleList="props.scheduleList"
        :todoList="props.todoList"
        :timeRange="timeRange"
        :effectivePxPerMinute="effectivePxPerMinute"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { NButton, NPopconfirm } from "naive-ui";
import { ArrowReset48Filled } from "@vicons/fluent";
import TimeTableEditor from "@/components/TimeTable/TimeTableEditor.vue";
import TimeBlocks from "@/components/TimeTable/TimeBlocks.vue";
import type { Block } from "@/core/types/Block";
import type { Todo } from "../../core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";

// 1 按钮
const showEditor = ref(false);
const buttonText = ref("设置时间表");

const toggleDisplay = () => {
  showEditor.value = !showEditor.value;
  buttonText.value = showEditor.value ? "确认时间表" : "设置时间表";
};

// 接收父级的数据
const props = defineProps<{
  blocks: Block[];
  currentType: "work" | "entertainment";
  todoList: Todo[];
  scheduleList: Schedule[];
}>();

// 发出事件给 Home
const emit = defineEmits<{
  (e: "update-blocks", blocks: Block[]): void;
  (e: "reset-schedule", type: "work" | "entertainment"): void;
  (e: "change-type", type: "work" | "entertainment"): void;
}>();

// 编辑器更新blocks回传到父级
function emitUpdate(newBlocks: Block[]) {
  emit("update-blocks", newBlocks);
}
function emitReset(type: "work" | "entertainment") {
  emit("reset-schedule", type);
}
// 切换时 emit
function toggleType() {
  const next = props.currentType === "work" ? "entertainment" : "work";
  emit("change-type", next);
}

// 高度和容器引用
const container = ref<HTMLElement | null>(null);
const containerHeight = ref(400);

const updateHeight = () => {
  if (container.value) {
    containerHeight.value = container.value.clientHeight;
    //console.log('容器高度:', containerHeight.value, '实际高度:', container.value.clientHeight)
  }
};

onMounted(() => {
  updateHeight();
  window.addEventListener("resize", updateHeight);
});

onUnmounted(() => window.removeEventListener("resize", updateHeight));

// watch blocks 更新时刷新高度
watch(props.blocks, () => {
  updateHeight();
});

// timeRange 计算 时间戳
const timeRange = computed(() => {
  if (props.blocks.length === 0) return { start: 0, end: 0 };
  const start = Math.min(...props.blocks.map((b) => b.start));
  const end = Math.max(...props.blocks.map((b) => b.end));
  return { start, end };
});

const totalMinutes = computed(
  () => (timeRange.value.end - timeRange.value.start) / (1000 * 60)
);

// 整体位移
const adjPara = ref(50);

const effectivePxPerMinute = computed(() => {
  if (totalMinutes.value <= 0) return 0;
  return (containerHeight.value - adjPara.value) / totalMinutes.value;
});

// 调试用
// watch(effectivePxPerMinute, (val) => {
//   console.log('实际像素分钟比:', val, '容器高度:', containerHeight.value, '总分钟数:', totalMinutes.value, 'adjPara:', adjPara.value);
// }, { immediate: true });
</script>

<style scoped>
.schedule-container {
  height: 100%;
  overflow: visible;
}

.schedule-editor {
  height: 100%;
  padding: 10px;
}

.schedule-time-block {
  margin: auto;
  position: relative;
  height: 100%;
}
.schedule-view-button-container {
  width: 100%;
  margin: auto;
  text-align: center;
  align-items: center;
  display: flex;
  justify-content: center;
  padding-top: 10px;
  text-align: center;
  flex-wrap: nowrap;
  gap: 10px;
}
</style>
