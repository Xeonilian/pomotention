<template>  
  <div class="schedule-container">  
    <!-- 1 按钮 -->  
    <n-button @click="toggleDisplay" default round strong type="info" class="schedule-button">
      {{ buttonText }}
    </n-button>  
    <!-- 2 编辑区 -->  
    <div v-if="showEditor" class="schedule-editor"><ScheduleEditor v-model="blocks" /> 
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
import { timeToMinutes } from '../../core/utils';  
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
  { id: '1', category: 'resting', start: timeToMinutes('00:00'), end: timeToMinutes('06:00') },  
  { id: '2', category: 'living', start: timeToMinutes('06:00'), end: timeToMinutes('10:00') },  
  { id: '3', category: 'working', start: timeToMinutes('10:00'), end: timeToMinutes('12:00') },  
  { id: '4', category: 'resting', start: timeToMinutes('12:00'), end: timeToMinutes('13:00') },  
]);  

</script>  

<style scoped> 
.schedule-container {  
  width: 100%;  
}  

.schedule-editor {  
  margin-bottom: 10px; /* 编辑区和按钮的间距 */  
}  

.schedule-button {  
  display: block; /* 让按钮独占一行 */  
  margin: auto; /* 靠右对齐的关键！ */  
}   

.schedule-time-block{
  margin : auto;
  position: relative;
}
</style>