<template>  
  <div class="schedule-container">  
    <!-- 1 按钮 -->  
    <n-button @click="toggleDisplay"  secondary type="default" strong class="schedule-button">
      {{ buttonText }}
    </n-button>  
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

 

const blocks = ref<Block[]>([   
  { id: '1', category: 'living', start:getTimestampForTimeString('06:00'), end: getTimestampForTimeString('09:00') }, 
  { id: '2', category: 'working', start:getTimestampForTimeString('09:00'), end: getTimestampForTimeString('12:00') },  
  { id: '3', category: 'living', start:getTimestampForTimeString('12:00'), end: getTimestampForTimeString('13:00') },  
  { id: '4', category: 'working', start:getTimestampForTimeString('13:00'), end: getTimestampForTimeString('15:00') },  
  { id: '5', category: 'living', start:getTimestampForTimeString('15:00'), end: getTimestampForTimeString('15:15') },  
  { id: '6', category: 'working', start:getTimestampForTimeString('15:15'), end: getTimestampForTimeString('17:40') },  
  { id: '7', category: 'living', start:getTimestampForTimeString('17:40'), end: getTimestampForTimeString('18:10') },  
  { id: '8', category: 'working', start:getTimestampForTimeString('18:10'), end: getTimestampForTimeString('19:40') },  
  { id: '9', category: 'living', start:getTimestampForTimeString('19:40'), end: getTimestampForTimeString('20:00') },
  { id: '10', category: 'working', start:getTimestampForTimeString('20:00'), end: getTimestampForTimeString('22:00') }, 
 
]);  

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

.schedule-button {  
  display: block; /* 让按钮独占一行 */  
  margin: auto; /* 靠右对齐的关键！ */ 

}   

.schedule-time-block{
  margin : auto;
  position: relative;
  height: 100%; 

}
</style>