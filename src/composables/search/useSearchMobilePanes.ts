import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";

/** list-full=仅列表整理；split=上下分屏；top-full=藏列表（仍留 search 行） */
export type SearchMobilePaneMode = "list-full" | "split" | "top-full";

const MODE_ORDER: SearchMobilePaneMode[] = ["list-full", "split", "top-full"];

/**
 * 手机 Search：三态手动切换布局。桌面勿依赖。
 */
export function useSearchMobilePanes(isMobile: MaybeRefOrGetter<boolean>) {
  const mode = ref<SearchMobilePaneMode>("split");

  function toggle() {
    if (!toValue(isMobile)) return;
    const i = MODE_ORDER.indexOf(mode.value);
    mode.value = MODE_ORDER[(i < 0 ? 0 : i + 1) % MODE_ORDER.length];
  }

  const isListFull = computed(() => toValue(isMobile) && mode.value === "list-full");
  const isTopFull = computed(() => toValue(isMobile) && mode.value === "top-full");
  /** 列表整理态：不点开、不选中，只滚 + 拖 */
  const isArrangeMode = computed(() => isListFull.value);
  /** 列表是否显示（search 行始终在） */
  const showProjectList = computed(() => {
    if (!toValue(isMobile)) return true;
    return mode.value !== "top-full";
  });

  const containerClass = computed(() => {
    if (!toValue(isMobile)) return {} as Record<string, boolean>;
    return {
      "search-container--list-full": mode.value === "list-full",
      "search-container--top-full": mode.value === "top-full",
    };
  });

  const toggleTitle = computed(() => {
    if (mode.value === "list-full") return "当前：列表整理（点切换分屏）";
    if (mode.value === "split") return "当前：分屏（点切换上满）";
    return "当前：上满（点切换列表整理）";
  });

  return {
    mode,
    toggle,
    isListFull,
    isTopFull,
    isArrangeMode,
    showProjectList,
    containerClass,
    toggleTitle,
  };
}
