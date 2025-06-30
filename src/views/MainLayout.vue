<template>
  <!-- 根布局容器：应用 .app-layout 类 -->
  <n-layout class="app-layout">
    <!-- Header 部分：根据 isMiniMode 动态添加类 -->
    <n-layout-header
      class="app-layout__header"
      :class="{ 'app-layout__header--hidden': isMiniMode }"
    >
      <div class="app-layout__header-content">
        <!-- 导航菜单 -->
        <n-menu
          :options="menuOptions"
          mode="horizontal"
          :value="current"
          @update:value="handleMenuSelect"
        />
        <!-- 视图控制按钮组 -->
        <div class="app-layout__view-controls">
          <n-button
            v-for="(control, index) in viewControls"
            :key="index"
            size="tiny"
            tertiary
            strong
            type="default"
            :style="buttonStyle(control.show, control.key)"
            :title="control.title"
            @click="handleMainLayoutViewToggle(control.key)"
            class="header-button"
          >
            <template #icon>
              <n-icon size="18" :component="control.icon" />
            </template>
          </n-button>
        </div>
      </div>
    </n-layout-header>

    <!-- Content 部分：应用的主内容区域 -->
    <n-layout-content
      class="app-layout__content"
      :class="{ 'app-layout__content--full-height': isMiniMode }"
    >
      <!-- 正常模式下显示路由视图 -->
      <!-- 当处于迷你模式时，router-view 不显示，整个区域被 PomodoroView 占据 -->
      <router-view v-if="!isMiniMode" />

      <!-- 拖动容器，用于正常模式下浮动的 PomodoroView -->
      <!-- 只有在非迷你模式且 showPomodoroView 为 true 时才渲染 -->
      <div
        class="draggable-container"
        ref="draggableContainer"
        v-if="!isMiniMode && showPomodoroView"
      >
        <PomodoroView
          :showPomoSeq="showPomoSeq"
          :isMiniMode="isMiniMode"
          @toggle-pomo-seq="showPomoSeq = !showPomoSeq"
        />
      </div>

      <!-- 迷你模式下显示 PomodoroView，它会占据整个内容区域 -->
      <!-- isMiniMode 触发时，PomodoroView 会自动全屏显示，无需 showPomodoroView 控制 -->
      <PomodoroView
        v-if="isMiniMode"
        :showPomoSeq="showPomoSeq"
        :isMiniMode="isMiniMode"
        @toggle-pomo-seq="showPomoSeq = !showPomoSeq"
        @report-size="handlePomodoroViewSizeReport"
        @exit-mini-mode="
          handleToggleOntopMode(reportedPomodoroWidth, reportedPomodoroHeight)
        "
      />
    </n-layout-content>

    <!-- Footer 部分 (如果你有的话，通常放在这里) -->
    <!-- <n-layout-footer class="app-layout__footer">
      Your Footer Content
    </n-layout-footer> -->
  </n-layout>
</template>

<script setup lang="ts">
// 1. ==================== 导入 (Imports) ====================
import { ref, watch, Component, nextTick, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { NMenu, NButton, NIcon } from "naive-ui";
import { useTimerStore } from "@/stores/useTimerStore";
import { useUIStore } from "@/stores/useUIStore";

import {
  ArrowLeft24Filled,
  ArrowUp24Filled,
  ArrowDown24Filled,
  ArrowRight24Filled,
  Timer24Regular,
  Pin24Regular,
} from "@vicons/fluent";

import { useAlwaysOnTop } from "@/composables/useAlwaysOnTop";
import {
  getCurrentWindow,
  PhysicalPosition,
  LogicalSize,
} from "@tauri-apps/api/window";

import PomodoroView from "./Home/PomodoroView.vue"; // 确保 PomodoroView 是正确的路径
import { isTauri } from "@tauri-apps/api/core";

// 2. ==================== Store 初始化 (Store Initialization) ====================
const timerStore = useTimerStore();
const uiStore = useUIStore();

// 3. ==================== 响应式状态 (Reactive State) ====================
// 3.1 应用程序/组件状态
const { isAlwaysOnTop, toggleAlwaysOnTop } = useAlwaysOnTop(); // 窗口置顶状态和切换函数
const router = useRouter(); // Vue Router 实例
const route = useRoute(); // 当前路由信息

const isMiniMode = ref(false); // 标记是否处于迷你模式 (Tauri 窗口模式)
const showPomoSeq = ref(false); // 控制 PomodoroView 内部的显示模式（番茄/序列）
const showPomodoroView = ref(true); // 控制正常模式下 PomodoroView (浮动可拖动) 的显示/隐藏

// 3.2 拖动相关状态
const draggableContainer = ref<HTMLElement | null>(null); // 用于获取 draggableContainer DOM 元素的引用
let isDragging = false; // 是否正在拖动
let startX = 0; // 鼠标按下时的 X 坐标
let startY = 0; // 鼠标按下时的 Y 坐标
let initialX = 0; // 元素拖动前的初始 X 坐标
let initialY = 0; // 元素拖动前的初始 Y 坐标
let hasPassedThreshold = false; // 拖动是否已超过阈值

// 3.3 浮动组件位置/尺寸状态
const lastPomodoroPosition = ref({ x: -1, y: -1 }); // 存储 PomodoroView 的最后位置
const reportedPomodoroWidth = ref(0); // PomodoroView 报告的宽度
const reportedPomodoroHeight = ref(0); // PomodoroView 报告的高度

// 3.4 导航菜单状态
const menuOptions = [
  { label: "首页", key: "/" },
  { label: "帮助", key: "/help" },
  { label: "搜索", key: "/search" },
  // { label: "统计", key: "/statistics" },
  // { label: "设置", key: "/settings" },
];
const current = ref(route.path); // 当前选中的菜单项

// 3.5 视图控制按钮状态
type ViewKey =
  | "ontop"
  | "pomodoro"
  | "schedule"
  | "today"
  | "task"
  | "activity";

interface ViewControl {
  key: ViewKey;
  icon: Component;
  title: string;
  show: boolean; // 是否显示这个控制按钮
}

const buttonStates = ref<Record<ViewKey, boolean>>({
  ontop: false,
  pomodoro: false,
  schedule: false,
  today: false,
  task: false,
  activity: false,
});

// 4. ==================== 常量定义 (Constants) ====================
const DRAG_THRESHOLD = 5; // 拖动阈值（像素），只有当鼠标移动超过这个距离才真正开始拖动

// 5. ==================== 业务逻辑函数 (Business Logic Functions) ====================

// 5.1 UI 状态管理相关函数
/**
 * PomodoroView 报告尺寸的回调函数。
 * @param size - 包含 width 和 height 的对象。
 */
const handlePomodoroViewSizeReport = async ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  // 更新报告的宽度和高度
  reportedPomodoroWidth.value = width;
  reportedPomodoroHeight.value = height;
  console.log(
    `[report] MainLayout received PomodoroView size: ${width}x${height}`
  );

  if (isTauri()) {
    const appWindow = getCurrentWindow(); // Tauri 窗口实例

    try {
      let finalWidth = Math.round(width);
      let finalHeight = Math.round(height);

      // 如果 PomodoroView 报告的尺寸为零，则使用默认值
      if (finalWidth === 0 || finalHeight === 0) {
        finalWidth = 220; // 默认宽度
        finalHeight = showPomoSeq ? 240 : 140; // 默认高度
      }

      const scaleFactor = await appWindow.scaleFactor();
      console.log("[report] scaleFactor", scaleFactor);
      await appWindow.setSize(new LogicalSize(finalWidth + 1, finalHeight + 2));
      console.log(`[report] Window resized to: ${finalWidth}x${finalHeight}`);
    } catch (error) {
      console.error("[report] Failed to resize window:", error);
    }
  } else {
    console.warn(
      "[report] Tauri calls are being skipped as the app is not running in Tauri environment."
    );
  }
};

/**
 * 导航菜单选择处理函数。
 * @param key - 选中的菜单项的 key。
 */
function handleMenuSelect(key: string) {
  if (key !== route.path) {
    router.push(key);
  }
}

/**
 * 视图控制按钮的配置数组。
 */
const viewControls: ViewControl[] = [
  {
    key: "ontop",
    icon: Pin24Regular,
    title: "界面置顶",
    show: true,
  },
  {
    key: "pomodoro",
    icon: Timer24Regular,
    title: "切换番茄钟视图",
    show: true,
  },
  {
    key: "schedule",
    icon: ArrowLeft24Filled,
    title: "切换日程视图",
    show: true,
  },
  { key: "today", icon: ArrowUp24Filled, title: "切换今日视图", show: true },
  { key: "task", icon: ArrowDown24Filled, title: "切换执行视图", show: true },
  {
    key: "activity",
    icon: ArrowRight24Filled,
    title: "切换活动视图",
    show: true,
  },
];

/**
 * 根据按钮状态动态生成样式。
 * @param show - 按钮是否显示。
 * @param key - 按钮的 key。
 */
function buttonStyle(show: boolean, key: string) {
  const isDisabled = key === "pomodoro" && timerStore.isActive; // 番茄钟运行时不能隐藏
  const isOntop = key === "ontop"; // 置顶按钮特殊处理
  const isActive = isOntop
    ? isAlwaysOnTop.value // 置顶按钮的状态
    : buttonStates.value[key as ViewKey]; // 其他按钮的状态

  return {
    filter: show ? (isDisabled ? "grayscale(50%)" : "none") : "grayscale(100%)",
    opacity: show ? (isDisabled ? 0.4 : 1) : 0.6,
    backgroundColor: isActive
      ? "var(--color-background-dark)"
      : "var(--color-background-light)",
    borderRadius: "4px",
    transition: "all 0.3s ease",
    cursor: isOntop ? "pointer" : isDisabled ? "not-allowed" : "pointer",
    transform: isDisabled ? "scale(0.95)" : "scale(1)",
  };
}

/**
 * 处理顶部控制按钮的点击事件。
 * @param key - 被点击按钮的 key。
 */
function handleMainLayoutViewToggle(key: string) {
  if (key === "ontop") {
    handleToggleOntopMode(
      reportedPomodoroWidth.value,
      reportedPomodoroHeight.value
    ); // 调用专门处理置顶/迷你模式的函数
    isMiniMode.value = true;
    return;
  }

  if (key === "pomodoro") {
    if (timerStore.isActive) {
      return; // 如果计时器正在运行，不允许隐藏 PomodoroView
    }
    showPomodoroView.value = !showPomodoroView.value; // 直接控制 showPomodoroView 的值
    // 按钮状态会通过 watch(showPomodoroView) 自动更新
    return;
  }

  // 对于其他面板（schedule, today, task, activity），通过 uiStore 来控制
  uiStore.togglePanel(key as "schedule" | "activity" | "task" | "today");
}

// 5.2 拖动逻辑相关函数
/**
 * 鼠标按下事件处理函数，用于启动拖动。
 * @param e - MouseEvent 对象。
 */
function handleMouseDown(e: MouseEvent) {
  // 确保是鼠标左键点击，且点击目标在 draggableContainer 内部，并且非迷你模式
  // 移除了 e.target === draggableContainer.value 条件，以便点击 PomodoroView 内部也能拖动
  if (e.button === 0 && draggableContainer.value && !isMiniMode.value) {
    // 确保点击事件确实发生在 draggableContainer 内部或其子元素上
    if (!draggableContainer.value.contains(e.target as Node)) {
      return;
    }

    isDragging = true;
    hasPassedThreshold = false; // 每次按下鼠标时重置拖动阈值检查
    startX = e.clientX;
    startY = e.clientY;

    const rect = draggableContainer.value.getBoundingClientRect();
    initialX = rect.left; // 获取当前元素的左边缘相对于视口的距离
    initialY = rect.top; // 获取当前元素的上边缘相对于视口的距离

    draggableContainer.value.style.cursor = "grabbing";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    e.preventDefault(); // 阻止默认的浏览器行为（如文本选择、图片拖动）
  }
}

/**
 * 鼠标移动事件处理函数，用于更新元素位置。
 * @param e - MouseEvent 对象。
 */
function handleMouseMove(e: MouseEvent) {
  if (!isDragging || !draggableContainer.value) return;

  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;

  if (!hasPassedThreshold) {
    const distance = Math.hypot(deltaX, deltaY);
    if (distance < DRAG_THRESHOLD) {
      return;
    }
    hasPassedThreshold = true;
  }

  // 获取 draggableContainer 的定位父元素 (即 .content)
  const parentElement = draggableContainer.value.parentElement;
  if (!parentElement) {
    console.warn("Draggable container has no parent element.");
    return;
  }

  // 获取父元素的可用内容区域尺寸 (不包含内边距和边框，因为 left/top 是相对于 padding-box 的)
  const parentWidth = parentElement.clientWidth; // clientWidth = width + padding
  const parentHeight = parentElement.clientHeight; // clientHeight = height + padding

  // 获取元素尺寸
  const elementWidth = draggableContainer.value.offsetWidth;
  const elementHeight = draggableContainer.value.offsetHeight;

  // 计算新的相对于父元素左上角的位置
  // 注意：rect.left 和 rect.top 是相对于视口的，我们需要转换为相对于父元素的
  const parentRect = parentElement.getBoundingClientRect();

  // 当前元素相对于父元素内部的 left/top (包括了 initialX/Y 里的父元素偏移)
  // newX 应该是相对于父元素左边界的距离
  let newX = initialX + deltaX - parentRect.left;
  let newY = initialY + deltaY - parentRect.top;

  // 限制X轴范围 (0 到 parentWidth - elementWidth)
  newX = Math.max(0, Math.min(newX, parentWidth - elementWidth));
  // 限制Y轴范围 (0 到 parentHeight - elementHeight)
  newY = Math.max(0, Math.min(newY, parentHeight - elementHeight));

  draggableContainer.value.style.left = `${newX}px`;
  draggableContainer.value.style.top = `${newY}px`;

  e.preventDefault();
}

/**
 * 鼠标松开事件处理函数，用于结束拖动。
 */
function handleMouseUp() {
  isDragging = false;
  hasPassedThreshold = false; // 鼠标松开时重置阈值检查状态
  if (draggableContainer.value) {
    draggableContainer.value.style.cursor = "grab";
    // 保存当前位置
    lastPomodoroPosition.value.x = draggableContainer.value.offsetLeft;
    lastPomodoroPosition.value.y = draggableContainer.value.offsetTop;
  }
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
}
// 5.3 Tauri 窗口控制相关函数
/**
 * 处理 Tauri 窗口迷你模式的逻辑（置顶/恢复）。
 */
async function handleToggleOntopMode(width: number, height: number) {
  if (isTauri()) {
    const appWindow = getCurrentWindow(); // Tauri 窗口实例
    // 切换窗口置顶状态
    await toggleAlwaysOnTop();

    // 确保 Vue 的响应式系统更新了 isAlwaysOnTop
    await nextTick();

    // 判断当前的置顶状态决定进入或退出迷你模式
    if (isAlwaysOnTop.value) {
      // 进入迷你模式
      console.log(
        "[mini] Entering mini mode...",
        width,
        height,
        "showPomoSeq",
        showPomoSeq.value
      );
      let finalWidth = reportedPomodoroWidth.value; // 使用传递的 width
      let finalHeight =
        reportedPomodoroHeight.value || (showPomoSeq.value ? 240 : 140);
      console.log(
        "[mini] final size:",
        width,
        height,
        "showPomoSeq",
        showPomoSeq.value
      );
      try {
        const scaleFactor = await appWindow.scaleFactor();
        console.log("[mini] scaleFactor", scaleFactor);
        await appWindow.setDecorations(false); // 隐藏窗口装饰 (标题栏、边框等)
        await appWindow.setSize(
          new LogicalSize(finalWidth + 1, finalHeight + 2)
        );
        console.log(`[mini] Window resized to: ${finalWidth}x${finalHeight}`);
        await appWindow.setPosition(new PhysicalPosition(100, 100)); // mini窗口位置
        //  console.log(
        //   "Window resized, positioned, and decorations hidden for mini mode."
        //    );
      } catch (error) {
        console.error(
          "[mini] Failed to set window properties for mini mode:",
          error
        );
      }
    } else {
      // 退出迷你模式
      isMiniMode.value = false;
      console.log("[mini] Exiting mini mode...");

      try {
        await appWindow.setDecorations(true); // 显示窗口装饰
        await appWindow.setSize(new LogicalSize(950, 600)); // 恢复默认窗口大小
        await appWindow.center(); // 恢复窗口居中
        console.log("[mini] Window properties restored from mini mode.");
        if (draggableContainer.value) {
          draggableContainer.value.style.visibility = "hidden"; // 首先隐藏
        }

        // 确保 Vue 响应
        await nextTick(); // 等待下一个 DOM 更新周期

        // 计算新的位置
        if (draggableContainer.value) {
          draggableContainer.value.addEventListener(
            "mousedown",
            handleMouseDown
          );
          const parentElement = draggableContainer.value.parentElement;
          if (parentElement) {
            const parentWidth = parentElement.clientWidth;
            const parentHeight = parentElement.clientHeight;

            const elementWidth = reportedPomodoroWidth.value || 220;
            const elementHeight = reportedPomodoroHeight.value || 350;

            const initialPosLeft = (parentWidth - elementWidth) * 0.4;
            const initialPosTop = (parentHeight - elementHeight) * 0.8;

            draggableContainer.value.style.left = `${initialPosLeft}px`;
            draggableContainer.value.style.top = `${initialPosTop}px`;
            draggableContainer.value.style.visibility = "visible"; // 最后重新显示
          }
        }
      } catch (error) {
        console.error("Failed to restore window properties:", error);
      }

      // 如果当前路由不是首页，则在退出迷你模式后回到首页
      if (route.path !== "/") {
        await router.push("/");
      }
    }
  } else {
    console.warn(
      "Tauri calls are being skipped as the app is not running in Tauri environment."
    );
  }
}

// 6. ==================== 生命周期钩子 (Lifecycle Hooks) ====================
onMounted(() => {
  if (draggableContainer.value) {
    draggableContainer.value.addEventListener("mousedown", handleMouseDown);
    draggableContainer.value.style.visibility = "hidden";

    const parentElement = draggableContainer.value.parentElement;
    if (!parentElement) {
      console.error("Draggable container has no parent element on mount!");
      return;
    }

    if (
      lastPomodoroPosition.value.x === -1 ||
      lastPomodoroPosition.value.y === -1
    ) {
      // 使用父元素的尺寸进行计算
      const parentWidth = parentElement.clientWidth;
      const parentHeight = parentElement.clientHeight;

      const elementWidth = reportedPomodoroWidth.value || 220;
      const elementHeight = reportedPomodoroHeight.value || 350;

      const initialPosLeft = (parentWidth - elementWidth) * 0.35;
      const initialPosTop = (parentHeight - elementHeight) * 0.8;

      draggableContainer.value.style.left = `${initialPosLeft}px`;
      draggableContainer.value.style.top = `${initialPosTop}px`;
    } else {
      draggableContainer.value.style.left = `${lastPomodoroPosition.value.x}px`;
      draggableContainer.value.style.top = `${lastPomodoroPosition.value.y}px`;
    }

    nextTick(() => {
      if (draggableContainer.value) {
        draggableContainer.value.style.visibility = "visible";
      }
    });
  }
});

// 同样，在 watch(showPomodoroView) 里面也需要修改 #HACK
watch(
  showPomodoroView,
  async (newVal) => {
    if (newVal) {
      await nextTick();
      if (draggableContainer.value) {
        const parentElement = draggableContainer.value.parentElement;
        draggableContainer.value.addEventListener("mousedown", handleMouseDown);
        if (!parentElement) {
          console.error(
            "Draggable container has no parent element in watcher!"
          );
          return;
        }

        if (
          lastPomodoroPosition.value.x !== -1 &&
          lastPomodoroPosition.value.y !== -1
        ) {
          draggableContainer.value.style.left = `${lastPomodoroPosition.value.x}px`;
          draggableContainer.value.style.top = `${lastPomodoroPosition.value.y}px`;
        } else {
          const parentWidth = parentElement.clientWidth;
          const parentHeight = parentElement.clientHeight;

          const elementWidth = reportedPomodoroWidth.value || 220;
          const elementHeight = reportedPomodoroHeight.value || 350;

          const initialPosLeft = (parentWidth - elementWidth) * 0.35;
          const initialPosTop = (parentHeight - elementHeight) * 0.8;

          draggableContainer.value.style.left = `${initialPosLeft}px`;
          draggableContainer.value.style.top = `${initialPosTop}px`;
        }
        draggableContainer.value.style.visibility = "visible";
      }
    } else {
      if (draggableContainer.value) {
        draggableContainer.value.style.visibility = "hidden";
      }
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  // 清理拖动事件监听器
  if (draggableContainer.value) {
    draggableContainer.value.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove); // 确保也移除全局的 mousemove
    document.removeEventListener("mouseup", handleMouseUp); // 确保也移除全局的 mouseup
  }
});

// 7. ==================== Watchers (监听器) ====================
// 7.1 UI Store 状态变化监听

// 7.2 路由变化监听
watch(route, (newVal) => {
  current.value = newVal.path;
});

// 7.3 浮动组件显示状态变化监听 (设置位置)
watch(
  showPomodoroView,
  async (newVal) => {
    if (newVal) {
      await nextTick();
      if (draggableContainer.value) {
        const parentElement = draggableContainer.value.parentElement;
        if (!parentElement) {
          console.error(
            "Draggable container has no parent element in watcher!"
          );
          return;
        }

        if (
          lastPomodoroPosition.value.x !== -1 &&
          lastPomodoroPosition.value.y !== -1
        ) {
          draggableContainer.value.style.left = `${lastPomodoroPosition.value.x}px`;
          draggableContainer.value.style.top = `${lastPomodoroPosition.value.y}px`;
        } else {
          const parentWidth = parentElement.clientWidth;
          const parentHeight = parentElement.clientHeight;

          const elementWidth = reportedPomodoroWidth.value || 220;
          const elementHeight = reportedPomodoroHeight.value || 350;

          const initialPosLeft = (parentWidth - elementWidth) * 0.4;
          const initialPosTop = (parentHeight - elementHeight) * 0.8;

          draggableContainer.value.style.left = `${initialPosLeft}px`;
          draggableContainer.value.style.top = `${initialPosTop}px`;
        }
        draggableContainer.value.style.visibility = "visible";
      }
    } else {
      if (draggableContainer.value) {
        draggableContainer.value.style.visibility = "hidden";
      }
    }
  },
  { immediate: true }
);

// 7.4 按钮状态监听 (同步内部状态到 buttonStates)
watch(
  showPomodoroView,
  (newVal) => {
    buttonStates.value.pomodoro = newVal;
  },
  { immediate: true }
);
watch(
  () => uiStore.showSchedulePanel,
  (newVal) => {
    buttonStates.value.schedule = newVal;
  },
  { immediate: true }
);
watch(
  () => uiStore.showTodayPanel,
  (newVal) => {
    buttonStates.value.today = newVal;
  },
  { immediate: true }
);
watch(
  () => uiStore.showTaskPanel,
  (newVal) => {
    buttonStates.value.task = newVal;
  },
  { immediate: true }
);
watch(
  () => uiStore.showActivityPanel,
  (newVal) => {
    buttonStates.value.activity = newVal;
  },
  { immediate: true }
);
</script>

<style scoped>
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* 根布局容器：占据整个视口，并垂直 flex 布局 */
.app-layout {
  overflow: hidden;
  height: 100vh;
}

/* 头部样式 */
.app-layout__header {
  flex-shrink: 0; /* 确保 header 不会被压缩 */
  height: 30px; /* 默认高度 */
  min-height: 30px; /* 确保最小高度 */
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--color-background); /* 使用主题变量 */
  border-bottom: 1px solid var(--color-background-light);
  font-weight: bold;
  transition: all 0.3s ease-in-out; /* 平滑过渡 */
  overflow: hidden; /* 隐藏 header 内部的溢出内容 */
  box-sizing: border-box; /* 确保 padding 和 border 包含在高度内 */
}

/* 迷你模式下隐藏头部 */
.app-layout__header--hidden {
  height: 0px !important; /* 强制高度为 0 */
  min-height: 0px !important; /* 强制最小高度为 0 */
  padding: 0 !important;
  border-bottom: none !important;
  opacity: 0;
  pointer-events: none; /* 隐藏时不允许交互 */
}

/* 头部内容布局 */
.app-layout__header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 视图控制按钮组样式 */
.app-layout__view-controls {
  display: flex;
  gap: 2px; /* 按钮间距 */
  align-items: center;
}

/* 主内容区域样式：占据所有剩余空间 */
.app-layout__content {
  height: calc(100% - 30px); /* 填充整个视口高度 */
  overflow: hidden;
}

/* 迷你模式下内容区域全屏 */
.app-layout__content--full-height {
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  height: 100%;
}

/* 头部按钮通用样式 */
.header-button {
  width: 30px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 14px;
}

/* draggable-container 样式 */
.draggable-container {
  position: absolute; /* 允许在内容区域内自由拖动 */
  visibility: hidden; /* 初始隐藏，直到设置好位置再显示，避免闪烁 */
  cursor: grab; /* 拖动光标 */
  z-index: 100; /* 确保它在其他内容之上 */
  /* 添加一些默认背景和边框，确保浮动时有良好外观 */

  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); /* 阴影效果 */
  user-select: none;
}
.n-layout {
  background-color: white;
}
</style>
