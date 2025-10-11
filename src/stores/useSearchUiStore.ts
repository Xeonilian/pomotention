// @/stores/useSearchUiStore.ts

import { defineStore } from "pinia";
import { ActivityRow } from "@/composables/useSearchFilter";
// 定义 Tab 类型，它属于 UI 的一部分，放在这里很合适
export type TabType = "todo" | "sch" | "activity";
export type TabItem = { key: string; type: TabType; id: number; title: string };

/**
 * 这个 Store 专门管理搜索/多标签视图的 UI 状态。
 * 它与 useDataStore 分离，后者只负责核心业务数据。
 */
export const useSearchUiStore = defineStore("searchUi", {
  // 1. State: 定义所有与此视图 UI 相关的状态
  state: () => ({
    searchQuery: "",
    filterStarredOnly: false,
    filterTagIds: [] as number[], // 当前过滤的 tag ids
    openedTabs: [] as TabItem[],
    activeTabKey: undefined as string | undefined,
  }),

  // 2. Getters: 计算派生状态
  getters: {
    /**
     * 获取当前激活的 tab 对象，方便在组件中使用。
     */
    activeTab(state): TabItem | undefined {
      if (!state.activeTabKey) return undefined;
      return state.openedTabs.find((tab) => tab.key === state.activeTabKey);
    },
  },

  // 3. Actions: 定义修改 state 的所有方法，封装业务逻辑
  actions: {
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },

    toggleFilterStarred() {
      this.filterStarredOnly = !this.filterStarredOnly;
    },

    /**
     * 内部辅助函数，用于生成唯一的 tab key。
     * 将其放在 store 内部可以确保生成规则在任何地方都保持一致。
     */
    _makeKey(type: TabType, id: number | undefined): string {
      return `${type}-${id ?? "unknown"}`;
    },

    /**
     * 打开一个新 Tab 或激活一个已存在的 Tab。
     * @param type - Tab 的类型 ('todo', 'sch', 'activity')
     * @param id - 对应的实体 ID
     * @param title - Tab 上显示的标题
     */
    openTab(type: TabType, id: number, title: string) {
      const key = this._makeKey(type, id);

      // 如果 tab 不存在，则添加到数组
      if (!this.openedTabs.some((t) => t.key === key)) {
        this.openedTabs.push({ key, type, id, title });
      }

      // 无论是否存在，都将其设为激活状态
      this.activeTabKey = key;
    },

    // 点击左侧列表项时，调用 store action 打开一个 tab
    openRow(row: ActivityRow) {
      const type: TabType = row.class === "T" ? "todo" : row.class === "S" ? "sch" : "activity";
      const todoOrSchId = row.currentId ?? row.activityId;
      this.openTab(type, todoOrSchId, row.title); // 调用 action，逻辑全部在 store 中处理
    },

    /**
     * 关闭一个指定的 Tab。
     * @param key - 要关闭的 Tab 的 key
     */
    closeTab(key: string) {
      const idx = this.openedTabs.findIndex((t) => t.key === key);
      if (idx === -1) return; // 如果找不到，则不执行任何操作

      const wasActive = this.activeTabKey === key;
      this.openedTabs.splice(idx, 1);

      // 如果关闭的是当前激活的 tab，需要智能地决定下一个激活哪个
      if (wasActive) {
        // 优先激活右边的 Tab，如果右边没有，则激活左边的
        const nextTab = this.openedTabs[idx] || this.openedTabs[idx - 1];
        this.activeTabKey = nextTab ? nextTab.key : undefined;
      }
    },

    closeAllTabs() {
      this.openedTabs = [];
      this.activeTabKey = undefined;
    },

    /**
     * 切换一个标签ID的筛选状态。
     * 如果ID已在筛选列表中，则移除它；如果不在，则添加它。
     * @param tagId - 要切换的标签ID
     */
    toggleFilterTagId(tagId: number) {
      // [!code ++]
      const index = this.filterTagIds.indexOf(tagId); // [!code ++]
      if (index > -1) {
        // [!code ++]
        // 如果已存在，则移除
        this.filterTagIds.splice(index, 1); // [!code ++]
      } else {
        // [!code ++]
        // 如果不存在，则添加
        this.filterTagIds.push(tagId); // [!code ++]
      } // [!code ++]
    }, // [!code ++]

    /**
     * 清除所有的标签筛选
     */
    clearFilterTags() {
      // [!code ++]
      this.filterTagIds = []; // [!code ++]
    }, // [!code ++]
  },

  // 4. (可选) 启用持久化
  // 如果安装了 pinia-plugin-persistedstate, 取消注释下面这行可以让
  // 搜索词、星标过滤状态和打开的标签页在刷新后依然保留。
  persist: true,
});
