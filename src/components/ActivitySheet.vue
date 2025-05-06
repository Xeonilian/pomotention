<template>  
  <!-- 按钮 -->  
  <div class="activity-view-button-container">  
    <n-button @click="pickActivity" secondary circle type="info" title="选择活动" >  
      <template #icon>  
        <n-icon><ChevronCircleLeft48Regular /></n-icon>  
      </template>  
    </n-button>  
    <n-button @click="filterActivity" strong secondary circle type="info" title="筛选活动" >  
      <template #icon>  
        <n-icon><DocumentTableSearch24Regular/></n-icon>  
      </template>
    </n-button>
    <n-button @click="addTaskRow" circle secondary type="success" title="添加任务">  
      <template #icon><n-icon><AddCircle24Regular /></n-icon></template>  
    </n-button> 
    <n-button title="添加预约" @click="addScheduleRow" circle secondary type="warning">  
      <template #icon><n-icon><BookAdd24Regular /></n-icon></template>  
    </n-button> 
     
    <n-button title="删除活动" @click="deleteActiveRow" circle secondary type="error" :disabled="activeId === null">  
      <template #icon><n-icon><Delete24Regular /></n-icon></template>  
    </n-button>  

  </div>  
  <!-- 数据区 -->  
  <div v-for="item in activitySheet" :key="item.id" class="activity-row">  
  <n-input v-model:value="item.title" type="text" placeholder="任务描述" style="flex:2"  
           @focus="activeId = item.id" />  
  <n-input v-if="item.class==='T'" v-model:value="item.estPomoI" placeholder="🍅" style="max-width:45px"  
           @focus="activeId = item.id" />  
  <!-- 单日期 -->  
  <n-date-picker  
    v-if="item.class==='T'"  
    v-model:value="item.dueDate"  
    type="date"  
    style="max-width:125px"  
    clearable  
    format="MM-dd"  
    @focus="activeId = item.id"  
    title="死线日期"  
  />  
  <!-- 日期区间+时间 -->  
  <n-date-picker  
    v-else  
    v-model:value="item.dueRange"  
    type="datetimerange"  
    style="max-width:170px"  
    clearable  
    format="HH:mm"  
    @focus="activeId = item.id"  
    title="约定时间"  
  />  
</div>  
</template>  

<script setup lang="ts">  
import { ref, watch } from 'vue'  
import { NDatePicker, NInput, NButton, NIcon } from 'naive-ui'  
import { AddCircle24Regular, Delete24Regular,ChevronCircleLeft48Regular,DocumentTableSearch24Regular, BookAdd24Regular } from '@vicons/fluent'  

interface Activity {  
  id: number;  
  title: string;  
  class:  'S' | 'T';  
  estPomoI?: string; 
  dueDate?: number; 
  dueRange?: [number,number]  
  interruption?: 'I'|'E';
  status?: '' | 'delay' | 'doing' | 'cancel' | 'done';  
  repeatParams?: string;  
  category?: 'red' | 'yellow' | 'blue' | 'green' | 'white';  
  fourZone?: '1' | '2' | '3' | '4';  
}  
 

const STORAGE_KEY = 'activitySheet'  

function load(): Activity[] {  
  try {  
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')  
  } catch { return [] }  
}  
function save(sheet: Activity[]) {  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sheet))  
}  

const activitySheet = ref<Activity[]>(load().length ? load() : [  
 
])  
const activeId = ref<number | null>(null)  
const activityClassTask = ref<boolean>(true)

function addTaskRow() {  
  activitySheet.value.push({  
    id: Date.now(),  
    class: 'T',  
    title: '' , 
    estPomoI: ''
  })  
}  


function addScheduleRow() {  
  activitySheet.value.push({  
    id: Date.now(),  
    class: 'S',  
    title: '' , 
    dueRange: [Date.now(),Date.now()]
  })  
} 
function deleteActiveRow() {  
  if (activeId.value == null) return  
  const idx = activitySheet.value.findIndex(a => a.id === activeId.value)  
  if (idx !== -1) {  
    activitySheet.value.splice(idx, 1)  
    activeId.value = null  
  }  
}  

function filterActivity(){

}


function pickActivity(){
  
}
// 实时同步  
watch(activitySheet, save, { deep: true })  
</script>  

<style scoped>  
.activity-view-button-container {  
  display: flex;  
  justify-content: center;  
  gap: 2px;  
  margin: 5px 0 5px 0;  
}  
.activity-sheet { 
  margin:auto; 
  margin-top: 5px; }  
  
.activity-row { 
  display: flex;
  align-items: center; 
  padding: 1px 0; 
  gap: 0px; 
  width:100%;}  
</style>  