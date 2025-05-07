// ActivityView.vue 
<template>
  <ActivityButtons
    :filterOptions="filterOptions"
    :activeId="activeId"
    @pick-activity="pickActivity"
    @filter="handleFilter"
    @add-task="addTaskRow"
    @add-schedule="addScheduleRow"
    @delete-active="deleteActiveRow"
  />
  <ActivitySheet
    :displaySheet="displaySheet"
    :getCountdownClass="getCountdownClass"
    @focus-row="handleFocusRow"
  />
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import ActivityButtons from '@/components/ActivitySheet/ActivityButtons.vue'
import ActivitySheet from '@/components/ActivitySheet/Activities.vue'

// 1 定义数据
interface Activity {
  id: number;
  title: string;
  class:  'S' | 'T';
  estPomoI?: string;
  dueDate?: number;
  dueRange?: [number,number];
  interruption?: 'I'|'E';
  status?: '' | 'delayed' | 'ongoing' | 'cancelled' | 'done';
  category?: 'red' | 'yellow' | 'blue' | 'green' | 'white';
  fourZone?: '1' | '2' | '3' | '4';
}

const STORAGE_KEY = 'activitySheet'

const filterOptions = [
  { label: '今日到期', key: 'today' },
  { label: '内外打扰', key: 'interrupt' },
  { label: '显示全部', key: 'all' }
]
// 全部数据
const activitySheet = ref<Activity[]>(load())
// 筛选后数据
const displaySheet = ref<Activity[]>(activitySheet.value)
// 选中的行
const activeId = ref<number | null>(null)
// 发射数据
const emit = defineEmits<{ (e: 'pick-activity', activity: Activity): void }>()

// 调取数据
function load(): Activity[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

// 保持数据
function save(sheet: Activity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sheet))
}

// 监控变化
watch(activitySheet, save, { deep: true })

// 2 pickActivity 可以进行父到子通信，或 emit 给更高级
function pickActivity() {
  if (activeId.value !== null) {
    const picked = activitySheet.value.find(a => a.id === activeId.value)
    if (picked) {
      // 通知父组件并传递全部内容
      console.log(picked)
      emit('pick-activity', picked)
    }
  }
}
// 3 筛选3功能及下拉
function handleFilter(key: string) {
  if (key === 'today') filterActivity('today')
  else if (key === 'interrupt') filterActivity('interrupt')
  else resetFilter()
}

function filterActivity(type: 'today' | 'interrupt') {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (type === 'today') {
    displaySheet.value = activitySheet.value.filter(item => {
      if (item.class === 'T') {
        if (!item.dueDate) return false
        const due = new Date(item.dueDate)
        due.setHours(0, 0, 0, 0)
        return due.getTime() === now.getTime()
      } else if (item.class === 'S') {
        if (!item.dueRange || !item.dueRange[0]) return false
        const start = new Date(item.dueRange[0])
        start.setHours(0, 0, 0, 0)
        return start.getTime() === now.getTime()
      }
      return false
    })
  } else if (type === 'interrupt') {
    displaySheet.value = activitySheet.value.filter(item => !!item.interruption)
  }
}

function resetFilter() {
  displaySheet.value = activitySheet.value
}

// 4 增加预约活动
function addScheduleRow() {
  activitySheet.value.push({
    id: Date.now(),
    class: 'S',
    title: '',
    dueRange: [Date.now(), Date.now()]
  })
}

// 5 增加任务活动
function addTaskRow() {
  activitySheet.value.push({
    id: Date.now(),
    class: 'T',
    title: '',
    estPomoI: ''
  })
}

// 6 删除任务
function deleteActiveRow() {
  if (activeId.value == null) return
  const idx = activitySheet.value.findIndex(a => a.id === activeId.value)
  if (idx !== -1) {
    activitySheet.value.splice(idx, 1)
    activeId.value = null
  }
}

// 7 获取激活的行
function handleFocusRow(id: number) {
  activeId.value = id
}

// 8 基于日期显示颜色
function getCountdownClass(dueDate: number | undefined | null): string {
  if (!dueDate) return ''
  const now = new Date();
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - now.setHours(0, 0, 0, 0)) / 86400000);

  if (diff === 0) return 'countdown-red'
  if (diff === 1) return 'countdown-deeporange'
  if (diff === 2) return 'countdown-orange'
  if (diff === 3) return 'countdown-yellow'
  return ''
}

</script>
 
