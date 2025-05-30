<!--
  Component: TodayTodo.vue
  Description: 显示多个任务的详细信息或列表。
  Props:
    - todos: Array<Todo> - 任务列表数据
    - activeId: number | null - 当前活动的任务ID
    - selectedRowId: number | null - 从父组件接收选中行ID
  Emits:
    - suspend-todo: (id: number)
    - update-todo-status: (id: number, activityId: number, status: string)
    - update-todo-priority: (id: number, priority: number)
    - batch-update-priorities: (updates: Array<{ id: number; priority: number }>)
    - update-todo-pomo: (id: number, realPomo: number[])
    - update-todo-est: (id: number, estPomo: number[])
    - convert-to-task: (id: number)
    - select-task: (taskId: number | null)
    - select-row: (id: number | null)
  Parent: TodayView.vue
-->
<template>
  <!-- 表格容器，占满父容器宽度 -->
  <div class="table-container">
    <table class="full-width-table">
      <!-- 表头部分，可单独调整样式 -->
      <thead class="table-header">
        <tr>
          <th style="width: 25px"></th>
          <th style="width: 45px; text-align: center">开始</th>
          <th style="width: 40px; text-align: center">优先</th>
          <th style="width: calc(100% - 350px)">描述</th>
          <th style="width: 180px">番茄</th>
          <th style="width: 60px; text-align: center">操作</th>
        </tr>
      </thead>
      <!-- 表格内容部分，可单独调整样式 -->
      <tbody class="table-body">
        <template v-if="sortedTodos.length > 0">
          <tr
            v-for="todo in sortedTodos"
            :key="todo.id"
            :class="{
              'active-row': todo.activityId === activeId,
              'selected-row': todo.id === selectedRowId,
            }"
            @click="handleRowClick(todo)"
            style="cursor: pointer"
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
                      v-if="todo.estPomo && index < todo.estPomo.length - 1"
                      class="pomo-separator"
                      >|</span
                    >
                  </div>
                </template>

                <!-- 新增估计按钮 -->
                <n-button
                  v-if="todo.estPomo && todo.estPomo.length < 3"
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
              <div class="button-group">
                <n-button
                  v-if="!todo.taskId"
                  size="tiny"
                  type="info"
                  secondary
                  @click="handleConvertToTask(todo)"
                  title="追踪任务"
                >
                  <template #icon>
                    <n-icon size="18">
                      <ChevronCircleDown48Regular />
                    </n-icon>
                  </template>
                </n-button>
                <n-button
                  v-if="!todo.realPomo"
                  size="tiny"
                  type="error"
                  secondary
                  @click="handleSuspendTodo(todo.id)"
                  title="取消待办"
                >
                  <template #icon>
                    <n-icon size="18">
                      <ChevronCircleRight48Regular />
                    </n-icon>
                  </template>
                </n-button>
              </div>
            </td>
          </tr>
        </template>
        <tr v-else class="empty-row">
          <td colspan="6" style="text-align: center; padding: 10px">
            暂无待办
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
  ChevronCircleDown48Regular,
} from "@vicons/fluent";
import { NCheckbox, NInputNumber, NPopover, NButton, NIcon } from "naive-ui";
import { ref, computed } from "vue";
import { taskService } from "@/services/taskService";

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
  selectedRowId: number | null; // 新增：从父组件接收选中行ID
}>();

const emit = defineEmits<{
  (e: "suspend-todo", id: number): void;
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
  (e: "convert-to-task", id: number): void;
  (e: "select-task", taskId: number | null): void;
  (e: "select-row", id: number | null): void; // 新增：选中行事件
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
  // 获取已完成任务的优先级集合
  const lockedPriorities = new Set(
    todos
      .filter((t) => t.status === "done" && t.priority > 0)
      .map((t) => t.priority)
  );

  // 获取未完成且优先级>0的任务
  const active = todos
    .filter((t) => t.status !== "done" && t.priority > 0)
    .sort((a, b) => a.priority - b.priority);

  // 获取所有可用的优先级（排除已锁定的）
  const availablePriorities = new Set<number>();
  for (let i = 1; i <= 10; i++) {
    if (!lockedPriorities.has(i)) {
      availablePriorities.add(i);
    }
  }

  // 按顺序分配可用的优先级
  let priorityIndex = 0;
  active.forEach((t) => {
    const availablePriority = Array.from(availablePriorities)[priorityIndex];
    if (availablePriority) {
      t.priority = availablePriority;
      priorityIndex++;
    }
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
  let desiredPriority = editingPriority.value;

  // 如果目标优先级已被锁定，显示提示并退出
  if (desiredPriority > 0 && lockedPriorities.has(desiredPriority)) {
    popoverMessage.value = "该优先级已被占用";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    editingTodo.value = null;
    return;
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
  emit("suspend-todo", id);
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
  if (!todo.estPomo) todo.estPomo = [];
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

// 转换为任务
function handleConvertToTask(todo: TodoWithNumberPriority) {
  if (todo.taskId) {
    popoverMessage.value = "该待办已转换为任务";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    return;
  }

  const task = taskService.createTaskFromTodo(
    todo.id.toString(),
    todo.activityTitle,
    todo.projectName
  );

  if (task) {
    // 立即更新本地的 taskId
    todo.taskId = task.id;
    popoverMessage.value = "已转换为任务";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    emit("convert-to-task", todo.id);
  }
}

// 修改点击行处理函数
function handleRowClick(todo: TodoWithNumberPriority) {
  emit("select-row", todo.id); // 新增：发送选中行事件
  emit("select-task", todo.taskId || null);
}
</script>

<style scoped>
/* 表格容器样式，占满页面 */
.table-container {
  width: 100%;
  overflow-x: auto;
}

:deep(.n-checkbox) {
  --n-check-mark-color: var(--color-text-primary) !important;
  --n-color-checked: transparent !important;
}

:deep(.n-checkbox.n-checkbox--checked .n-checkbox-box .n-checkbox-box__border) {
  border-color: var(--color-text-primary);
  border-width: 1.2px;
}

/* 表格占满宽度 */
.full-width-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

/* 表头样式 */
.table-header th {
  padding: 2px;
  text-align: left;
  border-top: 2px solid var(--color-background-dark);
  border-bottom: 2px solid var(--color-background-dark);
  white-space: nowrap;
  overflow: hidden;
  height: 24px;
}

/* 表格内容样式 */
.table-body td {
  padding-top: 3px;
  border-bottom: 1px solid var(--color-background-dark);
  text-align: left;
  white-space: normal;
  overflow: hidden;
  word-break: break-word;
  min-height: 25px;
  height: 25px;
}
.table-body td:first-child,
.table-body td:nth-child(2),
.table-body td:nth-child(3) {
  text-align: center;
}

.table-body td:nth-child(6) {

  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  min-height: 25px;
  height: 25px;
}
/* 优先级单元格样式 */
.priority-cell {
  cursor: pointer;
  text-align: center;
}

/* 允许描述列显示省略号 */
.ellipsis {
  text-overflow: ellipsis;
}

/* 隔行变色 */
.table-body tr:nth-child(even) {
  background-color: var(--color-background-light-light);
  height: 25px;
}

/* 激活行样式 */
.table-body tr.active-row {
  background-color: var(--color-red-light-transparent) !important;
  transition: background-color 0.2s ease;
}

.table-body tr:hover {
  background-color: var(--color-cyan-light-transparent);
  transition: background-color 0.2s ease;
}

/* 确保激活行的样式优先级高于隔行变色 */
.table-body tr.active-row:nth-child(even) {
  background-color: var(--color-red-light-transparent) !important;
}

/* 空行样式 */
.empty-row td {
  height: 30px;
  text-align: center;
  color: var(--color-text-secondary);
  width: 100%;
}

.priority-badge {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  text-align: center;
  line-height: 18px;
  font-weight: bold;
  color: var(--color-background);
  background-color: var(--color-text-secondary);
  font-size: 16px;
  box-shadow: 0 1px 3px var(--color-background-light);
}

/* 可按 priority 分不同色 */
.priority-1 {
  background-color: var(--color-red);
}
.priority-2 {
  background-color: var(--color-orange);
}
.priority-3 {
  background-color: var(--color-yellow);
  color: var(--color-text-primary);
}
.priority-4 {
  background-color: var(--color-green);
}
.priority-5 {
  background-color: var(--color-blue);
}
.priority-6 {
  background-color: var(--color-purple);
}
.priority-7 {
  background-color: var(--color-purple-dark);
}
.priority-8 {
  background-color: var(--color-cyan);
}
.priority-9 {
  background-color: var(--color-green-dark);
}
.priority-10 {
  background-color: var(--color-orange-dark);
}

.pomo-container {
  display: flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  overflow-x: auto;
}

.pomo-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.pomo-separator {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

/* 确保按钮不会被压缩 */
.pomo-container .n-button {
  flex-shrink: 0;
}

.button-group {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
  height: 24px;
}

/* 选中行样式 */
.table-body tr.selected-row {
  background-color: var(--color-yellow-transparent) !important;
  transition: background-color 0.2s ease;
}

/* 确保选中行的样式优先级高于其他样式 */
.table-body tr.selected-row:nth-child(even) {
  background-color: var(--color-yellow-transparent) !important;
}

/* 同时具有active和selected状态时的样式 */
.table-body tr.active-row.selected-row {
  background-color: var(--color-yellow-transparent) !important;
}
</style>
