<template>
  <n-config-provider>
    <n-notification-provider>
      <n-dialog-provider>
        <router-view />
        <UpdateManager />
      </n-dialog-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia"; // ✅ 添加导入
import { useRouter } from "vue-router";
import { NConfigProvider, NNotificationProvider, NDialogProvider } from "naive-ui";
import UpdateManager from "./components/UpdateManager.vue";
import { supabase } from "@/core/services/supabase";

// 导入 dataStore 和同步相关
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { useTimetableStore } from "@/stores/useTimetableStore";
import { initSyncServices } from "@/services/sync";
import { uploadAllDebounced } from "@/core/utils/autoSync";
import { useSettingStore } from "@/stores/useSettingStore";

const router = useRouter();
const dataStore = useDataStore();
const tagStore = useTagStore();
const templateStore = useTemplateStore();
const timetableStore = useTimetableStore();
const settingStore = useSettingStore();

// ✅ 使用 storeToRefs 提取响应式引用
const { activityList, todoList, scheduleList, taskList } = storeToRefs(dataStore);
const { rawTags } = storeToRefs(tagStore);
const { rawTemplates } = storeToRefs(templateStore);
const { blocks } = storeToRefs(timetableStore);

// ========== 移动端触摸事件处理，防止意外页面跳转 ==========
// 记录触摸开始位置和时间
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchTarget: EventTarget | null = null;
const SWIPE_THRESHOLD = 50; // 滑动阈值（像素）
const TIME_THRESHOLD = 300; // 时间阈值（毫秒）

// 检查是否是交互元素（不应该阻止）
const isInteractiveElement = (target: EventTarget | null): boolean => {
  if (!target) return false;
  const element = target as HTMLElement;

  // 允许所有交互元素的默认行为
  const interactiveSelectors = [
    "input",
    "textarea",
    "a",
    "button",
    ".n-input",
    ".n-input-wrapper",
    ".n-input__input",
    ".n-button",
    ".n-menu-item", // Naive UI 菜单项
    ".n-menu-item-content", // 菜单项内容
    "[role='menuitem']", // 菜单项角色
    "[role='button']", // 按钮角色
    "[role='link']", // 链接角色
    "router-link", // Vue Router 链接
    "[contenteditable]",
  ];

  // 检查是否是可滚动容器
  const isScrollable = element.closest(".n-scrollbar, .n-scrollbar-container, [data-scrollable]");
  if (isScrollable) return true;

  // 检查是否是交互元素
  for (const selector of interactiveSelectors) {
    if (element.closest(selector)) {
      return true;
    }
  }

  return false;
};

const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0];
  if (!touch) return;

  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
  touchTarget = e.target;

  // 不在 touchstart 阶段阻止，让正常点击可以工作
};

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 0) return;

  // 如果是交互元素，不阻止
  if (isInteractiveElement(touchTarget)) {
    return;
  }

  const touch = e.touches[0];
  const deltaX = Math.abs(touch.clientX - touchStartX);
  const deltaY = Math.abs(touch.clientY - touchStartY);
  const deltaTime = Date.now() - touchStartTime;

  // 如果是明显的水平滑动，且时间很短，可能是手势导航，阻止默认行为
  if (deltaX > SWIPE_THRESHOLD && deltaX > deltaY && deltaTime < TIME_THRESHOLD) {
    e.preventDefault();
  }
};

const handleTouchEnd = () => {
  // 触摸结束时的清理工作
  touchStartX = 0;
  touchStartY = 0;
  touchStartTime = 0;
  touchTarget = null;
};

onMounted(async () => {
  // ========== 1. 初始化本地数据 ==========
  dataStore.loadAllData();
  console.log("✅ [App] 本地数据已加载");
  settingStore.settings.autoSupabaseSync = false;

  // ========== 2. 初始化同步服务 ==========
  initSyncServices({
    activityList: activityList,
    todoList: todoList,
    scheduleList: scheduleList,
    taskList: taskList,
    tagList: rawTags,
    templateList: rawTemplates,
    blockList: blocks,

    // 未来加表只需在这里添加一行
  });

  // ========== 3. 监听数据变化，触发自动同步 ==========
  watch(
    [activityList, todoList, scheduleList, taskList, rawTemplates, rawTags, blocks], // ✅ 直接 watch ref, 未来加表只需在这里添加一行
    () => {
      dataStore.saveAllDebounced(); // 先保存到 localStorage
      timetableStore.saveToLocal();
      uploadAllDebounced(); // 再触发云端同步（5秒防抖）
    },
    { deep: true }
  );
  console.log("✅ [App] 自动同步已启动");

  // ========== 4. 处理 Supabase 的认证回调（原有逻辑） ==========
  const { error } = await supabase.auth.getSession();

  if (error) {
    console.error("Error handling auth callback:", error.message);
  }

  // 监听认证状态变化
  supabase.auth.onAuthStateChange((event, session) => {
    // 当用户确认邮箱或登录成功后
    if (event === "SIGNED_IN" && session) {
      // 清除 URL 中的 hash（认证令牌），让 URL 更干净
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      // 导航到首页
      router.push({ name: "Home" });
    }

    // 当用户退出登录时，重定向到登录页
    if (event === "SIGNED_OUT") {
      router.push({ name: "Login" });
    }
  });

  // ========== 5. 移动端触摸事件处理，防止意外页面跳转 ==========
  // 添加触摸事件监听（touchstart 使用 passive: true，touchmove 使用 passive: false）
  // 这样不会阻止正常的点击事件
  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchmove", handleTouchMove, { passive: false });
  document.addEventListener("touchend", handleTouchEnd, { passive: true });

  console.log("✅ [App] 移动端触摸事件处理已启动");
});

onUnmounted(() => {
  // 清理触摸事件监听器
  document.removeEventListener("touchstart", handleTouchStart);
  document.removeEventListener("touchmove", handleTouchMove);
  document.removeEventListener("touchend", handleTouchEnd);
});
</script>

<style scoped>
html,
body,
#app {
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
