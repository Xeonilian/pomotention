<!-- TemplateDialog.vue -->
<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="书写模板"
    class="mobile-dialog-top template-dialog"
    :on-after-leave="resetForm"
  >
    <!-- shell：限制主区+底栏总高度，避免 list 撑高把整个弹层顶破 -->
    <div class="template-dialog-shell">
      <!-- 不用 NLayout：窄屏下侧栏顺序与宽度在部分 WebView 里异常；自管 flex 更稳 -->
      <div class="template-body">
        <aside class="template-sider" aria-label="模板列表">
          <n-list>
            <n-list-item
              v-for="template in templates"
              :key="template.id"
              @click="selectTemplate(template)"
              @dblclick="onListItemDblClick(template)"
              :title="listItemHelpTitle"
              :style="{
                background: selectedTemplate?.id === template.id ? 'var(--color-blue-light)' : 'var(--color-background)',
              }"
            >
              <span class="template-item-title">{{ listItemTitle(template.title) }}</span>
            </n-list-item>
          </n-list>
        </aside>

        <div class="template-editor">
          <n-input
            type="text"
            v-model:value="editableTemplateTitle"
            :disabled="!canEditContent"
            :placeholder="contentPlaceholder"
            class="template-input-title"
            :style="{ background: canEditContent ? 'var(--color-blue-light)' : 'var(--color-background)' }"
          />
          <n-input
            type="textarea"
            v-model:value="editableTemplateContent"
            :placeholder="contentPlaceholder"
            :rows="isMobile ? 8 : 10"
            :disabled="!canEditContent"
            class="template-input-body"
            :style="{ background: !canEditContent ? 'var(--color-background-light)' : 'var(--color-background)' }"
          />
        </div>
      </div>

      <div class="template-footer">
        <!-- 不用 NSpace：其包裹层会导致 flex 宽度加在按钮上无效，手机端易出现 3+1 换行 -->
        <div class="template-footer-actions">
          <n-button
            type="info"
            secondary
            :disabled="!selectedTemplate"
            :title="selectedTemplate ? '将当前选中模板的正文复制到剪贴板' : '请先在左侧选择一个模板'"
            class="template-footer-btn"
            @click="copyToClipboard(selectedTemplate?.content)"
          >
            {{ copyButtonLabel }}
          </n-button>
          <n-button type="primary" secondary class="template-footer-btn" @click="handleAddNew" title="清空表单，填写后保存为新模板">
            {{ newTemplateButtonLabel }}
          </n-button>
          <n-button
            type="primary"
            class="template-footer-btn"
            @click="handleConfirm"
            :disabled="!canConfirm"
            :title="addNew ? '保存为新模板' : '保存对当前模板的修改'"
          >
            {{ confirmButtonLabel }}
          </n-button>
          <n-button
            type="error"
            secondary
            class="template-footer-btn"
            :disabled="!selectedTemplate"
            @click="handleDelete"
            title="删除当前选中的模板"
          >
            删除
          </n-button>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { NModal, NInput, NButton, NList, NListItem } from "naive-ui";
import { Template } from "@/core/types/Template";
import { useDevice } from "@/composables/useDevice";
import { copyTextToClipboard } from "@/utils/clipboard";

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
const { isMobile } = useDevice();
// 与父组件双向同步：遮罩/ESC 关闭时 naive 会改 show，必须用 computed 把变化 emit 回去，否则会与父级 show 脱节导致无法再打开
const showModal = computed({
  get: () => props.show,
  set: (val: boolean) => emit("update:show", val),
});
const selectedTemplate = ref<Template | null>(null);
const editableTemplateTitle = ref("");
const editableTemplateContent = ref("");
const addNew = ref(false);
const copyUiState = ref<"idle" | "ok" | "fail">("idle");
const copyUiResetTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const pendingSelectId = ref<number | null>(null);

// ==================== 计算属性 ====================
const canEditContent = computed(() => !!selectedTemplate.value || addNew.value);
const canConfirm = computed(() => canEditContent.value && editableTemplateTitle.value.trim().length > 0);
const contentPlaceholder = computed(() => (addNew.value ? "输入新模板内容" : "选择模板"));

/** 左侧列表项：桌面可双击复制，手机无双击复制，依赖底部按钮 */
const listItemHelpTitle = computed(() =>
  isMobile.value ? "点一下选中；复制请用底部「复制正文」" : "单击选中；双击可复制正文，或用底部「复制正文」",
);

const confirmButtonLabel = computed(() => (isMobile.value ? "保存" : addNew.value ? "保存为新模板" : "保存修改"));

/** 手机端缩短文案，避免窄格内截断 */
const newTemplateButtonLabel = computed(() => (isMobile.value ? "新建" : "新建模板"));

const copyButtonLabel = computed(() => {
  if (copyUiState.value === "ok") return "已复制";
  if (copyUiState.value === "fail") return "复制失败";
  return isMobile.value ? "复制" : "复制正文";
});

// ==================== 监听器 ====================
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

/** 避免手机上误触双击；桌面保留双击快捷复制 */
const onListItemDblClick = (template: Template) => {
  if (isMobile.value) return;
  void copyToClipboard(template.content);
};

const copyToClipboard = async (text?: string) => {
  if (!text) return;
  if (copyUiResetTimer.value) {
    clearTimeout(copyUiResetTimer.value);
    copyUiResetTimer.value = null;
  }
  const ok = await copyTextToClipboard(text);
  copyUiState.value = ok ? "ok" : "fail";
  copyUiResetTimer.value = setTimeout(
    () => {
      copyUiState.value = "idle";
      copyUiResetTimer.value = null;
    },
    ok ? 1200 : 2000,
  );
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

const resetForm = () => {
  if (copyUiResetTimer.value) {
    clearTimeout(copyUiResetTimer.value);
    copyUiResetTimer.value = null;
  }
  copyUiState.value = "idle";
  addNew.value = false;
  selectedTemplate.value = null;
  editableTemplateTitle.value = "";
  editableTemplateContent.value = "";
  pendingSelectId.value = null;
};
</script>

<style scoped>
.template-dialog-shell {
  box-sizing: border-box;
  width: 100%;
  --template-footer-pad-top: 10px;
  --template-footer-btn-row: 44px;
  --template-footer-pad-bottom: 0px;
  --template-footer-height: 54px;
}

.template-body {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  /* 主区固定高，列表只在左侧滚动 */
  height: 310px;
  overflow: hidden;
  background-color: var(--color-background-light);
  box-sizing: border-box;
}

.template-sider {
  width: 150px;
  flex-shrink: 0;
  align-self: stretch;
  box-sizing: border-box;
  border-right: 1px solid var(--color-background-dark);
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  background-color: var(--color-background-light);
}

.template-editor {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background-light);
}

.template-input-title {
  width: 100%;
  flex-shrink: 0;
}

.template-input-body {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.template-input-body :deep(textarea) {
  min-height: 200px;
  box-sizing: border-box;
}

.template-sider .n-list-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-sider .n-list-item :deep(.n-list-item__main) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.n-list {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  background-color: var(--color-background-light);
  border: 1px solid var(--color-background-light);
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
}

.n-list-item {
  padding: 4px 6px !important;
  min-height: 30px;
  border-radius: 2px;
}

.template-footer {
  background-color: var(--color-background);
  box-sizing: border-box;
  flex-shrink: 0;
  padding-top: 8px;
}

.template-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}

/* 移动端：保持与桌面相同的左列表、右编辑；底部四键横向等分 */
@media (max-width: 768px) {
  /* 与 global 的 template-dialog max-height 对齐 */
  .template-dialog-shell {
    display: flex;
    flex-direction: column;
    max-height: min(calc(65dvh - 5.5rem), 82dvh);
    overflow: hidden;
  }

  .template-body {
    flex-direction: row;
    align-items: stretch;
    flex: 0 0 auto;
    height: min(calc(65dvh - 5.5rem - var(--template-footer-height)), 280px);
    min-height: 200px;
    max-height: min(calc(65dvh - 5.5rem - var(--template-footer-height)), 280px);
    overflow: hidden;
  }

  .template-sider {
    width: 100px !important;
    min-width: 96px !important;
    max-width: 112px;
    flex-shrink: 0;
    border-right: 1px solid var(--color-background-dark);
    border-bottom: none;
  }

  .template-sider .n-list {
    flex: 1 1 0;
    min-height: 0;
    max-height: 100%;
    overflow-y: auto;
  }

  .template-editor {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .template-input-body {
    flex: 1;
    min-height: 0;
  }

  .template-input-body :deep(textarea) {
    min-height: 0;
    height: 100% !important;
    max-height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
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

  .template-sider .n-list-item :deep(.n-list-item__main) {
    display: block;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }

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
    flex: 0 0 auto;
    box-sizing: border-box;
    min-height: var(--template-footer-height);
    padding: var(--template-footer-pad-top) 8px 0px 8px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .template-footer-actions {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: stretch;
    width: 100%;
    min-height: var(--template-footer-btn-row);
    gap: 6px;
    box-sizing: border-box;
  }

  .template-footer-btn {
    flex: 1 1 0;
    min-width: 0;
    min-height: var(--template-footer-btn-row);
    box-sizing: border-box;
    font-size: 13px;
    padding: 8px 4px;
    /* 让 naive 按钮在格子里拉满，避免「只有字宽一块有底色」 */
    width: 100%;
    justify-content: center;
  }

  .template-footer-btn :deep(.n-button__content) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    line-height: 1.2;
    justify-content: center;
  }
}
</style>
