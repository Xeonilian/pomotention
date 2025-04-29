<template>  
  <div class="schedule-bar-container" ref="container">  
    <div  
      v-for="block in props.blocks"  
      :key="block.id"  
      :style="getVerticalBlockStyle(block)"  
      class="time-block"  
    >  

    </div>  
  </div>  
</template>  

<script setup lang="ts">  
import { ref, onMounted, onUnmounted,computed } from 'vue';  
import type { CSSProperties } from 'vue';  

interface Block {  
  id: string;  
  category: string;  
  start: number;  
  end: number;  
}  

const props = defineProps<{  
  blocks: Block[]  
}>();  

const categoryColors: Record<string, string> = {  
  living: '#4A90E2',  
  sleeping: '#7ED321',  
  working: '#D0021B',  
};  

const container = ref<HTMLElement | null>(null);  
const containerHeight = ref(400); // 默认高度 400px  

// 动态获取容器高度  
const updateHeight = () => {  
  if (container.value) {  
    containerHeight.value = container.value.clientHeight;  
  }  
};  

onMounted(() => {  
  console.log('容器 DOM:', container.value); // 检查是否为 null  
  updateHeight();  
  console.log('容器高度:', containerHeight.value); // 调试输出  
  window.addEventListener('resize', updateHeight);  
});  

onUnmounted(() => {  
  window.removeEventListener('resize', updateHeight);  
});  

// 计算最早开始时间和最晚结束时间  
const timeRange = computed(() => {  
  if (props.blocks.length === 0) {  
    return { start: 0, end: 0 };  
  }  
  const start = Math.min(...props.blocks.map(block => block.start));  
  const end = Math.max(...props.blocks.map(block => block.end));  
  return { start, end };  
});  

// 计算总时间跨度（分钟）  
const totalMinutes = computed(() => {  
  return (timeRange.value.end - timeRange.value.start) / (1000 * 60);  
});  

function getVerticalBlockStyle(block: { start: number; end: number; category: string }): CSSProperties {  
  const startDate = new Date(block.start);  
  const endDate = new Date(block.end);  
  const earliestDate = new Date(timeRange.value.start);  

  // 计算相对于最早开始时间的分钟数  
  const startMinute = (startDate.getTime() - earliestDate.getTime()) / (1000 * 60);  
  let endMinute = (endDate.getTime() - earliestDate.getTime()) / (1000 * 60);  

  // 处理跨天情况  
  if (endMinute < startMinute) {  
    endMinute += 1440; // 加上一天的分钟数（24*60）  
  }  

  const duration = endMinute - startMinute;  
  const pxPerMinute = containerHeight.value / totalMinutes.value;  

  const topPx = startMinute * pxPerMinute;  
  const heightPx = duration * pxPerMinute;   

  // 确保时间块不超出容器底部  
  const adjustedHeightPx = Math.min(heightPx, containerHeight.value - topPx);  

  return {  
    position: 'absolute',  
    top: topPx + 'px',  
    left: '0%',  
    transform: 'translateX(-50%)',  
    width: '30px',  
    height: adjustedHeightPx + 'px',  
    backgroundColor: categoryColors[block.category] || '#ccc',  
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
</script>  

<style scoped>  
.schedule-bar-container {  
  height: 100%; /* 或固定高度（如 400px） */  
  /* min-height: 400px;   */
  position: relative;  
  overflow: hidden; /* 禁止滚动条 */  
}  
</style>  