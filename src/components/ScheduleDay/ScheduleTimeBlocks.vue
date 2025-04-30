<template>  
  <div class="schedule-bar-container" ref="container">  

    <!-- 小时刻度线背景 -->  
    <div class="hour-ticks-container">  
      <div  
        v-for="hourStamp in hourStamps"  
        :key="hourStamp"  
        class="hour-tick"  
        :style="{ top: getHourTickTop(hourStamp) + 'px' }"  
      >  
      <div class="tick-line"></div>  
      <span class="hour-label">{{ formatHour(hourStamp) }}</span>  

      </div>  
    </div>  

    <!-- 时间块 -->  
    <div  
      v-for="block in props.blocks"  
      :key="block.id"  
      :style="getVerticalBlockStyle(block)"  
      class="time-block"  
    >  
      {{ block.category }}  
    </div>  

    <!-- 当前时间指示线 -->  
    <div   
      v-if="showCurrentLine"   
      class="current-time-line"   
      :style="{ top: currentTimeTop + 'px' }"   
    />  
  </div>  
</template>  

<script setup lang="ts">  
import { ref, onMounted, onUnmounted, computed } from 'vue';  
import type { CSSProperties } from 'vue';  
import { CategoryColors } from '../../core/constants';  

interface Block {  
  id: string;  
  category: keyof typeof CategoryColors;  
  start: number;  
  end: number;  
}  

const props = defineProps<{  
  blocks: Block[]  
}>();  

const container = ref<HTMLElement | null>(null);  
const containerHeight = ref(400);  

const updateHeight = () => {  
  if (container.value) {  
    containerHeight.value = container.value.clientHeight;  
  }  
};  

onMounted(() => {  
  updateHeight();  
  window.addEventListener('resize', updateHeight);  
});  

onUnmounted(() => {  
  window.removeEventListener('resize', updateHeight);  
});  

const timeRange = computed(() => {  
  if (props.blocks.length === 0) {  
    return { start: 0, end: 0 };  
  }  
  const start = Math.min(...props.blocks.map(block => block.start));  
  const end = Math.max(...props.blocks.map(block => block.end));  
  return { start, end };  
});  

const totalMinutes = computed(() => {  
  return (timeRange.value.end - timeRange.value.start) / (1000 * 60);  
});  

const now = ref(Date.now());  

setInterval(() => {  
  now.value = Date.now();  
}, 60 * 1000);  

const currentTimeTop = computed(() => {  
  if (now.value < timeRange.value.start || now.value > timeRange.value.end) {  
    return -1;  
  }  
  const minutesFromStart = (now.value - timeRange.value.start) / (1000 * 60);  
  const pxPerMinute = containerHeight.value / totalMinutes.value;  
  return minutesFromStart * pxPerMinute;  
});  

const showCurrentLine = computed(() => currentTimeTop.value >= 0);  

function getVerticalBlockStyle(block: Block): CSSProperties {  
  const startDate = new Date(block.start);  
  const endDate = new Date(block.end);  
  const earliestDate = new Date(timeRange.value.start);  

  const startMinute = (startDate.getTime() - earliestDate.getTime()) / (1000 * 60);  
  let endMinute = (endDate.getTime() - earliestDate.getTime()) / (1000 * 60);  

  const duration = endMinute - startMinute;  
  const pxPerMinute = containerHeight.value / totalMinutes.value;  

  const topPx = startMinute * pxPerMinute;  
  const heightPx = duration * pxPerMinute;   
  const adjustedHeightPx = Math.min(heightPx, containerHeight.value - topPx);  

  return {  
    position: 'absolute',  
    top: topPx + 'px',  
    left: '0%',  
    transform: 'translateX(0%)',  
    width: '30px',  
    height: adjustedHeightPx + 'px',  
    backgroundColor: CategoryColors[block.category] || '#ccc',  
    color: '#fff',  
    fontSize: '10px',  
    textAlign: 'center',  
    lineHeight: adjustedHeightPx + 'px',  
    userSelect: 'none',  
    borderRadius: '2px',  
    cursor: 'default',  
    overflow: 'hidden',  
    whiteSpace: 'nowrap',  
  } as CSSProperties;  
}  

// 生成从最早时间到最晚时间的按小时时间戳数组  
const hourStamps = computed(() => {  
  if (!timeRange.value.start || !timeRange.value.end) return [];  

  const startHour = new Date(timeRange.value.start);  
  startHour.setMinutes(0, 0, 0); // 向下取整小时  

  const endHour = new Date(timeRange.value.end);  
  endHour.setMinutes(0, 0, 0);  

  const stamps = [];  
  let current = startHour.getTime();  
  while (current <= endHour.getTime()) {  
    stamps.push(current);  
    current += 1000 * 60 * 60; // 加一小时  
  }  
  return stamps;  
});  

// 计算小时刻度的top位置  
function getHourTickTop(timeStamp: number): number {  
  const pxPerMinute = containerHeight.value / totalMinutes.value;  
  const minutesFromStart = (timeStamp - timeRange.value.start) / (1000 * 60);  
  return minutesFromStart * pxPerMinute;  
}  

// 格式化小时标签，比如 "09:00"  
function formatHour(timeStamp: number): string {  
  const dt = new Date(timeStamp);  
  const hh = dt.getHours().toString().padStart(2, '0');  
  return `${hh}:00`;  
}  
</script>  

<style scoped>  
.schedule-bar-container {  
  padding-top: 14px;  /* 预留足够的顶部空间 */  
  position: relative;  
  overflow: hidden;  
  height: 100%;  
  margin-top: 10px;
}    

/* 小时刻度背景容器，放第一个，z-index最低 */  
.hour-ticks-container {  
  position: absolute;  
  left: 0;  
  top: 0;  
  width: 100%;  
  height: 100%;  
  pointer-events: none; /* 让背景不可交互 */  
  z-index: 1;  
}  

/* 确定宽度的容器 */
.hour-tick {  
  position: absolute;  
  left: 0;  
  width: 250px; /* 根据需要调整宽度 */  
  display: flex;  
  flex-direction: column;   /* 竖直排列 */  
  align-items: center;      /* 水平居中 */  
  user-select: none;  
}  

/* 看到的线 */
.tick-line {  
  height: 1px;  
  width: 240px;  
  background-color: #bbb;  
  margin-bottom: 2px;  
  flex-shrink: 0;  
}  

/* 看到的标签 */
.hour-label {  
  font-size: 10px;  
  line-height: 14px;  
  width: 240px;  
  text-align: right;  
  flex-shrink: 0;  
  color: #666;  
}  

/* 当前时间指示线 */  
.current-time-line {  
  position: absolute;  
  left: 0px;  
  width: 30px;  
  height: 1px;  
  background-color: rgb(241, 219, 21);  
  pointer-events: none;  
  z-index: 20;  
  
} 

.current-time-line::before {  
  content: "🍅";  
  position: absolute;  
  right: 3px;              /* 或者 left:0，根据你想放的位置 */  
  transform: translateY(-50%);  
  font-size: 16px;       /* Emoji大小 */  
  pointer-events: none;  
  user-select: none;  
}
</style>  