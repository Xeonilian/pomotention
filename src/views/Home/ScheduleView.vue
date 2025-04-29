<template>  
  <div class="schedule-container">  
    <!-- 1 按钮 -->  
    <n-button @click="toggleDisplay" default round strong type="info" class="schedule-button">
      {{ buttonText }}
    </n-button>  
    <!-- 2 编辑区 -->  
    <div v-if="showEditor" class="schedule-editor">
      <ScheduleEditor v-model="blocks" />
      <ScheduleTry v-model= "blocks" />
    </div> 
    <!-- 3 显示区 -->  
    <div v-else class="schedule-time-block"><ScheduleTimeBlocks :blocks="blocks" />   
    </div>  
  </div>
</template>  

<script setup lang="ts">  
 

import { ref, reactive } from 'vue';  
import { NButton } from 'naive-ui';  
import ScheduleEditor from '../../components/ScheduleDay/ScheduleEditor.vue';
import ScheduleTimeBlocks from '../../components/ScheduleDay/ScheduleTimeBlocks.vue';
import ScheduleTry from '../../components/ScheduleDay/ScheduleTry.vue';
import { getTimestampForTimeString } from '../../core/utils';  
const showEditor = ref(false); // 控制弹窗显示  
const buttonText = ref('设置日程'); 

const toggleDisplay = () => {  
  showEditor.value = !showEditor.value;  
  buttonText.value = showEditor.value ? '确认日程' : '设置日程';
};  

interface Block {  
  id: string;  
  category: string;  
  start: number;  
  end: number;  
}  

const blocks = reactive<Block[]>([  
  { id: '1', category: 'sleeping', start:getTimestampForTimeString('00:00'), end: getTimestampForTimeString('06:00') },  
  { id: '2', category: 'living', start:getTimestampForTimeString('06:00'), end: getTimestampForTimeString('12:00') }, 
  { id: '3', category: 'working', start:getTimestampForTimeString('12:00'), end: getTimestampForTimeString('24:00') },  
 
]);  



</script>  

<style scoped> 
.schedule-container {  
  height: 100%;  
  overflow: hidden;
}  

.schedule-editor {  
  margin-bottom: 10px; /* 编辑区和按钮的间距 */  
  height: 100%; 
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