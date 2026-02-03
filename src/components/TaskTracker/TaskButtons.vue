<template>
  <div class="task-buttons" ref="buttonsContainerRef">
    <!-- 展开状态：显示所有按钮 -->
    <template v-if="!isCollapsed">
      <n-button type="warning" text @click="starTrack" :disabled="!taskId">
        <template #icon>
          <n-icon v-if="isStarred">
            <Star20Filled />
          </n-icon>
          <n-icon v-else>
            <Star20Regular />
          </n-icon>
        </template>
      </n-button>
      <!-- 打开标签管理器的按钮 -->
      <n-button text @click="openTagManager" :disabled="!taskId">
        <template #icon>
          <n-icon color="var(--color-blue)"><Tag16Regular /></n-icon>
        </template>
      </n-button>

      <n-button size="small" type="info" secondary circle strong @click="showEnergyDialog = true" :disabled="!taskId" title="能量记录">
        <template #icon>
          <n-icon><BatterySaver20Regular /></n-icon>
        </template>
      </n-button>
      <n-button size="small" type="info" secondary circle strong @click="showRewardDialog = true" :disabled="!taskId" title="奖赏记录">
        <template #icon>
          <n-icon><Emoji24Regular /></n-icon>
        </template>
      </n-button>
      <n-button size="small" type="info" circle strong secondary @click="showInterruptionDialog = true" :disabled="!taskId" title="打扰记录">
        <template #icon>
          <n-icon><CalendarAssistant20Regular /></n-icon>
        </template>
      </n-button>

      <!-- 模板管理按钮 -->
      <n-button type="default" size="small" circle strong secondary :disabled="!taskId" @click="showTemplateDialog = true" title="模板管理">
        <template #icon>
          <n-icon><CalligraphyPen20Regular /></n-icon>
        </template>
      </n-button>
    </template>

    <!-- 折叠状态：显示折叠按钮和 popover -->
    <n-popover v-else v-model:show="showCollapsedPopover" trigger="click" placement="top-end" :show-arrow="false">
      <template #trigger>
        <n-button size="small" text :disabled="!taskId" title="更多操作">
          <template #icon>
            <n-icon><ChevronDoubleLeft16Regular /></n-icon>
          </template>
        </n-button>
      </template>
      <div class="collapsed-buttons">
        <n-button type="warning" text @click="handleCollapsedAction(starTrack)" :disabled="!taskId">
          <template #icon>
            <n-icon v-if="isStarred">
              <Star20Filled />
            </n-icon>
            <n-icon v-else>
              <Star20Regular />
            </n-icon>
          </template>
        </n-button>
        <n-button text @click="handleCollapsedAction(openTagManager)" :disabled="!taskId">
          <template #icon>
            <n-icon color="var(--color-blue)"><Tag16Regular /></n-icon>
          </template>
        </n-button>
        <n-button size="small" type="info" secondary circle strong @click="handleCollapsedAction(() => showEnergyDialog = true)" :disabled="!taskId" title="能量记录">
          <template #icon>
            <n-icon><BatterySaver20Regular /></n-icon>
          </template>
        </n-button>
        <n-button size="small" type="info" secondary circle strong @click="handleCollapsedAction(() => showRewardDialog = true)" :disabled="!taskId" title="奖赏记录">
          <template #icon>
            <n-icon><Emoji24Regular /></n-icon>
          </template>
        </n-button>
        <n-button size="small" type="info" circle strong secondary @click="handleCollapsedAction(() => showInterruptionDialog = true)" :disabled="!taskId" title="打扰记录">
          <template #icon>
            <n-icon><CalendarAssistant20Regular /></n-icon>
          </template>
        </n-button>
        <n-button type="default" size="small" circle strong secondary :disabled="!taskId" @click="handleCollapsedAction(() => showTemplateDialog = true)" title="模板管理">
          <template #icon>
            <n-icon><CalligraphyPen20Regular /></n-icon>
          </template>
        </n-button>
      </div>
    </n-popover>

    <!-- 弹窗组件挂载 -->
    <EnergyInputDialog v-model:show="showEnergyDialog" @confirm="handleEnergyConfirm" />
    <RewardInputDialog v-model:show="showRewardDialog" @confirm="handleRewardConfirm" />
    <InterruptionInputDialog v-model:show="showInterruptionDialog" @confirm="handleInterruptionConfirm" />

    <!-- 模板管理弹窗 -->
    <TemplateDialog
      :show="showTemplateDialog"
      :templates="templates"
      @update:show="showTemplateDialog = $event"
      @confirm="handleTemplateConfirm"
      @delete="handleDeleteTemplate"
    />

    <!-- 标签管理器弹窗 -->
    <n-modal v-model:show="showTagManager" @after-leave="handleTagManagerClose">
      <n-card style="width: 420px">
        <TagManager v-model="tagIdsProxy" />
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { NButton, NModal, NCard, NPopover, NIcon } from "naive-ui";
import EnergyInputDialog from "@/components/TaskTracker/EnergyInputDialog.vue";
import RewardInputDialog from "@/components/TaskTracker/RewardInputDialog.vue";
import InterruptionInputDialog from "@/components/TaskTracker/InterruptionInputDialog.vue";
import TemplateDialog from "@/components/TaskTracker/TemplateDialog.vue";
import TagManager from "@/components/TagSystem/TagManager.vue";
import {
  BatterySaver20Regular,
  Emoji24Regular,
  CalendarAssistant20Regular,
  CalligraphyPen20Regular,
  Star20Regular,
  Star20Filled,
  Tag16Regular,
  ChevronDoubleLeft16Regular,
} from "@vicons/fluent";
import { useTemplateStore } from "@/stores/useTemplateStore";
import type { Template } from "@/core/types/Template";
import { useActivityTagEditor } from "@/composables/useActivityTagEditor";
import { useDataStore } from "@/stores/useDataStore";

const tagEditor = useActivityTagEditor();
const dataStore = useDataStore();

// Props
const props = defineProps<{
  taskId: number | null;
  isStarred: boolean;
}>();

// Store
const templateStore = useTemplateStore();

// State Variables
const showEnergyDialog = ref(false);
const showRewardDialog = ref(false);
const showInterruptionDialog = ref(false);
const showTemplateDialog = ref(false);

const templates = computed(() => templateStore.allTemplates);

// 响应式折叠状态
const isCollapsed = ref(false);
const buttonsContainerRef = ref<HTMLElement | null>(null);
const showCollapsedPopover = ref(false);

// 处理折叠状态下的按钮点击（点击后关闭 popover）
const handleCollapsedAction = (action: () => void) => {
  action();
  showCollapsedPopover.value = false;
};

// 检测是否需要折叠（基于父容器的类名）
const checkCollapse = () => {
  if (!buttonsContainerRef.value) return;
  const container = buttonsContainerRef.value.parentElement;
  if (!container) return;
  
  // 检查父容器是否有 buttons-collapsed 类
  isCollapsed.value = container.classList.contains('buttons-collapsed');
};

// 监听父容器类名变化
let mutationObserver: MutationObserver | null = null;

onMounted(() => {
  if (buttonsContainerRef.value?.parentElement) {
    // 初始检查
    checkCollapse();
    
    // 监听类名变化
    mutationObserver = new MutationObserver(() => {
      checkCollapse();
    });
    mutationObserver.observe(buttonsContainerRef.value.parentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  }
});

onUnmounted(() => {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
});

// Methods
const emit = defineEmits<{
  (e: "energy-record", value: { value: number; description?: string }): void;
  (e: "reward-record", value: { value: number; description?: string }): void;
  (
    e: "interruption-record",
    data: {
      interruptionType: "E" | "I";
      description: string;
      asActivity: boolean;
      activityType?: "T" | "S";
      dueDate?: number | null;
    }
  ): void;
  (e: "star"): void;
}>();

// 能量弹窗点击确认
function handleEnergyConfirm(val: { value: number; description?: string }) {
  if (props.taskId) {
    emit("energy-record", val);
  }
}

// 奖励弹窗点击确认
function handleRewardConfirm(val: { value: number; description?: string }) {
  if (props.taskId) {
    emit("reward-record", val);
  }
}

// 打扰弹窗点击确认
function handleInterruptionConfirm(val: {
  interruptionType: "E" | "I";
  description: string;
  asActivity: boolean;
  activityType?: "T" | "S";
  dueDate?: number | null;
}) {
  if (props.taskId) {
    emit("interruption-record", val);
  }
}

// 更新模板的确认处理
const handleTemplateConfirm = (template: Template) => {
  // ✅ 检查模板是否已存在于 store
  const exists = templateStore.allTemplates.some((t) => t.id === template.id);

  if (!exists) {
    // 新增：使用 store 方法生成 id
    templateStore.addTemplate(template.title, template.content);
  } else {
    // 编辑：更新现有模板
    templateStore.updateTemplate(template.id, {
      title: template.title,
      content: template.content,
    });
  }
};

// 删除模板
const handleDeleteTemplate = (templateId: number) => {
  templateStore.removeTemplate(templateId);
};

function starTrack() {
  if (props.taskId) {
    emit("star");
  }
}

const showTagManager = ref(false);

// 标签管理器的 tagIds 代理
const tagIdsProxy = computed({
  get: () => tagEditor.tempTagIds.value,
  set: (v) => (tagEditor.tempTagIds.value = v),
});

function openTagManager() {
  // 使用来自 composable 的 activityId
  // 通过 taskId 在 dataStore 里查找对应的 activityId
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

// 标签管理器关闭处理
function handleTagManagerClose() {
  tagEditor.saveAndCloseTagManager();
  showTagManager.value = false;
}
</script>

<style scoped>
.task-buttons {
  display: flex;
  gap: 8px;
  justify-content: right;
  flex-shrink: 0;
  min-width: 0; /* 允许收缩 */
}

.collapsed-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
