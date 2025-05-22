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
            <td>
              {{ todo.taskId ? timestampToTimeString(todo.taskId) : "-" }}
            </td>
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
                <span
                  class="priority-badge"
                  :class="'priority-' + todo.priority"
                >
                  {{ todo.priority > 0 ? todo.priority : "" }}
                </span>
              </template>
            </td>
            <td class="ellipsis">{{ todo.activityTitle ?? "-" }}</td>
            <td>
              <div class="pomo-container">
                {{ todo.pomoType }}
                <template v-for="(est, index) in todo.estPomo" :key="index">
                  <div class="pomo-group">
                    <template v-for="i in est" :key="i">
                      <n-checkbox
                        :checked="isPomoCompleted(todo, index, i)"
                        @update:checked="
                          (checked) => handlePomoCheck(todo, index, i, checked)
                        "
                      />
                    </template>
                    <span
                      v-if="index < todo.estPomo.length - 1"
                      class="pomo-separator"
                      >|</span
                    >
                  </div>
                </template>

                <!-- 新增估计按钮 -->
                <n-button
                  v-if="todo.estPomo.length < 3"
                  size="tiny"
                  type="primary"
                  secondary
                  @click="handleAddEstimate(todo)"
                >
                  <template #icon>
                    <n-icon size="18">
                      <CheckboxArrowRight24Regular />
                    </n-icon>
                  </template>
                </n-button>
              </div>
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
  <n-popover
    v-model:show="showPopover"
    trigger="manual"
    placement="top-end"
    style="width: 200px"
  >
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
  <!-- 添加输入框弹窗 -->
  <n-modal
    v-model:show="showEstimateInput"
    preset="dialog"
    title="新增番茄钟估计"
    positive-text="确认"
    negative-text="取消"
    @positive-click="confirmAddEstimate"
    @negative-click="cancelAddEstimate"
    style="width: 300px"
  >
    <n-input-number
      v-model:value="newEstimate"
      :min="1"
      :max="5"
      placeholder="请输入估计的番茄数"
      style="width: 100%"
    />
  </n-modal>
</template>

<script setup lang="ts">
import type { Todo } from "@/core/types/Todo";
import { timestampToTimeString } from "@/core/utils";
import {
  ChevronCircleRight48Regular,
  CheckboxArrowRight24Regular,
} from "@vicons/fluent";
import { NCheckbox, NInputNumber, NPopover } from "naive-ui";
import { ref, computed } from "vue";

// 添加状态来控制提示信息
const showPopover = ref(false);
const popoverMessage = ref("");

// 添加状态来控制输入框的显示
const showEstimateInput = ref(false);
const currentTodoId = ref<number | null>(null);
const newEstimate = ref<number>(1);

// Todo 类型中 priority 是 number
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
  (e: "update-todo-pomo", id: number, realPomo: number[]): void;
  (e: "update-todo-est", id: number, estPomo: number[]): void;
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
    // 0 放最后
    if (a.priority === 0 && b.priority === 0) return 0;
    if (a.priority === 0) return 1;
    if (b.priority === 0) return -1;
    // 其余越小越优先
    return a.priority - b.priority;
  });
});

// 开始编辑优先级
function startEditing(todo: TodoWithNumberPriority) {
  editingTodo.value = todo;
  editingPriority.value = todo.priority;
}

// 重新排序
function relayoutPriority(todos: TodoWithNumberPriority[]) {
  // 只管"未完成+优先级>0"的 task
  const active = todos
    .filter((t) => t.status !== "done" && t.priority > 0)
    .sort((a, b) => a.priority - b.priority);

  active.forEach((t, idx) => {
    t.priority = idx + 1;
  });
}
// 结束优先级编辑
function finishEditing() {
  if (!editingTodo.value) return;

  // 1. 统计已完成任务的优先级集合（要锁定）
  const lockedPriorities = new Set(
    props.todos
      .filter((t) => t.status === "done" && t.priority > 0)
      .map((t) => t.priority)
  );

  // 2. 统计所有未完成任务
  const activeTodos = props.todos.filter(
    (t) => t.status !== "done" && t.priority > 0
  );

  // 3. 优先级调整
  // 用户想设置 newPriority，如果这个数字已经被锁定，则往后选下一个没被占用的
  let desiredPriority = editingPriority.value;
  while (desiredPriority > 0 && lockedPriorities.has(desiredPriority)) {
    desiredPriority++;
  }

  // 4. 检查是否真的发生了变化
  if (editingTodo.value.priority === desiredPriority) {
    editingTodo.value = null;
    return;
  }

  // 5. 准备批量更新
  const updates: Array<{ id: number; priority: number }> = [];

  // 如果设置为0，单独处理
  if (desiredPriority === 0) {
    updates.push({
      id: editingTodo.value.id,
      priority: 0,
    });
  } else {
    // 处理冲突：所有 >= 新优先级的未完成任务，编号往后挪
    activeTodos.forEach((t) => {
      if (t.id !== editingTodo.value!.id && t.priority >= desiredPriority) {
        updates.push({ id: t.id, priority: t.priority + 1 });
      }
    });

    // 当前项赋值
    updates.push({
      id: editingTodo.value.id,
      priority: desiredPriority,
    });
  }

  // 6. 应用更新
  if (updates.length > 0) {
    emit("batch-update-priorities", updates);

    // 立即更新本地状态以获得良好的用户体验
    updates.forEach((update) => {
      const todo = props.todos.find((t) => t.id === update.id);
      if (todo) todo.priority = update.priority;
    });

    popoverMessage.value = "优先级已更新";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
  }

  // 退出编辑模式
  editingTodo.value = null;
  //  确保优先级连续
  relayoutPriority(props.todos);
}

// suspended Todo
function handleSuspendTodo(id: number) {
  emit("drop-todo", id);
}

function handleCheckboxChange(todo: TodoWithNumberPriority, checked: boolean) {
  const newStatus = checked ? "done" : "ongoing";
  todo.status = newStatus;

  emit("update-todo-status", todo.id, todo.activityId, newStatus);
}

// 番茄估计
// 检查番茄钟是否完成
function isPomoCompleted(
  todo: Todo,
  estIndex: number,
  pomoIndex: number
): boolean {
  if (!todo.realPomo || todo.realPomo.length <= estIndex) return false;
  return todo.realPomo[estIndex] >= pomoIndex;
}

// 处理番茄钟勾选
function handlePomoCheck(
  todo: Todo,
  estIndex: number,
  pomoIndex: number,
  checked: boolean
) {
  // 确保 realPomo 数组存在且长度与 estPomo 一致
  if (!todo.realPomo) todo.realPomo = [];
  while (todo.realPomo.length < todo.estPomo.length) {
    todo.realPomo.push(0);
  }

  if (checked) {
    todo.realPomo[estIndex] = Math.max(todo.realPomo[estIndex], pomoIndex);
  } else {
    todo.realPomo[estIndex] = Math.min(todo.realPomo[estIndex], pomoIndex - 1);
  }

  // 通知父组件更新
  emit("update-todo-pomo", todo.id, todo.realPomo);
}

// 处理新增估计
function handleAddEstimate(todo: Todo) {
  currentTodoId.value = todo.id;
  newEstimate.value = 1;
  showEstimateInput.value = true;
}

// 确认添加新的估计
function confirmAddEstimate() {
  if (!currentTodoId.value) return;

  const todo = props.todos.find((t) => t.id === currentTodoId.value);
  if (!todo) return;

  // 确保 estPomo 数组存在
  if (!todo.estPomo) todo.estPomo = [];

  // 添加新的估计值
  todo.estPomo.push(newEstimate.value);

  // 通知父组件更新
  emit("update-todo-est", todo.id, todo.estPomo);

  // 重置状态并关闭对话框
  showEstimateInput.value = false;
  currentTodoId.value = null;
  newEstimate.value = 1; // 重置为默认值
}

// 取消添加
function cancelAddEstimate() {
  showEstimateInput.value = false;
  currentTodoId.value = null;
  newEstimate.value = 1; // 重置为默认值
}
</script>

<style scoped>
/* 表格容器样式，占满页面 */
.table-container {
  width: 100%;
  overflow-x: auto; /* 支持横向滚动 */
}

:deep(.n-checkbox) {
  --n-check-mark-color: #343434 !important;
  --n-color-checked: transparent !important;
}

:deep(.n-checkbox.n-checkbox--checked .n-checkbox-box .n-checkbox-box__border) {
  border-color: #343434;
  border-width: 1.2px;
}

/* 表格占满宽度 */
.full-width-table {
  width: 100%;
  border-collapse: collapse; /* 合并边框 */
  table-layout: fixed; /* 使用固定布局算法 */
}

/* 表头样式 */
.table-header th {
  background-color: rgba(198, 219, 244, 0.3); /* 背景色 */
  padding: 2px;
  text-align: left;
  border-top: 2px solid #ddd; /* 顶部边框 */
  border-bottom: 2px solid #ddd; /* 底部边框 */
  white-space: nowrap; /* 防止文本换行 */
  overflow: hidden; /* 隐藏溢出内容 */
  height: 24px; /* 固定高度 */
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
.priority-badge {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  text-align: center;
  line-height: 18px;
  font-weight: bold;
  color: #fff;
  background-color: #bbb;
  font-size: 16px;
  box-shadow: 0 1px 3px #eee;
}

/* 可按 priority 分不同色 */
.priority-1 {
  background-color: #ef5350;
}
.priority-2 {
  background-color: #ff9800;
}
.priority-3 {
  background-color: #ffc107;
  color: #555;
}
.priority-4 {
  background-color: #4caf50;
}
.priority-5 {
  background-color: #2196f3;
}
.priority-6 {
  background-color: #9575cd;
}
.priority-7 {
  background-color: #7e57c2;
}
.priority-8 {
  background-color: #26a69a;
}
.priority-9 {
  background-color: #789262;
}
.priority-10 {
  background-color: #8d6e63;
}
.pomo-container {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap; /* 防止换行 */
  overflow-x: auto; /* 如果内容过长允许横向滚动 */
}

.pomo-group {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0; /* 防止压缩 */
}

.pomo-separator {
  margin: 0 4px;
  color: #999;
  flex-shrink: 0; /* 防止压缩 */
}

/* 确保按钮不会被压缩 */
.pomo-container .n-button {
  flex-shrink: 0;
}
</style>
