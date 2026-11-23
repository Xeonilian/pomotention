// PWA 安装状态：iOS 无系统弹窗，需应用内引导；Android 由系统/浏览器弹窗
import { ref, computed, onMounted } from "vue";
import { useSettingStore } from "@/stores/useSettingStore";

function getIsIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function getIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!nav.standalone || window.matchMedia("(display-mode: standalone)").matches;
}

export function usePwaInstall() {
  const settingStore = useSettingStore();
  const isIOS = ref(false);
  const isStandalone = ref(false);

  const showIosInstallBanner = computed(
    () => isIOS.value && !isStandalone.value && !settingStore.settings.pwaIosInstallDismissed,
  );

  const dismiss = () => {
    settingStore.settings.pwaIosInstallDismissed = true;
  };

  onMounted(() => {
    isIOS.value = getIsIOS();
    isStandalone.value = getIsStandalone();
  });

  return {
    isIOS,
    isStandalone,
    showIosInstallBanner,
    dismiss,
  };
}
