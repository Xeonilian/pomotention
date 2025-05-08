<template>  
  <div class="today-todo">  
    <TodayTodo :todos="todayTodos" />  
  </div>  
  <div class="today-schedule">  
    <TodaySchedule />  
  </div>  
</template>  

<script setup lang="ts">  
import { ref, computed, watch } from 'vue'  
import TodaySchedule from '../../components/TodayTSG/TodaySchedule.vue'  
import TodayTodo from '../../components/TodayTSG/TodayTodo.vue'  
import type { Activity } from '../../core/types/Activity'  
import type { Todo } from '../../core/types/Todo'  
import { isToday } from '../../core/utils'  

const STORAGE_KEY_TODOS = 'todos'  


// 父组件传入：已 pick 的 Activity（支持 undefined/null，类型安全）  
const props = defineProps<{  
  pickedTodoActivity?: Activity | null;  
  scheduleActivity?: Activity | null;  
}>()  

// 本地持久化  
function loadTodos(): Todo[] {  
  const saved = localStorage.getItem(STORAGE_KEY_TODOS)  
  return saved ? JSON.parse(saved) : []  
}  
function saveTodos(todos: Todo[]) {  
  localStorage.setItem(STORAGE_KEY_TODOS, JSON.stringify(todos))  
}  

// 响应式 todos 列表  
const todos = ref<Todo[]>(loadTodos())  

// 监听 pickedTodoActivity，如有新 activity 就转成 Todo，并去重  
watch(  
  () => props.pickedTodoActivity,  
  (activity) => {  
    if (activity && activity.id) {  
      // 已有同 activityId 并且是今天的不能重复加入  
      const exists = todos.value.some(  
        t => t.activityId === activity.id && isToday(t.id)  
      )  
      if (exists) return  

      const now = Date.now()  
      const newTodo: Todo = {  
        id: now,  
        activityId: activity.id,  
        activityTitle: activity.title,
          
        // estPomoI 是字符串，比如 '1'，即最少为 [1]  
        estPomo: [Number(activity.estPomoI || 1)],  
        realPomo: [],  
        status: ''  
      }  
      todos.value.unshift(newTodo)  
      saveTodos(todos.value)  
    }  
  }  
)  

// 只取今天的 todo，用于传递  
const todayTodos = computed(() =>  
  todos.value.filter(todo => isToday(todo.id))  
)  
</script>  