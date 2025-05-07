//ActivitySheet.vue
<template>  
  <!-- 按钮 -->  
  <div class="activity-view-button-container">  
    <n-button @click="pickActivity" secondary circle type="info" title="选择活动" >  
      <template #icon>  
        <n-icon><ChevronCircleLeft48Regular /></n-icon>  
      </template>  
    </n-button>  
    <n-dropdown :options="filterOptions" @select="handleFilter">  
    <n-button strong secondary circle type="info" title="筛选活动">  
      <template #icon>  
        <n-icon><DocumentTableSearch24Regular/></n-icon>  
      </template>  
      <!-- 可加 <span style="font-size: 12px; margin-left: 3px;">▼</span> -->  
    </n-button>  
  </n-dropdown> 
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
  <!-- 活动数据区 -->  
  <div v-for="item in displaySheet" :key="item.id" class="activity-row">  
    <n-input  
  v-model:value="item.title"  
  type="text"  
  placeholder="任务描述"  
  style="flex:2"  
  @focus="activeId = item.id"  
>  
  <template #prefix>  
    <n-icon v-if="item.interruption === 'I'"  color="#fa5c7c">  
      <VideoPersonSparkle24Regular />  
    </n-icon>  
    <n-icon v-else-if="item.interruption === 'E'"  color="#138">  
      <VideoPersonCall24Regular />  
    </n-icon>  
  </template>  
</n-input>  
           
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
  :class="getCountdownClass(item.dueDate)"  
/>  
<n-date-picker  
  v-else  
  v-model:value="item.dueRange"  
  type="datetimerange"  
  style="max-width:170px"  
  clearable  
  format="HH:mm"  
  @focus="activeId = item.id"  
  title="约定时间"  
  :class="getCountdownClass(item.dueRange && item.dueRange[1])"  
/>  
</div>  
</template>  

<script setup lang="ts">  
import { ref, watch } from 'vue'  
import { NDatePicker, NInput, NButton, NIcon, NDropdown } from 'naive-ui'  
import { AddCircle24Regular, Delete24Regular,ChevronCircleLeft48Regular,DocumentTableSearch24Regular, BookAdd24Regular,VideoPersonSparkle24Regular, VideoPersonCall24Regular } from '@vicons/fluent'  
import type { Activity } from '../../core/types/Activity'

 
const filterOptions = [  
  { label: '今日到期', key: 'today' },  
  { label: '内外打扰', key: 'interrupt' },  
  { label: '显示全部', key: 'all' }  
]  

function handleFilter(key: string) {  
  if (key === 'today') filterActivity('today')  
  else if (key === 'interrupt') filterActivity('interrupt')  
  else if (key === 'all') resetFilter()  
}  
const activitySheet = ref<Activity[]>(load().length ? load() : [])  
const displaySheet = ref<Activity[]>(activitySheet.value)  

function filterActivity(type: 'today' | 'interrupt') {  
  const now = new Date();  
  now.setHours(0, 0, 0, 0);  

  if (type === 'today') {  
    // 只显示今天到期的任务: 任务截止日期是今天，或者预约起始时间是今天  
    displaySheet.value = activitySheet.value.filter(item => {  
      if (item.class === 'T') {  
        if (!item.dueDate) return false;  
        const due = new Date(item.dueDate);  
        due.setHours(0, 0, 0, 0);  
        return due.getTime() === now.getTime();  
      } else if (item.class === 'S') {  
        if (!item.dueRange || !item.dueRange[0]) return false;  
        const start = new Date(item.dueRange[0]);  
        start.setHours(0, 0, 0, 0);  
        return start.getTime() === now.getTime();  
      }  
      return false;  
    });  
  } else if (type === 'interrupt') {  
    // 只显示有 interruption 的任务  
    displaySheet.value = activitySheet.value.filter(item => !!item.interruption);  
  }  
}  

function resetFilter() {  
  displaySheet.value = activitySheet.value;  
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

 
const activeId = ref<number | null>(null)  

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
    //interruption:"I",
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


function pickActivity(){
  
}

function getCountdownClass(dueDate: number | undefined | null): string {  
  if (!dueDate) return ''  
  // 当前时间到目标日0点的天数差  
  const now = new Date();  
  const due = new Date(dueDate);  
  due.setHours(0, 0, 0, 0);  
  const diff = Math.ceil((due.getTime() - now.setHours(0, 0, 0, 0)) / 86400000);  

  if (diff === 0) return 'countdown-red'      // 当天  
  if (diff === 1) return 'countdown-deeporange'  
  if (diff === 2) return 'countdown-orange'  
  if (diff === 3) return 'countdown-yellow'  
  return ''  
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

.countdown-yellow  :deep(.n-input) { background: #f8d444a0; }  
.countdown-orange  :deep(.n-input) {  background: #ffa940a3; }  
.countdown-deeporange :deep(.n-input) {  background: #ff7040b9; }  
.countdown-red     :deep(.n-input) {  background: #f34d50b6;}  
</style>  