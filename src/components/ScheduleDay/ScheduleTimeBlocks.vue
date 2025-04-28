<template>  
  <div class="time-axis-container">  
  <div  
    v-for="block in props.blocks"  
    :key="block.id"  
    :style="getVerticalBlockStyle(block)"  
    :title="`${block.category} ${minutesToTime(block.start)} - ${minutesToTime(block.end)}`"  
    class="time-block"  
  >  
    {{ block.category }}  
  </div>  
</div>  
</template>  
  
<script setup lang="ts">  
import { minutesToTime } from '../../core/utils'; // 确保路径正确  
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
  resting: '#7ED321',  
  working: '#D0021B',  
};  

function getVerticalBlockStyle(block: { start: number; end: number; category: string }): CSSProperties {  
  const startMinute = block.start;  
  const endMinute = block.end;  
  const duration = endMinute - startMinute;  
  const pxPerMinute = 720 / 1440; // 720px 表示全天24小时  

  const topPx = startMinute * pxPerMinute;  
  const heightPx = duration * pxPerMinute;  

  return {  
    position: 'absolute',  
    top: topPx + 'px',  
    left: '50%',  
    transform: 'translateX(-50%)',  
    width: '10px',  
    height: heightPx + 'px',  
    backgroundColor: categoryColors[block.category] || '#ccc',  
    color: '#fff',  
    fontSize: '10px',  
    textAlign: 'center',  
    lineHeight: heightPx + 'px',  
    userSelect: 'none',  
    borderRadius: '2px',  
    cursor: 'default',  
    overflow: 'hidden',  
    whiteSpace: 'nowrap',  
  } as CSSProperties;  
}  
 
</script>  
  
<style scoped>  
  
</style>  