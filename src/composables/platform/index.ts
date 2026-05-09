// 平台能力分组：设备识别、PWA、跨平台触控与外部文档入口能力统一从这里导出。
export { useDevice } from "@/composables/platform/useDevice";
export { usePwaInstall } from "@/composables/platform/usePwaInstall";
export { usePwaUpdate } from "@/composables/platform/usePwaUpdate";
export { navigateToBuiltDocs } from "@/composables/platform/useDocsUrl";
export { createTouchScheduledSingleAndDouble } from "@/composables/platform/useTouchScheduledSingleAndDouble";
export { usePomoSlotVoidFingerDouble, pomoFingerVoidPathEnabled } from "@/composables/platform/usePomoSlotVoidFingerDouble";
