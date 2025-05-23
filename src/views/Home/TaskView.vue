<!-- TaskView.vue -->
<template>
  <div>
    <div class="draggable-container" ref="draggableContainer">
      <PomodoroView v-if="showPomodoroView" :showPomoSeq="showPomoSeq" />
    </div>
    <!-- <div class="task-id-display">
      {{ selectedTaskId !== null ? selectedTaskId : "无记录" }}
    </div> -->
    <TaskButtons
      :taskId="selectedTaskId"
      @energy-record="handleEnergyRecord"
      @reward-record="handleRewardRecord"
      @interruption-record="handleInterruptionRecord"
    />
  </div>
</template>

<script setup lang="ts">
import PomodoroView from "./PomodoroView.vue";
import TaskButtons from "@/components/TaskTracker/TaskButtons.vue";
import { ref, onMounted, onUnmounted } from "vue";

defineProps<{
  showPomoSeq: boolean;
  showPomodoroView: boolean;
  selectedTaskId: number | null;
}>();

const emit = defineEmits<{
  (e: "energy-record"): void;
  (e: "reward-record"): void;
  (e: "interruption-record"): void;
}>();

// 处理能量记录
function handleEnergyRecord() {
  emit("energy-record");
}

// 处理奖赏记录
function handleRewardRecord() {
  emit("reward-record");
}

// 处理打扰记录
function handleInterruptionRecord() {
  emit("interruption-record");
}

// 移动Timer的位置
const draggableContainer = ref<HTMLElement | null>(null);
let isDragging = false;
let startX = 0;
let startY = 0;
let initialX = 0;
let initialY = 0;

function handleMouseDown(e: MouseEvent) {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  if (draggableContainer.value) {
    const rect = draggableContainer.value.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging || !draggableContainer.value) return;

  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;

  draggableContainer.value.style.left = `${initialX + deltaX}px`;
  draggableContainer.value.style.top = `${initialY + deltaY}px`;
}

function handleMouseUp() {
  isDragging = false;
}

onMounted(() => {
  if (draggableContainer.value) {
    draggableContainer.value.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }
});

onUnmounted(() => {
  if (draggableContainer.value) {
    draggableContainer.value.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }
});
</script>

<style scoped>
.draggable-container {
  position: fixed;
  z-index: 1000;
  cursor: move;
  user-select: none;
  background: rgba(255, 255, 255, 0);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(255, 255, 255, 0.1);
  transition: box-shadow 0.3s ease;
}

.draggable-container:hover {
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15);
}
</style>
