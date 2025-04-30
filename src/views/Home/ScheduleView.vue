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
    <div v-else class="schedule-time-block"><ScheduleTimeBlocks :blocks="blocks" />   
    </div>  
  </div>
</template>  

<script setup lang="ts">  

import { ref, onMounted, watch  } from 'vue';  
import { NButton } from 'naive-ui';  
import ScheduleEditor from '../../components/ScheduleDay/ScheduleEditor.vue';
import ScheduleTimeBlocks from '../../components/ScheduleDay/ScheduleTimeBlocks.vue';
import { getTimestampForTimeString } from '../../core/utils';  
import { CategoryColors } from '../../core/constants';

const showEditor = ref(false); // 控制弹窗显示  
const buttonText = ref('设置日程'); 

const toggleDisplay = () => {  
  showEditor.value = !showEditor.value;  
  buttonText.value = showEditor.value ? '确认日程' : '设置日程';
};  

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
  { id: '10', category: 'working', start: getTimestampForTimeString('20:00'), end: getTimestampForTimeString('22:00') },  
];  

const entertainmentBlocks: Block[] = [  
  { id: '1', category: 'sleeping', start: getTimestampForTimeString('00:00'), end: getTimestampForTimeString('09:00') },  
  { id: '2', category: 'living', start: getTimestampForTimeString('09:00'), end: getTimestampForTimeString('22:00') },  
  { id: '3', category: 'sleeping', start: getTimestampForTimeString('22:00'), end: getTimestampForTimeString('24:00') },  

]; 

// 响应式日程数据，用默认数组初始化  
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

watch(blocks, (newVal) => {  
  localStorage.setItem('myScheduleBlocks', JSON.stringify(newVal));  
}, { deep: true });  

</script>  

<style scoped> 
.schedule-container {  
  height: 100%;  
  overflow: hidden;

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