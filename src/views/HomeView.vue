<!-- 
  Component: HomeView.vue 
  Description: 界面控制，数据管理
  Parent: App.vue
-->

<template>  
  <div class="home-content">  
    <div class="content">  
      <div v-if="showLeft" class="left"><ScheduleView
        :blocks = "blocks"
        @update-blocks="onBlocksUpdate"
        @reset-schedule="onScheduleReset"
         /></div>  
      <div class="middle">  
        <div v-if="showMiddleTop" class="middle-top"><TodayView :pickedTodoActivity="pickedTodoActivity"/></div>  
        <div class="middle-bottom">
        <div class="button-group">  
          <n-button  
            size="small"  
            circle  secondary strong type = "info"
            @click="showLeft = !showLeft"  
            :style="buttonStyle(showLeft)"  
            title="切换日程视图"  
            >🗓️</n-button>  
          <n-button  
            size="small"  
            circle secondary strong type = "info" 
            @click="showMiddleTop = !showMiddleTop"  
            :style="buttonStyle(showMiddleTop)"  
            title="切换待办视图"  
            >🖊️</n-button>  
          <n-button  
            size="small"  
            circle  secondary strong type = "info"
            @click="showRight = !showRight"  
            :style="buttonStyle(showRight)"  
            title="切换活动视图"  
            >📋</n-button>  
      </div>  
          <TaskView /></div>  
      </div>  
      <div v-if="showRight" class="right"><ActivityView  @pick-activity-todo="passPickedActivity" /></div>  
    </div>  
  </div>  
</template>  

<script setup lang="ts">  

import { ref, onMounted, watch } from 'vue'
import { NButton } from 'naive-ui'  
import ScheduleView from '@/views/Home/ScheduleView.vue'  
import TodayView from '@/views//Home/TodayView.vue'  
import TaskView from '@/views//Home/TaskView.vue'  
import ActivityView from '@/views//Home/ActivityView.vue' 
import type { Activity } from '@/core/types/Activity'
import { getTimestampForTimeString } from '@/core/utils';  
import type { Block } from '@/core/types/Block'

// 1 界面控制参数定义
const showLeft = ref(true)  
const showMiddleTop = ref(true)  
const showRight = ref(true)  

// 2 ScheduleView 数据传递
const STORAGE_KEY_SCHEDULE = 'myScheduleBlocks'
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

const blocks = ref<Block[]>([]);  

// 读取本地数据
onMounted(() => {
  try {
    const local = localStorage.getItem(STORAGE_KEY_SCHEDULE)
    if (local) {
      blocks.value = JSON.parse(local)
    } else {
      blocks.value = [...workBlocks] // 没有就用默认
    }
  } catch {
    blocks.value = [...workBlocks]
  }
})

//  blocks 每次变化就持久化本地 
watch(blocks, (newVal) => {  
  localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(newVal));  
}, { deep: true });  

/** ScheduleView 发出blocks修改事件，接管更新 */
function onBlocksUpdate(newBlocks: Block[]) {
  blocks.value = [...newBlocks]
}

/** “重置”事件，区分工作/娱乐 */
function onScheduleReset(type: 'work' | 'entertainment') {
  blocks.value = type === 'work' ? [...workBlocks] : [...entertainmentBlocks]
  localStorage.removeItem(STORAGE_KEY_SCHEDULE) // 可选，重置时也清理
}

// 3 ActivityView 数据传递
const pickedTodoActivity = ref<Activity | null>(null) 

function passPickedActivity(activity: Activity) {
  pickedTodoActivity.value = activity
}

function buttonStyle(show: boolean) {  
  return {  
    filter: show ? 'none' : 'grayscale(100%)',  
    opacity: show ? 1 : 0.6,  
  }  
}  

// 4 TodayView 数据传递

// 5 TaskView 数据传递
</script>  

<style scoped>  
.home-content {  
  display: flex;  
  flex-direction: column;  
  height: 100%;  
  overflow: auto; 
  flex: 1; 
}  

.content {  
  flex: 1;  
  display: flex;  
  background: #fafafa;  
  overflow: auto;  
}  

.button-group {  
  display: flex;  
  gap: 8px;  
  padding: 0px; 
  justify-content: flex-end;
} 

.left {  
  width: 240px;  
  background: #e1eaf3;  
  padding: 16px;  
  box-sizing: border-box;  
  overflow-y: hidden; /*BUG*/ 
  margin-right: 8px;
}  

.right {  
  width: 480px;  
  background: #f0e9d8;  
  padding: 16px;  
  box-sizing: border-box;  
  overflow: auto;  
  margin-left: 8px;
}  

.middle {  
  flex: 1;  
  display: flex;  
  flex-direction: column;  
  padding: 0px;  
  box-sizing: border-box;  
  background: #fff;  
  overflow: hidden;  
}  

.middle-top {  
  height: 40%;  
  background: #f7f2f0;  
  margin-bottom: 12px;  
  overflow: auto;  
  padding: 8px;  
  box-sizing: border-box;  
}  

.middle-bottom {  
  flex: 1;  
  background: #f7f2f0;  
  overflow: auto;  
  padding: 8px;  
  box-sizing: border-box; 
  height: 60%;  
}  
</style>  