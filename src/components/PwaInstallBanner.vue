<template>
  <Transition name="pwa-banner">
    <div v-if="showIosInstallBanner" class="pwa-install-banner">
      <span class="pwa-install-banner__text">
        添加到主屏幕使用更流畅：点击 Safari 底部分享按钮
        <span class="pwa-install-banner__arrow">→</span>
        选择「添加到主屏幕」
      </span>
      <button type="button" class="pwa-install-banner__close" aria-label="关闭" @click="dismiss">
        ×
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { usePwaInstall } from "@/composables/usePwaInstall";

const { showIosInstallBanner, dismiss } = usePwaInstall();
</script>

<style scoped>
.pwa-install-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px 10px 14px;
  background: linear-gradient(135deg, #1a7f37 0%, #2d9d4a 100%);
  color: #fff;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding-top: max(10px, env(safe-area-inset-top));
}

.pwa-install-banner__text {
  flex: 1;
  min-width: 0;
}

.pwa-install-banner__arrow {
  margin: 0 2px;
  opacity: 0.9;
}

.pwa-install-banner__close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.pwa-install-banner__close:hover {
  background: rgba(255, 255, 255, 0.35);
}

.pwa-banner-enter-active,
.pwa-banner-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.pwa-banner-enter-from,
.pwa-banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
