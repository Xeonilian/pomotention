<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="书写模板"
    :on-after-leave="handleCancel"
    style="width: 500px; height: 400px"
  >
    <n-space vertical size="large">
      <n-layout has-sider>
        <n-layout-sider
          content-style="padding: 0; overflow-y: auto; max-height: 300px; background-color:var(--color-background-light)"
          width="150"
        >
          <!-- 左侧：模板列表 -->
          <n-list bordered>
            <n-list-item
              v-for="template in templates"
              :key="template.id"
              @click="selectTemplate(template)"
              @dblclick="copyTemplateContent(template)"
              title="双击复制模板"
              :style="{
                background:
                  selectedTemplate?.id === template.id
                    ? 'var(--color-blue-light)'
                    : 'var(--color-background',
              }"
            >
              {{ template.title }}
            </n-list-item>
          </n-list>
        </n-layout-sider>

        <!-- 右侧：模板内容编辑区域 -->
        <n-layout-content
          content-style="padding:0 2px; display: flex; flex-direction: column; height: 100%;"
        >
          <div style="flex: 1; overflow: hidden">
            <n-input
              type="text"
              v-model:value="editableTemplateTitle"
              :disabled="!canEditContent"
              :placeholder="contentPlaceholder"
              style="width: 100%"
              :style="{
                background: canEditContent
                  ? 'var(--color-blue-light)'
                  : 'var(--color-background)',
              }"
            />
            <n-input
              type="textarea"
              v-model:value="editableTemplateContent"
              :placeholder="contentPlaceholder"
              rows="10"
              :disabled="!canEditContent"
              style="width: 100%"
              :style="{
                background: !canEditContent
                  ? 'var(--color-background-light)'
                  : 'var(--color-background)',
              }"
            />
          </div>
        </n-layout-content>
      </n-layout>

      <n-layout-footer>
        <n-space justify="center">
          <n-button
            @click="handleAddNewTemplate"
            type="primary"
            :title="'新增模板'"
            >新增</n-button
          >
          <n-button
            type="primary"
            @click="handleConfirm"
            :disabled="!selectedTemplate && !addNew"
            :title="addNew ? '确认新增模版' : '确认编辑模版'"
            >确认</n-button
          >
          <n-button
            type="default"
            :disabled="!selectedTemplate"
            @click="handleDelete"
          >
            删除
          </n-button>
          <n-button @click="handleCancel">取消</n-button>
        </n-space>
      </n-layout-footer>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  NModal,
  NInput,
  NButton,
  NSpace,
  NList,
  NListItem,
  NLayout,
} from "naive-ui";
import { Template } from "@/core/types/Template";
import { generateTemplateId } from "@/services/storageService";

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

const showModal = ref(props.show);
// 在适当的生命周期钩子中同步 props 与 local state
watch(
  () => props.show,
  (newVal) => {
    showModal.value = newVal; // 确保 props 与内部状态同步
    console.log(addNew);
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
    .then(() => console.log("模板内容已复制到剪贴板"))
    .catch((err) => console.error("复制失败:", err));
};

const handleAddNewTemplate = () => {
  resetForm();
  addNew.value = true;
  selectedTemplate.value = null;
};

const handleConfirm = () => {
  if (addNew.value) {
    // 添加
    const newTemplate = {
      id: generateTemplateId(),
      title: editableTemplateTitle.value.trim(),
      content: editableTemplateContent.value.trim(),
    };
    if (newTemplate.title) {
      emit("confirm", newTemplate);
      addNew.value = false;
      resetForm();
    }
  } else if (selectedTemplate.value) {
    // 修改
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
.n-layout-sider {
  max-height: calc(100% - 100px); /* 保证最大高度适应 */
  overflow-y: auto; /* 使侧边栏支持滚动 */
}
.n-list {
  max-height: 300px; /* 根据需求调整最大高度 */
}

.n-list-item {
  padding: 4px 6px !important;
  min-height: 30px;
}

.n-layout-footer {
  padding: 0px;
  background-color: var(--color-background);
}

.n-dialog {
  padding: 0 0;
  margin: 0;
}
</style>
