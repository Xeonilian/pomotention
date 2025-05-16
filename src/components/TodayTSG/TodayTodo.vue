<!--
  Component: TodayTodo.vue
  Description: 显示多个任务的详细信息或列表。
  Props:
    - todos: Array<Todo> - 任务列表数据
  Emits: 无
  Parent: TodayView.vue
-->
<template>
  <!-- 表格容器，占满父容器宽度 -->
  <div class="table-container">
    <table class="full-width-table">
      <!-- 表头部分，可单独调整样式 -->
      <thead class="table-header">
        <tr>
          <th style="width: 40px"></th>
          <th style="width: 60px">开始</th>
          <th style="width: 40px">优先</th>
          <th style="width: calc((100% - 180px) / 2)">描述</th>
          <th style="width: calc((100% - 180px) / 2)">番茄</th>
          <th style="width: 40px"></th>
        </tr>
      </thead>
      <!-- 表格内容部分，可单独调整样式 -->
      <tbody class="table-body">
        <template v-if="sortedTodos.length > 0">
          <tr
            v-for="todo in sortedTodos"
            :key="todo.id"
            :class="{ 'active-row': todo.activityId === activeId }"
          >
            <td>
              <n-checkbox
                :checked="todo.status === 'done'"
                @update:checked="handleCheckboxChange(todo, $event)"
              />
            </td>
            <td>{{ todo.taskId ? formatTime(todo.taskId) : "-" }}</td>
            <td class="priority-cell" @click="startEditing(todo)">
              <template v-if="editingTodo && editingTodo.id === todo.id">
                <n-input-number
                  v-model:value="editingPriority"
                  :min="0"
                  :max="10"
                  @blur="finishEditing"
                  @keydown.enter="finishEditing"
                  size="small"
                  style="width: 30px"
                  @focus="handleInputFocus"
                  autofocus
                  :show-button="false"
                  placeholder=" "
                />
              </template>
              <template v-else>
                {{ getPriorityEmoji(todo.priority) }}
              </template>
            </td>
            <td class="ellipsis">{{ todo.activityTitle ?? "-" }}</td>
            <td>
              {{
                todo.estPomo && todo.estPomo.length
                  ? todo.estPomo.join("/")
                  : "-"
              }}
              /
              {{
                todo.realPomo && todo.realPomo.length
                  ? todo.realPomo.join("/")
                  : "-"
              }}
            </td>
            <td>
              <n-button
                size="tiny"
                type="error"
                secondary
                @click="handleSuspendTodo(todo.id)"
              >
                <template #icon>
                  <n-icon size="18">
                    <ChevronCircleRight48Regular />
                  </n-icon>
                </template>
              </n-button>
            </td>
          </tr>
        </template>
        <tr v-else class="empty-row">
          <td colspan="6" style="text-align: center; padding: 10px">
            暂无今日待办
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <n-popover v-model:show="showPopover" trigger="manual" placement="top-end">
    <template #trigger>
      <div
        style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 1px;
          height: 1px;
        "
      ></div>
    </template>
    {{ popoverMessage }}
  </n-popover>
</template>

<script setup lang="ts">
import type { Todo } from "@/core/types/Todo";
import { formatTime } from "@/core/utils";
import { ChevronCircleRight48Regular } from "@vicons/fluent";
import { NCheckbox, NInputNumber, NPopover } from "naive-ui";
import { ref, computed } from "vue";

// 添加状态来控制提示信息
const showPopover = ref(false);
const popoverMessage = ref("");

// 假设 Todo 类型中 priority 是 number
interface TodoWithNumberPriority extends Omit<Todo, "priority"> {
  priority: number;
}

// 定义 Props
const props = defineProps<{
  todos: TodoWithNumberPriority[];
  activeId: number | null;
}>();

const emit = defineEmits<{
  (e: "drop-todo", id: number): void;
  (
    e: "update-todo-status",
    id: number,
    activityId: number,
    status: string
  ): void;
  (e: "update-todo-priority", id: number, priority: number): void;
  (
    e: "batch-update-priorities",
    updates: Array<{ id: number; priority: number }>
  ): void;
}>();

const editingTodo = ref<TodoWithNumberPriority | null>(null);
const editingPriority = ref<number>(0);

// 处理输入框获取焦点
function handleInputFocus(event: FocusEvent) {
  const inputElement = event.target as HTMLInputElement;
  if (inputElement) {
    inputElement.select();
  }
}

// 对待办事项按优先级降序排序（高优先级在前）
const sortedTodos = computed(() => {
  if (!props.todos || props.todos.length === 0) {
    return [];
  }

  return [...props.todos].sort((a, b) => {
    return b.priority - a.priority; // 降序排列
  });
});

// 将数字优先级转换为对应表情符号
function getPriorityEmoji(priority: number): string {
  const emojis = [
    "0️⃣",
    "1️⃣",
    "2️⃣",
    "3️⃣",
    "4️⃣",
    "5️⃣",
    "6️⃣",
    "7️⃣",
    "8️⃣",
    "9️⃣",
    "🔟",
  ];
  return priority >= 0 && priority <= 10 ? emojis[priority] : "❓";
}

// 开始编辑优先级
function startEditing(todo: TodoWithNumberPriority) {
  editingTodo.value = todo;
  editingPriority.value = todo.priority;
}

// 完成编辑优先级并处理优先级冲突
function finishEditing() {
  if (!editingTodo.value) return;

  // 检查任务数量是否已经达到限制
  const prioritizedTodos = props.todos.filter((todo) => todo.priority > 0);
  if (
    prioritizedTodos.length >= 10 &&
    editingPriority.value > 0 &&
    editingTodo.value.priority === 0
  ) {
    popoverMessage.value = "今天已经有10件优先事项了，不能再添加了";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 3000); // 3秒后自动关闭
    editingTodo.value = null;
    return;
  }

  // 如果优先级没有变化，直接退出编辑模式
  if (editingPriority.value === editingTodo.value.priority) {
    editingTodo.value = null;
    return;
  }

  const oldPriority = editingTodo.value.priority;
  const newPriority = editingPriority.value;

  // 创建更新列表
  const updates: Array<{ id: number; priority: number }> = [];

  // 如果设置为0，只需要更新当前任务
  if (newPriority === 0) {
    updates.push({
      id: editingTodo.value.id,
      priority: 0,
    });
  }
  // 如果是从0设置为其他值，需要检查是否有冲突
  else if (oldPriority === 0) {
    // 查找是否有相同优先级的任务
    const conflictingTodo = props.todos.find(
      (todo) =>
        todo.id !== editingTodo.value!.id && todo.priority === newPriority
    );

    if (conflictingTodo) {
      // 所有大于等于新优先级的任务优先级加1
      props.todos.forEach((todo) => {
        if (todo.id !== editingTodo.value!.id && todo.priority >= newPriority) {
          updates.push({
            id: todo.id,
            priority: todo.priority + 1,
          });
        }
      });
    }

    // 更新当前任务
    updates.push({
      id: editingTodo.value.id,
      priority: newPriority,
    });
  }
  // 如果是交换两个任务的优先级
  else {
    // 找到与新优先级匹配的任务
    const targetTodo = props.todos.find(
      (todo) =>
        todo.id !== editingTodo.value!.id && todo.priority === newPriority
    );

    if (targetTodo) {
      // 简单交换优先级
      updates.push({
        id: targetTodo.id,
        priority: oldPriority,
      });
    }

    // 更新当前任务
    updates.push({
      id: editingTodo.value.id,
      priority: newPriority,
    });
  }

  // 发送批量更新事件
  if (updates.length > 0) {
    emit("batch-update-priorities", updates);

    // 立即更新本地状态以获得良好的用户体验
    updates.forEach((update) => {
      const todo = props.todos.find((t) => t.id === update.id);
      if (todo) {
        todo.priority = update.priority;
      }
    });

    popoverMessage.value = "优先级已更新";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000); // 2秒后自动关闭
  }

  // 退出编辑模式
  editingTodo.value = null;
}

function handleSuspendTodo(id: number) {
  emit("drop-todo", id);
}

function handleCheckboxChange(todo: TodoWithNumberPriority, checked: boolean) {
  const newStatus = checked ? "done" : "";
  todo.status = newStatus;

  emit("update-todo-status", todo.id, todo.activityId, newStatus);
}
</script>

<style scoped>
/* 表格容器样式，占满页面 */
.table-container {
  width: 100%;
  overflow-x: auto; /* 支持横向滚动 */
}

/* 表格占满宽度 */
.full-width-table {
  width: 100%;
  border-collapse: collapse; /* 合并边框 */
  table-layout: fixed; /* 使用固定布局算法 */
}

/* 表头样式 */
.table-header th {
  background-color: #ffe9e1; /* 背景色 */
  padding: 2px;
  text-align: left;
  border-top: 2px solid #ddd; /* 顶部边框 */
  border-bottom: 2px solid #ddd; /* 底部边框 */
  white-space: nowrap; /* 防止文本换行 */
  overflow: hidden; /* 隐藏溢出内容 */
  height: 32px; /* 固定高度 */
}

/* 表格内容样式 */
.table-body td {
  padding-top: 3px;
  border-bottom: 1px solid #ddd; /* 底部边框 */
  text-align: left;
  white-space: normal; /* 允许文本换行 */
  overflow: hidden; /* 隐藏溢出内容 */
  word-break: break-word; /* 允许在单词内换行 */
  min-height: 20px;
  height: auto;
}

/* 优先级单元格样式 */
.priority-cell {
  cursor: pointer;
  text-align: center;
}

/* 允许描述列显示省略号 */
.ellipsis {
  text-overflow: ellipsis; /* 文本溢出显示省略号 */
}

/* 隔行变色 */
.table-body tr:nth-child(even) {
  background-color: #f9f9f9;
}

/* 激活行样式 */
.table-body tr.active-row {
  background-color: rgba(255, 255, 0, 0.378); /* 激活行的底色为黄色 */
}

/* 空行样式 */
.empty-row td {
  height: 40px;
  text-align: center;
}
</style>
