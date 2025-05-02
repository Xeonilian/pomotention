<template>  
    <div class="mark-container" ref="container" style="position: relative; height: 400px; border: 1px solid #ccc;">  
      <!-- 显示 emoji -->  
      <div  
        v-for="block in blocks"  
        :key="block.id"  
        class="emoji-mark"  
        :style="{  
          position: 'absolute',  
          top: getEmojiTop(block.start) + 'px',  
          left: '10px',  

          fontSize: '24px',
 
        }"  
      >  
        {{ block.label || '⭐' }}  
      </div>  
    </div>  
  </template>  
  
  <script setup lang="ts">  

  // BUG 20250502 需要传递进来的是  timeRange, pxPerMinute
  import { ref } from 'vue';  
  import { useScheduleBase } from './useScheduleBase';  
  import { getTimestampForTimeString } from '../../core/utils';  
  
  interface Block {  
    id: string;  
    category: string;  
    start: number;  
    end: number;  
    label?: string;  
  }  
  
  // 固定的测试时间块，start 和 end 一样，表示一个时间点  
  const blocks: Block[] = [  
    { id: '1', category: 'work', start: getTimestampForTimeString('07:00'), end: getTimestampForTimeString('07:00'), label: '🍇' },  
  ];  
  
  const container = ref<HTMLElement | null>(null);  
  
  const { timeRange, pxPerMinute } = useScheduleBase(blocks, container);  
  console.log(pxPerMinute.value)
  // 计算定位emoji的top位置  
  function getEmojiTop(timeStamp: number) {  
  if (!timeRange.value.start) return 0;  

  const minutesFromStart = (timeStamp - timeRange.value.start) / (1000 * 60);  

  const topPx = minutesFromStart * pxPerMinute.value;  

  console.log('getEmojiTop:', {  
    timeStamp: new Date(timeStamp).toLocaleTimeString(),  
    minutesFromStart,  
    pxPerMinute: pxPerMinute.value,  
    topPx,  
  });  

  return topPx;  
}  
  </script>  
  
  <style scoped>  
  .mark-container {  
    width: 200px;  
    overflow: visible;  
    /* 你可以根据需要调整样式 */  
  }  
  .emoji-mark {  
    /* 额外样式，例如阴影或动画 */  
    user-select: none;  
    position: absolute;  
    z-index: 10; /* 大于默认即在上层 */  
  }  
  </style>  