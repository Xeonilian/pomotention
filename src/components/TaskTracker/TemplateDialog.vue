<!-- TemplateDialog.vue -->
<template>
  <n-modal v-model:show="showModal" preset="dialog" title="书写模板" :on-after-leave="resetForm" style="width: 500px; height: 410px">
    <n-layout has-sider class="template-container">
      <n-layout-sider bordered width="150">
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
            {{ template.title }}
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

    <n-layout-footer>
      <n-space justify="center">
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
  (val) => (showModal.value = val)
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
  { deep: true }
);

// ==================== 方法 ====================
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
.template-container {
  height: 305px;
  width: 445px;
}

.n-layout-content {
  background-color: var(--color-background-light);
}

.n-layout-sider {
  width: 150px;
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
</style>
