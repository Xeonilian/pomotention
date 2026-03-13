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
            <n-button text type="info" @click.stop="handleQuickAddTodo" title="快速新增待办" class="add-todo-button">
              <template #icon>
                <n-icon size="20">
                  <AddCircle24Regular />
                </n-icon>
              </template>
            </n-button>
          </th>
          <th
            class="col-start"
            :class="{ 'disabled-toggle': !selectedRowId }"
            @click.stop="selectedRowId && handleFillCurrentTimeStart()"
            :title="selectedRowId ? '点击填入当前时间' : '请先选中一行'"
          >
            <n-icon size="20" class="header-icon">
              <Play20Regular />
            </n-icon>
          </th>
          <th
            class="col-end"
            :class="{ 'disabled-toggle': !selectedRowId }"
            @click.stop="selectedRowId && handleFillCurrentTimeEnd()"
            :title="selectedRowId ? '点击填入当前时间' : '请先选中一行'"
          >
            <n-icon size="20" class="header-icon">
              <RecordStop20Regular />
            </n-icon>
          </th>
          <th class="col-rank" :title="rankHeaderTitle" @click.stop="openPriorityBindingModal">
            <n-icon size="20" class="header-icon"><Important20Regular /></n-icon>
          </th>
          <th class="col-intent" @click.stop="selectedRowId && handleFillCurrentTitle()" title="将当前待办意图复制到任务备注">
            <n-icon size="20" title="意图" class="header-icon"><Thinking20Regular /></n-icon>
          </th>
          <th
            class="col-fruit"
            :class="{ 'disabled-toggle': !canTogglePomoType }"
            @click.stop="canTogglePomoType && handleTogglePomoType()"
            :title="canTogglePomoType ? '点击切换类型' : '不能切换类型'"
          >
            <template v-if="selectedRowId">
              <span v-if="currentPomoType">{{ currentPomoType }}</span>
              <n-icon v-else size="20" class="header-icon">
                <FoodPizza20Regular />
              </n-icon>
            </template>
            <template v-else>
              <n-icon size="20" class="header-icon">
                <FoodPizza20Regular />
              </n-icon>
            </template>
          </th>
          <th class="col-status">
            <!-- 表头操作：对选中行执行取消/退回，仅对进行中(ongoing)任务生效 -->
            <n-button
              class="cancel-button"
              v-if="selectedTodo && selectedTodo.status !== 'done' && selectedTodo.status !== 'cancelled' && !selectedTodo.realPomo"
              text
              @click.stop="handleCancelSelectedTodo"
              title="取消选中任务，不退回活动清单"
            >
              <template #icon>
                <n-icon size="20">
                  <DismissCircle20Regular />
                </n-icon>
              </template>
            </n-button>
            <n-button
              class="suspend-button"
              v-if="
                selectedTodo &&
                selectedTodo.status !== 'done' &&
                selectedTodo.status !== 'cancelled' &&
                !selectedTodo.realPomo &&
                !selectedTodo.startTime
              "
              text
              @click.stop="handleSuspendSelectedTodo"
              title="撤销选中任务，退回活动清单"
            >
              <template #icon>
                <n-icon size="20">
                  <ChevronCircleRight48Regular />
                </n-icon>
              </template>
            </n-button>
          </th>
        </tr>
      </thead>

      <tbody>
        <template v-if="todosForCurrentViewWithTaskRecords && todosForCurrentViewWithTaskRecords!.length > 0">
          <!-- 行 -->
          <tr
            v-for="todo in sortedTodos"
            :key="todo.id"
            :class="{
              'active-row': todo.activityId === activeId && activeId !== undefined,
              'selected-row': todo.id === selectedRowId,
              'done-row': todo.status === 'done' && isViewDateToday,
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
              @click.stop="startEditing(todo.id, 'start')"
              :title="editingRowId === todo.id && editingField === 'start' ? '' : '单击编辑'"
            >
              <input
                class="start-input time-input"
                v-if="editingRowId === todo.id && editingField === 'start'"
                :ref="(el: any) => (startInputRef = el)"
                v-model="editingValue"
                @blur="saveEdit(todo)"
                @keyup.enter="saveEdit(todo)"
                @keyup.esc="cancelEdit"
                :data-todo-id="todo.id"
                maxlength="5"
                autocomplete="off"
              />
              <span v-else>{{ formatTimeForDisplay(todo.startTime) }}</span>
            </td>

            <!-- 3 结束时间 -->
            <td
              class="col-end"
              @click.stop="startEditing(todo.id, 'done')"
              :title="editingRowId === todo.id && editingField === 'done' ? '' : '单击编辑'"
            >
              <input
                class="done-input time-input"
                v-if="editingRowId === todo.id && editingField === 'done'"
                :ref="(el: any) => (doneInputRef = el)"
                v-model="editingValue"
                @blur="saveEdit(todo)"
                @keyup.enter="saveEdit(todo)"
                @keyup.esc="cancelEdit"
                :data-todo-id="todo.id"
                maxlength="5"
                autocomplete="off"
              />
              <span v-else>{{ formatTimeForDisplay(todo.doneTime) }}</span>
            </td>

            <!-- 4 排序：点击弹出 emoji 选择，选后写 priority 并打上绑定的 tag -->
            <td
              class="col-rank"
              :class="{ 'col-rank-disabled': todo.status === 'done' || todo.status === 'cancelled' }"
              :title="todo.status === 'done' || todo.status === 'cancelled' ? '不能切换' : '单击选择分类'"
            >
              <n-popover
                :show="rankPopoverTodoId === todo.id"
                @update:show="(v) => !v && (rankPopoverTodoId = null)"
                trigger="manual"
                placement="bottom"
                :z-index="10001"
              >
                <template #trigger>
                  <span class="priority-badge" :class="'priority-' + todo.priority" @click.stop="openRankPopoverIfActive(todo)">
                    {{ getEmojiForPriority(todo.priority) || (todo.priority > 0 ? todo.priority : "") }}
                  </span>
                </template>
                <div class="rank-emoji-options">
                  <button type="button" class="rank-emoji-btn" title="清除当前优先级" @click.stop="applyPriorityAndTag(todo, 0)">⚪</button>
                  <button
                    type="button"
                    class="rank-emoji-btn"
                    title="从 1 起第一个可用数字"
                    @click.stop="applyFirstAvailablePriority(todo)"
                  >
                    1️⃣
                  </button>
                  <button
                    v-for="cat in PRIORITY_CATEGORIES"
                    :key="cat.priority"
                    type="button"
                    class="rank-emoji-btn"
                    @click.stop="applyPriorityAndTag(todo, cat.priority)"
                  >
                    {{ cat.emoji }}
                  </button>
                </div>
              </n-popover>
            </td>

            <!-- 5 意图 -->
            <td
              class="col-intent"
              @click.stop="startEditing(todo.id, 'title')"
              :title="editingRowId === todo.id && editingField === 'title' ? '' : '单击编辑'"
            >
              <input
                class="title-input"
                v-if="editingRowId === todo.id && editingField === 'title'"
                :ref="(el: any) => (titleInputRef = el)"
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
                          @update:checked="(checked: any) => handlePomoCheck(todo, index, i, checked)"
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
              <div class="status-cell">
                <div class="records-stat" title="能量值 | 奖赏值 | 内部打扰 | 外部打扰">
                  <span style="color: var(--color-blue)">{{ averageValue(todo.energyRecords) }}</span>

                  <span style="color: var(--color-text-secondary)">{{ averageValue(todo.rewardRecords) }}</span>
                  <span style="color: var(--color-red)">{{ countInterruptions(todo.interruptionRecords, "I") }}</span>
                  <span style="color: var(--color-text-secondary)">{{ countInterruptions(todo.interruptionRecords, "E") }}</span>
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
    class="mobile-dialog-top"
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
    style="padding: 0; border-radius: 6px; margin-top: -30px; margin-left: 130px; z-index: 10000"
    :z-index="10000"
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

  <!-- 排序槽位绑定 tag：单击表头「排序」打开，失去焦点自动保存 -->
  <n-modal
    v-model:show="showPriorityBindingModal"
    preset="card"
    title="排序分类绑定标签"
    class="mobile-dialog-top"
    style="width: 420px"
    :mask-closable="true"
    @update:show="
      (v) => {
        if (!v) savePriorityBinding();
      }
    "
  >
    <div class="priority-binding-list">
      <div v-for="cat in PRIORITY_CATEGORIES" :key="cat.priority" class="priority-binding-row">
        <span class="priority-binding-emoji">{{ cat.emoji }}</span>
        <n-select
          v-model:value="priorityBindingDraft[cat.priority]"
          :options="tagOptionsForBinding"
          placeholder="选择标签"
          clearable
          size="small"
          style="flex: 1; min-width: 120px"
          :render-label="renderTagOptionLabel"
        />
        <n-button quaternary size="tiny" @click="clearPriorityBinding(cat.priority)">清空</n-button>
      </div>
    </div>
  </n-modal>
</template>
<script setup lang="ts">
import type { Todo, TodoWithTaskRecords } from "@/core/types/Todo";
import { timestampToTimeString } from "@/core/utils";
import { PRIORITY_CATEGORIES, SPECIAL_PRIORITIES, getEmojiForPriority } from "@/core/priorityCategories";
import {
  ChevronCircleRight48Regular,
  DismissCircle20Regular,
  DismissSquare20Filled,
  CaretLeft12Filled,
  CaretRight12Filled,
  AddCircle24Regular,
  Important20Regular,
  Thinking20Regular,
  Play20Regular,
  RecordStop20Regular,
  FoodPizza20Regular,
} from "@vicons/fluent";
import { NCheckbox, NInputNumber, NPopover, NButton, NIcon, NModal, NSelect } from "naive-ui";
import { ref, computed, nextTick, reactive, watch, onBeforeUnmount } from "vue";

import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTagStore } from "@/stores/useTagStore";
import { storeToRefs } from "pinia";
import { useActivityTagEditor } from "@/composables/useActivityTagEditor";
import TagSelector from "../TagSystem/TagSelector.vue";
import type { SelectOption } from "naive-ui";
import { useDevice } from "@/composables/useDevice";

const dataStore = useDataStore();
const { isMobile } = useDevice();

const settingStore = useSettingStore();
const tagStore = useTagStore();
const { activeId, selectedRowId, selectedActivityId, selectedTaskId, selectedTask, todosForCurrentViewWithTaskRecords } =
  storeToRefs(dataStore);
const { allTags: allTagsFromStore } = storeToRefs(tagStore);

// 当前视图是否为今天（仅今天时已完成行才变灰）
const dateService = dataStore.dateService;
const isViewDateToday = computed(() => dateService.isViewDateToday);

// 根据 selectedRowId 找到对应的 todo
const selectedTodo = computed(() => {
  if (!selectedRowId.value) return null;
  return todosForCurrentViewWithTaskRecords.value.find((t) => t.id === selectedRowId.value) || null;
});

// 判断果果是否可以切换（todo 不是 done 和 cancelled 状态）
const canTogglePomoType = computed(() => {
  if (!selectedTodo.value) return false;
  return selectedTodo.value.status !== "done" && selectedTodo.value.status !== "cancelled";
});

// 获取当前选中 todo 的果果类型
const currentPomoType = computed(() => {
  return selectedTodo.value?.pomoType || "";
});

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
// Enter 选中标签时置为 true，saveEdit 会跳过结束编辑以保持继续输入
const selectingTagViaEnter = ref(false);
const titleInputRef = ref<HTMLInputElement | null>(null);
const startInputRef = ref<HTMLInputElement | null>(null);
const doneInputRef = ref<HTMLInputElement | null>(null);

// 排序列：emoji 弹窗与绑定设置
const rankPopoverTodoId = ref<number | null>(null);
const showPriorityBindingModal = ref(false);

// 点击 popover 外视为放弃，关闭排序选择
function handleRankPopoverClickOutside(e: MouseEvent | TouchEvent) {
  const target = e.target as Node;
  if (target && document.body.contains(target) && !(target as Element).closest?.(".rank-emoji-options")) {
    rankPopoverTodoId.value = null;
  }
}
let rankPopoverOutsideCleanup: (() => void) | null = null;
watch(
  rankPopoverTodoId,
  (id) => {
    if (rankPopoverOutsideCleanup) {
      rankPopoverOutsideCleanup();
      rankPopoverOutsideCleanup = null;
    }
    if (id != null) {
      nextTick(() => {
        const onDown = (e: MouseEvent | TouchEvent) => handleRankPopoverClickOutside(e);
        document.addEventListener("mousedown", onDown, true);
        document.addEventListener("touchstart", onDown, true);
        rankPopoverOutsideCleanup = () => {
          document.removeEventListener("mousedown", onDown, true);
          document.removeEventListener("touchstart", onDown, true);
        };
      });
    }
  },
  { flush: "sync" },
);
onBeforeUnmount(() => {
  if (rankPopoverOutsideCleanup) rankPopoverOutsideCleanup();
});
const priorityBindingDraft = reactive<Record<number, number | null>>({});
const rankHeaderTitle = computed(
  () => "Emoji：" + PRIORITY_CATEGORIES.map((c) => `${c.priority}=${c.emoji}`).join(" ") + "；单击打开绑定标签",
);
const tagOptionsForBinding = computed<SelectOption[]>(() =>
  [...allTagsFromStore.value]
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => ({ label: t.name, value: t.id })),
);
function renderTagOptionLabel(option: SelectOption) {
  return option.label as string;
}

// 根据设备类型格式化时间显示，移动端去掉冒号
function formatTimeForDisplay(timestamp?: number | null) {
  if (!timestamp) return "-";
  const timeString = timestampToTimeString(timestamp);
  if (isMobile.value) {
    return timeString.replace(":", "");
  }
  return timeString;
}
function openPriorityBindingModal() {
  Object.keys(priorityBindingDraft).forEach((k) => delete priorityBindingDraft[Number(k)]);
  const saved = settingStore.settings.priorityCategoryTagIds;
  Object.keys(saved).forEach((k) => {
    priorityBindingDraft[Number(k)] = saved[Number(k)];
  });
  showPriorityBindingModal.value = true;
}
function clearPriorityBinding(priority: number) {
  delete priorityBindingDraft[priority];
}
function savePriorityBinding() {
  const ids: Record<number, number> = {};
  Object.entries(priorityBindingDraft).forEach(([p, tagId]) => {
    if (typeof tagId === "number") ids[Number(p)] = tagId;
  });
  settingStore.settings.priorityCategoryTagIds = ids;
}

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
  (e: "edit-todo-title", id: number, newTitle: string): void;
  (e: "edit-todo-start", id: number, newTs: string): void;
  (e: "edit-todo-done", id: number, newTs: string): void;
  (e: "quick-add-todo"): void;
  (e: "toggle-pomo-type", id: number): void;
}>();

// 对待办事项按优先级降序排序（高优先级在前）
// 增加规则：一旦done，特殊值（33/44/55/66/77/88/99）按 startTime 排序
const sortedTodos = computed(() => {
  const todos = [...todosForCurrentViewWithTaskRecords.value];
  const specialPriorities = SPECIAL_PRIORITIES;

  const normalTodos: TodoWithTaskRecords[] = [];
  const specialTodosNotDone: TodoWithTaskRecords[] = [];
  const specialTodosDone: TodoWithTaskRecords[] = [];

  todos.forEach((todo) => {
    if (specialPriorities.includes(todo.priority)) {
      if (todo.status === "done") {
        specialTodosDone.push(todo);
      } else {
        specialTodosNotDone.push(todo);
      }
    } else {
      normalTodos.push(todo);
    }
  });

  // 正常任务排序：0放最后，其余越小优先
  normalTodos.sort((a, b) => {
    if (a.priority === 0 && b.priority === 0) return 0;
    if (a.priority === 0) return 1;
    if (b.priority === 0) return -1;
    return a.priority - b.priority;
  });

  // 未完成的特殊任务按特殊值顺序
  specialTodosNotDone.sort((a, b) => {
    const orderA = specialPriorities.indexOf(a.priority);
    const orderB = specialPriorities.indexOf(b.priority);
    return orderA - orderB;
  });

  // 已完成（done）的特殊任务按 startTime 升序（无 startTime 排后面）
  specialTodosDone.sort((a, b) => {
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return String(a.startTime).localeCompare(String(b.startTime));
  });

  // 合并：正常 > 未完成特殊 > 已完成特殊
  return [...normalTodos, ...specialTodosNotDone, ...specialTodosDone];
});

function openRankPopoverIfActive(todo: Todo) {
  if (todo.status === "done" || todo.status === "cancelled") return;
  rankPopoverTodoId.value = todo.id;
}

/** 从 1 起第一个可用的优先级（1–21），考虑已完成锁定和其余进行中任务占用 */
function getFirstAvailablePriority(todos: Todo[], current: Todo): number {
  const locked = new Set<number>();
  const used = new Set<number>();
  todos.forEach((t) => {
    if (t.status === "done" && t.priority >= 1 && t.priority <= 21 && !SPECIAL_PRIORITIES.includes(t.priority)) {
      locked.add(t.priority);
    }
    if (
      t.status !== "done" &&
      t.status !== "cancelled" &&
      t.id !== current.id &&
      t.priority >= 1 &&
      t.priority <= 21 &&
      !SPECIAL_PRIORITIES.includes(t.priority)
    ) {
      used.add(t.priority);
    }
  });
  for (let n = 1; n <= 21; n++) {
    if (!locked.has(n) && !used.has(n)) return n;
  }
  return 1;
}

function applyFirstAvailablePriority(todo: Todo) {
  const desired = getFirstAvailablePriority(todosForCurrentViewWithTaskRecords.value, todo);
  applyPriorityAndTag(todo, desired);
}

// 排序列：选择 emoji 后写入 priority 并打上绑定的 tag
function applyPriorityAndTag(todo: Todo, desired: number) {
  rankPopoverTodoId.value = null;
  if (todo.status === "done" || todo.status === "cancelled") {
    popoverMessage.value = "当前任务已经结束！";
    showPopover.value = true;
    setTimeout(() => (showPopover.value = false), 2000);
    return;
  }
  if (todo.priority === desired) return;

  const before = new Map<number, number>();
  todosForCurrentViewWithTaskRecords.value.forEach((t) => before.set(t.id, t.priority));
  relayoutPriority(todosForCurrentViewWithTaskRecords.value, todo, desired);

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

  const tagId = settingStore.settings.priorityCategoryTagIds[desired];
  if (tagId != null) {
    dataStore.addTagToActivity(todo.activityId, tagId);
  }
}

// 传入 current 和 desired，让排序更智能
function relayoutPriority(todos: Todo[], current: Todo, desired: number) {
  const specialPriorities = SPECIAL_PRIORITIES;

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
  // 取消激活活动
  // if (todo.status !== "done" && todo.status !== "cancelled") {
  //   activeId.value = todo.activityId;
  // } else {
  //   activeId.value = undefined;
  // }
  activeId.value = undefined;
  selectedRowId.value = todo.id;
  selectedActivityId.value = todo.activityId;
  selectedTaskId.value = todo.taskId ?? null;
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

  // 单击编辑：只带出原值，不自动填充当前时间
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

  // 单击后激活光标：用 ref 聚焦，与 col-intent 一致；v-if 挂载后再等一帧
  nextTick(() => {
    nextTick(() => {
      if (field === "title") titleInputRef.value?.focus();
      else if (field === "start") startInputRef.value?.focus();
      else if (field === "done") doneInputRef.value?.focus();
    });
  });
}

// 表头点击「开始」：给选中行填入当前时间（HH:mm）
function handleFillCurrentTimeStart() {
  if (!selectedRowId.value) return;
  const now = new Date();
  const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  emit("edit-todo-start", selectedRowId.value, ts);

  // 将当前选中待办的意图同步到任务备注
  const todo = todosForCurrentViewWithTaskRecords.value.find((t) => t.id === selectedRowId.value);
  if (!todo) return;
  const taskId = selectedTaskId.value;
  if (taskId == null) return;
  const titleForHeader = (todo.activityTitle ?? "").trim();
  const originalDescription = selectedTask.value?.description ?? "";
  let newDescription = originalDescription;
  const trimmed = originalDescription.trim();
  if (!trimmed || trimmed === "#") {
    // 如果任务描述为空或只有一个 #，写入「# 标题\n」
    newDescription = titleForHeader ? `# ${titleForHeader}\n` : originalDescription;
  } else if (titleForHeader) {
    // 如果已有内容，只替换第一个换行前的内容
    const firstNewlineIndex = originalDescription.indexOf("\n");
    const rest = firstNewlineIndex !== -1 ? originalDescription.slice(firstNewlineIndex) : "\n";
    newDescription = `# ${titleForHeader}${rest}`;
  }
  dataStore.updateTaskById(taskId, {
    description: newDescription,
  });
}

// 表头点击「结束」：给选中行填入当前时间（HH:mm）
function handleFillCurrentTimeEnd() {
  if (!selectedRowId.value) return;
  const now = new Date();
  const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  emit("edit-todo-done", selectedRowId.value, ts);
}

// 将当前选中待办的意图同步到任务备注
function handleFillCurrentTitle() {
  if (!selectedRowId.value) return;
  const todo = todosForCurrentViewWithTaskRecords.value.find((t) => t.id === selectedRowId.value);
  if (!todo) return;
  const taskId = selectedTaskId.value;
  if (taskId == null) return;
  const titleForHeader = (todo.activityTitle ?? "").trim();
  const originalDescription = selectedTask.value?.description ?? "";
  let newDescription = originalDescription;
  const trimmed = originalDescription.trim();
  if (!trimmed || trimmed === "#") {
    // 如果任务描述为空或只有一个 #，写入「# 标题\n」
    newDescription = titleForHeader ? `# ${titleForHeader}\n` : originalDescription;
  } else if (titleForHeader) {
    // 如果已有内容，只替换第一个换行前的内容
    const firstNewlineIndex = originalDescription.indexOf("\n");
    const rest = firstNewlineIndex !== -1 ? originalDescription.slice(firstNewlineIndex) : "\n";
    newDescription = `# ${titleForHeader}${rest}`;
  }
  dataStore.updateTaskById(taskId, {
    description: newDescription,
  });
}

// 表头按钮：对当前选中行执行撤销任务（退回活动清单）
function handleSuspendSelectedTodo() {
  if (
    !selectedTodo.value ||
    selectedTodo.value.status === "done" ||
    selectedTodo.value.status === "cancelled" ||
    selectedTodo.value.realPomo
  )
    return;
  emit("suspend-todo", selectedTodo.value.id);
}

// 表头按钮：对当前选中行执行取消任务（不退回活动清单）
function handleCancelSelectedTodo() {
  if (
    !selectedTodo.value ||
    selectedTodo.value.status === "done" ||
    selectedTodo.value.status === "cancelled" ||
    selectedTodo.value.realPomo
  )
    return;
  emit("cancel-todo", selectedTodo.value.id);
}

// 注意这里是 timestring 不是timestamp，是在Home用currentViewdate进行的转化
function saveEdit(todo: Todo) {
  if (!editingRowId.value) return;
  // Enter 选中标签后 keyup.enter 仍会触发 saveEdit，此时不结束编辑以便继续输入
  if (selectingTagViaEnter.value) {
    selectingTagViaEnter.value = false;
    return;
  }

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
    const normalized = normalizeTimeInput(editingValue.value);
    if (normalized && normalized !== "") {
      emit("edit-todo-start", todo.id, normalized);
    }
  }

  if (editingField.value === "done") {
    const normalized = normalizeTimeInput(editingValue.value);
    if (normalized === "") {
      emit("edit-todo-done", todo.id, "");
    } else if (typeof normalized === "string") {
      emit("edit-todo-done", todo.id, normalized);
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

// 规范化时间输入，支持多种格式并返回 HH:mm
function normalizeTimeInput(raw: string): string | "" | null {
  const value = raw.trim();
  if (!value) return "";

  // 带冒号形式，如 7:3 / 07:11
  const colonMatch = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colonMatch) {
    let hours = parseInt(colonMatch[1], 10);
    let minutes = parseInt(colonMatch[2], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return null;
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  // 四位纯数字，如 0711 / 1234
  if (/^\d{4}$/.test(value)) {
    const hours = parseInt(value.slice(0, 2), 10);
    const minutes = parseInt(value.slice(2), 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return null;
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  // 三位纯数字，前 1 位小时，后 2 位分钟，如 711 / 930 / 111
  if (/^\d{3}$/.test(value)) {
    const hours = parseInt(value.slice(0, 1), 10);
    const minutes = parseInt(value.slice(1), 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return null;
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  return null;
}

// 保持旧 API 以兼容其他调用方（目前未使用，占位以防其他模块引用）
// @ts-expect-error keep API for potential external usage
const isValidTimeString: (str: string) => string | "" | null = normalizeTimeInput;

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
  const average = Math.round(sum / count);
  return count === 0 ? "-" : average === 10 ? "x" : average;
}

// 2) 统计中断类型数量（"E" 或 "I"）
// 空、null、undefined 或 [] 返回 null
function countInterruptions(records: { interruptionType: "E" | "I" }[] | null | undefined, type: "E" | "I"): number | string {
  if (!Array.isArray(records) || records.length === 0) return "-";
  let count = 0;
  for (const r of records) if (r?.interruptionType === type) count++;
  return count === 0 ? "-" : count > 10 ? "X" : count;
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
        selectingTagViaEnter.value = true;
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
  // Enter 选中时把焦点拉回输入框以便继续编辑
  if (selectingTagViaEnter.value) {
    nextTick(() => titleInputRef.value?.focus());
  }
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

function handleTogglePomoType() {
  if (selectedRowId.value) {
    emit("toggle-pomo-type", selectedRowId.value);
  }
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
  width: 46px;
}

col.col-end {
  width: 46px;
}

col.col-rank {
  width: 24px;
}

td.col-rank-disabled {
  cursor: not-allowed;
}

col.col-intent {
  width: 55%;
  min-width: 0px;
}

col.col-fruit {
  width: 45%;
  min-width: 0px;
}

col.col-status {
  width: 60px;
}

@media (max-width: 400px) {
  col.col-check {
    width: 20px;
  }

  col.col-start {
    width: 36px;
    font-family: Consolas, "Courier New", Courier, monospace;
  }

  col.col-end {
    width: 36px;
    font-family: Consolas, "Courier New", Courier, monospace;
  }

  col.col-rank {
    width: 24px;
  }

  col.col-status {
    width: 40px;
  }

  td.col-intent {
    text-overflow: clip !important;
  }

  td.col-intent .ellipsis {
    text-overflow: clip !important;
  }

  td.col-start,
  td.col-end,
  .time-input {
    font-size: 12px;
    text-overflow: clip;
  }
}

td.col-start,
td.col-end {
  font-family: Consolas, "Courier New", Courier, monospace;
}
/* 表头样式 */
thead th {
  padding: 2px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  height: 20px;
  font-weight: 500;
  border-bottom: 2px solid var(--color-background-dark);
  color: var(--color-text-primary);
  background-color: var(--color-background) !important;
  line-height: 1.3;
  box-sizing: border-box;
}

/* 状态列表头不放省略号，保证取消/退回按钮完整显示 */
th.col-status {
  overflow: visible;
  text-overflow: clip;
}

/* 开始/结束表头可点击，悬停为手型 */
th.col-start,
th.col-end {
  cursor: pointer;
}

/* 果果列及开始/结束列禁用状态 */
th.col-fruit.disabled-toggle,
th.col-start.disabled-toggle,
th.col-end.disabled-toggle {
  cursor: not-allowed;
}

.add-todo-button {
  cursor: pointer;
  transform: translate(-1px, 3px);
}

.header-icon {
  transform: translateY(3px);
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

tr.cancel-row {
  color: var(--color-text-secondary);
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
td.col-intent .ellipsis {
  display: block;
  width: 100%;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.priority-badge {
  display: inline-flex;
  align-items: center !important;
  justify-content: center !important;
  line-height: 1;
  width: 15px;
  height: 15px;
  position: relative;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  top: -1px;
}

/* 可按 priority 分不同色 */
.priority-0 {
  background-color: var(--color-background-light);
  color: var(--color-text-secondary);
  top: 2px; /* 修复偏移 因为没有字就没有因为行高产生的定位*/
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
  margin-left: -4px;
  z-index: 1;
}

.button-right {
  margin-left: -8px;
  z-index: 2;
}

.button-right.one-mode {
  margin-left: -4px;
  z-index: 2;
}

/* 状态信息 */
.status-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}

/* 统计值为内联块，避免撑满 */
.records-stat {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  font-family: Consolas, "Courier New", Courier, monospace;
  font-size: 14px;
  gap: 2px;
}

:deep(.n-button) :hover {
  color: var(--color-red);
}
.cancel-button {
  transform: translateY(3px);
}
.suspend-button {
  transform: translateY(3px);
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

/* 排序列 emoji 弹窗：10 个选项 5×2 网格，不留多余空白 */
.rank-emoji-options {
  display: grid;
  grid-template-columns: repeat(5, 24px);
  grid-template-rows: repeat(2, 24px);
  gap: 6px;
  padding: 0px;
  width: fit-content;
}
.rank-emoji-btn {
  width: 24px;
  height: 24px;
  font-size: 16px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  background: var(--n-color);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.rank-emoji-btn:hover {
  background: var(--n-color-hover);
}

/* 排序绑定标签弹层 */
.priority-binding-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.priority-binding-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.priority-binding-emoji {
  font-size: 20px;
  width: 28px;
  text-align: center;
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
</style>
