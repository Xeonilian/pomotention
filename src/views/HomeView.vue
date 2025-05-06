<template>  
  <div class="home-content">  
    <div class="content">  
      <div v-if="showLeft" class="left"><ScheduleView /></div>  
      <div class="middle">  
        <div v-if="showMiddleTop" class="middle-top"><TodoView /></div>  
        <div class="middle-bottom">
        <div class="button-group">  
          <n-button  
            size="small"  
            circle  secondary strong type = "info"
            @click="showLeft = !showLeft"  
            :style="buttonStyle(showLeft)"  
            title="切换日程"  
            >🗓️</n-button>  
          <n-button  
            size="small"  
            circle secondary strong type = "info" 
            @click="showMiddleTop = !showMiddleTop"  
            :style="buttonStyle(showMiddleTop)"  
            title="切换待办"  
            >🖊️</n-button>  
          <n-button  
            size="small"  
            circle  secondary strong type = "info"
            @click="showRight = !showRight"  
            :style="buttonStyle(showRight)"  
            title="切换任务"  
            >📋</n-button>  
      </div>  
          <TaskView /></div>  
      </div>  
      <div v-if="showRight" class="right"><ActivityView /></div>  
    </div>  
  </div>  
</template>  

<script setup lang="ts">  
import { ref } from 'vue'  
import { NButton } from 'naive-ui'  
import ScheduleView from './Home/ScheduleView.vue'  
import TodoView from './Home/TodoView.vue'  
import TaskView from './Home/TaskView.vue'  
import ActivityView from './Home/ActivityView.vue'  

const showLeft = ref(true)  
const showMiddleTop = ref(true)  
const showRight = ref(true)  

function buttonStyle(show: boolean) {  
  return {  
    filter: show ? 'none' : 'grayscale(100%)',  
    opacity: show ? 1 : 0.6,  
  }  
}  
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
  height: 200px;  
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
}  
</style>  