import { computed, type ComputedRef } from "vue";
import { useDevice } from "@/composables/platform/useDevice";

/**
 * 手机真机 + 窄屏预览：浮层改居中 Modal，不跟 trigger 锚点。
 * 与 LifeRecordScorePop / LedgerEntryPopover 同一判定。
 */
export function useCenteredPanel(): ComputedRef<boolean> {
  const { isMobile, width } = useDevice();
  return computed(() => isMobile.value || width.value < 768);
}
