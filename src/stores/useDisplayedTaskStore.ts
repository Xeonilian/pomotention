// 当前展示任务的「最近历史」：最后点的为当前，列表最多 99 条，超出删最旧
// 下标 -1 表示末尾「空位」：不展示 task、列表保留；仅能从当时正在看的那条通过置空进入，不能再往“更右”走
import { defineStore } from "pinia";
import { ref, computed } from "vue";

const MAX_RECENT = 99;

/** 无列表时的安全空位下标 */
const EMPTY_INDEX = -1;

export const useDisplayedTaskStore = defineStore(
  "displayedTask",
  () => {
    const taskIdsRecentList = ref<number[]>([]);
    const displayedTaskIndex = ref(EMPTY_INDEX);
    /** 进入空位前所在的列表下标，用于从空位 prev 回到刚看过的那条（如 A） */
    const emptySlotBackIndex = ref<number | null>(null);

    const displayedTaskId = computed<number | null>(() => {
      const list = taskIdsRecentList.value;
      const idx = displayedTaskIndex.value;
      if (idx < 0 || idx >= list.length) return null;
      return list[idx] ?? null;
    });

    const hasPrev = computed(() => {
      const n = taskIdsRecentList.value.length;
      if (n === 0) return false;
      const idx = displayedTaskIndex.value;
      return idx > 0 || idx === EMPTY_INDEX;
    });

    const hasNext = computed(() => {
      const n = taskIdsRecentList.value.length;
      if (n === 0) return false;
      const idx = displayedTaskIndex.value;
      if (idx === EMPTY_INDEX) return false;
      return idx < n - 1;
    });

    function pushTaskId(id: number) {
      if (id == null) return;
      emptySlotBackIndex.value = null;
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
      const list = taskIdsRecentList.value;
      const n = list.length;
      if (n === 0 || !hasPrev.value) return;
      const idx = displayedTaskIndex.value;
      if (idx === EMPTY_INDEX) {
        const back = emptySlotBackIndex.value;
        if (back != null && back >= 0 && back < n) {
          displayedTaskIndex.value = back;
        } else {
          displayedTaskIndex.value = n - 1;
        }
        emptySlotBackIndex.value = null;
        return;
      }
      displayedTaskIndex.value--;
    }

    function goNext() {
      const list = taskIdsRecentList.value;
      const n = list.length;
      if (n === 0 || !hasNext.value) return;
      const idx = displayedTaskIndex.value;
      if (idx < n - 1) {
        displayedTaskIndex.value++;
      }
    }

    /** Planner selectedTaskId 置空：落到末尾空位并记住当前条，便于只往回退到该条 */
    function snapToEmptySlot() {
      const idx = displayedTaskIndex.value;
      const n = taskIdsRecentList.value.length;
      if (idx >= 0 && idx < n) {
        emptySlotBackIndex.value = idx;
      } else if (n > 0 && emptySlotBackIndex.value == null) {
        emptySlotBackIndex.value = n - 1;
      }
      displayedTaskIndex.value = EMPTY_INDEX;
    }

    return {
      taskIdsRecentList,
      displayedTaskIndex,
      emptySlotBackIndex,
      displayedTaskId,
      hasPrev,
      hasNext,
      pushTaskId,
      goPrev,
      goNext,
      snapToEmptySlot,
    };
  },
  {
    persist: {
      key: "displayed-task-history",
      pick: ["taskIdsRecentList", "displayedTaskIndex", "emptySlotBackIndex"],
    },
  },
);
