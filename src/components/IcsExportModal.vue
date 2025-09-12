<!-- src/components/IcsExportModal.vue -->
<template>
  <teleport to="body">
    <div class="ics-modal-mask" @click.self="emit('close')">
      <div class="ics-modal">
        <div class="ics-modal-header">
          <span>ICS 二维码</span>
          <button class="icon-btn" @click="emit('close')">✕</button>
        </div>
        <div class="ics-modal-body">
          <canvas ref="canvasRef" class="qr-canvas" />
          <div class="actions">
            <n-button size="small" @click="onCopy">复制 ICS 文本</n-button>
          </div>
          <details>
            <summary>预览 ICS 文本</summary>
            <pre class="ics-preview">{{ qrText }}</pre>
          </details>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import QRCode from "qrcode";

const props = defineProps<{
  visible: boolean;
  qrText: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

async function drawQR() {
  if (!canvasRef.value || !props.qrText) return;
  await QRCode.toCanvas(canvasRef.value, props.qrText, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 260,
  });
}

onMounted(drawQR);
watch(() => props.qrText, drawQR);

async function onCopy() {
  try {
    await navigator.clipboard.writeText(props.qrText);
    (window as any).$message?.success?.("已复制到剪贴板");
  } catch {
    (window as any).$message?.error?.("复制失败");
  }
}
</script>

<style scoped>
.ics-modal-mask {
  position: fixed;
  inset: 0;
  backdrop-filter: blur(6px);
  background: rgba(0, 0, 0, 0.25);
  display: grid;
  place-items: center;
  z-index: 9999;
}
.ics-modal {
  width: 360px;
  background: var(--modal-bg, #fff);
  color: var(--modal-fg, #111);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.ics-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  font-weight: 600;
}
.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
}
.ics-modal-body {
  padding: 14px;
  display: grid;
  gap: 12px;
}
.qr-canvas {
  margin: 0 auto;
  display: block;
}
.actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.ics-preview {
  max-height: 260px;
  overflow: auto;
  background: #f6f6f6;
  padding: 8px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
