<!--
  Component: DayTodo.vue
-->
<template>
  <div class="table-container">
    <table class="full-width-table">
      <colgroup>
        <!-- 勾选 -->
        <col class="col-check" />
        <!-- 开始 -->
        <col class="col-start" />
        <!-- 结束 -->
        <col class="col-end" />
        <!-- 排序 -->
        <col class="col-rank" />
        <!-- 意图 -->
        <col class="col-intent" />
        <!-- 果果 -->
        <col class="col-fruit" />
        <!-- 状态 -->
        <col class="col-status" />
      </colgroup>

      <thead>
        <tr>
          <th class="col-check"></th>
          <th class="col-start">开始</th>
          <th class="col-end">结束</th>
          <th class="col-rank">排序</th>
          <th class="col-intent">意图</th>
          <th class="col-fruit">果果</th>
          <th class="col-status">状态</th>
        </tr>
      </thead>

      <tbody>
        <template v-if="sortedTodos.length > 0">
          <!-- 行 -->
          <tr
            v-for="todo in sortedTodos"
            :key="todo.id"
            :class="{
              'active-row': todo.activityId === activeId,
              'selected-row': todo.id === selectedRowId,
              'done-row': todo.status === 'done',
              'cancel-row': todo.status === 'cancelled',
            }"
            @click.stop="handleRowClick(todo)"
            style="cursor: pointer"
          >
            <!-- 单元格 -->
            <!-- 1 完成状态 -->
            <td class="col-check">
              <n-checkbox
                v-if="todo.status !== 'cancelled'"
                :checked="todo.status === 'done'"
                @update:checked="handleCheckboxChange(todo.id, $event)"
              />
              <n-icon
                v-else
                class="cancel-icon"
                color="var(--color-text-secondary)"
              >
                <DismissSquare20Filled />
              </n-icon>
            </td>

            <!-- 2 开始时间 -->
            <td
              class="col-start"
              @dblclick.stop="startEditing(todo.id, 'start')"
              :title="
                editingRowId === todo.id && editingField === 'start'
                  ? ''
                  : '双击编辑'
              "
            >
              <input
                class="start-input time-input"
                v-if="editingRowId === todo.id && editingField === 'start'"
                v-model="editingValue"
                @blur="saveEdit(todo)"
                @keyup.enter="saveEdit(todo)"
                @keyup.esc="cancelEdit"
                :data-todo-id="todo.id"
                maxlength="5"
                autocomplete="off"
              />
              <span v-else>{{
                todo.startTime ? timestampToTimeString(todo.startTime) : "-"
              }}</span>
            </td>

            <!-- 3 结束时间 -->
            <td
              class="col-end"
              @dblclick.stop="startEditing(todo.id, 'done')"
              :title="
                editingRowId === todo.id && editingField === 'done'
                  ? ''
                  : '双击编辑'
              "
            >
              <input
                class="done-input time-input"
                v-if="editingRowId === todo.id && editingField === 'done'"
                v-model="editingValue"
                @blur="saveEdit(todo)"
                @keyup.enter="saveEdit(todo)"
                @keyup.esc="cancelEdit"
                :data-todo-id="todo.id"
                maxlength="5"
                autocomplete="off"
              />
              <span v-else>{{
                todo.doneTime ? timestampToTimeString(todo.doneTime) : "-"
              }}</span>
            </td>

            <!-- 4 排序 -->
            <td class="col-rank" @click.stop="startEditingPriority(todo)">
              <n-input-number
                class="rank-input"
                v-if="editingTodo && editingTodo.id === todo.id"
                v-model:value="editingPriority"
                :min="0"
                :max="11"
                size="small"
                :show-button="false"
                placeholder=" "
                @blur="finishEditing"
                @keydown.enter="finishEditing"
              />

              <span
                v-else
                class="priority-badge"
                :class="'priority-' + todo.priority"
              >
                {{ todo.priority > 0 ? todo.priority : "—" }}
              </span>
            </td>

            <!-- 5 意图 -->
            <td
              class="col-intent"
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
                class="title-input"
                v-if="editingRowId === todo.id && editingField === 'title'"
                v-model="editingValue"
                @blur="saveEdit(todo)"
                @keyup.enter="saveEdit(todo)"
                @keyup.esc="cancelEdit"
                @click.stop
                :data-todo-id="todo.id"
              />
              <span class="ellipsis" v-else>{{
                todo.activityTitle ?? "-"
              }}</span>
            </td>

            <!-- 6 果果 -->
            <td class="col-fruit">
              <div class="pomo-container">
                <!-- 将所有番茄钟内容包装在一个容器中 -->
                <div class="pomo-groups">
                  <template v-for="(est, index) in todo.estPomo" :key="index">
                    <div class="pomo-group">
                      <template v-for="i in est" :key="i">
                        <n-checkbox
                          :class="{
                            'pomo-cherry': todo.pomoType === '🍒',
                            'pomo-grape': todo.pomoType === '🍇',
                            'pomo-tomato': todo.pomoType === '🍅',
                          }"
                          :checked="isPomoCompleted(todo, index, i)"
                          :disabled="todo.status === 'cancelled'"
                          @update:checked="
                            (checked: any) =>
                              handlePomoCheck(todo, index, i, checked)
                          "
                        />
                      </template>
                      <span
                        class="pomo-separator"
                        v-if="todo.estPomo && index < todo.estPomo.length - 1"
                        >|</span
                      >
                    </div>
                  </template>
                </div>
                <div
                  v-if="todo.status !== 'done' && todo.status !== 'cancelled'"
                  class="est-buttons"
                >
                  <!-- 删除估计按钮  -->
                  <n-button
                    class="button-left"
                    v-if="
                      todo.pomoType != '🍒' &&
                      todo.estPomo &&
                      todo.estPomo.length > 1 &&
                      todo.estPomo.length < 4
                    "
                    text
                    @click="handleDeleteEstimate(todo)"
                    title="减少预估番茄数量"
                  >
                    <template #icon>
                      <n-icon size="18" color="var(--color-background-dark)">
                        <CaretLeft12Filled />
                      </n-icon>
                    </template>
                  </n-button>

                  <!-- 新增估计按钮  -->
                  <n-button
                    class="button-right"
                    :class="{ 'bidirection-mode': todo.estPomo.length === 2 }"
                    v-if="
                      todo.pomoType != '🍒' &&
                      todo.estPomo &&
                      todo.estPomo.length < 3
                    "
                    text
                    type="default"
                    @click="handleAddEstimate(todo)"
                    title="增加预估番茄数量"
                  >
                    <template #icon>
                      <n-icon size="18" color="var(--color-background-dark)">
                        <CaretRight12Filled />
                      </n-icon>
                    </template>
                  </n-button>
                </div>
              </div>
            </td>

            <!-- 7 状态 -->
            <td class="status-col">
              <div
                class="status-cell"
                :class="{
                  'check-mode':
                    todo.status === 'done' || todo.status === 'cancelled',
                }"
              >
                <div
                  class="records-stat"
                  v-if="todo.taskId"
                  title="能量值 | 奖赏值 | 内部打扰 | 外部打扰"
                >
                  {{ averageValue(todo.energyRecords) }}|{{
                    averageValue(todo.rewardRecords)
                  }}|{{ countInterruptions(todo.interruptionRecords, "I") }}|{{
                    countInterruptions(todo.interruptionRecords, "E")
                  }}
                </div>
                <div
                  class="button-group"
                  v-if="todo.status !== 'done' && todo.status !== 'cancelled'"
                >
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
                    v-if="!todo.realPomo"
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
                    v-if="!todo.realPomo && !todo.taskId"
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
              </div>
            </td>
          </tr>
        </template>
        <tr v-else class="empty-row">
          <td colspan="7" style="text-align: center; padding: 10px">
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
import type { Todo, TodoWithTaskRecords } from "@/core/types/Todo";
import { timestampToTimeString } from "@/core/utils";
import {
  ChevronCircleRight48Regular,
  ChevronCircleDown48Regular,
  DismissCircle20Regular,
  // ArrowRepeatAll24Regular,
  DismissSquare20Filled,
  CaretLeft12Filled,
  CaretRight12Filled,
} from "@vicons/fluent";
import { NCheckbox, NInputNumber, NPopover, NButton, NIcon } from "naive-ui";
import { ref, computed, nextTick } from "vue";
import { taskService } from "@/services/taskService";
import { Task } from "@/core/types/Task";

// 编辑用
const editingRowId = ref<number | null>(null);
const editingField = ref<null | "title" | "start" | "done">(null);
const editingValue = ref("");

// 添加状态来控制提示信息
const showPopover = ref(false);
const popoverMessage = ref("");

// 添加状态来控制输入框的显示
const showEstimateInput = ref(false);
const currentTodoId = ref<number | null>(null);
const newEstimate = ref<number>(1);

// 定义 Props
const props = defineProps<{
  todos: TodoWithTaskRecords[];
  activeId: number | null | undefined;
  selectedRowId: number | null; // 新增：从父组件接收选中行ID
}>();

const emit = defineEmits<{
  (e: "suspend-todo", id: number): void;
  (e: "cancel-todo", id: number): void;
  // (e: "repeat-todo", id: number): void;
  (e: "update-todo-status", id: number, checked: boolean): void;
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

// 优先级 排序================
const editingTodo = ref<Todo | null>(null);
const editingPriority = ref<number>(0);

// 开始编辑优先级
function startEditingPriority(todo: Todo) {
  editingTodo.value = todo;
  editingPriority.value = todo.priority;
  nextTick(() => {
    const input = document.querySelector(".rank-input .n-input__input-el");
    if (input) {
      console.log(input);
      (input as HTMLInputElement).select();
    }
  });
}

function finishEditing() {
  if (!editingTodo.value) return;
  if (
    editingTodo.value.status === "done" ||
    editingTodo.value.status === "cancelled"
  ) {
    popoverMessage.value = "当前任务已经结束！";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    editingTodo.value = null;
    return;
  }
  if (editingPriority.value === 11) {
    popoverMessage.value = "请输入1-10";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    editingTodo.value = null;
    return;
  }

  const current = editingTodo.value;
  const desired = editingPriority.value;

  if (current.priority === desired) {
    editingTodo.value = null;
    return;
  }

  const before = new Map<number, number>();
  props.todos.forEach((t) => before.set(t.id, t.priority));

  // 关键：不再提前修改 priority，而是把 current 和 desired 传给排序函数
  // 让排序函数自己去智能处理
  relayoutPriority(props.todos, current, desired);

  // 后续逻辑不变...
  const updates: Array<{ id: number; priority: number }> = [];
  props.todos.forEach((t) => {
    const oldP = before.get(t.id);
    if (oldP !== t.priority) {
      updates.push({ id: t.id, priority: t.priority });
    }
  });

  if (updates.length > 0) {
    popoverMessage.value = "优先级已更新";
    showPopover.value = true;
    setTimeout(() => (showPopover.value = false), 2000);
    emit("batch-update-priorities", updates);
  }

  editingTodo.value = null;
}

// 传入 current 和 desired，让排序更智能
function relayoutPriority(todos: Todo[], current: Todo, desired: number) {
  const locked = new Set<number>();
  todos.forEach((t) => {
    if (t.status === "done" && t.priority > 0) locked.add(t.priority);
  });

  const active = todos.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  );

  active.sort((a, b) => {
    // 为 a 和 b 获取用于比较的“有效优先级”
    let pA = a.priority;
    let pB = b.priority;

    // 如果任务是正在被移动的那个，使用它的“目标优先级”
    if (a.id === current.id) pA = desired;
    if (b.id === current.id) pB = desired;

    // 如果是把一个任务往前移（例如 P3 -> P1）
    // 正在移动的任务应该排在目标位置任务的“前面”
    if (a.id === current.id && a.priority > desired && pA === pB) {
      return -1;
    }
    // 如果是把一个任务往后移（例如 P1 -> P3）
    // 正在移动的任务应该排在目标位置任务的“后面”
    if (a.id === current.id && a.priority < desired && pA === pB) {
      return 1;
    }

    // 对于其他情况，正常比较
    // 1. 无效优先级排在后面
    const aIsLow = pA <= 0 ? 1 : 0;
    const bIsLow = pB <= 0 ? 1 : 0;
    if (aIsLow !== bIsLow) return aIsLow - bIsLow;

    // 2. 按优先级数字排序
    if (pA !== pB) return pA - pB;

    // 3. 稳定排序
    return a.id - b.id;
  });

  // 重新编号 (逻辑不变)
  let next = 1;
  for (const t of active) {
    while (locked.has(next)) next++;
    t.priority = next;
    next++;
  }
}
// ===================================
// 更新打钩状态
function handleCheckboxChange(id: number, checked: boolean) {
  emit("update-todo-status", id, checked);
}

// 番茄估计=============================
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
function handleRowClick(todo: Todo) {
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
function saveEdit(todo: Todo) {
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
function handleConvertToTask(todo: Todo) {
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

// 取消repeat功能简化页面，Activity部分可以完成同样功能
// function handleRepeatTodo(id: number) {
//   emit("repeat-todo", id);
// }

// 1) 计算平均值（适用于 EnergyRecord[] 或 RewardRecord[]）
// 空、null、undefined 或 [] 返回 null
function averageValue<T extends { value: number }>(
  records: T[] | null | undefined
): number | string {
  if (!Array.isArray(records) || records.length === 0) return "-";
  let sum = 0,
    count = 0;
  for (const r of records) {
    const v = r?.value;
    if (typeof v === "number" && Number.isFinite(v)) {
      sum += v;
      count++;
    }
  }
  return count === 0 ? "-" : sum / count;
}

// 2) 统计中断类型数量（"E" 或 "I"）
// 空、null、undefined 或 [] 返回 null
function countInterruptions(
  records: { interruptionType: "E" | "I" }[] | null | undefined,
  type: "E" | "I"
): number | string {
  if (!Array.isArray(records) || records.length === 0) return "-";
  let count = 0;
  for (const r of records) if (r?.interruptionType === type) count++;
  return count;
}
</script>

<style scoped>
/* 表格容器样式，占满页面 */
.table-container {
  width: 100%;
  overflow-x: auto;
}

/* 表格占满宽度 */
.full-width-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

col.col-check {
  width: 22px;
}

col.col-start {
  width: 40px;
}

col.col-end {
  width: 40px;
}

col.col-rank {
  width: 35px;
}

col.col-intent {
  width: 60%;
  min-width: 140px;
}

col.col-fruit {
  width: 40%;
  min-width: 75px;
}

col.col-status {
  width: 76px;
}

thead th,
tbody td {
  box-sizing: border-box; /* 避免 padding/border 影响固定计算 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 表头样式 */
thead th {
  padding: 2px;
  text-align: center;
  border-bottom: 2px solid var(--color-background-dark);
  white-space: nowrap;
  overflow: hidden;
  height: 20px;
  font-weight: 400;
  color: var(--color-text-primary);
  line-height: 1.3;
  background-color: var(--color-background) !important;
}

/* 行样式 */
/* 隔行变色 */
tr:nth-child(even) {
  background-color: var(--color-background-light-transparent);
}

/* hover 高亮（不加 !important，便于被 selected/active 覆盖） */
tr:hover {
  background-color: var(--color-cyan-light-transparent);
}

/* 激活行样式（覆盖一切） */
tr.active-row {
  background-color: var(--color-red-light-transparent) !important;
}

/* 选中行样式（覆盖一切） */
tr.selected-row {
  background-color: var(--color-yellow-transparent) !important;
}

/* 当同时 active + selected 时，明确以 selected 的颜色为准（可留可删） */
tr.active-row.selected-row {
  background-color: var(--color-yellow-transparent) !important;
}

/* 统一过渡效果 */
tr,
tr:hover,
tr.active-row,
tr.selected-row {
  transition: background-color 0.2s ease;
}

/* 行状态样式 */
tr.done-row {
  color: var(--color-text-secondary);
}

tr.done-cell {
  text-decoration: line-through var(--color-text-secondary) 0.5px;
}

tr.cancel-row {
  color: var(--color-text-secondary);
}

tr.cancel-cell {
  font-style: italic;
}

tr.empty-row {
  height: 30px;
  text-align: center;
  color: var(--color-text-secondary);
  width: 100%;
  border-bottom: 1px solid var(--color-background);
}

/* 表格内容样式 */
td {
  padding: 2px 0px;
  border-bottom: 1px solid var(--color-background-dark);
  white-space: nowrap;
  overflow: hidden;
  min-height: 25px;
  height: 25px;
}

td:first-child,
td:nth-child(2),
td:nth-child(3),
td:nth-child(4) {
  text-align: center;
}

td:nth-child(7) {
  min-height: 25px;
  height: 25px;
}

th.status-col,
td.status-col {
  white-space: nowrap;
  text-align: right;
  min-width: 0;
}

/* 允许描述列显示省略号 */
.col-intent.ellipsis {
  display: block;
  width: 100%;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.priority-badge {
  display: inline-flex;
  align-items: center !important;
  justify-content: center !important;
  width: 16px;
  height: 16px;
  position: relative;
  top: -1px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  color: var(--color-background);
  background-color: var(--color-background-dark);
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

/* 估计番茄数量 */
.pomo-container {
  display: flex;
  align-items: center;
  white-space: nowrap;
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
  z-index: 10;
}

.pomo-groups {
  padding-right: 1px;
  z-index: 10;
}

.pomo-group {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 0.5px;
}

.pomo-separator {
  color: var(--color-text-secondary);
  flex-shrink: 0;
  transform: translateY(-1px);
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
  --n-color: var(--color-purple-light-transparent);
  --n-box-shadow-focus: 0 0 0 0;
  --n-border: 1px solid var(--color-purple-dark);
  --n-border-checked: 1px solid var(--color-purple-dark);
}

.est-buttons {
  display: flex;
}

.button-left {
  position: relative;
  left: -4px;
  z-index: 5;
}

.button-right:not(.bidirection-mode) {
  position: relative;
  left: -4px;
}

.button-right.bidirection-mode {
  position: relative;
  left: -12px;
  z-index: 0;
}

/* 状态信息 */
.status-cell {
  display: inline-flex;
  align-items: center;
}

/* 统计值为内联块，避免撑满 */
.records-stat {
  display: inline-flex;
  font-family: Consolas, "Courier New", Courier, monospace;
  font-size: 14px;
  padding-right: 2px;
}

/* 按钮组为内联块，不再强制贴右（因为整列已右对齐） */
.button-group {
  display: inline-flex;
  height: 20px;
  transform: translateY(1px);
}

:deep(.n-button) :hover {
  color: var(--color-red);
}

td.col-check {
  padding-left: 1px;
}
.cancel-icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  transform: scale(1.4) translateY(2px) !important;
  transform-origin: center;
}

.cancel-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}

.rank-input {
  border: 1px solid #40a9ff;
  width: 20px;
  height: 18px;
  border-radius: 4px;
  outline: none;
  margin-left: 6px;
}

.rank-input :deep(.n-input-wrapper) {
  height: 18px;
  line-height: 22px;
  padding-left: 2px;
  padding-right: 2px;
}

.rank-input :deep(.n-input .n-input__input-el) {
  --n-border-radius: 4px;
  --n-height: 12px;
  transform: translateY(-1px);
}

.title-input {
  width: calc(100% - 10px);
  border: 1px solid #40a9ff;
  border-radius: 4px;
  outline: none;
}

.time-input {
  border: 1px solid #40a9ff;
  border-radius: 4px;
  outline: none;
}

.start-input,
.done-input {
  width: 32px !important;
  max-width: 32px !important;
  min-width: 0 !important;
  box-sizing: border-box;
  padding: 0px 0px;
  font-size: inherit;
}
</style>
