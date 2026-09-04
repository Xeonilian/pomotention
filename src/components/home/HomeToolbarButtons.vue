<!-- Home 顶栏：标签筛选 / 记账 / 生活记录；手机 2 槽 + 更多，交互对齐 TaskButtons -->
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
import { computed, defineComponent, h, ref, toValue, type Component, type PropType } from "vue";
import { NButton, NIcon, NPopover } from "naive-ui";
import {
  ChevronDoubleLeft16Regular,
  Door20Filled,
  Door20Regular,
  Drop20Filled,
  Drop20Regular,
  FoodApple20Filled,
  FoodApple20Regular,
  TagSearch20Regular,
  Wallet20Regular,
  WeatherMoon20Filled,
  WeatherMoon20Regular,
} from "@vicons/fluent";
import { storeToRefs } from "pinia";
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
import { findLifeRecordTodoForDay } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";

const { isMobile } = useDevice();
const settingStore = useSettingStore();
const dataStore = useDataStore();
const { todoList, activityById } = storeToRefs(dataStore);
const dateService = dataStore.dateService;

const showCollapsedPopover = ref(false);
const popoverEditMode = ref(false);
const editSelection = ref<HomeToolbarActionId[]>([]);

const desktopActionIds = HOME_TOOLBAR_ACTION_IDS;
const mobilePinnedIds = computed(() => normalizeHomeToolbarMobilePinned(settingStore.settings.homeToolbarMobilePinned));
const mobileOverflowIds = computed(() => getHomeToolbarOverflowIds(mobilePinnedIds.value));
const moreButtonTitle = computed(() => (popoverEditMode.value ? "完成调整快捷按钮" : "调整快捷按钮"));

const LIFE_ICONS: Record<LifeRecordKind, { regular: Component; filled: Component }> = {
  drink: { regular: Drop20Regular, filled: Drop20Filled },
  eat: { regular: FoodApple20Regular, filled: FoodApple20Filled },
  toilet: { regular: Door20Regular, filled: Door20Filled },
  sleep: { regular: WeatherMoon20Regular, filled: WeatherMoon20Filled },
};

function hasLifeRecordToday(kind: LifeRecordKind): boolean {
  const raw = toValue(dateService.appDateTimestamp as Parameters<typeof toValue>[0]);
  const dayStart = typeof raw === "number" && !Number.isNaN(raw) ? raw : null;
  if (dayStart == null) return false;
  return !!findLifeRecordTodoForDay(todoList.value, activityById.value, kind, dayStart);
}

function actionTitle(actionId: HomeToolbarActionId): string {
  return HOME_TOOLBAR_ACTION_TITLES[actionId];
}

function actionIcon(actionId: HomeToolbarActionId): Component {
  if (actionId === "tagFilter") return TagSearch20Regular;
  if (actionId === "ledger") return Wallet20Regular;
  const pair = LIFE_ICONS[actionId];
  return hasLifeRecordToday(actionId) ? pair.filled : pair.regular;
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
  filter: grayscale(1);
  opacity: 0.55;
}

.toolbar-popover-action--selected {
  filter: none !important;
  opacity: 1 !important;
}

.toolbar-pinned-action {
  display: inline-flex;
  align-items: center;
}

.toolbar-pinned-action--muted {
  filter: grayscale(1);
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
