import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";

/** split=列表展开；top-full=藏 Project 列表（仍留 tab 条 + search 行） */
export type SearchMobilePaneMode = "split" | "top-full";

/**
 * 手机 Search：切换 Project 列表显隐（不含 search 行）。桌面勿依赖。
 */
export function useSearchMobilePanes(
  isMobile: MaybeRefOrGetter<boolean>,
  openedTabsLength: MaybeRefOrGetter<number>,
) {
  const mode = ref<SearchMobilePaneMode>("split");

  function toggle() {
    if (!toValue(isMobile)) return;
    mode.value = mode.value === "split" ? "top-full" : "split";
  }

  const isTopFull = computed(() => toValue(isMobile) && mode.value === "top-full");
  /** 列表是否显示（search 行始终在） */
  const showProjectList = computed(() => toValue(isMobile) ? mode.value === "split" : true);
  const hasOpenTabs = computed(() => toValue(openedTabsLength) > 0);

  const containerClass = computed(() => {
    if (!toValue(isMobile)) return {} as Record<string, boolean>;
    return {
      "search-container--top-full": mode.value === "top-full",
      "search-container--no-tabs": !hasOpenTabs.value,
    };
  });

  const toggleTitle = computed(() => (mode.value === "top-full" ? "显示列表" : "收起列表"));

  return {
    mode,
    toggle,
    isTopFull,
    showProjectList,
    hasOpenTabs,
    containerClass,
    toggleTitle,
  };
}
