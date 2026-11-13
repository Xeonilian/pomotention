import type { Activity } from "@/core/types/Activity";
import { taskService } from "@/services/task/taskService";
import { useDataStore } from "@/stores/useDataStore";
import { useSearchUiStore } from "@/stores/useSearchUiStore";

/**
 * 按默认 onAddActivity 路径：无日期的 T 类 Activity → createTaskFromActivity → 写正文 → 打开 activity Tab。
 */
export function openExportMarkdownPreview(markdown: string, tabTitle = "Review"): void {
  const dataStore = useDataStore();
  const searchUi = useSearchUiStore();

  const newActivity: Activity = {
    id: Date.now(),
    class: "T",
    title: tabTitle,
    estPomoI: "",
    pomoType: "🍅",
    status: "ongoing",
    // 不写 dueDate：尚未入日
    parentId: null,
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  };

  dataStore.activityList.push(newActivity);

  const task = taskService.createTaskFromActivity(newActivity.id, newActivity.title);
  task.description = markdown;
  dataStore.taskList = [...dataStore.taskList, task];

  newActivity.taskId = task.id;
  newActivity.synced = false;
  newActivity.lastModified = Date.now();

  dataStore.saveAllDebounced();
  searchUi.openTab("activity", newActivity.id, tabTitle);
}
