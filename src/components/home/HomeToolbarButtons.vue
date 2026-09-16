<!-- Home 顶栏：标签筛选 / 记账 / 生活记录；手机 3 槽 + 更多，交互对齐 TaskButtons -->
<template>
  <div class="home-toolbar-buttons">
    <template v-if="!isMobile">
      <HomeToolbarActionSlot v-for="actionId in desktopActionIds" :key="actionId" :action-id="actionId" />
    </template>

    <template v-else>
      <n-popover
        v-model:show="showCollapsedPopover"
        trigger="click"
        placement="bottom-start"
        :show-arrow="false"
        :content-style="{ padding: '3px 2px' }"
        @update:show="onPopoverShowChange"
      >
        <template #trigger>
          <n-button size="small" text title="更多操作">
            <template #icon>
              <n-icon><ChevronDoubleLeft16Regular /></n-icon>
            </template>
          </n-button>
        </template>

        <div class="collapsed-buttons" :class="{ 'collapsed-buttons--edit': popoverEditMode }">
          <template v-for="actionId in mobileOverflowIds" :key="actionId">
            <n-button
              v-if="popoverEditMode"
              size="small"
              text
              class="toolbar-popover-action home-toolbar-icon-btn"
              :class="{
                'toolbar-popover-action--selected': editSelection.includes(actionId),
                'toolbar-popover-action--muted': !editSelection.includes(actionId),
              }"
              :title="actionTitle(actionId)"
              @click.stop="handleOverflowEditClick(actionId)"
            >
              <template #icon>
                <n-icon :size="18">
                  <component :is="actionIcon(actionId)" />
                </n-icon>
              </template>
            </n-button>
            <HomeToolbarActionSlot
              v-else
              :action-id="actionId"
              @life-recorded="showCollapsedPopover = false"
            />
          </template>

          <n-button
            text
            size="small"
            class="toolbar-more-btn"
            :class="{ 'toolbar-more-btn--edit': popoverEditMode }"
            :title="moreButtonTitle"
            @click.stop="handleMoreClick"
          >
            ...
          </n-button>
        </div>
      </n-popover>

      <span
        v-for="actionId in mobilePinnedIds"
        :key="'pin-' + actionId"
        class="toolbar-pinned-action"
        :class="{ 'toolbar-pinned-action--muted': popoverEditMode && showCollapsedPopover }"
      >
        <HomeToolbarActionSlot :action-id="actionId" />
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, type Component, type PropType } from "vue";
import { NButton, NIcon, NPopover } from "naive-ui";
import {
  ChevronDoubleLeft16Regular,
  Door20Regular,
  Drop20Regular,
  FoodApple20Regular,
  TagSearch20Regular,
  Wallet20Regular,
  WeatherMoon20Regular,
} from "@vicons/fluent";
import HomeTagFilterPopover from "@/components/TagSystem/HomeTagFilterPopover.vue";
import LedgerAggregatePopover from "@/components/Ledger/LedgerAggregatePopover.vue";
import LifeRecordButtons from "@/components/LifeRecord/LifeRecordButtons.vue";
import { useDevice } from "@/composables/platform/useDevice";
import {
  HOME_TOOLBAR_ACTION_IDS,
  HOME_TOOLBAR_ACTION_TITLES,
  getHomeToolbarOverflowIds,
  isLifeRecordToolbarId,
  mergeHomeToolbarMobilePinned,
  normalizeHomeToolbarMobilePinned,
  toggleHomeToolbarEditSelection,
  type HomeToolbarActionId,
} from "@/core/homeToolbarActions";
import type { LifeRecordKind } from "@/core/lifeRecord";
import { useSettingStore } from "@/stores/useSettingStore";

const { isMobile } = useDevice();
const settingStore = useSettingStore();

const showCollapsedPopover = ref(false);
const popoverEditMode = ref(false);
const editSelection = ref<HomeToolbarActionId[]>([]);

const desktopActionIds = HOME_TOOLBAR_ACTION_IDS;
const mobilePinnedIds = computed(() => normalizeHomeToolbarMobilePinned(settingStore.settings.homeToolbarMobilePinned));
const mobileOverflowIds = computed(() => getHomeToolbarOverflowIds(mobilePinnedIds.value));
const moreButtonTitle = computed(() => (popoverEditMode.value ? "完成调整快捷按钮" : "调整快捷按钮"));

/** 编辑态预览用线框图标；真实态由 LifeRecordButtons 负责 */
const LIFE_EDIT_ICONS: Record<LifeRecordKind, Component> = {
  drink: Drop20Regular,
  eat: FoodApple20Regular,
  toilet: Door20Regular,
  sleep: WeatherMoon20Regular,
};

function actionTitle(actionId: HomeToolbarActionId): string {
  return HOME_TOOLBAR_ACTION_TITLES[actionId];
}

function actionIcon(actionId: HomeToolbarActionId): Component {
  if (actionId === "tagFilter") return TagSearch20Regular;
  if (actionId === "ledger") return Wallet20Regular;
  return LIFE_EDIT_ICONS[actionId];
}

function onPopoverShowChange(show: boolean) {
  if (!show) {
    popoverEditMode.value = false;
    editSelection.value = [];
  }
}

function handleOverflowEditClick(actionId: HomeToolbarActionId) {
  editSelection.value = toggleHomeToolbarEditSelection(editSelection.value, actionId);
}

function handleMoreClick() {
  if (!popoverEditMode.value) {
    popoverEditMode.value = true;
    editSelection.value = [];
    return;
  }
  if (editSelection.value.length > 0) {
    settingStore.settings.homeToolbarMobilePinned = mergeHomeToolbarMobilePinned(
      mobilePinnedIds.value,
      editSelection.value,
    );
  }
  popoverEditMode.value = false;
  editSelection.value = [];
  showCollapsedPopover.value = false;
}

/** 按 actionId 渲染真实控件（标签/钱包/生活记录） */
const HomeToolbarActionSlot = defineComponent({
  name: "HomeToolbarActionSlot",
  props: {
    actionId: { type: String as PropType<HomeToolbarActionId>, required: true },
  },
  emits: ["lifeRecorded"],
  setup(props, { emit }) {
    return () => {
      const id = props.actionId as HomeToolbarActionId;
      if (id === "tagFilter") {
        return h(HomeTagFilterPopover);
      }
      if (id === "ledger") {
        return h(LedgerAggregatePopover);
      }
      if (isLifeRecordToolbarId(id)) {
        return h(LifeRecordButtons, {
          kinds: [id],
          onRecorded: () => emit("lifeRecorded"),
        });
      }
      return null;
    };
  },
});
</script>

<style scoped>
.home-toolbar-buttons {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
}

.collapsed-buttons {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
}

.toolbar-popover-action--muted {
  opacity: 0.55;
}

.toolbar-popover-action--selected {
  opacity: 1 !important;
}

.toolbar-pinned-action {
  display: inline-flex;
  align-items: center;
}

.toolbar-pinned-action--muted {
  opacity: 0.55;
}

.toolbar-more-btn {
  flex-shrink: 0;
  margin-left: 2px;
  padding: 0 2px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.toolbar-more-btn--edit {
  color: var(--n-text-color);
}

.home-toolbar-icon-btn {
  width: 18px;
  min-width: 18px;
  height: 18px;
  padding: 0 !important;
}

.home-toolbar-icon-btn :deep(.n-button__icon) {
  margin: 0;
}
</style>
