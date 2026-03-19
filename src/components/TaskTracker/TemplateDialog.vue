<!-- TemplateDialog.vue -->
<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="书写模板"
    class="mobile-dialog-top"
    :class="{ 'template-dialog--ios': isIOS }"
    :on-after-leave="resetForm"
  >
    <n-layout has-sider>
      <n-layout-sider bordered width="150" class="template-sider">
        <n-list>
          <n-list-item
            v-for="template in templates"
            :key="template.id"
            @click="selectTemplate(template)"
            @dblclick="copyToClipboard(template.content)"
            title="双击复制模板"
            :style="{
              background: selectedTemplate?.id === template.id ? 'var(--color-blue-light)' : 'var(--color-background)',
            }"
          >
            <span class="template-item-title">{{ listItemTitle(template.title) }}</span>
          </n-list-item>
        </n-list>
      </n-layout-sider>

      <n-layout-content>
        <n-input
          type="text"
          v-model:value="editableTemplateTitle"
          :disabled="!canEditContent"
          :placeholder="contentPlaceholder"
          style="width: 100%; height: 30px"
          :style="{ background: canEditContent ? 'var(--color-blue-light)' : 'var(--color-background)' }"
        />
        <n-input
          type="textarea"
          v-model:value="editableTemplateContent"
          :placeholder="contentPlaceholder"
          rows="10"
          :disabled="!canEditContent"
          style="width: 100%; height: calc(100% - 31px)"
          :style="{ background: !canEditContent ? 'var(--color-background-light)' : 'var(--color-background)' }"
        />
      </n-layout-content>
    </n-layout>

    <n-layout-footer class="template-footer">
      <n-space justify="center" class="template-footer-actions">
        <n-button type="info" secondary :disabled="!selectedTemplate" @click="copyToClipboard(selectedTemplate?.content)">
          {{ copyMessage }}
        </n-button>
        <n-button type="primary" @click="handleAddNew">新增</n-button>
        <n-button type="primary" @click="handleConfirm" :disabled="!canConfirm" :title="addNew ? '确认新增模版' : '确认编辑模版'">
          确认
        </n-button>
        <n-button type="default" :disabled="!selectedTemplate" @click="handleDelete">删除</n-button>
        <n-button @click="handleCancel">取消</n-button>
      </n-space>
    </n-layout-footer>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { NModal, NInput, NButton, NSpace, NList, NListItem, NLayout } from "naive-ui";
import { Template } from "@/core/types/Template";
import { useDevice } from "@/composables/useDevice";

const props = defineProps<{
  show: boolean;
  templates: Template[];
}>();

const emit = defineEmits<{
  (e: "update:show", show: boolean): void;
  (e: "confirm", template: Template): void;
  (e: "delete", templateId: number): void;
}>();

// ==================== 状态 ====================
const { isMobile, isIOS } = useDevice();
const showModal = ref(props.show);
const selectedTemplate = ref<Template | null>(null);
const editableTemplateTitle = ref("");
const editableTemplateContent = ref("");
const addNew = ref(false);
const copyMessage = ref("复制");
const pendingSelectId = ref<number | null>(null);

// ==================== 计算属性 ====================
const canEditContent = computed(() => !!selectedTemplate.value || addNew.value);
const canConfirm = computed(() => canEditContent.value && editableTemplateTitle.value.trim().length > 0);
const contentPlaceholder = computed(() => (addNew.value ? "输入新模板内容" : "选择模板"));

// ==================== 监听器 ====================
watch(
  () => props.show,
  (val) => (showModal.value = val),
);

watch(
  () => props.templates,
  (newTemplates) => {
    // 新增后自动选中
    if (pendingSelectId.value) {
      const created = newTemplates.find((t) => t.id === pendingSelectId.value);
      if (created) {
        selectedTemplate.value = created;
        editableTemplateTitle.value = created.title;
        editableTemplateContent.value = created.content;
        pendingSelectId.value = null;
      }
      return; // ✅ 提前返回，避免重复处理
    }

    // 编辑后刷新引用
    if (selectedTemplate.value) {
      const updated = newTemplates.find((t) => t.id === selectedTemplate.value!.id);
      if (updated) {
        selectedTemplate.value = updated;
        editableTemplateTitle.value = updated.title;
        editableTemplateContent.value = updated.content;
      }
    }
  },
  { deep: true },
);

// ==================== 方法 ====================
/** 手机端左侧只显示前 6 个字，避免布局/省略号问题 */
const listItemTitle = (title: string) => {
  if (isMobile.value && title.length > 6) return title.slice(0, 5) + "…";
  return title;
};

const selectTemplate = (template: Template) => {
  selectedTemplate.value = template;
  editableTemplateTitle.value = template.title;
  editableTemplateContent.value = template.content;
  addNew.value = false;
};

const copyToClipboard = (text?: string) => {
  if (!text) return;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      copyMessage.value = "复制✔️";
      setTimeout(() => (copyMessage.value = "复制"), 1000);
    })
    .catch((err) => console.error("复制失败:", err));
};

const handleAddNew = () => {
  addNew.value = true;
  selectedTemplate.value = null;
  editableTemplateTitle.value = "";
  editableTemplateContent.value = "";
};

const handleConfirm = () => {
  const title = editableTemplateTitle.value.trim();
  const content = editableTemplateContent.value.trim();

  if (!title) return;

  if (addNew.value) {
    const newTemplate: Template = {
      id: Date.now(),
      title,
      content,
      synced: false,
      deleted: false,
      lastModified: Date.now(),
    };
    pendingSelectId.value = newTemplate.id;
    emit("confirm", newTemplate);
    addNew.value = false;
  } else if (selectedTemplate.value) {
    const updatedTemplate: Template = {
      ...selectedTemplate.value,
      title,
      content,
      synced: false,
      lastModified: Date.now(),
    };
    emit("confirm", updatedTemplate);
  }
};

const handleDelete = () => {
  if (selectedTemplate.value) {
    emit("delete", selectedTemplate.value.id);
    resetForm();
  }
};

const handleCancel = () => {
  showModal.value = false;
  emit("update:show", false);
};

const resetForm = () => {
  addNew.value = false;
  selectedTemplate.value = null;
  editableTemplateTitle.value = "";
  editableTemplateContent.value = "";
  pendingSelectId.value = null;
};
</script>

<style scoped>
/* 额外的样式调整 */
.n-layout-content {
  background-color: var(--color-background-light);
}

.n-layout-sider {
  width: 150px;
}

.template-sider .n-list-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Naive 列表项内部可能再包一层，省略号需作用到实际文字容器 */

.template-sider .n-list-item :deep(.n-list-item__main) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-list {
  height: calc(100% - 2px);
  background-color: var(--color-background-light);
  border: 1px solid var(--color-background-light);
}

.n-list-item {
  padding: 4px 6px !important;
  min-height: 30px;
  border-radius: 2px;
}

.n-layout-footer {
  padding: 8px;
  background-color: var(--color-background);
}

/* 移动端：适应宽度、左侧可滚动并显示完整标题、按钮单行缩小 */
@media (max-width: 768px) {
  /* 仅 iOS 底部多一截：类直接绑在 .template-container 上，不依赖 modal 根节点（teleport 后层级会断） */
  .template-container--ios {
    height: 280px !important;
  }

  .template-sider {
    width: 100px !important;
    min-width: 100px !important;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .template-sider .n-list {
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 0;
    -webkit-overflow-scrolling: touch;
  }

  .template-sider .n-list-item {
    display: block;
    width: 100%;
    line-height: 1.3;
    min-height: auto;
    min-width: 0;
    max-width: 100%;
    padding: 6px 8px !important;
    overflow: hidden;
    box-sizing: border-box;
  }

  /* 包住标题的 Naive 容器也要限制宽度，否则 span 的 100% 仍会被撑开 */
  .template-sider .n-list-item :deep(.n-list-item__main) {
    display: block;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }

  /* 用自家 span 控制省略，不依赖 Naive 内部宽度 */
  .template-sider .template-item-title {
    display: block;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    box-sizing: border-box;
  }

  .template-footer {
    padding: 10px 0px;
  }

  .template-footer-actions {
    flex-wrap: nowrap !important;
    gap: 8px !important;
    overflow: hidden;
    justify-content: center;
  }

  .template-footer-actions :deep(.n-button) {
    font-size: 12px;
    padding: 8px;
  }
}
</style>
