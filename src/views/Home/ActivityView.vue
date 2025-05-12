<!-- 
  Component: ActivityView.vue
  Description: 
  该组件用于展示和管理活动（任务和预约）的列表，提供筛选、添加、删除等功能，并与子组件（ActivityButtons、ActivitySheet）进行交互，实现活动的显示、操作以及数据的传递。

  Props:
  无

  Emits:
  - pick-activity-todo (activity: Activity): 当用户选择一个活动时，向父组件传递该活动的全部内容。

  Parent: ActivityView.vue （该组件自身作为父组件，与子组件进行交互）

  Children:
  - ActivityButtons: 用于显示活动相关的操作按钮，如筛选、添加任务、添加预约、删除活动等，并将用户的操作事件传递给父组件。
  - ActivitySheet: 用于展示筛选后的活动列表，并将用户对活动行的操作事件（如聚焦某行）传递给父组件。

  Data:
  - activitySheet: 存储全部活动数据的数组，类型为 Activity[]，初始值通过从 localStorage 中加载数据获得。
  - displaySheet: 存储筛选后的活动数据的数组，类型为 Activity[]，初始值为 activitySheet 的值。
  - activeId: 存储当前选中的活动行的 id，类型为 number | null，初始值为 null。
  - filterOptions: 存储筛选选项的数组，每个选项包含 label 和 key 属性，用于在 ActivityButtons 中显示筛选按钮。

  Methods:
  - load(): 从 localStorage 中加载活动数据，若加载失败则返回空数组。
  - save(sheet: Activity[]): 将活动数据保存到 localStorage 中。
  - pickActivity(): 当用户选择一个活动时，从全部活动数据中找到对应的活动，并通过 emit 通知父组件。
  - handleFilter(key: string): 根据用户选择的筛选选项，调用 filterActivity 或 resetFilter 方法对活动数据进行筛选。
  - filterActivity(type: 'today' | 'interrupt'): 根据筛选类型（今日到期或内外打扰），对活动数据进行筛选，并更新 displaySheet 的值。
  - resetFilter(): 重置筛选，将 displaySheet 的值恢复为 activitySheet 的值。
  - addScheduleRow(): 添加一个新的预约活动到 activitySheet 中。
  - addTaskRow(): 添加一个新的任务活动到 activitySheet 中。
  - deleteActiveRow(): 删除当前选中的活动行。
  - handleFocusRow(id: number): 更新当前选中的活动行的 id。
  - getCountdownClass(dueDate: number | undefined | null): 根据活动的到期日期，返回对应的倒计时颜色类名。

  Watchers:
  - activitySheet: 监控 activitySheet 的变化，当其值发生变化时，调用 save 方法将新的活动数据保存到 localStorage 中。

  Usage:
  该组件通常用于活动管理页面，用户可以通过它查看、筛选、添加、删除活动，以及对活动进行其他操作。

  Example:
  <ActivityView />
  通过上述方式在页面中使用该组件，即可实现活动的展示和管理功能。
-->
<template>
  <div class="activity-buttons-sticky">
  <ActivityButtons
    :filterOptions="filterOptions"
    :activeId="activeId"
    @pick-activity-todo="pickActivity"
    @filter="handleFilter"
    @add-task="addTaskRow"
    @add-schedule="addScheduleRow"
    @delete-active="deleteActiveRow"
  />
  </div>
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
import type { Activity } from "../../core/types/Activity"


const STORAGE_KEY_ACTIVITY = 'activitySheet'

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
const emit = defineEmits<{ (e: 'pick-activity-todo', activity: Activity): void }>()

// 调取数据
function load(): Activity[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVITY) || '[]') }
  catch { return [] }
}

// 保持数据
function save(sheet: Activity[]) {
  localStorage.setItem(STORAGE_KEY_ACTIVITY, JSON.stringify(sheet))
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
      emit('pick-activity-todo', picked)
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
  if (diff < 0 ) return 'countdown-blue'
  return ''
}

</script>

<style scoped>
.activity-buttons-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  margin: 0 auto 10px auto;    /* 水平居中+下方间距 */
  background-color: rgb(245, 245, 245);
  border-radius: 15px;         /* 建议用像素，百分号效果容易变形 */
  width: 200px;
  height: 50px;
  display: flex;               /* 加flex布局 */
  align-items: center;         /* 垂直居中（高度方向） */
  justify-content: center;     /* 水平居中内部内容 */
  box-shadow: 0 2px 8px rgba(0,0,0,0.05); /* 如需要阴影 */
}
</style>
 
