// useEnvironment.ts
import { ref, onMounted } from "vue";
import { getVersion } from "@tauri-apps/api/app";
import { type } from "@tauri-apps/plugin-os";

// 定义一个异步函数来获取平台类型
async function getPlatformType(): Promise<"desktop" | "mobile" | "web"> {
  try {
    // 尝试调用Tauri的API，如果成功，说明在Tauri环境中
    await getVersion();
    const osType = await type();

    // 根据 osType 判断平台
    if (osType === "ios" || osType === "android") {
      return "mobile";
    } else {
      return "desktop";
    }
  } catch (e) {
    // 如果调用Tauri API失败，说明在Web浏览器中
    return "web";
  }
}

// 导出的组合式函数
export function useEnvironment() {
  const env = ref<"desktop" | "mobile" | "web" | "unknown">("unknown");

  onMounted(async () => {
    env.value = await getPlatformType();
  });

  return {
    isDesktop: () => env.value === "desktop",
    isMobile: () => env.value === "mobile",
    isWeb: () => env.value === "web",
    env,
  };
}
