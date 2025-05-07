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


interface Activity {
  id: number;
  title: string;
  class:  'S' | 'T';
  estPomoI?: string;
  dueDate?: number;
  dueRange?: [number,number];
  interruption?: 'I'|'E';
  status?: '' | 'delay' | 'doing' | 'cancel' | 'done';
  category?: 'red' | 'yellow' | 'blue' | 'green' | 'white';
  fourZone?: '1' | '2' | '3' | '4';
}

const STORAGE_KEY = 'activitySheet'

const filterOptions = [
  { label: '今日到期', key: 'today' },
  { label: '内外打扰', key: 'interrupt' },
  { label: '显示全部', key: 'all' }
]

function load(): Activity[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
function save(sheet: Activity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sheet))
}

const activitySheet = ref<Activity[]>(load())
const displaySheet = ref<Activity[]>(activitySheet.value)
const activeId = ref<number | null>(null)

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
function handleFocusRow(id: number) {
  activeId.value = id
}
function addTaskRow() {
  activitySheet.value.push({
    id: Date.now(),
    class: 'T',
    title: '',
    estPomoI: ''
  })
}
function addScheduleRow() {
  activitySheet.value.push({
    id: Date.now(),
    class: 'S',
    title: '',
    dueRange: [Date.now(), Date.now()]
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
// pickActivity 可以进行父到子通信，或 emit 给更高级
function pickActivity() {
  // 你可 emit('pick-activity', ...) 给上游，也可在此处理选项逻辑
  // alert('自定义活动选择弹窗或逻辑');
}

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

watch(activitySheet, save, { deep: true })
</script>
 
