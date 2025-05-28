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
        secondary
        circle
        type="info"
        size="small"
        :disabled="showEditor"
        :title="
          currentType === 'work' ? '切换到娱乐时间表' : '切换到工作时间表'
        "
        @click="toggleType"
      >
        <template #icon>
          <n-icon>
            <Backpack24Regular v-if="currentType === 'work'" />
            <Beach24Regular v-else />
          </n-icon>
        </template>
      </n-button>
      <n-button
        @click="toggleDisplay"
        secondary
        circle
        type="default"
        size="small"
        class="schedule-button"
        :title="showEditor ? '完成编辑' : '开始编辑'"
      >
        <template #icon>
          <n-icon><Settings24Regular /></n-icon>
        </template>
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
            size="small"
            type="default"
            title="复位为默认时间表"
            strong
            :disabled="!showEditor"
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
      <TimeTableEditor
        v-if="showEditor"
        :blocks="props.blocks"
        @update-blocks="emitUpdate"
        :key="props.currentType + '-' + props.blocks.length"
        :current-type="props.currentType"
      />
    </div>
    <!-- 3 显示区 -->
    <div v-else class="schedule-time-block" ref="container">
      <TimeBlocks
        :blocks="props.blocks"
        :schedules="todaySchedules"
        :todos="todayTodos"
        :timeRange="timeRange"
        :effectivePxPerMinute="effectivePxPerMinute"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { NButton, NPopconfirm } from "naive-ui";
import {
  ArrowReset48Filled,
  Settings24Regular,
  Beach24Regular,
  Backpack24Regular,
} from "@vicons/fluent";
import TimeTableEditor from "@/components/TimeTable/TimeTableEditor.vue";
import TimeBlocks from "@/components/TimeTable/TimeBlocks.vue";
import type { Block } from "@/core/types/Block";
import type { Todo } from "../../core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import { getTimestampForTimeString } from "@/core/utils";

// 1 按钮
const showEditor = ref(false);

const toggleDisplay = () => {
  //console.log("准备进入编辑模式时的 currentType:", props.currentType);
  showEditor.value = !showEditor.value;
};

// 接收父级的数据
const props = defineProps<{
  blocks: Block[];
  currentType: "work" | "entertainment";
  todayTodos: Todo[];
  todaySchedules: Schedule[];
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

// 复位数据
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
  const start = Math.min(
    ...props.blocks.map((b) => getTimestampForTimeString(b.start))
  );
  const end = Math.max(
    ...props.blocks.map((b) => getTimestampForTimeString(b.end))
  );
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
// watch(
//   effectivePxPerMinute,
//   (val) => {
//     console.log(
//       "实际像素分钟比:",
//       val,
//       "容器高度:",
//       containerHeight.value,
//       "总分钟数:",
//       totalMinutes.value,
//       "adjPara:",
//       adjPara.value
//     );
//   },
//   { immediate: true }
// );

// watch(
//   timeRange,
//   (val) => {
//     console.log("timeRange changed:", val);
//     console.log("blocks:", props.blocks);
//   },
//   { immediate: true }
// );
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
  bottom: 5px;
}
.schedule-view-button-container {
  position: sticky;
  top: 0;
  z-index: 10;
  margin: 10px auto 10px auto; /* 水平居中+下方间距 */
  background-color: rgb(245, 245, 245);
  border-radius: 15px; /* 建议用像素，百分号效果容易变形 */
  width: 135px;
  height: 40px;
  display: flex; /* 加flex布局 */
  align-items: center; /* 垂直居中（高度方向） */
  justify-content: center; /* 水平居中内部内容 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); /* 如需要阴影 */
  gap: 8px;
}
</style>
