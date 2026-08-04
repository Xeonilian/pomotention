import type { Activity } from "@/core/types/Activity";
import { passPickedActivity } from "@/services/activity/activityService";
import { taskService } from "@/services/task/taskService";
import { useDataStore } from "@/stores/useDataStore";
import { getDayStartTimestamp } from "@/core/utils/getDayStartTimestamp";
import { addDays } from "@/core/utils/addDays";
import { isToday } from "@/core/utils/isToday";
import type { CaptureTodoIntent } from "./schema";

export interface WriteTodoResult {
  todoId: number;
  title: string;
}

/** 按 HomeView.onQuickAddTodo 路径写入一条 todo */
export function writeCaptureTodo(intent: CaptureTodoIntent): WriteTodoResult {
  const dataStore = useDataStore();
  const offset = intent.fields.dueDayOffset ?? 0;
  const dayStart = addDays(getDayStartTimestamp(Date.now()), offset);
  const viewIsToday = isToday(dayStart);

  const newActivity: Activity = {
    id: Date.now(),
    class: "T",
    title: intent.fields.title.trim(),
    estPomoI: intent.fields.estPomo != null ? String(intent.fields.estPomo) : "",
    pomoType: "🍅",
    status: "ongoing",
    dueDate: dayStart,
    parentId: null,
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  };

  dataStore.activityList.push(newActivity);

  const task = taskService.createTaskFromActivity(newActivity.id, newActivity.title);
  dataStore.taskList = [...dataStore.taskList, task];
  newActivity.taskId = task.id;
  newActivity.synced = false;
  newActivity.lastModified = Date.now();

  const { newTodo } = passPickedActivity(newActivity, dayStart, viewIsToday);
  newTodo.taskId = task.id;
  if (intent.fields.estPomo != null) {
    newTodo.estPomo = [intent.fields.estPomo];
  }
  newTodo.dueDate = dayStart;
  newTodo.synced = false;
  newTodo.lastModified = Date.now();

  dataStore.todoList = [...dataStore.todoList, newTodo];
  dataStore.selectedActivityId = newActivity.id;
  dataStore.selectedTaskId = task.id;
  dataStore.selectedRowId = newTodo.id;

  dataStore.saveAllDebounced();

  return { todoId: newTodo.id, title: newTodo.activityTitle };
}
