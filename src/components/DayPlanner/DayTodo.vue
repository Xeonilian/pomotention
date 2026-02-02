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
          <th class="col-check">
            <n-button
              text
              type="default"
              @click.stop="handleQuickAddTodo"
              title="快速新增待办"
              style="transform: translateX(2px) translateY(4px)"
            >
              <template #icon>
                <n-icon size="13">
                  <Add12Regular />
                </n-icon>
              </template>
            </n-button>
          </th>
          <th class="col-start">开始</th>
          <th class="col-end">结束</th>
          <th class="col-rank" title="Emoji：33=💤 44=🥗 55=📚 66=🙊 77=✨ 88=💸 99=🧸">排序</th>
          <th class="col-intent">意图</th>
          <th class="col-fruit">果果</th>
          <th class="col-status">状态</th>
        </tr>
      </thead>

      <tbody>
        <template v-if="todosForCurrentViewWithTaskRecords && todosForCurrentViewWithTaskRecords!.length > 0">
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
                style="cursor: pointer"
                title="点击撤销取消"
                @click.stop="handleUncancelTodo(todo.id)"
              >
                <DismissSquare20Filled />
              </n-icon>
            </td>

            <!-- 2 开始时间 -->
            <td
              class="col-start"
              @dblclick.stop="startEditing(todo.id, 'start')"
              :title="editingRowId === todo.id && editingField === 'start' ? '' : '双击编辑'"
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
              <span v-else>{{ todo.startTime ? timestampToTimeString(todo.startTime) : "-" }}</span>
            </td>

            <!-- 3 结束时间 -->
            <td
              class="col-end"
              @dblclick.stop="startEditing(todo.id, 'done')"
              :title="editingRowId === todo.id && editingField === 'done' ? '' : '双击编辑'"
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
              <span v-else>{{ todo.doneTime ? timestampToTimeString(todo.doneTime) : "-" }}</span>
            </td>

            <!-- 4 排序 -->
            <td class="col-rank" @click.stop="startEditingPriority(todo)" title="点击编辑优先级">
              <n-input-number
                class="rank-input"
                v-if="editingTodo && editingTodo.id === todo.id"
                v-model:value="editingPriority"
                :min="0"
                :max="99"
                size="small"
                :show-button="false"
                placeholder=" "
                @blur="finishEditing"
                @keydown.enter="finishEditing"
              />

              <span v-else class="priority-badge" :class="'priority-' + todo.priority">
                <template v-if="todo.priority === 33">💤</template>
                <template v-else-if="todo.priority === 44">🥗</template>
                <template v-else-if="todo.priority === 55">📚</template>
                <template v-else-if="todo.priority === 66">🙊</template>
                <template v-else-if="todo.priority === 77">✨</template>
                <template v-else-if="todo.priority === 88">💸</template>
                <template v-else-if="todo.priority === 99">🧸</template>
                <template v-else>{{ todo.priority > 0 ? todo.priority : "" }}</template>
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
              :title="editingRowId === todo.id && editingField === 'title' ? '' : '双击编辑'"
            >
              <input
                class="title-input"
                v-if="editingRowId === todo.id && editingField === 'title'"
                v-model="editingValue"
                @blur="saveEdit(todo)"
                @keyup.enter="saveEdit(todo)"
                @keyup.esc="cancelEdit"
                @input="handleTitleInput(todo)"
                @keydown="handleInputKeydown($event, todo)"
                @click.stop
                :data-todo-id="todo.id"
              />
              <span class="ellipsis" v-else>{{ todo.activityTitle ?? "-" }}</span>
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
                      <span class="pomo-separator" v-if="todo.estPomo && index < todo.estPomo.length - 1">|</span>
                    </div>
                  </template>
                </div>
                <div v-if="todo.status !== 'done' && todo.status !== 'cancelled'" class="est-buttons">
                  <!-- 删除估计按钮  -->
                  <n-button
                    class="button-left"
                    v-if="todo.pomoType != '🍒' && todo.estPomo && todo.estPomo.length < 4 && todo.estPomo.length > 0"
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
                    :class="{
                      'one-mode': !todo.estPomo,
                    }"
                    v-if="(todo.estPomo && todo.pomoType != '🍒' && todo.estPomo.length < 3) || (!todo.estPomo && todo.pomoType != '🍒')"
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
                  'check-mode': todo.status === 'done' || todo.status === 'cancelled',
                }"
              >
                <div class="records-stat" v-if="todo.startTime" title="能量值 | 奖赏值 | 内部打扰 | 外部打扰">
                  <span style="color: var(--color-blue)">{{ averageValue(todo.energyRecords) }}</span>
                  |
                  <span style="color: var(--color-red)">{{ averageValue(todo.rewardRecords) }}</span>
                  |{{ countInterruptions(todo.interruptionRecords, "I") }}|{{ countInterruptions(todo.interruptionRecords, "E") }}
                </div>
                <div class="button-group" v-if="todo.status !== 'done' && todo.status !== 'cancelled'">
                  <!-- 追踪任务按钮 -->
                  <n-button v-if="!todo.startTime" class="convert-button" text type="info" @click="handleQuickStart(todo)" title="开始待办">
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
                    class="cancel-button"
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
                    class="suspend-button"
                    v-if="!todo.realPomo"
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
          <td colspan="7" style="text-align: center; padding: 10px">暂无待办</td>
        </tr>
      </tbody>
    </table>
  </div>
  <n-popover v-model:show="showPopover" trigger="manual" placement="top-end" style="width: 200px">
    <template #trigger>
      <div style="position: fixed; bottom: 20px; right: 20px; width: 1px; height: 1px"></div>
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
    <n-input-number v-model:value="newEstimate" :min="1" :max="5" placeholder="请输入估计的番茄数" style="width: 100%" />
  </n-modal>
  <!-- Tag Selector Popover -->
  <n-popover
    :show="
      tagEditor.popoverTargetId.value !== null && todosForCurrentViewWithTaskRecords.some((t) => t.id === tagEditor.popoverTargetId.value)
    "
    @update:show="(show) => !show && (tagEditor.popoverTargetId.value = null)"
    placement="bottom-start"
    :trap-focus="false"
    trigger="manual"
    :show-arrow="false"
    style="padding: 0; border-radius: 6px; margin-top: -30px; margin-left: 130px"
    :to="false"
  >
    <template #trigger>
      <span style="position: absolute; pointer-events: none"></span>
    </template>
    <TagSelector
      :ref="(el) => (tagSelectorRef = el)"
      :search-term="tagEditor.tagSearchTerm.value"
      :allow-create="true"
      @select-tag="(tagId: any) => handleTagSelected(tagId)"
      @create-tag="(tagName: any) => handleTagCreate(tagName)"
      @close-selector="tagEditor.popoverTargetId.value = null"
    />
  </n-popover>
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
  Add12Regular,
} from "@vicons/fluent";
import { NCheckbox, NInputNumber, NPopover, NButton, NIcon } from "naive-ui";
import { ref, computed, nextTick } from "vue";

import { useDataStore } from "@/stores/useDataStore";
import { storeToRefs } from "pinia";
import { useActivityTagEditor } from "@/composables/useActivityTagEditor";
import TagSelector from "../TagSystem/TagSelector.vue";
const dataStore = useDataStore();
const { activeId, selectedRowId, todosForCurrentViewWithTaskRecords } = storeToRefs(dataStore);

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

// Tag Editor
const tagEditor = useActivityTagEditor();
const tagSelectorRef = ref<any>(null);

// 定义 Emit
const emit = defineEmits<{
  (e: "suspend-todo", id: number): void;
  (e: "cancel-todo", id: number): void;
  (e: "uncancel-todo", id: number): void;
  // (e: "repeat-todo", id: number): void;
  (e: "update-todo-status", id: number, checked: boolean): void;
  (e: "batch-update-priorities", updates: Array<{ id: number; priority: number }>): void;
  (e: "update-todo-pomo", id: number, realPomo: number[]): void;
  (e: "update-todo-est", id: number, estPomo: number[]): void;

  (e: "select-task", taskId: number | null): void;
  (e: "select-row", id: number | null): void;
  (e: "select-activity", activityId: number | null): void;
  (e: "edit-todo-title", id: number, newTitle: string): void;
  (e: "edit-todo-start", id: number, newTs: string): void;
  (e: "edit-todo-done", id: number, newTs: string): void;
  (e: "quick-add-todo"): void;
}>();

// 对待办事项按优先级降序排序（高优先级在前）
const sortedTodos = computed(() => {
  const todos = [...todosForCurrentViewWithTaskRecords.value];
  // 分离特殊值（66、88、99）和正常值
  const specialPriorities = [33, 44, 55, 66, 77, 88, 99];
  const normalTodos: TodoWithTaskRecords[] = [];
  const specialTodos: TodoWithTaskRecords[] = [];

  todos.forEach((todo) => {
    if (specialPriorities.includes(todo.priority)) {
      specialTodos.push(todo);
    } else {
      normalTodos.push(todo);
    }
  });

  // 正常任务排序：0放最后，其余越小越优先
  normalTodos.sort((a, b) => {
    if (a.priority === 0 && b.priority === 0) return 0;
    if (a.priority === 0) return 1;
    if (b.priority === 0) return -1;
    return a.priority - b.priority;
  });

  // 特殊值任务按66、88、99顺序排序
  specialTodos.sort((a, b) => {
    const orderA = specialPriorities.indexOf(a.priority);
    const orderB = specialPriorities.indexOf(b.priority);
    return orderA - orderB;
  });

  // 合并：正常任务在前，特殊值任务在后
  return [...normalTodos, ...specialTodos];
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
      (input as HTMLInputElement).select();
    }
  });
}

function finishEditing() {
  if (!editingTodo.value) return;
  if (editingPriority.value === null) {
    editingPriority.value = 0;
  }
  if (editingTodo.value.status === "done" || editingTodo.value.status === "cancelled") {
    popoverMessage.value = "当前任务已经结束！";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    editingTodo.value = null;
    return;
  }
  // 允许特殊值66、88、99
  const specialPriorities = [33, 44, 55, 66, 77, 88, 99];
  if (!specialPriorities.includes(editingPriority.value) && editingPriority.value > 21) {
    popoverMessage.value = "请输入0-21或66、88、99";
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
  todosForCurrentViewWithTaskRecords.value.forEach((t) => before.set(t.id, t.priority));

  // 关键：不再提前修改 priority，而是把 current 和 desired 传给排序函数
  // 让排序函数自己去智能处理
  relayoutPriority(todosForCurrentViewWithTaskRecords.value, current, desired);

  // 后续逻辑不变...
  const updates: Array<{ id: number; priority: number }> = [];
  todosForCurrentViewWithTaskRecords.value.forEach((t) => {
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
  // 特殊优先级值，不参与重新分配
  const specialPriorities = [33, 44, 55, 66, 77, 88, 99];

  // 如果目标是特殊值，直接设置并返回，不参与重新分配
  if (specialPriorities.includes(desired)) {
    current.priority = desired;
    return;
  }

  // 锁定已完成任务的优先级，这部分逻辑不变
  const locked = new Set<number>();
  todos.forEach((t) => {
    if (t.status === "done" && t.priority > 0 && !specialPriorities.includes(t.priority)) {
      locked.add(t.priority);
    }
  });

  // 筛选出需要重新排序的活动任务，排除特殊值
  const active = todos.filter((t) => t.status !== "done" && t.status !== "cancelled");

  // 关键修改：
  // 找出所有优先级大于 0 且不是特殊值的任务
  const positivePriorityTasks = active.filter((t) => t.priority > 0 && !specialPriorities.includes(t.priority) && t.id !== current.id);
  // 对它们进行排序
  positivePriorityTasks.sort((a, b) => a.priority - b.priority);

  // 将当前正在修改的任务插入到目标位置
  // 如果 desired 是 0 或负数，我们不把它放到排序列表中，因为它不需要参与重新编号
  if (desired > 0 && !specialPriorities.includes(desired)) {
    // 找到插入点
    const insertIndex = positivePriorityTasks.findIndex((t) => t.priority >= desired);
    if (insertIndex === -1) {
      positivePriorityTasks.push(current);
    } else {
      positivePriorityTasks.splice(insertIndex, 0, current);
    }
  }

  // 为被移动的任务重新编号，不触碰 priority <= 0 的任务和特殊值
  let next = 1;
  for (const t of positivePriorityTasks) {
    // 跳过锁定的优先级
    while (locked.has(next)) {
      next++;
    }
    // 如果任务原来的优先级和新计算出的优先级不同，则更新
    if (t.id === current.id) {
      current.priority = desired; // 直接应用期望的优先级
    } else if (t.priority !== next) {
      t.priority = next;
    }
    // 如果是当前任务，并且期望优先级大于0，则它的优先级就是 next
    // 否则，非当前任务的优先级按顺序递增
    if (t.id === current.id && desired > 0) {
      t.priority = next;
    } else if (t.id !== current.id) {
      t.priority = next;
    }

    next++;
  }

  // 如果 current 的目标是 0 或负数，直接设置即可，因为它不影响其他任务
  if (desired <= 0) {
    current.priority = desired;
  }
}
// ===================================
// 更新打钩状态
function handleCheckboxChange(id: number, checked: boolean) {
  emit("update-todo-status", id, checked);
}

// 番茄估计=============================
// 检查番茄钟是否完成
function isPomoCompleted(todo: Todo, estIndex: number, pomoIndex: number): boolean {
  if (!todo.realPomo || todo.realPomo.length <= estIndex) return false;
  return todo.realPomo[estIndex] >= pomoIndex;
}

// 处理番茄钟勾选
function handlePomoCheck(todo: Todo, estIndex: number, pomoIndex: number, checked: boolean) {
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

  const todo = todosForCurrentViewWithTaskRecords.value.find((t) => t.id === currentTodoId.value);
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
    if (todo.realPomo && delIdx < todo.realPomo.length && todo.realPomo[delIdx] !== undefined && todo.realPomo[delIdx] !== 0) {
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

// 快速新增待办
function handleQuickAddTodo() {
  emit("quick-add-todo");
}

// 编辑相关函数
function startEditing(todoId: number, field: "title" | "start" | "done") {
  const todo = todosForCurrentViewWithTaskRecords.value.find((t) => t.id === todoId);
  if (!todo) return;
  editingRowId.value = todoId;
  editingField.value = field;

  // 双击编辑：只带出原值，不自动填充当前时间
  editingValue.value =
    field === "title"
      ? todo.activityTitle || ""
      : field === "start"
      ? todo.startTime
        ? timestampToTimeString(todo.startTime)
        : ""
      : field === "done"
      ? todo.doneTime
        ? timestampToTimeString(todo.doneTime)
        : ""
      : "";

  // 使用 querySelector 来获取当前编辑的输入框，而不是依赖 ref
  nextTick(() => {
    const input = document.querySelector(`input.${field}-input[data-todo-id="${todoId}"]`);
    if (input) {
      (input as HTMLInputElement).focus();
    }
  });
}

// 一键开始：不进入编辑态，直接把开始时间写成当前时间并保存
function handleQuickStart(todo: Todo) {
  // 已结束的任务不允许开始
  if (todo.status === "done" || todo.status === "cancelled") {
    popoverMessage.value = "当前任务已经结束！";
    showPopover.value = true;
    setTimeout(() => {
      showPopover.value = false;
    }, 2000);
    return;
  }

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ts = `${hours}:${minutes}`;

  // 直接通知父组件更新开始时间（不进入编辑状态）
  emit("edit-todo-start", todo.id, ts);
}

// 注意这里是 timestring 不是timestamp，是在Home用currentViewdate进行的转化
function saveEdit(todo: Todo) {
  if (!editingRowId.value) return;

  // 如果输入框中有 # 开头的文本，清理并关闭 popover
  if (editingValue.value.includes("#") && tagEditor.popoverTargetId.value) {
    editingValue.value = tagEditor.clearTagTriggerText(editingValue.value);
    tagEditor.closePopover();
  }

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
  // 如果输入框中有 # 开头的文本，清理并关闭 popover
  if (editingValue.value.includes("#") && tagEditor.popoverTargetId.value) {
    editingValue.value = tagEditor.clearTagTriggerText(editingValue.value);
    tagEditor.closePopover();
  }
  editingRowId.value = null;
  editingField.value = null;
  editingValue.value = "";
}

function isValidTimeString(str: string) {
  return /^\d{2}:\d{2}$/.test(str) && +str.split(":")[0] <= 24 && +str.split(":")[1] < 60;
}

// suspended Todo
function handleSuspendTodo(id: number) {
  emit("suspend-todo", id);
}

function handleCancelTodo(id: number) {
  emit("cancel-todo", id);
}

// 撤销取消
function handleUncancelTodo(id: number) {
  emit("uncancel-todo", id);
}

// 取消repeat功能简化页面，Activity部分可以完成同样功能
// function handleRepeatTodo(id: number) {
//   emit("repeat-todo", id);
// }

// 1) 计算平均值（适用于 EnergyRecord[] 或 RewardRecord[]）
// 空、null、undefined 或 [] 返回 null
function averageValue<T extends { value: number }>(records: T[] | null | undefined): number | string {
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
  return count === 0 ? "-" : Math.round(sum / count);
}

// 2) 统计中断类型数量（"E" 或 "I"）
// 空、null、undefined 或 [] 返回 null
function countInterruptions(records: { interruptionType: "E" | "I" }[] | null | undefined, type: "E" | "I"): number | string {
  if (!Array.isArray(records) || records.length === 0) return "-";
  let count = 0;
  for (const r of records) if (r?.interruptionType === type) count++;
  return count;
}

// Tag 相关函数
function handleTitleInput(todo: Todo) {
  tagEditor.handleContentInput(todo.id, editingValue.value);
}

function handleInputKeydown(event: KeyboardEvent, todo: Todo) {
  if (tagEditor.popoverTargetId.value === todo.id && tagSelectorRef.value) {
    switch (event.key) {
      case "ArrowDown":
        tagSelectorRef.value.navigateDown();
        event.preventDefault();
        break;
      case "ArrowUp":
        tagSelectorRef.value.navigateUp();
        event.preventDefault();
        break;
      case "Enter":
        tagSelectorRef.value.selectHighlighted();
        event.preventDefault();
        break;
      case "Escape":
        tagEditor.closePopover();
        event.preventDefault();
        break;
    }
  }

  // 特殊处理：# 键自动打开 popover
  if (event.key === "#" && !tagEditor.popoverTargetId.value) {
    tagEditor.popoverTargetId.value = todo.id;
  }
}

function handleTagSelected(tagId: number) {
  if (!tagEditor.popoverTargetId.value) return;
  const todo = todosForCurrentViewWithTaskRecords.value.find((t) => t.id === tagEditor.popoverTargetId.value);
  if (!todo) return;

  const cleanedTitle = tagEditor.clearTagTriggerText(editingValue.value);
  editingValue.value = cleanedTitle;

  // 通过 activityId 给 Activity 添加标签
  dataStore.addTagToActivity(todo.activityId, tagId);
  tagEditor.closePopover();
}

function handleTagCreate(tagName: string) {
  if (!tagEditor.popoverTargetId.value) return;
  const todo = todosForCurrentViewWithTaskRecords.value.find((t) => t.id === tagEditor.popoverTargetId.value);
  if (!todo) return;

  const cleanedTitle = tagEditor.clearTagTriggerText(editingValue.value);
  editingValue.value = cleanedTitle;

  // 通过 activityId 创建并添加标签到 Activity
  dataStore.createAndAddTagToActivity(todo.activityId, tagName);
  tagEditor.closePopover();
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
  width: 88px;
}

/* 表头样式 */
thead th {
  padding: 2px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  height: 20px;
  font-weight: 400;
  border-bottom: 2px solid var(--color-background-dark);
  color: var(--color-text-primary);
  background-color: var(--color-background) !important;
  line-height: 1.3;
  box-sizing: border-box;
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
tbody td {
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 28px;
  line-height: 18px;
  padding: 2px 0px;
  border-bottom: 1px solid var(--color-background-dark);
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

  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
}

/* 可按 priority 分不同色 */
.priority-0 {
  background-color: var(--color-background-light);
  color: var(--color-text-secondary);
  top: 2px;
}

/* 可按 priority 分不同色 */
.priority-1 {
  background-color: #ef53505c;
  color: #ef5350;
}

/* 按 1 的风格修改 */
.priority-2 {
  background-color: #ff98005c;
  color: #ff9800;
}

/* priority-3 保持不变 */
.priority-3 {
  background-color: #ffeb3bb7;
  color: #3d3d3dc1;
}

.priority-4 {
  background-color: #4caf505c;
  color: #4caf50;
}
.priority-5 {
  background-color: #2196f35c;
  color: #2196f3;
}
.priority-6 {
  background-color: #d33af65c;
  color: #a156b8;
}

.priority-7 {
  background-color: #7e57c25c;
  color: #7e57c2;
}
.priority-8 {
  background-color: #26a69a5c;
  color: #26a69a;
}
.priority-9 {
  background-color: #7892625c;
  color: #789262;
}
.priority-10 {
  background-color: #8d6e635c;
  color: #8d6e63;
}

.priority-66 {
  background-color: #ffffff5c;
  color: #f57f17;
}

.priority-88 {
  background-color: #ffffff5c;
  color: #f9a825;
}

.priority-99 {
  background-color: #ffffff5c;
  color: #ab47bc;
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
  overflow-x: auto;
  overflow-y: hidden;
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
  z-index: 1;
}

.button-right {
  position: relative;
  left: -12px;
  z-index: 2;
}

.button-right.one-mode {
  position: relative;
  left: -4px;
  z-index: 2;
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
.convert-button {
  right: 0px;
}
.cancel-button {
  right: 2px;
}
.suspend-button {
  right: 4px;
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
