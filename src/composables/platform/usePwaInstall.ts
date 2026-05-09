// PWA 安装状态：iOS 无系统弹窗，需应用内引导；Android 由系统/浏览器弹窗
import { ref, computed, onMounted } from "vue";

const PWA_IOS_DISMISSED_KEY = "pwa-ios-install-dismissed";

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

function getDismissed(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(PWA_IOS_DISMISSED_KEY) === "1";
}

export function usePwaInstall() {
  const isIOS = ref(false);
  const isStandalone = ref(false);
  const dismissed = ref(false);

  const showIosInstallBanner = computed(
    () => isIOS.value && !isStandalone.value && !dismissed.value
  );

  const dismiss = () => {
    dismissed.value = true;
    try {
      localStorage.setItem(PWA_IOS_DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  };

  onMounted(() => {
    isIOS.value = getIsIOS();
    isStandalone.value = getIsStandalone();
    dismissed.value = getDismissed();
  });

  return {
    isIOS,
    isStandalone,
    showIosInstallBanner,
    dismiss,
  };
}
