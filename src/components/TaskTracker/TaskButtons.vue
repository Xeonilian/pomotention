<template>

  <div class="task-buttons" ref="buttonsContainerRef">

    <template v-if="!isMobile">

      <n-button

        v-for="actionId in desktopActionIds"

        :key="actionId"

        v-bind="desktopButtonProps(actionId)"

        :disabled="!taskId"

        :title="actionTitle(actionId)"

        @click="runToolbarAction(actionId)"

      >

        <template #icon>

          <ToolbarActionIcon :action-id="actionId" :is-starred="isStarred" />

        </template>

      </n-button>

    </template>



    <template v-if="isMobile">

      <n-popover
        v-model:show="showCollapsedPopover"
        trigger="click"
        placement="bottom-start"
        :show-arrow="false"
        :content-style="{ padding: '3px 2px' }"
        @update:show="onPopoverShowChange"
      >

        <template #trigger>

          <n-button size="small" text :disabled="!taskId" title="更多操作">

            <template #icon>

              <n-icon><ChevronDoubleLeft16Regular /></n-icon>

            </template>

          </n-button>

        </template>

        <div class="collapsed-buttons" :class="{ 'collapsed-buttons--edit': popoverEditMode }">

          <n-button

            v-for="actionId in mobileOverflowIds"

            :key="actionId"

            v-bind="popoverActionButtonProps(actionId)"
            class="toolbar-popover-action"

            :class="{
              'toolbar-popover-action--selected': popoverEditMode && editSelection.includes(actionId),
              'toolbar-popover-action--muted': popoverEditMode && !editSelection.includes(actionId),
            }"

            :disabled="!taskId"

            :title="actionTitle(actionId)"

            @click.stop="handleOverflowActionClick(actionId)"

          >

            <template #icon>

              <ToolbarActionIcon :action-id="actionId" :is-starred="isStarred" />

            </template>

          </n-button>

          <n-button
            text
            size="small"
            class="toolbar-more-btn"

            :class="{ 'toolbar-more-btn--edit': popoverEditMode }"

            :title="moreButtonTitle"

            @click.stop="handleMoreClick"

          >

            ...

          </n-button>

        </div>

      </n-popover>

      <n-button

        v-for="actionId in mobilePinnedIds"

        :key="'pin-' + actionId"

        v-bind="mobilePinnedButtonProps(actionId)"

        class="toolbar-pinned-action"

        :class="{ 'toolbar-pinned-action--muted': popoverEditMode && showCollapsedPopover }"

        :disabled="!taskId"

        :title="actionTitle(actionId)"

        @click="runToolbarAction(actionId)"

      >

        <template #icon>

          <ToolbarActionIcon :action-id="actionId" :is-starred="isStarred" />

        </template>

      </n-button>

    </template>



    <n-button text @click="displayStore.goPrev()" :disabled="!displayStore.hasPrev" title="上一个任务">

      <template #icon>

        <n-icon><ChevronLeft20Regular /></n-icon>

      </template>

    </n-button>

    <n-button text @click="displayStore.goNext()" :disabled="!displayStore.hasNext" title="下一个任务">

      <template #icon>

        <n-icon><ChevronRight20Regular /></n-icon>

      </template>

    </n-button>



    <EnergyInputDialog v-model:show="showEnergyDialog" @confirm="handleEnergyConfirm" />

    <RewardInputDialog v-model:show="showRewardDialog" @confirm="handleRewardConfirm" />

    <InterruptionInputDialog v-model:show="showInterruptionDialog" @confirm="handleInterruptionConfirm" />



    <TemplateDialog

      :show="showTemplateDialog"

      :templates="templates"

      @update:show="showTemplateDialog = $event"

      @confirm="handleTemplateConfirm"

      @delete="handleDeleteTemplate"

    />



    <TagManager

      v-model="tagIdsProxy"

      :show="showTagManager"

      @update:show="showTagManager = $event"

      @after-leave="handleTagManagerClose"

      :taskId="taskId"

      :modalTo="tagManagerModalTo"

    />

  </div>

</template>



<script setup lang="ts">

import { ref, computed, inject, onMounted, onUnmounted, defineComponent, h } from "vue";

import { NButton, NPopover, NIcon } from "naive-ui";

import EnergyInputDialog from "@/components/TaskTracker/EnergyInputDialog.vue";

import RewardInputDialog from "@/components/TaskTracker/RewardInputDialog.vue";

import InterruptionInputDialog from "@/components/TaskTracker/InterruptionInputDialog.vue";

import TemplateDialog from "@/components/TaskTracker/TemplateDialog.vue";

import TagManager from "@/components/TagSystem/TagManager.vue";

import {

  BatterySaver20Regular,

  Trophy20Regular,

  CommentLightning20Regular,

  BookAdd20Regular,

  Star20Regular,

  Star20Filled,

  Tag16Regular,

  ChevronDoubleLeft16Regular,

  ChevronRight20Regular,

  ChevronLeft20Regular,

} from "@vicons/fluent";



import { useTemplateStore } from "@/stores/useTemplateStore";

import { useSettingStore } from "@/stores/useSettingStore";

import type { Template } from "@/core/types/Template";

import type { TaskToolbarActionId } from "@/core/taskToolbarActions";

import {

  TASK_TOOLBAR_ACTION_IDS,

  TASK_TOOLBAR_ACTION_TITLES,

  normalizeTaskToolbarMobilePinned,

  getTaskToolbarOverflowIds,

  mergeTaskToolbarMobilePinned,

  toggleTaskToolbarEditSelection,

} from "@/core/taskToolbarActions";

import { useActivityTagEditor } from "@/composables/activity/useActivityTagEditor";

import { useDataStore } from "@/stores/useDataStore";

import { useDisplayedTaskStore } from "@/stores/useDisplayedTaskStore";

import { useDevice } from "@/composables/platform/useDevice";

import { registerTaskKeyboardCommandApi } from "@/composables/keyboard/useTaskKeyboardCommands";



const ToolbarActionIcon = defineComponent({

  name: "ToolbarActionIcon",

  props: {

    actionId: { type: String, required: true },

    isStarred: { type: Boolean, default: false },

  },

  setup(props) {

    return () => {

      switch (props.actionId as TaskToolbarActionId) {

        case "star":

          return h(NIcon, null, () => h(props.isStarred ? Star20Filled : Star20Regular));

        case "tag":

          return h(NIcon, { color: "var(--color-blue)" }, () => h(Tag16Regular));

        case "energy":

          return h(NIcon, null, () => h(BatterySaver20Regular));

        case "reward":

          return h(NIcon, null, () => h(Trophy20Regular));

        case "interruption":

          return h(NIcon, null, () => h(CommentLightning20Regular));

        case "template":

          return h(NIcon, null, () => h(BookAdd20Regular));

        default:

          return null;

      }

    };

  },

});



const tagEditor = useActivityTagEditor();

const dataStore = useDataStore();

const displayStore = useDisplayedTaskStore();

const settingStore = useSettingStore();

const { isMobile } = useDevice();



const fullscreenContainerRef = inject<{ value: HTMLElement | null }>("taskTrackerFullscreenContainerRef", { value: null });

const isTaskTrackerFullscreen = inject<{ value: boolean }>("isTaskTrackerFullscreen", { value: false });

const startTaskRecordEditing = inject<() => boolean>("taskTrackerStartRecordEditing", () => false);



const props = defineProps<{

  taskId: number | null;

  isStarred: boolean;

}>();



const templateStore = useTemplateStore();



const showEnergyDialog = ref(false);

const showRewardDialog = ref(false);

const showInterruptionDialog = ref(false);

const showTemplateDialog = ref(false);



const templates = computed(() => templateStore.allTemplates);



const showCollapsedPopover = ref(false);

const popoverEditMode = ref(false);

const editSelection = ref<TaskToolbarActionId[]>([]);

let unregisterTaskCommandApi: (() => void) | null = null;



const desktopActionIds = TASK_TOOLBAR_ACTION_IDS;



const mobilePinnedIds = computed(() =>

  normalizeTaskToolbarMobilePinned(settingStore.settings.taskToolbarMobilePinned),

);



const mobileOverflowIds = computed(() => getTaskToolbarOverflowIds(mobilePinnedIds.value));



const moreButtonTitle = computed(() =>

  popoverEditMode.value ? "完成调整快捷按钮" : "调整快捷按钮",

);



function actionTitle(actionId: TaskToolbarActionId): string {

  return TASK_TOOLBAR_ACTION_TITLES[actionId];

}



function desktopButtonProps(actionId: TaskToolbarActionId) {

  if (actionId === "star") return { type: "warning" as const, text: true };

  if (actionId === "tag") return { text: true };

  if (actionId === "template") return { type: "default" as const, size: "small" as const, secondary: true, circle: true };

  return { type: "info" as const, size: "small" as const, secondary: true, circle: true };

}



function mobileButtonProps(actionId: TaskToolbarActionId) {
  const base = { text: true as const, size: "small" as const };
  if (actionId === "star") return { ...base, type: "warning" as const };
  if (actionId === "tag") return base;
  if (actionId === "template") return { ...base, type: "default" as const };
  return { ...base, type: "info" as const };
}

function mobilePinnedButtonProps(actionId: TaskToolbarActionId) {
  return mobileButtonProps(actionId);
}

function popoverActionButtonProps(actionId: TaskToolbarActionId) {
  return mobileButtonProps(actionId);
}



function onPopoverShowChange(show: boolean) {

  if (!show) {

    popoverEditMode.value = false;

    editSelection.value = [];

  }

}



function handleOverflowActionClick(actionId: TaskToolbarActionId) {

  if (popoverEditMode.value) {

    editSelection.value = toggleTaskToolbarEditSelection(editSelection.value, actionId);

    return;

  }

  runToolbarAction(actionId);

  showCollapsedPopover.value = false;

}



function handleMoreClick() {

  if (!popoverEditMode.value) {

    popoverEditMode.value = true;

    editSelection.value = [];

    return;

  }



  if (editSelection.value.length > 0) {

    settingStore.settings.taskToolbarMobilePinned = mergeTaskToolbarMobilePinned(

      mobilePinnedIds.value,

      editSelection.value,

    );

  }



  popoverEditMode.value = false;

  editSelection.value = [];

  showCollapsedPopover.value = false;

}



function runToolbarAction(actionId: TaskToolbarActionId) {

  if (!props.taskId) return;

  switch (actionId) {

    case "star":

      starTrack();

      break;

    case "tag":

      openTagManager();

      break;

    case "energy":

      showEnergyDialog.value = true;

      showCollapsedPopover.value = false;

      break;

    case "reward":

      showRewardDialog.value = true;

      showCollapsedPopover.value = false;

      break;

    case "interruption":

      showInterruptionDialog.value = true;

      showCollapsedPopover.value = false;

      break;

    case "template":

      showTemplateDialog.value = true;

      showCollapsedPopover.value = false;

      break;

  }

}



const emit = defineEmits<{

  (e: "energy-record", value: { value: number; description?: string; recordedAt: number }): void;

  (e: "reward-record", value: { value: number; description?: string; recordedAt: number }): void;

  (

    e: "interruption-record",

    data: {

      interruptionType: "E" | "I";

      description: string;

      asActivity: boolean;

      activityType?: "T" | "S";

      dueDate?: number | null;

      recordedAt: number;

    },

  ): void;

  (e: "star"): void;

}>();



function handleEnergyConfirm(val: { value: number; description?: string; recordedAt: number }) {

  if (props.taskId) {

    emit("energy-record", val);

  }

}



function handleRewardConfirm(val: { value: number; description?: string; recordedAt: number }) {

  if (props.taskId) {

    emit("reward-record", val);

  }

}



function handleInterruptionConfirm(val: {

  interruptionType: "E" | "I";

  description: string;

  asActivity: boolean;

  activityType?: "T" | "S";

  dueDate?: number | null;

  recordedAt: number;

}) {

  if (props.taskId) {

    emit("interruption-record", val);

  }

}



const handleTemplateConfirm = (template: Template) => {

  const exists = templateStore.allTemplates.some((t) => t.id === template.id);



  if (!exists) {

    templateStore.addTemplate(template.title, template.content);

  } else {

    templateStore.updateTemplate(template.id, {

      title: template.title,

      content: template.content,

    });

  }

};



const handleDeleteTemplate = (templateId: number) => {

  templateStore.removeTemplate(templateId);

};



function starTrack() {

  if (props.taskId) {

    emit("star");

  }

}



const showTagManager = ref(false);

const tagManagerModalTo = computed<string | HTMLElement>(() => {

  if (!isTaskTrackerFullscreen.value) return "body";

  return fullscreenContainerRef.value ?? "body";

});



const tagIdsProxy = computed({

  get: () => tagEditor.tempTagIds.value,

  set: (v) => (tagEditor.tempTagIds.value = v),

});



function openTagManager() {

  let activityId = null;

  if (props.taskId) {

    const task = dataStore.taskById.get(props.taskId);

    if (task && task.sourceId) {

      activityId = task.sourceId;

    }

  }

  if (activityId) {

    tagEditor.openTagManager(activityId);

    showTagManager.value = true;

  }

}



function handleTagManagerClose() {

  tagEditor.saveAndCloseTagManager();

  showTagManager.value = false;

}



function keyboardToggleStar(): boolean {

  if (!props.taskId) return false;

  starTrack();

  return true;

}



function keyboardOpenEditor(): boolean {

  return startTaskRecordEditing();

}



function keyboardOpenTagManager(): boolean {

  if (!props.taskId) return false;

  openTagManager();

  return true;

}



function keyboardOpenEnergyDialog(): boolean {

  if (!props.taskId) return false;

  showEnergyDialog.value = true;

  showCollapsedPopover.value = false;

  return true;

}



function keyboardOpenRewardDialog(): boolean {

  if (!props.taskId) return false;

  showRewardDialog.value = true;

  showCollapsedPopover.value = false;

  return true;

}



function keyboardOpenInterruptionDialog(): boolean {

  if (!props.taskId) return false;

  showInterruptionDialog.value = true;

  showCollapsedPopover.value = false;

  return true;

}



function keyboardOpenTemplateDialog(): boolean {

  if (!props.taskId) return false;

  showTemplateDialog.value = true;

  showCollapsedPopover.value = false;

  return true;

}



function keyboardGoPrevTask(): boolean {

  if (!displayStore.hasPrev) return false;

  displayStore.goPrev();

  return true;

}



function keyboardGoNextTask(): boolean {

  if (!displayStore.hasNext) return false;

  displayStore.goNext();

  return true;

}



onMounted(() => {

  unregisterTaskCommandApi = registerTaskKeyboardCommandApi({

    openEditor: keyboardOpenEditor,

    toggleStar: keyboardToggleStar,

    openTagManager: keyboardOpenTagManager,

    openEnergyDialog: keyboardOpenEnergyDialog,

    openRewardDialog: keyboardOpenRewardDialog,

    openInterruptionDialog: keyboardOpenInterruptionDialog,

    openTemplateDialog: keyboardOpenTemplateDialog,

    goPrevTask: keyboardGoPrevTask,

    goNextTask: keyboardGoNextTask,

  });

});



onUnmounted(() => {

  if (unregisterTaskCommandApi) {

    unregisterTaskCommandApi();

    unregisterTaskCommandApi = null;

  }

});

</script>



<style scoped>

.task-buttons {

  display: flex;

  gap: 8px;

  justify-content: right;

  flex-shrink: 0;

  min-width: 0;

}



.collapsed-buttons {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
}

.toolbar-popover-action--muted {
  filter: grayscale(1);
  opacity: 0.55;
}

.toolbar-popover-action--selected {
  filter: none !important;
  opacity: 1 !important;
}

.toolbar-pinned-action--muted {
  filter: grayscale(1);
  opacity: 0.55;
}

.toolbar-more-btn {
  flex-shrink: 0;
  margin-left: 2px;
  padding: 0 2px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.toolbar-more-btn--edit {
  color: var(--n-text-color);
}

@media (max-width: 430px) {
  .task-buttons {
    gap: 6px;
  }
}

</style>

