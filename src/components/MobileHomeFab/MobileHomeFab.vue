<!-- 移动端 Home 右下角快捷操作：状态来自 useDataStore，动作用 emit 交给 HomeView -->
<template>
  <div v-show="!taskRecordEditing" class="mobile-home-fab" aria-label="快捷操作">
    <div class="mobile-home-fab__anchor">
      <!-- 往左：横向 add -->
      <n-popover
        v-model:show="panelShow"
        trigger="manual"
        placement="left-end"
        :show-arrow="false"
        content-class="mobile-home-fab-popover"
        :z-index="110"
        style="background: var(--color-background); box-shadow: none; --n-padding: 0; border-radius: 20px"
      >
        <template #trigger>
          <span class="mobile-home-fab__ghost-trigger" aria-hidden="true" />
        </template>
        <div class="mobile-home-fab__left">
          <n-button size="large" secondary circle type="info" @click="emit('quick-add-todo')">
            <template #icon>
              <n-icon :component="AddCircle24Regular" />
            </template>
          </n-button>
          <n-button size="large" secondary circle type="info" @click="emit('quick-add-schedule', false)">
            <template #icon>
              <n-icon :component="CalendarAdd24Regular" />
            </template>
          </n-button>
          <n-button size="large" secondary circle type="info" @click="emit('quick-add-schedule', true)">
            <template #icon>
              <n-icon :component="CloudAdd20Regular" />
            </template>
          </n-button>
        </div>
      </n-popover>

      <!-- 往上：纵向（与 ActivityButtons 对齐的交互） -->
      <n-popover
        v-if="showUpPopover"
        v-model:show="panelShow"
        trigger="manual"
        placement="top-end"
        :show-arrow="false"
        content-class="mobile-home-fab-popover"
        style="background: var(--color-background); box-shadow: none; --n-padding: 0; border-radius: 20px"
        :z-index="110"
      >
        <template #trigger>
          <span class="mobile-home-fab__ghost-trigger" aria-hidden="true" />
        </template>
        <div class="mobile-home-fab__up">
          <template v-if="showRowActions">
            <n-button
              v-if="!showActivityPanel"
              class="mobile-home-fab__suspend-button"
              size="large"
              secondary
              circle
              @click.stop="emit('suspend-planner-row')"
              title="撤销选中任务，退回活动清单"
              :disabled="isSelectedRowDone || selectedRowId === null || isSelectedClassS"
            >
              <template #icon>
                <n-icon size="20">
                  <ChevronCircleRight48Regular />
                </n-icon>
              </template>
            </n-button>
            <n-button
              v-if="showActivityPanel"
              @click="handlePickActivity"
              :disabled="activeId == null || isDeleted || isSelectedRowDone"
              circle
              secondary
              type="default"
              size="large"
              :title="isSelectedClassS ? '预约：跳转日期' : '任务：跳转日期|选择'"
            >
              <template #icon>
                <n-icon><ChevronCircleLeft48Regular /></n-icon>
              </template>
            </n-button>
            <template v-if="showActivityPanel">
              <n-button
                v-if="!hasParent"
                secondary
                circle
                type="default"
                size="large"
                title="生成子活动"
                :disabled="isSelectedRowDone || isSelectedClassS || isDeleted || noSelectedActivity"
                @click="emit('create-child-activity', activeId ?? selectedActivityId ?? null)"
              >
                <template #icon>
                  <n-icon><TextGrammarArrowRight24Regular /></n-icon>
                </template>
              </n-button>
              <n-button
                v-else
                secondary
                type="success"
                circle
                size="large"
                title="升级为兄弟"
                :disabled="activeId === null || isSelectedClassS"
                @click="emit('increase-child-activity', activeId ?? selectedActivityId ?? null)"
              >
                <template #icon>
                  <n-icon><TextGrammarArrowLeft24Regular /></n-icon>
                </template>
              </n-button>
            </template>
            <n-button
              :title="isDeleted && activeId !== null && activeId !== undefined ? '恢复活动' : '删除活动'"
              @click="emit('delete-activity', activeId ?? selectedActivityId ?? null)"
              circle
              secondary
              :type="isDeleted ? 'error' : 'default'"
              size="large"
              :disabled="isSelectedRowDone || noSelectedActivity"
            >
              <template #icon>
                <n-icon>
                  <DeleteDismiss24Regular v-if="isDeleted && activeId !== null" />
                  <Delete24Regular v-else />
                </n-icon>
              </template>
            </n-button>
          </template>
          <n-button
            title="重复活动"
            @click="emit('repeat-activity', showActivityPanel)"
            circle
            secondary
            type="default"
            size="large"
            :disabled="noSelectedActivity"
          >
            <template #icon>
              <n-icon><ArrowRepeatAll24Regular /></n-icon>
            </template>
          </n-button>
        </div>
        <n-button v-if="showBackToToday" quaternary circle type="info" size="large" @click="emit('reset-to-present')">
          <template #icon><n-icon size="22" :component="AnimalTurtle24Regular" /></template>
        </n-button>
      </n-popover>

      <n-button type="info" circle secondary size="large" class="mobile-home-fab__trigger" :focusable="false" @click="togglePanel">
        <template #icon>
          <n-icon :component="Add24Regular" />
        </template>
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted, toRefs } from "vue";
import { storeToRefs } from "pinia";
import { NButton, NIcon, NPopover } from "naive-ui";
import {
  Add24Regular,
  AddCircle24Regular,
  CalendarAdd24Regular,
  CloudAdd20Regular,
  AnimalTurtle24Regular,
  ChevronCircleRight48Regular,
  ChevronCircleLeft48Regular,
  DeleteDismiss24Regular,
  Delete24Regular,
  TextGrammarArrowRight24Regular,
  TextGrammarArrowLeft24Regular,
  ArrowRepeatAll24Regular,
} from "@vicons/fluent";
import type { Activity } from "@/core/types/Activity";
import { timestampToDatetime } from "@/core/utils";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";

const emit = defineEmits<{
  (e: "notify", message: string): void;
  (e: "update-active-id", id: number | null | undefined): void;
  (e: "pick-activity", activity: Activity): void;
  (e: "delete-activity", id: number | null | undefined): void;
  (e: "create-child-activity", id: number | null | undefined): void;
  (e: "increase-child-activity", id: number | null | undefined): void;
  (e: "quick-add-todo"): void;
  (e: "quick-add-schedule", isUntaetigkeit: boolean): void;
  (e: "reset-to-present"): void;
  (e: "suspend-planner-row"): void;
  (e: "repeat-activity", noTodoRepeat: boolean): void;
}>();

const props = defineProps<{
  /** TaskRecord 编辑时隐藏 FAB（由 HomeView 传入） */
  taskRecordEditing: boolean;
}>();
const { taskRecordEditing } = toRefs(props);
const settingStore = useSettingStore();

const dataStore = useDataStore();
const { activeId, selectedActivityId, selectedRowId, isSelectedRowDone, selectedActivity } = storeToRefs(dataStore);
const { activityById, todoByActivityId, scheduleByActivityId } = storeToRefs(dataStore);
const dateService = dataStore.dateService;

const isDeleted = computed(() => selectedActivity.value?.deleted ?? false);
const isSelectedClassS = computed(() => selectedActivity.value?.class === "S");
const hasParent = computed(() => selectedActivity.value?.parentId ?? null);

/** 与 ActivitySheet 一致：无选中且非今日 →「回到当下」 */
const showBackToToday = computed(() => !dateService.isViewDateToday);
const showRowActions = computed(() => selectedRowId.value !== null || activeId.value !== null);
const showUpPopover = computed(() => showBackToToday.value || showRowActions.value);
const showActivityPanel = computed(() => settingStore.settings.showActivity);
const noSelectedActivity = computed(() => selectedRowId.value == null && selectedActivityId.value == null);

/** 与 ActivitySheet.pickActivity 一致 */
function handlePickActivity() {
  const aid = activeId.value;
  if (aid == null) {
    emit("notify", "请选择一个活动！");
    return;
  }

  const relatedTodo = todoByActivityId.value.get(aid);
  if (relatedTodo && !relatedTodo.deleted) {
    emit("notify", "【" + timestampToDatetime(relatedTodo.id) + "】启动待办");
    dateService.navigateTo(new Date(relatedTodo.id));
    emit("update-active-id", aid);
    return;
  }

  const relatedSchedule = scheduleByActivityId.value.get(aid);
  if (relatedSchedule) {
    if (relatedSchedule.activityDueRange[0]) {
      dateService.navigateTo(new Date(relatedSchedule.activityDueRange[0]));
      emit("update-active-id", aid);
    } else {
      emit("notify", "预约尚未设置时间！");
    }
    return;
  }

  const picked = activityById.value.get(aid);
  if (!picked) return;
  emit("pick-activity", picked);
}

const panelShow = ref(false);
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

const POPOVER_AUTO_DISMISS_MS = 50_000;

function clearDismissTimer() {
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

function scheduleDismiss() {
  clearDismissTimer();
  dismissTimer = setTimeout(() => {
    panelShow.value = false;
    dismissTimer = null;
  }, POPOVER_AUTO_DISMISS_MS);
}

function togglePanel() {
  panelShow.value = !panelShow.value;
}

watch(taskRecordEditing, (editing) => {
  if (editing) {
    panelShow.value = false;
    clearDismissTimer();
  }
});

watch(panelShow, (show) => {
  if (show) {
    scheduleDismiss();
  } else {
    clearDismissTimer();
  }
});

onUnmounted(() => {
  clearDismissTimer();
});
</script>

<style scoped>
.mobile-home-fab {
  position: fixed;
  right: 15px;
  bottom: max(30px, env(safe-area-inset-bottom));
  z-index: 90;
  pointer-events: auto;
}

.mobile-home-fab__anchor {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mobile-home-fab__ghost-trigger {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: block;
}

.mobile-home-fab__trigger {
  position: relative;
  z-index: 1;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}

.mobile-home-fab__up {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.mobile-home-fab__left {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
</style>
