<!-- 
  Component: DayView.vue
  Parent: HomeView.vue
-->
<template>
  <div class="today-container">
    <div class="todo-container">
      <DayTodo
        ref="dayTodoRef"
        :navigator-active="navigatorActive"
        @update-todo-status="updateTodoStatus"
        @suspend-todo="handleSuspendTodo"
        @cancel-todo="handleCancelTodo"
        @uncancel-todo="handleUncancelTodo"
        @update-todo-pomo="updateTodoPomo"
        @batch-update-priorities="updateTodoPriority"
        @update-todo-est="updateTodoEst"
        @edit-todo-title="handleEditTodoTitle"
        @edit-todo-start="handleEditTodoStart"
        @edit-todo-done="handleEditTodoDone"
        @quick-add-todo="handleQuickAddTodo"
        @toggle-pomo-type="handleTogglePomoType"
      />
    </div>
    <div class="schedule-container">
      <DaySchedule
        ref="dayScheduleRef"
        :navigator-active="navigatorActive"
        @update-schedule-status="updateScheduleStatus"
        @cancel-schedule="handleCancelSchedule"
        @uncancel-schedule="handleUncancelSchedule"
        @edit-schedule-title="handleEditScheduleTitle"
        @edit-schedule-start="handleEditScheduleStart"
        @edit-schedule-done="handleEditScheduleDone"
        @edit-schedule-duration="handleEditScheduleDuration"
        @edit-schedule-location="handleEditScheduleLocation"
        @quick-add-schedule="handleQuickAddSchedule"
      />
    </div>
  </div>
</template>
<!-- @repeat-schedule="handleRepeatSchedule" -->
<!-- @repeat-todo="handleRepeatTodo" -->

<script setup lang="ts">
import { ref } from "vue";
import DayTodo from "@/components/DayPlanner/DayTodo.vue";
import DaySchedule from "@/components/DayPlanner/DaySchedule.vue";
import type { Task } from "@/core/types/Task";

defineProps<{
  navigatorActive?: boolean;
}>();

type DayTodoExpose = {
  startKeyboardEdit: (field: "title" | "start" | "done") => boolean;
  moveKeyboardCell: (delta: 1 | -1) => boolean;
  activateKeyboardCell: () => boolean;
  confirmKeyboardAction: () => boolean;
  moveRankKeyboardOption: (delta: number) => boolean;
  toggleCheckForSelectedRow: () => boolean;
};

type DayScheduleExpose = {
  startKeyboardEdit: (field: "title" | "start" | "done" | "duration" | "location") => boolean;
  moveKeyboardCell: (delta: 1 | -1) => boolean;
  activateKeyboardCell: () => boolean;
  confirmKeyboardAction: () => boolean;
  toggleCheckForSelectedRow: () => boolean;
};

const dayTodoRef = ref<DayTodoExpose | null>(null);
const dayScheduleRef = ref<DayScheduleExpose | null>(null);

const emit = defineEmits<{
  (e: "update-schedule-status", id: number, checked: boolean): void;
  (e: "edit-schedule-title", id: number, newTitle: string): void;
  (e: "cancel-schedule", id: number): void;
  (e: "uncancel-schedule", id: number): void;
  (e: "update-todo-status", id: number, checked: boolean): void;
  (e: "suspend-todo", id: number): void;
  (e: "cancel-todo", id: number): void;
  (e: "uncancel-todo", id: number): void;
  (e: "quick-add-todo"): void;
  (e: "quick-add-schedule"): void;
  (e: "update-todo-est", id: number, estPomo: number[]): void;
  (e: "update-todo-pomo", id: number, pomo: number[]): void;
  (e: "update-todo-priority", id: number, priority: number): void;
  (e: "batch-update-priorities", updates: Array<{ id: number; priority: number }>): void;
  (e: "edit-todo-title", id: number, newTitle: string): void;
  (e: "edit-todo-start", id: number, newTs: string): void;
  (e: "edit-todo-done", id: number, newTs: string): void;
  (e: "edit-schedule-start", id: number, newTs: string): void;
  (e: "edit-schedule-done", id: number, newTs: string): void;
  (e: "edit-schedule-duration", id: number, newDurationMin: string): void;
  (e: "edit-schedule-location", id: number, newLocation: string): void;
  (e: "convert-todo-to-task", payload: { task: Task; activityId: number }): void;
  (e: "convert-schedule-to-task", payload: { task: Task; activityId: number }): void;
  (e: "toggle-pomo-type", id: number): void;
}>();

function updateScheduleStatus(id: number, checked: boolean) {
  emit("update-schedule-status", id, checked);
}

function updateTodoStatus(id: number, checked: boolean) {
  emit("update-todo-status", id, checked);
}

function handleCancelSchedule(id: number) {
  emit("cancel-schedule", id);
}

function handleUncancelSchedule(id: number) {
  emit("uncancel-schedule", id);
}

function handleSuspendTodo(id: number) {
  emit("suspend-todo", id);
}

function handleCancelTodo(id: number) {
  emit("cancel-todo", id);
}

function handleUncancelTodo(id: number) {
  emit("uncancel-todo", id);
}

function updateTodoPriority(updates: Array<{ id: number; priority: number }>) {
  emit("batch-update-priorities", updates);
}
function updateTodoPomo(id: number, pomo: number[]) {
  emit("update-todo-pomo", id, pomo);
}

function updateTodoEst(id: number, estPomo: number[]) {
  emit("update-todo-est", id, estPomo);
}

function handleEditScheduleTitle(scheduleId: number, newTitle: string) {
  emit("edit-schedule-title", scheduleId, newTitle);
}

function handleEditScheduleStart(scheduleId: number, newTs: string) {
  emit("edit-schedule-start", scheduleId, newTs);
}

function handleEditTodoTitle(todoId: number, newTitle: string) {
  emit("edit-todo-title", todoId, newTitle);
}

function handleEditTodoStart(todoId: number, newTs: string) {
  emit("edit-todo-start", todoId, newTs);
}

function handleEditTodoDone(todoId: number, newTs: string) {
  emit("edit-todo-done", todoId, newTs);
}

function handleEditScheduleDone(scheduleId: number, newTs: string) {
  emit("edit-schedule-done", scheduleId, newTs);
}

function handleEditScheduleDuration(scheduleId: number, newDurationMin: string) {
  emit("edit-schedule-duration", scheduleId, newDurationMin);
}

function handleEditScheduleLocation(scheduleId: number, newLocation: string) {
  emit("edit-schedule-location", scheduleId, newLocation);
}

function handleQuickAddTodo() {
  emit("quick-add-todo");
}

function handleQuickAddSchedule() {
  emit("quick-add-schedule");
}

function handleTogglePomoType(id: number) {
  emit("toggle-pomo-type", id);
}

function startTodoKeyboardEdit(field: "title" | "start" | "done"): boolean {
  return dayTodoRef.value?.startKeyboardEdit(field) ?? false;
}

function startScheduleKeyboardEdit(field: "title" | "start" | "done" | "duration" | "location"): boolean {
  return dayScheduleRef.value?.startKeyboardEdit(field) ?? false;
}

function movePlannerKeyboardCell(delta: 1 | -1): boolean {
  return dayTodoRef.value?.moveKeyboardCell(delta) || dayScheduleRef.value?.moveKeyboardCell(delta) || false;
}

function activatePlannerKeyboardCell(): boolean {
  return dayTodoRef.value?.activateKeyboardCell() || dayScheduleRef.value?.activateKeyboardCell() || false;
}

function toggleSelectedRowCheckKeyboard(): boolean {
  if (dayTodoRef.value?.toggleCheckForSelectedRow()) return true;
  return dayScheduleRef.value?.toggleCheckForSelectedRow() ?? false;
}

function confirmPlannerKeyboardCellAction(): boolean {
  return dayTodoRef.value?.confirmKeyboardAction() || dayScheduleRef.value?.confirmKeyboardAction() || false;
}

function navigatePlannerKeyboardSubSelection(delta: number): boolean {
  return dayTodoRef.value?.moveRankKeyboardOption(delta) ?? false;
}

defineExpose({
  startTodoKeyboardEdit,
  startScheduleKeyboardEdit,
  movePlannerKeyboardCell,
  activatePlannerKeyboardCell,
  toggleSelectedRowCheckKeyboard,
  confirmPlannerKeyboardCellAction,
  navigatePlannerKeyboardSubSelection,
});
</script>
<style scoped>
.today-container {
  margin: 0px 0px 0px 5px;
}
.schedule-container {
  margin-top: 3px;
}

.todo-container {
  margin-bottom: 2px;
}
</style>
