import type { Activity } from "@/core/types/Activity";
import type { Task } from "@/core/types/Task";
import { useDataStore } from "@/stores/useDataStore";
import { useSearchUiStore } from "@/stores/useSearchUiStore";
import { saveActivities, saveTasks } from "@/services/data/localStorageService";

/** 建普通 Activity + Task（正文 = Markdown），打开右侧 Tab */
export function openExportMarkdownPreview(markdown: string, tabTitle = "导出预览"): void {
  const dataStore = useDataStore();
  const searchUi = useSearchUiStore();

  const now = Date.now();
  const activityId = now;
  const taskId = now + 1;

  const activity: Activity = {
    id: activityId,
    title: tabTitle,
    class: "T",
    parentId: null,
    taskId,
    status: "",
    deleted: false,
    synced: false,
    lastModified: now,
  };

  const task: Task = {
    id: taskId,
    activityTitle: tabTitle,
    source: "activity",
    sourceId: activityId,
    description: markdown,
    energyRecords: [],
    rewardRecords: [],
    interruptionRecords: [],
    starred: false,
    deleted: false,
    synced: false,
    lastModified: now,
  };

  dataStore.activityList = [...dataStore.activityList, activity];
  dataStore.taskList = [...dataStore.taskList, task];
  saveActivities(dataStore.activityList);
  saveTasks(dataStore.taskList);

  searchUi.openTab("activity", activityId, tabTitle);
}
