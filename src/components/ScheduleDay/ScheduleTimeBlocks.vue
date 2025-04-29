<template>  
  <div class="schedule-bar-container" ref="container">  
    <div  
      v-for="block in props.blocks"  
      :key="block.id"  
      :style="getVerticalBlockStyle(block)"  
      class="time-block"  
    >  
      {{ block.category }}  
    </div>  
  </div>  
</template>  

<script setup lang="ts">  
import { ref, onMounted, onUnmounted } from 'vue';  
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

function getVerticalBlockStyle(block: { start: number; end: number; category: string }): CSSProperties {  
  const startDate = new Date(block.start);  
  const endDate = new Date(block.end);  

  // 计算分钟数（支持跨天）  
  const startMinute = startDate.getHours() * 60 + startDate.getMinutes();  
  let endMinute = endDate.getHours() * 60 + endDate.getMinutes();  

  // 处理跨天的情况（例如 24:00 是次日的 0:00）  
  if (endDate.getDate() !== startDate.getDate()) {  
    endMinute += 1440; // 加上一天的分钟数（24*60）  
  }  

  const duration = endMinute - startMinute;   
  const pxPerMinute = containerHeight.value / 1440; // 动态计算每分钟像素高度  

  const topPx = startMinute * pxPerMinute;  
  const heightPx = duration * pxPerMinute;  

  // 确保时间块不超出容器底部  
  const adjustedHeightPx = Math.min(heightPx, containerHeight.value - topPx);  

  return {  
    position: 'absolute',  
    top: topPx + 'px',  
    left: '100%',  
    transform: 'translateX(-50%)',  
    width: '10px',  
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