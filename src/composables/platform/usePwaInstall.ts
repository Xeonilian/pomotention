// PWA 安装引导：未装成独立窗口时提示；已 standalone / Tauri 不提示
import { ref, computed, onMounted } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import { useSettingStore } from "@/stores/useSettingStore";
import { isAppleTouchWebKitDevice, isAndroidTouchDevice } from "@/core/sounds/platform";

/** Apple 触控（含桌面站 Macintosh UA）；与 standalone 无关 */
function getIsIOS(): boolean {
  return isAppleTouchWebKitDevice();
}

function getIsAndroid(): boolean {
  return isAndroidTouchDevice();
}

function getIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!nav.standalone || window.matchMedia("(display-mode: standalone)").matches;
}

export type PwaInstallBannerKind = "ios" | "android" | "desktop";

export function usePwaInstall() {
  const settingStore = useSettingStore();
  const isIOS = ref(typeof window !== "undefined" ? getIsIOS() : false);
  const isAndroid = ref(typeof window !== "undefined" ? getIsAndroid() : false);
  const isStandalone = ref(typeof window !== "undefined" ? getIsStandalone() : false);

  /** 浏览器标签页内：电脑 / 手机 / 平板都提示；独立窗口与桌面客户端不提示 */
  const showIosInstallBanner = computed(
    () =>
      !isTauri() &&
      !isStandalone.value &&
      !settingStore.settings.pwaIosInstallDismissed,
  );

  const bannerKind = computed<PwaInstallBannerKind>(() => {
    if (isIOS.value) return "ios";
    if (isAndroid.value) return "android";
    return "desktop";
  });

  const dismiss = () => {
    settingStore.settings.pwaIosInstallDismissed = true;
  };

  onMounted(() => {
    isIOS.value = getIsIOS();
    isAndroid.value = getIsAndroid();
    isStandalone.value = getIsStandalone();
  });

  return {
    isIOS,
    isAndroid,
    isStandalone,
    bannerKind,
    showIosInstallBanner,
    dismiss,
  };
}
