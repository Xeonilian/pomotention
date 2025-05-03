// SchedualTimeBlocks.vue
<template>  
  <div class="schedule-bar-container">  
    <!-- HACK 只有在这里引用能成功不能从父组件传入 -->  
    <!-- 小时刻度线背景 -->  
    <div class="hour-ticks-container">  
      <div  
        v-for="(hourStamp, index) in hourStamps"  
        :key="hourStamp"  
        class="hour-tick"  
        :style="{ top: getHourTickTop(hourStamp) + 'px' }"  
        
      >  
      <div class="tick-line"></div>  
      <span class="hour-label"
      :style="index === hourStamps.length - 1 ? { display: 'none' } : {}">{{ formatHour(hourStamp) }}</span>  

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
import { ref, computed } from 'vue';  
import type { CSSProperties } from 'vue';  
import { CategoryColors } from '../../core/constants';  

// 说明 Date 加上当天日期的时间戳毫秒 getTime变为分钟时间 HH:mm 时间字符串
// 1 数据结构和传递
// 定义 Block 接口，表示时间块的结构  
interface Block {  
  id: string;                     // 每个块的唯一标识  
  category: keyof typeof CategoryColors; // 类别，对应颜色字典的key  
  start: number;                  // 开始时间（时间戳）  
  end: number;                    // 结束时间（时间戳）  
}  

// 定义组件接收的 props，blocks 是 Block 类型数组  
const props = defineProps<{  
  blocks: Block[],  
  timeRange: { start: number; end: number },  // 区域范围时间戳
  effectivePxPerMinute: number,  // 像素分钟比
}>();  


// 3 将Blocks根据时间对应到区域 [不重复使用] 
// 输入是在Blocks里面的start end，
// 根据时间块数据，计算该块对应的样式（定位和尺寸）  
function getVerticalBlockStyle(block: Block): CSSProperties {  
  const startMinute = (block.start - props.timeRange.start) / (1000 * 60);  
  const endMinute = (block.end - props.timeRange.start) / (1000 * 60);  
  const topPx = startMinute * props.effectivePxPerMinute;  
  const heightPx = (endMinute - startMinute) * props.effectivePxPerMinute;  

  return {  
    position: 'absolute',  
    top: topPx + 'px',  
    left: '0%',  
    width: '30px',  
    height: heightPx + 'px',  
    backgroundColor: CategoryColors[block.category] || '#ccc',  
    color: '#fff',  
    fontSize: '10px',  
    textAlign: 'center',  
    lineHeight: heightPx + 'px',  
    userSelect: 'none',  
    borderRadius: '2px',  
    cursor: 'default',  
    whiteSpace: 'nowrap',  
  };  
}   
// 4 绘制小时刻度线
// timeRange.start timeRange.end 之间
// 生成时间区间内每小时的【时间戳】数组，用于绘制小时刻度线  
const hourStamps = computed(() => {  
  if (!props.timeRange.start || !props.timeRange.end) return [];  

  const startHour = new Date(props.timeRange.start);  
  startHour.setMinutes(0, 0, 0); // 向下取整到整点小时  

  const endHour = new Date(props.timeRange.end);  
  endHour.setMinutes(0, 0, 0);  

  const stamps = [];  
  let current = startHour.getTime();  
  while (current <= endHour.getTime()) {  
    stamps.push(current);  
    current += 1000 * 60 * 60; // 递增1小时  
  }  
  return stamps;  
});  

// 计算指定小时刻度对应的top像素位置  
// 在template里将hourStamps传递到timeStamp
// pxPerMinute
function getHourTickTop(timeStamp: number): number {   
  const minutesFromStart = (timeStamp - props.timeRange.start) / (1000 * 60);  
  return minutesFromStart * props.effectivePxPerMinute;  // HACK
}  

// 格式化小时标签，输出类似 "09:00"  
function formatHour(timeStamp: number): string {  
  const dt = new Date(timeStamp);  
  const hh = dt.getHours().toString().padStart(2, '0');  
  return `${hh}:00`;  
} 

// 5 显示当前时间线 [本函数特有]
// 当前时间戳，初始为当前时间  
const now = ref(Date.now());  

// 每隔一分钟更新当前时间，保证视图刷新当前时间线位置  
setInterval(() => {  
  now.value = Date.now();  
}, 60 * 1000);  

// 计算当前时间线相对于容器顶部的像素位置
// 超出时间区间时返回 -1 表示不显示  
const currentTimeTop = computed(() => {  
  if (now.value < props.timeRange.start || now.value > props.timeRange.end) {  
    return -1;  
  }  
  const minutesFromStart = (now.value - props.timeRange.start) / (1000 * 60);  
  
  return minutesFromStart * props.effectivePxPerMinute;  
});  

// 判断是否展示当前时间线（只有当前时间在线范围内才显示）  
const showCurrentLine = computed(() => currentTimeTop.value >= 0);  

 
</script>   

<style scoped>  
.schedule-bar-container {  
  padding-top: 14px;  /* 预留足够的顶部空间 */  
  position: relative;  
  overflow: visible;  
  height: 100%;  
  max-height: 200px;
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
  width: 100%; /* 根据需要调整宽度 */  
  display: flex;  
  flex-direction: column;   /* 竖直排列 */  
  align-items: center;      /* 水平居中 */  
  user-select: none;  
}  

/* 看到的线 */
.tick-line {  
  height: 1px;  
  width: 179px;  
  background-color: #bbb;  
  margin-bottom: 2px;  
  flex-shrink: 0;  
  margin-left: auto; /* 靠右对齐 */
}  

/* 看到的标签 */
.hour-label {  
  font-size: 10px;  
  line-height: 14px;  
  width: 180px;  
  text-align: right;  
  flex-shrink: 0;  
  color: #666;  
  margin-left: auto; /* 靠右对齐 */
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
  z-index: 20; 
}
</style>  