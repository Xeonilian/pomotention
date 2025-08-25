<template>
  <n-modal
    :show="visible"
    @update:show="(val) => emit('update:visible', val)"
    preset="card"
    title="AI 助手设置"
    style="width: 500px"
    :mask-closable="false"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="120px"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="API Key" path="apiKey">
        <n-input
          v-model:value="formData.apiKey"
          type="password"
          placeholder="请输入 DeepSeek API Key"
          show-password-on="click"
        />
        <template #feedback>
          <div class="form-tip">
            在
            <a href="https://platform.deepseek.com/" target="_blank"
              >DeepSeek 平台</a
            >
            获取 API Key
          </div>
        </template>
      </n-form-item>

      <n-form-item label="模型" path="model">
        <n-select
          v-model:value="formData.model"
          :options="modelOptions"
          placeholder="选择 AI 模型"
          :loading="loadingModels"
        />
      </n-form-item>

      <n-form-item label="最大 Token" path="maxTokens">
        <n-input-number
          v-model:value="formData.maxTokens"
          :min="100"
          :max="4000"
          :step="100"
          placeholder="最大输出长度"
        />
      </n-form-item>

      <n-form-item label="温度" path="temperature">
        <n-slider
          v-model:value="formData.temperature"
          :min="0"
          :max="2"
          :step="0.1"
          :marks="temperatureMarks"
        />
        <div class="slider-tip">
          较低的值使输出更确定性，较高的值使输出更创造性
        </div>
      </n-form-item>

      <n-form-item label="系统提示词" path="systemPrompt">
        <n-input
          v-model:value="formData.systemPrompt"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 6 }"
          placeholder="设置 AI 助手的角色和行为..."
        />
        <template #feedback>
          <div class="form-tip">定义 AI 助手的角色、能力和行为方式</div>
        </template>
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="dialog-footer">
        <n-button
          @click="testConnection"
          :loading="testing"
          :disabled="!formData.apiKey"
        >
          测试连接
        </n-button>
        <div class="footer-buttons">
          <n-button @click="cancel">取消</n-button>
          <n-button type="primary" @click="save" :loading="saving"
            >保存</n-button
          >
        </div>
      </div>
    </template>

    <!-- 测试结果提示 -->
    <n-message-provider>
      <message-dispatcher ref="messageDispatcher" />
    </n-message-provider>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from "vue";
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NInputNumber,
  NSlider,
  NButton,
  NMessageProvider,
} from "naive-ui";
import { aiService, type AIConfig } from "@/services/aiService";
import MessageDispatcher from "./MessageDispatcher.vue";

interface Props {
  visible: boolean;
}

interface Emits {
  (e: "update:visible", value: boolean): void;
  (e: "saved"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 响应式数据
const formRef = ref();
const messageDispatcher = ref();
const loadingModels = ref(false);
const testing = ref(false);
const saving = ref(false);

const formData = reactive({
  apiKey: "",
  model: "deepseek-chat",
  maxTokens: 2000,
  temperature: 0.7,
  systemPrompt:
    "你是一个智能的时间管理助手，专门帮助用户提高工作效率和时间管理能力。你可以提供番茄工作法建议、时间规划建议、任务管理技巧等。请用中文回答，保持友好和专业的语调。",
});

// 表单验证规则
const rules = {
  apiKey: {
    required: true,
    message: "请输入 API Key",
    trigger: "blur",
  },
  model: {
    required: true,
    message: "请选择模型",
    trigger: "change",
  },
  maxTokens: {
    required: true,
    message: "请设置最大 Token 数",
    trigger: "blur",
  },
};

// 模型选项
const modelOptions = ref([
  { label: "DeepSeek Chat", value: "deepseek-chat" },
  { label: "DeepSeek Coder", value: "deepseek-coder" },
]);

// 温度滑块标记
const temperatureMarks = computed(() => ({
  0: "0",
  0.5: "0.5",
  1: "1",
  1.5: "1.5",
  2: "2",
}));

// 加载模型列表
const loadModels = async () => {
  if (!formData.apiKey) return;

  loadingModels.value = true;
  try {
    const models = await aiService.getModels();
    modelOptions.value = models.map((model) => ({
      label: model,
      value: model,
    }));
  } catch (error) {
    console.error("加载模型列表失败:", error);
  } finally {
    loadingModels.value = false;
  }
};

// 测试连接
const testConnection = async () => {
  if (!formData.apiKey) {
    showMessage("请先输入 API Key", "warning");
    return;
  }

  testing.value = true;
  try {
    const isValid = await aiService.validateAPIKey(formData.apiKey);
    if (isValid) {
      showMessage("连接测试成功！", "success");
      await loadModels();
    } else {
      showMessage("连接测试失败，请检查 API Key", "error");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    showMessage(`连接测试失败: ${errorMessage}`, "error");
  } finally {
    testing.value = false;
  }
};

// 保存设置
const save = async () => {
  try {
    await formRef.value?.validate();

    saving.value = true;

    // 保存到 AI 服务
    aiService.setConfig({
      apiKey: formData.apiKey,
      model: formData.model,
      maxTokens: formData.maxTokens,
      temperature: formData.temperature,
    });

    // 保存到本地存储
    localStorage.setItem(
      "ai-config",
      JSON.stringify({
        apiKey: formData.apiKey,
        model: formData.model,
        maxTokens: formData.maxTokens,
        temperature: formData.temperature,
        systemPrompt: formData.systemPrompt,
      })
    );

    showMessage("设置保存成功！", "success");
    emit("saved");
    emit("update:visible", false);
  } catch (error) {
    console.error("保存设置失败:", error);
    showMessage("保存设置失败，请检查输入", "error");
  } finally {
    saving.value = false;
  }
};

// 取消
const cancel = () => {
  emit("update:visible", false);
};

// 显示消息
const showMessage = (
  message: string,
  type: "success" | "error" | "warning" | "info"
) => {
  if (messageDispatcher.value) {
    messageDispatcher.value.createMessage({
      type,
      content: message,
      duration: 3000,
    });
  }
};

// 加载保存的设置
const loadSavedConfig = () => {
  try {
    const saved = localStorage.getItem("ai-config");
    if (saved) {
      const config = JSON.parse(saved);
      Object.assign(formData, config);

      // 同步到 AI 服务
      aiService.setConfig({
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      });
    }
  } catch (error) {
    console.error("加载保存的设置失败:", error);
  }
};

// 监听 visible 变化，加载设置
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadSavedConfig();
    }
  }
);

onMounted(() => {
  loadSavedConfig();
});
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.slider-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 8px;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-buttons {
  display: flex;
  gap: 8px;
}

:deep(.n-slider) {
  width: 100%;
}

:deep(.n-slider-mark) {
  font-size: 12px;
}
</style>
