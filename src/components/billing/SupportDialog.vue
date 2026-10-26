<template>
  <n-modal v-model:show="visible" preset="dialog" title="支持 Pomotention" style="width: 420px; max-width: 92vw">
    <n-space vertical>
      <n-text>谢谢你用到现在 🙏</n-text>
      <template v-if="loading">
        <n-text>读取账号中…</n-text>
      </template>
      <template v-else-if="!userId">
        <n-text>
          云服务费用：9 元/月，年付 49 元/首年（回馈老用户）
          <br />
          14 天免费试用，7 天无理由退款
        </n-text>
        <n-button size="small" type="primary" @click="goLogin">去登录</n-button>
      </template>
      <template v-else>
        <n-text>登录起 14 天免费，之后 9 元/月 ☁️</n-text>
        <n-text v-if="countdown.label" depth="3" style="font-size: 12px">⏳ {{ countdown.label }}</n-text>
        <n-text depth="3" style="font-size: 12px">回馈老用户：年付 49 元/首年 ✨</n-text>
        <n-space>
          <n-button size="small" type="primary" @click="goSubscribe('year')">年付 49 元</n-button>
          <n-button size="small" type="primary" secondary @click="goSubscribe('month')">月付 9 元</n-button>
        </n-space>
      </template>
      <n-text>如果 Pomotention 帮到了你，欢迎给作者加加油、打打气 ❤</n-text>
      <n-button size="small" type="info" secondary @click="goTip">去爱发电打赏</n-button>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NModal, NSpace, NText, NButton } from "naive-ui";
import { useRouter } from "vue-router";
import { getCurrentUser } from "@/core/services/authService";
import {
  buildAfdianSyncSubscribeUrl,
  buildAfdianTipUrl,
  openExternalUrl,
} from "@/core/billing/afdian";
import { useSyncCountdown } from "@/composables/billing/useSyncCountdown";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
}>();

const router = useRouter();

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const loading = ref(false);
const userId = ref<string | null>(null);
const countdown = useSyncCountdown();

async function loadUser() {
  loading.value = true;
  try {
    const user = await getCurrentUser();
    userId.value = user?.id ?? null;
  } finally {
    loading.value = false;
  }
}

watch(visible, (v) => {
  if (v) {
    void loadUser();
    void countdown.refresh();
  }
});

function goSubscribe(period: "month" | "year") {
  openExternalUrl(buildAfdianSyncSubscribeUrl(userId.value, period));
}

function goTip() {
  openExternalUrl(buildAfdianTipUrl());
}

function goLogin() {
  visible.value = false;
  router.push({ name: "Login" }).catch(() => router.push("/login").catch(() => {}));
}
</script>
