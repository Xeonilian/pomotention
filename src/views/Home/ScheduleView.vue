<template>  
  <div class="schedule-container">  
    <!-- 1 按钮 -->  
    <div class="schedule-view-button-container">  
      <!-- 设置按钮 --> 
      <n-button  @click="toggleDisplay" secondary round strong type="default" class="schedule-button">{{ buttonText }}</n-button>  
      <!-- 工作日程 -->  
      <n-button @click="resetToWork" secondary circle type="warning" title="默认工作日" >💰</n-button>
      <!-- 娱乐日程 -->  
      <n-button @click="resetToEntertainment" secondary circle type="warning" title="默认休息日">🏕️</n-button>
    </div>
    <!-- 2 编辑区 -->  
    <div v-if="showEditor" class="schedule-editor">

      <ScheduleEditor v-model= "blocks" @update:modelValue="val => console.log('父组件事件收到数据:', val)"  />
    </div> 
    <!-- 3 显示区 -->  
    <div v-else class="schedule-time-block" ref="container">
      <ScheduleTimeBlocks :blocks="blocks"   :timeRange="timeRange"   :effectivePxPerMinute="effectivePxPerMinute" />    
  
    </div>  
  </div>
</template>  

<script setup lang="ts">  

import { ref, onMounted, onUnmounted, watch, computed } from 'vue';  
import { NButton } from 'naive-ui';  
import ScheduleEditor from '../../components/ScheduleDay/ScheduleEditor.vue';  
import ScheduleTimeBlocks from '../../components/ScheduleDay/ScheduleTimeBlocks.vue';  
import { getTimestampForTimeString } from '../../core/utils';  
import { CategoryColors } from '../../core/constants';  

// 1 按钮  
const showEditor = ref(false);  
const buttonText = ref('设置日程');   

const toggleDisplay = () => {  
  showEditor.value = !showEditor.value;  
  buttonText.value = showEditor.value ? '确认日程' : '设置日程';  
};  

// Block类型声明  
interface Block {  
  id: string;  
  category: keyof typeof CategoryColors;  
  start: number;  
  end: number;  
}  

// 默认日程数据  
const workBlocks: Block[] = [  
  { id: '1', category: 'living', start: getTimestampForTimeString('06:00'), end: getTimestampForTimeString('09:00') },  
  { id: '2', category: 'working', start: getTimestampForTimeString('09:00'), end: getTimestampForTimeString('12:00') },  
  { id: '3', category: 'living', start: getTimestampForTimeString('12:00'), end: getTimestampForTimeString('13:00') },  
  { id: '4', category: 'working', start: getTimestampForTimeString('13:00'), end: getTimestampForTimeString('15:00') },  
  { id: '5', category: 'living', start: getTimestampForTimeString('15:00'), end: getTimestampForTimeString('15:15') },  
  { id: '6', category: 'working', start: getTimestampForTimeString('15:15'), end: getTimestampForTimeString('17:40') },  
  { id: '7', category: 'living', start: getTimestampForTimeString('17:40'), end: getTimestampForTimeString('18:10') },  
  { id: '8', category: 'working', start: getTimestampForTimeString('18:10'), end: getTimestampForTimeString('19:40') },  
  { id: '9', category: 'living', start: getTimestampForTimeString('19:40'), end: getTimestampForTimeString('20:00') },  
  { id: '10', category: 'working', start: getTimestampForTimeString('20:00'), end: getTimestampForTimeString('24:00') },  
];  

const entertainmentBlocks: Block[] = [  
  { id: '1', category: 'sleeping', start: getTimestampForTimeString('00:00'), end: getTimestampForTimeString('09:00') },  
  { id: '2', category: 'living', start: getTimestampForTimeString('09:00'), end: getTimestampForTimeString('22:00') },  
  { id: '3', category: 'sleeping', start: getTimestampForTimeString('22:00'), end: getTimestampForTimeString('24:00') },  
];   

const blocks = ref<Block[]>([...workBlocks]);  

const resetToWork = () => {  
  localStorage.removeItem('myScheduleBlocks');  
  blocks.value = [...workBlocks];  
};   

const resetToEntertainment = () => {  
  localStorage.removeItem('myScheduleBlocks');  
  blocks.value = [...entertainmentBlocks];  
};   

onMounted(() => {  
  const localData = localStorage.getItem('myScheduleBlocks');  
  if (localData) {  
    try {  
      const parsed = JSON.parse(localData);  
      if (Array.isArray(parsed)) {  
        blocks.value = parsed;  
        console.log('父组件：从localStorage加载数据');  
        return;  
      }  
    } catch {}  
  }   
});  

// 高度和容器引用  
const container = ref<HTMLElement | null>(null)  
const containerHeight = ref(400);  

const updateHeight = () => {  
  if (container.value) {  
    containerHeight.value = container.value.clientHeight;  
    console.log('容器高度:', containerHeight.value, '实际高度:', container.value.clientHeight)
  }  
};  

onMounted(() => {  
  updateHeight();  
  window.addEventListener('resize', updateHeight);  
});  

onUnmounted(() => window.removeEventListener('resize', updateHeight));  

// watch blocks 更新时刷新高度  
watch(blocks, () => {  
  updateHeight();  
});  

// timeRange 计算 时间戳 
const timeRange = computed(() => {  
  if (blocks.value.length === 0) return { start: 0, end: 0 };  
  const start = Math.min(...blocks.value.map(b => b.start));  
  const end = Math.max(...blocks.value.map(b => b.end));  
  return { start, end };  
}); 

const totalMinutes = computed(() =>   
  (timeRange.value.end - timeRange.value.start) / (1000 * 60)  
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

// 保存blocks到localStorage  
watch(blocks, (newVal) => {  
  localStorage.setItem('myScheduleBlocks', JSON.stringify(newVal));  
}, { deep: true });  


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
 

.schedule-time-block{
  margin : auto;
  position: relative;
  height: 100%; 

}
.schedule-view-button-container{
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