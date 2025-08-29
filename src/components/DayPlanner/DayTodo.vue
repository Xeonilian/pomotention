<!--
  Component: DayTodo.vue
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

    - select-task: (taskId: number | null)
    - select-row: (id: number | null)
  Parent: DayView.vue
-->
<template>
  <!-- 表格容器，占满父容器宽度 -->
  <div class="table-container">
    <table class="full-width-table">
      <!-- 表头部分，可单独调整样式 -->
      <thead class="table-header">
        <tr>
          <th style="width: 18px"></th>
          <th style="width: 34px; text-align: center">开始</th>
          <th style="width: 34px; text-align: center">结束</th>
          <th style="width: 30px; text-align: center">排序</th>
          <th style="width: 40%; min-width: 100px; text-align: center">
            任务描述
          </th>
          <th style="width: 30%; min-width: 80px">累积果果</th>
          <th style="width: 18px; text-align: center">打扰</th>
          <th style="width: 50px; text-align: center">操作</th>
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
              'done-row': todo.status === 'done',
              'cancel-row': todo.status === 'cancelled',
            }"
            @click="handleRowClick(todo)"
            style="cursor: pointer"
          >
            <td>
              <n-checkbox
                v-if="todo.status !== 'cancelled'"
                :checked="todo.status === 'done'"
                @update:checked="handleCheckboxChange(todo.id, $event)"
              />

              <n-icon
                v-else
                size="22"
                style="transform: translate(0px, 3px)"
                color="var(--color-red)"
              >
                <DismissSquare20Filled />
              </n-icon>
            </td>
            <!-- 开始时间 -->
            <td
              @dblclick.stop="startEditing(todo.id, 'start')"
              :title="
                editingRowId === todo.id && editingField === 'start'
                  ? ''
                  : '双击编辑'
              "
            >
              <input
                v-if="editingRowId === todo.id && editingField === 'start'"
                v-model="editingValue"
                @blur="saveEdit(todo)"
                @keyup.enter="saveEdit(todo)"
                @keyup.esc="cancelEdit"
                ref="editingInput"
                class="start-input time-input"
                :data-todo-id="todo.id"
                maxlength="5"
                autocomplete="off"
              />
              <span v-else>{{
                todo.startTime ? timestampToTimeString(todo.startTime) : "-"
              }}</span>
            </td>
            <!-- 结束时间 -->
            <td
              @dblclick.stop="startEditing(todo.id, 'done')"
              :title="
                editingRowId === todo.id && editingField === 'done'
                  ? ''
                  : '双击编辑'
              "
            >
              <input
                v-if="editingRowId === todo.id && editingField === 'done'"
                v-model="editingValue"
                @blur="saveEdit(todo)"
                @keyup.enter="saveEdit(todo)"
                @keyup.esc="cancelEdit"
                ref="editingInput"
                class="done-input time-input"
                :data-todo-id="todo.id"
                maxlength="5"
                autocomplete="off"
              />
              <span v-else>{{
                todo.doneTime ? timestampToTimeString(todo.doneTime) : "-"
              }}</span>
            </td>
            <td class="priority-cell" @click="startEditingPriority(todo)">
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
                  {{ todo.priority > 0 ? todo.priority : "—" }}
                </span>
              </template>
            </td>
            <td
              class="ellipsis title-cell"
              :class="{
                'done-cell': todo.status === 'done',
                'cancel-cell': todo.status === 'cancelled',
              }"
              @dblclick.stop="startEditing(todo.id, 'title')"
              :title="
                editingRowId === todo.id && editingField === 'title'
                  ? ''
                  : '双击编辑'
              "
            >
              <input
                v-if="editingRowId === todo.id && editingField === 'title'"
                v-model="editingValue"
                @blur="saveEdit(todo)"
                @keyup.enter="saveEdit(todo)"
                @keyup.esc="cancelEdit"
                @click.stop
                class="title-input"
                :data-todo-id="todo.id"
                ref="editingInput"
              />
              <span v-else>{{ todo.activityTitle ?? "-" }}</span>
            </td>
            <td>
              <div class="pomo-container">
                <!-- 将所有番茄钟内容包装在一个容器中 -->
                <div class="pomo-groups">
                  <template v-for="(est, index) in todo.estPomo" :key="index">
                    <div class="pomo-group">
                      <template v-for="i in est" :key="i">
                        <n-checkbox
                          :checked="isPomoCompleted(todo, index, i)"
                          :class="{
                            'pomo-cherry': todo.pomoType === '🍒',
                            'pomo-grape': todo.pomoType === '🍇',
                            'pomo-tomato': todo.pomoType === '🍅',
                          }"
                          @update:checked="
                            (checked: any) =>
                              handlePomoCheck(todo, index, i, checked)
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
                </div>

                <!-- 删除估计按钮  -->
                <n-button
                  v-if="
                    todo.pomoType != '🍒' &&
                    todo.estPomo &&
                    todo.estPomo.length > 1 &&
                    todo.estPomo.length < 4 &&
                    todo.status !== 'done'
                  "
                  text
                  @click="handleDeleteEstimate(todo)"
                  title="减少预估番茄数量"
                  class="button-left"
                >
                  <template #icon>
                    <n-icon size="14">
                      <ArrowExportRtl20Regular />
                    </n-icon>
                  </template>
                </n-button>

                <!-- 新增估计按钮  -->
                <n-button
                  v-if="
                    todo.pomoType != '🍒' &&
                    todo.estPomo &&
                    todo.estPomo.length < 3 &&
                    todo.status !== 'done'
                  "
                  text
                  @click="handleAddEstimate(todo)"
                  title="增加预估番茄数量"
                  class="button-right"
                >
                  <template #icon>
                    <n-icon size="14">
                      <ArrowExportLtr20Regular />
                    </n-icon>
                  </template>
                </n-button>
              </div>
            </td>
            <td></td>
            <td>
              <div class="button-group">
                <!-- 追踪任务按钮 -->
                <n-button
                  v-if="!todo.taskId"
                  text
                  type="info"
                  @click="handleConvertToTask(todo)"
                  title="追踪任务"
                >
                  <template #icon>
                    <n-icon size="18">
                      <ChevronCircleDown48Regular />
                    </n-icon>
                  </template>
                </n-button>
                <!-- <n-button
                  v-if="todo.status !== 'done'"
                  text
                  type="info"
                  @click="handleRepeatTodo(todo.id)"
                  title="重复待办，新建活动"
                >
                  <template #icon>
                    <n-icon size="18">
                      <ArrowRepeatAll24Regular />
                    </n-icon>
                  </template>
                </n-button> -->
                <!-- 取消任务按钮 -->
                <n-button
                  v-if="
                    !todo.realPomo &&
                    todo.status !== 'done' &&
                    todo.status !== 'cancelled'
                  "
                  text
                  type="info"
                  @click="handleCancelTodo(todo.id)"
                  title="取消任务，不退回活动清单"
                >
                  <template #icon>
                    <n-icon size="18">
                      <DismissCircle20Regular />
                    </n-icon>
                  </template>
                </n-button>
                <!-- 退回任务按钮 = 不再在今日 -->
                <n-button
                  v-if="
                    !todo.realPomo &&
                    todo.status !== 'done' &&
                    !todo.taskId &&
                    todo.status !== 'cancelled'
                  "
                  text
                  type="info"
                  @click="handleSuspendTodo(todo.id)"
                  title="撤销任务，退回活动清单"
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
          <td colspan="8" style="text-align: center; padding: 10px">
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
  ArrowExportLtr20Regular,
  ChevronCircleDown48Regular,
  DismissCircle20Regular,
  // ArrowRepeatAll24Regular,
  DismissSquare20Filled,
  ArrowExportRtl20Regular,
} from "@vicons/fluent";
import { NCheckbox, NInputNumber, NPopover, NButton, NIcon } from "naive-ui";
import { ref, computed, nextTick } from "vue";
import { taskService } from "@/services/taskService";
import { Task } from "@/core/types/Task";

// 编辑用
const editingRowId = ref<number | null>(null);
const editingField = ref<null | "title" | "start" | "done">(null);
const editingValue = ref("");
const editingInput = ref<HTMLInputElement>();

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
  (e: "cancel-todo", id: number): void;
  // (e: "repeat-todo", id: number): void;
  (e: "update-todo-status", id: number, checked: boolean): void;
  (e: "update-todo-priority", id: number, priority: number): void;
  (
    e: "batch-update-priorities",
    updates: Array<{ id: number; priority: number }>
  ): void;
  (e: "update-todo-pomo", id: number, realPomo: number[]): void;
  (e: "update-todo-est", id: number, estPomo: number[]): void;

  (e: "select-task", taskId: number | null): void;
  (e: "select-row", id: number | null): void;
  (e: "select-activity", activityId: number | null): void;
  (e: "edit-todo-title", id: number, newTitle: string): void;
  (e: "edit-todo-start", id: number, newTs: string): void;
  (e: "edit-todo-done", id: number, newTs: string): void;
  (e: "convert-todo-to-task", payload: { task: Task; todoId: number }): void;
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
function startEditingPriority(todo: TodoWithNumberPriority) {
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

function handleCheckboxChange(id: number, checked: boolean) {
  emit("update-todo-status", id, checked);
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

// 删除估计
function handleDeleteEstimate(todo: Todo) {
  if (todo.estPomo && todo.estPomo.length > 0) {
    // 要删除的下标是最后一项
    const delIdx = todo.estPomo.length - 1;
    if (
      todo.realPomo &&
      delIdx < todo.realPomo.length &&
      todo.realPomo[delIdx] !== undefined &&
      todo.realPomo[delIdx] !== 0
    ) {
      // realPomo此位置已被填写，提示不能删
      popoverMessage.value = "已经有实际完成，不可删除~";
      showPopover.value = true;
      setTimeout(() => {
        showPopover.value = false;
      }, 2000);
      return;
    }
    // 可以删
    todo.estPomo.pop();
    emit("update-todo-est", todo.id, todo.estPomo);
  } else {
    popoverMessage.value = "没啦，别删了~";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    return;
  }
}

// 修改点击行处理函数
function handleRowClick(todo: TodoWithNumberPriority) {
  emit("select-row", todo.id); // 新增：发送选中行事件
  emit("select-task", todo.taskId || null);
  emit("select-activity", todo.activityId || null);
}

// 编辑相关函数
function startEditing(todoId: number, field: "title" | "start" | "done") {
  const todo = props.todos.find((t) => t.id === todoId);
  if (!todo) return;
  editingRowId.value = todoId;
  editingField.value = field;
  editingValue.value =
    field === "title"
      ? todo.activityTitle || ""
      : field === "start"
      ? todo.taskId
        ? timestampToTimeString(todo.taskId)
        : ""
      : todo.doneTime
      ? timestampToTimeString(todo.doneTime)
      : "";

  // 使用 querySelector 来获取当前编辑的输入框，而不是依赖 ref
  nextTick(() => {
    const input = document.querySelector(
      `input.${field}-input[data-todo-id="${todoId}"]`
    );
    if (input) {
      (input as HTMLInputElement).focus();
    }
  });
}

// 注意这里是 timestring 不是timestamp，是在Home用currentViewdate进行的转化
function saveEdit(todo: TodoWithNumberPriority) {
  if (!editingRowId.value) return;

  if (editingField.value === "title") {
    if (editingValue.value.trim()) {
      emit("edit-todo-title", todo.id, editingValue.value.trim());
    }
  }

  if (editingField.value === "start") {
    if (isValidTimeString(editingValue.value)) {
      const ts = editingValue.value;
      emit("edit-todo-start", todo.id, ts);
    }
  }

  if (editingField.value === "done") {
    if (isValidTimeString(editingValue.value)) {
      const ts = editingValue.value;
      emit("edit-todo-done", todo.id, ts);
    } else {
      if (editingValue.value === "") {
        emit("edit-todo-done", todo.id, "");
      }
    }
  }
  cancelEdit();
}

function cancelEdit() {
  editingRowId.value = null;
  editingField.value = null;
  editingValue.value = "";
}

function isValidTimeString(str: string) {
  return (
    /^\d{2}:\d{2}$/.test(str) &&
    +str.split(":")[0] <= 24 &&
    +str.split(":")[1] < 60
  );
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
    todo.id,
    todo.activityTitle,
    todo.projectName
  );

  if (task) {
    // 立即更新本地的 taskId
    todo.taskId = task.id;

    emit("convert-todo-to-task", { task: task, todoId: todo.id });
    popoverMessage.value = "完成任务转换";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
  }
}

// suspended Todo
function handleSuspendTodo(id: number) {
  emit("suspend-todo", id);
}

function handleCancelTodo(id: number) {
  emit("cancel-todo", id);
}

// function handleRepeatTodo(id: number) {
//   emit("repeat-todo", id);
// }
</script>

<style scoped>
/* 表格容器样式，占满页面 */
.table-container {
  width: 100%;
  overflow-x: auto;
}

:deep(.n-checkbox) {
  --n-color-checked: transparent !important;
  --n-check-mark-color: var(--color-text-primary) !important;
}

.pomo-tomato :deep(.n-checkbox-box) {
  --n-color: var(--color-red-light-transparent);
  --n-box-shadow-focus: 0 0 0 0;
  --n-border: 1px solid var(--color-red-dark);
  --n-border-checked: 1px solid var(--color-red-dark);
}

.pomo-cherry :deep(.n-checkbox-box) {
  --n-color: var(--color-green-light-transparent);
  --n-box-shadow-focus: 0 0 0 0;
  --n-border: 1px solid var(--color-green-dark);
  --n-border-checked: 1px solid var(--color-green-dark);
}

.pomo-grape :deep(.n-checkbox-box) {
  /* --n-color-checked: var(--color-purple-light); */
  --n-color: var(--color-purple-light-transparent);
  --n-box-shadow-focus: 0 0 0 0;
  --n-border: 1px solid var(--color-purple-dark);
  --n-border-checked: 1px solid var(--color-purple-dark);
}

/* 表格占满宽度 */
.full-width-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

/* 表头样式 */
.table-header th {
  overflow: visible;
  padding: 2px;
  text-align: left;
  border-bottom: 2px solid var(--color-background-dark);
  white-space: nowrap;
  height: 20px;
  font-weight: 400;
  color: var(--color-text-secondary);
  line-height: 1.3;
}

/* 表格内容样式 */
.table-body td {
  padding-top: 3px;
  border-bottom: 1px solid var(--color-background-dark);
  white-space: nowrap;
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

.table-body td:nth-child(8) {
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
  text-overflow: ellipsis !important;
}

/* 隔行变色 */
.table-body tr:nth-child(even) {
  background-color: var(--color-background-light-transparent);
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
  border-bottom: 1px solid var(--color-background);
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
  background-color: var(--color-background-dark);
  font-size: 16px;
  box-shadow: 0 1px 3px var(--color-background-light);
}

/* 可按 priority 分不同色 */
.priority-0 {
  background-color: var(--color-background);
  color: var(--color-text-secondary);
}
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
  white-space: nowrap;
  flex-shrink: 0;
}

.pomo-groups {
  padding-left: 1px;
  padding-right: 1px;
  overflow-x: auto;
  overflow-y: hidden;
}

.pomo-group {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  margin-right: 1px;
  gap: 1px;
}

.pomo-separator {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.button-left {
  display: flex;
  margin-left: -4px;
}

.button-right {
  display: flex;
  margin-left: -2px;
  right: 3px !important;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  height: 24px;
  overflow: visible;
}

:deep(.n-button) :hover {
  color: var(--color-red);
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

/* 完成行样式 */
.done-row {
  color: var(--color-text-secondary);
}

.done-cell {
  text-decoration: line-through var(--color-text-secondary) 0.5px;
}

.cancel-row {
  color: var(--color-text-secondary);
}

.cancel-cell {
  font-style: italic;
}

.title-cell {
  position: relative;
  cursor: pointer;
}

.title-cell:hover::after {
  content: "双击编辑";
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
}

.title-input {
  width: calc(100% - 10px);
  border: 1px solid #d9d9d9;
  border-radius: 4px;

  font-size: inherit;
  font-family: inherit;
  outline: none;
}

.title-input:focus {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(64, 169, 255, 0.2);
}

.time-input {
  border: 1px solid #d9d9d9;
  max-width: 100%;
  border-radius: 4px;
  font-size: inherit;
  font-family: inherit;
  outline: none;
}
.start-input,
.done-input {
  width: 42px !important;
  max-width: 42px !important;
  min-width: 0 !important;
  box-sizing: border-box;
  padding: 2px 4px;
  font-size: inherit;
}

.time-input:focus {
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(64, 169, 255, 0.2);
}
</style>
