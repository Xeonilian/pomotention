// 当前展示任务的「最近历史」：最后点的为当前，无循环，列表最多 99 条，超出删最旧
import { defineStore } from "pinia";
import { ref, computed } from "vue";

const MAX_RECENT = 99;

export const useDisplayedTaskStore = defineStore(
  "displayedTask",
  () => {
    const taskIdsRecentList = ref<number[]>([]);
    const displayedTaskIndex = ref(0);

    const displayedTaskId = computed<number | null>(() => {
      const list = taskIdsRecentList.value;
      const idx = displayedTaskIndex.value;
      if (idx < 0 || idx >= list.length) return null;
      return list[idx] ?? null;
    });

    const hasPrev = computed(() => displayedTaskIndex.value > 0);
    const hasNext = computed(
      () =>
        taskIdsRecentList.value.length > 0 &&
        displayedTaskIndex.value < taskIdsRecentList.value.length - 1,
    );

    function pushTaskId(id: number) {
      if (id == null) return;
      const list = taskIdsRecentList.value;
      if (list.length > 0 && list[list.length - 1] === id) {
        displayedTaskIndex.value = list.length - 1;
        return;
      }
      const next = [...list, id];
      if (next.length > MAX_RECENT) next.splice(0, next.length - MAX_RECENT);
      taskIdsRecentList.value = next;
      displayedTaskIndex.value = taskIdsRecentList.value.length - 1;
    }

    function goPrev() {
      if (!hasPrev.value) return;
      displayedTaskIndex.value--;
    }

    function goNext() {
      if (!hasNext.value) return;
      displayedTaskIndex.value++;
    }

    return {
      taskIdsRecentList,
      displayedTaskIndex,
      displayedTaskId,
      hasPrev,
      hasNext,
      pushTaskId,
      goPrev,
      goNext,
    };
  },
  {
    persist: {
      key: "displayed-task-history",
      pick: ["taskIdsRecentList", "displayedTaskIndex"],
    },
  },
);
