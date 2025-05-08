<!--
Component: TodayView.vue
Description: 活动（todo和schedule)转换为今日安排。
Props:

  - pickedActivityT: Activity[]  // 当前选中的活动（多用于过滤）
Emits:
  - update(newTodos: Todo[]) // 通知父组件任务内容有变
Parent: Home.vue
-->
<template>  
按钮区域，1获取今日预约任务，2将选中的todo发送到task区域
  <div class="today-todo">  
    <TodayTodo :todos="todayTodos"  />
  </div>  
  <div class="today-schedule">
    <TodaySchedule/>
  </div>
</template>  

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import TodaySchedule from '../../components/TodoToday/TodaySchedule.vue';
import TodayTodo from '../../components/TodoToday/TodayTodo.vue';
import type { Activity } from '../../core/types/Activity';
import type { Todo } from '../../core/types/Todo';
import { isToday } from '../../core/utils';

// 定义从父类接受数据类型
const props = defineProps<{
  pickedActivityT?: Activity | null;
  scheduledActivity?: Activity | null;
}>();

// 今日待办持久化
const TODOS_KEY = 'todos';
function loadTodos(): Todo[] {
  const saved = localStorage.getItem(TODOS_KEY);
  return saved ? JSON.parse(saved) : [];
}
function saveTodos(todos: Todo[]) {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}

const todos = ref<Todo[]>(loadTodos());

watch(
  () => props.pickedActivityT,
  (activity) => {
    if (activity && activity.id) {
      const exists = todos.value.some(
        (t) => t.activityId === activity.id && isToday(t.id)
      );
      if (exists) return;
      const now = Date.now();
      const newTodo: Todo = {
        id: now,
        activityId: activity.id,
        taskId: now,
        estPomo: [Number(activity.estPomoI || 1)],
        realPomo: [],
        status: 'ongoing',
      };
      todos.value.unshift(newTodo);
      saveTodos(todos.value);
    }
  }
);

const todayTodos = computed(() =>
  todos.value.filter(todo => isToday(todo.id))
);


</script>  

