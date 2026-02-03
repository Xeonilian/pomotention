<template>
  <Transition name="pwa-splash">
    <div v-if="visible" class="pwa-splash" aria-hidden="true">
      <div class="pwa-splash__inner">
        <img src="/icon-192.png" alt="" class="pwa-splash__icon" width="96" height="96" />
        <span class="pwa-splash__name">Pomotention</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";

// 与 manifest 一致：仅在以 PWA 方式打开（主屏幕图标进入）时显示启动屏
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!nav.standalone || window.matchMedia("(display-mode: standalone)").matches;
}

const visible = ref(false);
const SPLASH_DURATION_MS = 1200;

onMounted(() => {
  if (!isStandalone()) return;
  visible.value = true;
  const t = setTimeout(() => {
    visible.value = false;
  }, SPLASH_DURATION_MS);
  return () => clearTimeout(t);
});
</script>

<style scoped>
.pwa-splash {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

.pwa-splash__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.pwa-splash__icon {
  width: 96px;
  height: 96px;
  border-radius: 22px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.pwa-splash__name {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.02em;
}

/* 与 Android 类似的淡出效果 */
.pwa-splash-enter-active {
  transition: opacity 0.15s ease;
}

.pwa-splash-leave-active {
  transition: opacity 0.35s ease;
}

.pwa-splash-leave-to {
  opacity: 0;
}
</style>
