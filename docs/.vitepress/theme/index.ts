import { h } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import DefaultTheme from "vitepress/theme";
import type { EnhanceAppContext } from "vitepress";
import "./custom.css";

/** 本地开发或非线上部署：浏览器访问 localhost / 127.0.0.1 */
function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
}

/**
 * 与主应用同源的 SPA 根路径：从当前 URL 剥掉 /docs-app 及其后路径
 * （约定见 scripts/run-docs-for-app.mjs）
 */
function appRootFromLocation(): string {
  if (typeof window === "undefined") return "/";
  const { origin, pathname } = window.location;
  const marker = "/docs-app";
  const i = pathname.indexOf(marker);
  if (i < 0) return `${origin}/`;
  const prefix = pathname.slice(0, i);
  const withSlash = prefix.endsWith("/") ? prefix : `${prefix}/`;
  return `${origin}${withSlash}`;
}

/** Logo/站点标题链到主应用或线上入口 */
function resolveExitHref(): string {
  if (typeof window === "undefined") return "/";
  if (isTauri() || isLocalHost()) return appRootFromLocation();
  const raw = import.meta.env.VITE_DOCS_EXIT_HREF;
  if (typeof raw === "string" && raw.trim() !== "") {
    const normalized = raw.trim();
    if (/^https?:\/\//.test(normalized)) {
      return normalized.replace(/\/?$/, "/");
    }
    if (normalized.startsWith("/")) {
      return new URL(normalized.replace(/\/?$/, "/"), window.location.origin).href;
    }
  }
  return `${window.location.origin}/`;
}

/** 纠正 Logo 链：须带 vp-raw，否则 VitePress 会把同源出站也当成站内 router.go()（快捷键后退不受影响） */
function patchNavBarTitleExitLink(): void {
  if (typeof document === "undefined") return;
  const a = document.querySelector<HTMLAnchorElement>(".VPNavBarTitle a.title");
  if (!a) return;
  const href = resolveExitHref();
  if (a.getAttribute("href") !== href) a.setAttribute("href", href);
  if (!a.classList.contains("vp-raw")) a.classList.add("vp-raw");
}

let navTitleObserver: MutationObserver | null = null;

/** 路由切换或首屏后修正导航栏标题链接（Vue 重绘会覆盖 href/class，需兜底） */
function setupExitToApp(ctx: EnhanceAppContext): void {
  if (typeof window === "undefined") return;
  const schedule = () => {
    patchNavBarTitleExitLink();
    requestAnimationFrame(patchNavBarTitleExitLink);
  };
  const prev = ctx.router.onAfterRouteChange;
  ctx.router.onAfterRouteChange = async (to) => {
    await prev?.(to);
    schedule();
  };
  setTimeout(schedule, 0);

  if (navTitleObserver) return;
  navTitleObserver = new MutationObserver(() => patchNavBarTitleExitLink());
  const attachObserver = () => {
    const wrap = document.querySelector(".VPNavBarTitle");
    if (!wrap) {
      requestAnimationFrame(attachObserver);
      return;
    }
    patchNavBarTitleExitLink();
    navTitleObserver!.observe(wrap, {
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "class"],
    });
  };
  attachObserver();
}

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // 插槽配置（如果需要）
    });
  },
  enhanceApp(ctx: EnhanceAppContext) {
    setupExitToApp(ctx);
  },
};
