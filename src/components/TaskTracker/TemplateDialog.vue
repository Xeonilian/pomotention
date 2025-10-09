<template>
  <n-modal v-model:show="showModal" preset="dialog" title="书写模板" :on-after-leave="handleCancel" style="width: 500px; height: 410px">
    <n-layout has-sider class="template-container">
      <n-layout-sider bordered width="150">
        <!-- 左侧：模板列表 -->
        <n-list>
          <n-list-item
            v-for="template in templates"
            :key="template.id"
            @click="selectTemplate(template)"
            @dblclick="copyTemplateContent(template)"
            title="双击复制模板"
            :style="{
              background: selectedTemplate?.id === template.id ? 'var(--color-blue-light)' : 'var(--color-background)',
            }"
          >
            {{ template.title }}
          </n-list-item>
        </n-list>
      </n-layout-sider>

      <!-- 右侧：模板内容编辑区域 -->
      <n-layout-content>
        <n-input
          type="text"
          v-model:value="editableTemplateTitle"
          :disabled="!canEditContent"
          :placeholder="contentPlaceholder"
          style="width: 100%; height: 30px"
          :style="{
            background: canEditContent ? 'var(--color-blue-light)' : 'var(--color-background)',
          }"
        />
        <n-input
          type="textarea"
          v-model:value="editableTemplateContent"
          :placeholder="contentPlaceholder"
          rows="10"
          :disabled="!canEditContent"
          style="width: 100%; height: calc(100% - 31px)"
          :style="{
            background: !canEditContent ? 'var(--color-background-light)' : 'var(--color-background)',
          }"
        />
      </n-layout-content>
    </n-layout>

    <n-layout-footer>
      <n-space justify="center">
        <n-button type="info" secondary :disabled="!selectedTemplate" @click="handleCopy">
          {{ copyMessage }}
        </n-button>
        <n-button @click="handleAddNewTemplate" type="primary" :title="'新增模板'">新增</n-button>
        <n-button
          type="primary"
          @click="handleConfirm"
          :disabled="!selectedTemplate && !addNew"
          :title="addNew ? '确认新增模版' : '确认编辑模版'"
        >
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

const selectedTemplate = ref<Template | null>(null);
const editableTemplateContent = ref<string>("");
const editableTemplateTitle = ref<string>("");
const addNew = ref<boolean>(false);
const copyMessage = ref("复制");

const showModal = ref(props.show);
// 在适当的生命周期钩子中同步 props 与 local state
watch(
  () => props.show,
  (newVal) => {
    showModal.value = newVal; // 确保 props 与内部状态同步
  }
);
// 是否可以编辑内容的计算属性
const canEditContent = computed(() => {
  return !!selectedTemplate.value || addNew.value;
});

// 内容占位符
const contentPlaceholder = computed(() => {
  if (addNew.value) {
    return "输入新模板内容";
  }
  return "选择模板";
});

const selectTemplate = (template: Template) => {
  selectedTemplate.value = template;
  editableTemplateContent.value = template.content || "";
  editableTemplateTitle.value = template.title || "";
};

const copyTemplateContent = (template: Template) => {
  const textToCopy = `${template.content}`;
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      copyMessage.value = "复制✔️";
      setTimeout(() => {
        copyMessage.value = "复制";
      }, 1000); // 5000 毫秒后恢复
    })
    .catch((err) => console.error("复制失败:", err));
};

const handleAddNewTemplate = () => {
  resetForm();
  addNew.value = true;
  selectedTemplate.value = null;
};

const handleCopy = () => {
  const textToCopy = selectedTemplate.value?.content;
  if (textToCopy) {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        copyMessage.value = "复制✔️";
        setTimeout(() => {
          copyMessage.value = "复制";
        }, 1000); // 5000 毫秒后恢复
      })
      .catch((err) => console.error("复制失败:", err));
  }
};

const handleConfirm = () => {
  if (addNew.value) {
    // 确认添加
    const newTemplate = {
      id: Date.now(),
      title: editableTemplateTitle.value.trim(),
      content: editableTemplateContent.value.trim(),
    };
    if (newTemplate.title) {
      emit("confirm", newTemplate);
      addNew.value = false;
      resetForm();
    }
  } else if (selectedTemplate.value) {
    // 确认修改
    const updatedTemplate = {
      ...selectedTemplate.value,
      title: editableTemplateTitle.value.trim(),
      content: editableTemplateContent.value.trim(),
    };
    emit("confirm", updatedTemplate);
    resetForm();
  }
};

const handleCancel = () => {
  showModal.value = false; // 更新显示状态
  emit("update:show", false);
  resetForm();
};

const handleDelete = () => {
  if (selectedTemplate.value) {
    emit("delete", selectedTemplate.value.id);
    resetForm();
  }
};

const resetForm = () => {
  addNew.value = false;
  selectedTemplate.value = null;
  editableTemplateContent.value = "";
  editableTemplateTitle.value = "";
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
