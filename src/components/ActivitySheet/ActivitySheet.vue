<template>
  <div class="activity-container">
    <!-- 顶部固定按钮区域 -->
    <div class="activity-button-container">
      <ActivityButtons
        v-if="!isMobile"
        :activeId="activeId"
        :isSelectedRowDone="isSelectedRowDone"
        :selectedRowHasParent="selectedRowHasParent"
        :selectedTaskId="selectedTaskId"
        :selectedClass="selectedActivity?.class"
        :hasParent="selectedActivity?.parentId"
        :isDeleted="selectedActivity?.deleted ?? false"
        @pick-activity="pickActivity"
        @add-todo="addTodoRow"
        @add-schedule="addScheduleRow"
        @add-untaetigkeit="addUntaetigkeitRow"
        @delete-active="deleteActiveRow"
        @toggle-pomo-type="togglePomoType"
        @create-child-activity="createChildActivity"
        @increase-child-activity="increaseChildActivity"
      />
    </div>

    <template v-if="!settingStore.settings.kanbanQuadrantMode">
      <!-- 看板列容器 -->
      <div class="kanban-columns">
        <div v-for="(section, idx) in sections" :key="section.id" class="kanban-column">
          <ActivitySection
            :filterOptions="filterOptions"
            :displaySheet="filteredBySection(section)"
            :activityId="selectedActivityId"
            :currentFilter="section.filterKey"
            :isAddButton="section.id === 1 && sections.length < 6"
            :isRemoveButton="section.id !== 1"
            :sectionId="section.id"
            :search="section.search"
            :activeId="activeId"
            @add-section="addSection"
            @remove-section="removeSection"
            @focus-row="handleFocusRow"
            @filter="(filterKey) => handleSectionFilter(idx, filterKey)"
            @update:search="(val) => handleSectionSearch(section.id, val)"
            @focus-search="handleFocusSearch"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="activity-quadrant-head-wrap">
        <ActivitySection
          header-only
          :filter-options="filterOptions"
          :display-sheet="[]"
          :activity-id="selectedActivityId"
          :current-filter="firstKanbanSection?.filterKey ?? 'all'"
          :is-add-button="false"
          :is-remove-button="false"
          :section-id="1"
          :search="firstKanbanSection?.search ?? ''"
          :active-id="activeId"
          @add-section="addSection"
          @remove-section="removeSection"
          @focus-row="handleFocusRow"
          @filter="(filterKey) => handleSectionFilter(firstSectionIdx, filterKey)"
          @update:search="(val) => handleSectionSearch(1, val)"
          @focus-search="handleFocusSearch"
        />
      </div>
      <div
        ref="quadrantGridRef"
        class="activity-quadrant-grid"
        :style="quadrantGridSoloStyle"
        @focusin.capture="onQuadrantGridFocusIn"
        @focusout.capture="onQuadrantGridFocusOut"
      >
        <ActivityQuadrant v-show="quadrantVisible('importantOnly')" quadrant-key="importantOnly" grid-area="imp">
          <ActivitySection
            list-only
            :filter-options="filterOptions"
            :display-sheet="quadrantImportantOnly"
            :activity-id="selectedActivityId"
            :current-filter="firstKanbanSection?.filterKey ?? 'all'"
            :is-add-button="false"
            :is-remove-button="false"
            :section-id="11"
            :search="firstKanbanSection?.search ?? ''"
            :active-id="activeId"
            @add-section="addSection"
            @remove-section="removeSection"
            @focus-row="handleFocusRow"
            @filter="(filterKey) => handleSectionFilter(firstSectionIdx, filterKey)"
            @update:search="(val) => handleSectionSearch(1, val)"
            @focus-search="handleFocusSearch"
          />
        </ActivityQuadrant>
        <ActivityQuadrant v-show="quadrantVisible('urgentImportant')" quadrant-key="urgentImportant" grid-area="both">
          <ActivitySection
            list-only
            :filter-options="filterOptions"
            :display-sheet="quadrantUrgentImportant"
            :activity-id="selectedActivityId"
            :current-filter="firstKanbanSection?.filterKey ?? 'all'"
            :is-add-button="false"
            :is-remove-button="false"
            :section-id="12"
            :search="firstKanbanSection?.search ?? ''"
            :active-id="activeId"
            @add-section="addSection"
            @remove-section="removeSection"
            @focus-row="handleFocusRow"
            @filter="(filterKey) => handleSectionFilter(firstSectionIdx, filterKey)"
            @update:search="(val) => handleSectionSearch(1, val)"
            @focus-search="handleFocusSearch"
          />
        </ActivityQuadrant>
        <ActivityQuadrant v-show="quadrantVisible('urgentOnly')" quadrant-key="urgentOnly" grid-area="urg">
          <ActivitySection
            list-only
            :filter-options="filterOptions"
            :display-sheet="quadrantUrgentOnly"
            :activity-id="selectedActivityId"
            :current-filter="firstKanbanSection?.filterKey ?? 'all'"
            :is-add-button="false"
            :is-remove-button="false"
            :section-id="13"
            :search="firstKanbanSection?.search ?? ''"
            :active-id="activeId"
            @add-section="addSection"
            @remove-section="removeSection"
            @focus-row="handleFocusRow"
            @filter="(filterKey) => handleSectionFilter(firstSectionIdx, filterKey)"
            @update:search="(val) => handleSectionSearch(1, val)"
            @focus-search="handleFocusSearch"
          />
        </ActivityQuadrant>
        <ActivityQuadrant v-show="quadrantVisible('neither')" quadrant-key="neither" grid-area="nor">
          <ActivitySection
            list-only
            :filter-options="filterOptions"
            :display-sheet="quadrantNeither"
            :activity-id="selectedActivityId"
            :current-filter="firstKanbanSection?.filterKey ?? 'all'"
            :is-add-button="false"
            :is-remove-button="false"
            :section-id="14"
            :search="firstKanbanSection?.search ?? ''"
            :active-id="activeId"
            @add-section="addSection"
            @remove-section="removeSection"
            @focus-row="handleFocusRow"
            @filter="(filterKey) => handleSectionFilter(firstSectionIdx, filterKey)"
            @update:search="(val) => handleSectionSearch(1, val)"
            @focus-search="handleFocusSearch"
          />
        </ActivityQuadrant>
      </div>
    </template>
  </div>
  <!-- 错误提示弹窗 -->
  <n-popover v-model:show="showPopover" trigger="manual" placement="top-end" style="width: 200px">
    <template #trigger>
      <div style="position: fixed; bottom: 20px; right: 20px; width: 1px; height: 1px"></div>
    </template>
    {{ popoverMessage }}
  </n-popover>
</template>

<script setup lang="ts">
// ========================
// 依赖导入
// ========================
import { ref, computed, onMounted, onUnmounted, provide, watch } from "vue";
import ActivityButtons from "@/components/ActivitySheet/ActivityButtons.vue";
import ActivitySection from "@/components/ActivitySheet/ActivitySection.vue";
import ActivityQuadrant from "@/components/ActivitySheet/ActivityQuadrant.vue";
import type { Activity, ActivitySectionConfig } from "@/core/types/Activity";
import {
  ACTIVITY_QUADRANT_DRAG_END_KEY,
  ACTIVITY_QUADRANT_SOLO_KEY,
  ACTIVITY_QUADRANT_SORT_KEY,
  applyQuadrantToActivity,
  findQuadrantKeyFromPoint,
  filterActivitiesForQuadrantKey,
  isActivityQuadrantKey,
  syncQuadrantTagsFromPrimaryDue,
  type ActivityQuadrantKey,
  type ActivitySectionSortKey,
  type QuadrantDragEndPayload,
} from "@/core/activityQuadrant";
import { NPopover } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";
import { storeToRefs } from "pinia";
import { timestampToDatetime } from "@/core/utils";
import { useDevice } from "@/composables/platform/useDevice";
import { registerActivityNavigatorApi } from "@/composables/keyboard/useActivityKeyboardNavigator";
import { registerActivityKeyboardCommandApi } from "@/composables/keyboard/useActivityKeyboardCommands";
import { activityNavigatorInjectKey } from "@/components/ActivitySheet/activityNavigatorInject";

const dataStore = useDataStore();
const {
  activeId,
  selectedRowId,
  selectedTaskId,
  selectedActivityId,
  selectedActivity,
  activeActivities,
  activityById,
  todoByActivityId,
  scheduleByActivityId,
  isSelectedRowDone,
  selectedRowHasParent,
} = storeToRefs(dataStore);
const { activityList } = storeToRefs(dataStore);
const dateService = dataStore.dateService;
const { isMobile, width } = useDevice();
const settingStore = useSettingStore();

/** 窄屏象限内输入聚焦时仅保留该格，腾出键盘可用高度；与样式断点 max-width:650px 一致 */
const quadrantGridRef = ref<HTMLElement | null>(null);
const soloQuadrantKey = ref<ActivityQuadrantKey | null>(null);
let soloFocusSyncTimer: ReturnType<typeof setTimeout> | null = null;

const SOLO_FOCUS_SYNC_MS = 160;

function isEditableFocusTarget(el: HTMLElement): boolean {
  if (el.closest("[data-quadrant-solo-ignore]")) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = (el as HTMLInputElement).type?.toLowerCase() ?? "text";
  const skip = new Set(["button", "checkbox", "radio", "submit", "reset", "image", "file", "hidden", "range", "color"]);
  return !skip.has(type);
}

function scheduleSoloQuadrantSync() {
  if (soloFocusSyncTimer) clearTimeout(soloFocusSyncTimer);
  soloFocusSyncTimer = setTimeout(() => {
    soloFocusSyncTimer = null;
    syncSoloQuadrantFromActiveElement();
  }, SOLO_FOCUS_SYNC_MS);
}

function cancelSoloQuadrantSync() {
  if (soloFocusSyncTimer) {
    clearTimeout(soloFocusSyncTimer);
    soloFocusSyncTimer = null;
  }
}

/** 窄屏象限：手动退出独奏（恢复四格同屏） */
function exitQuadrantSolo() {
  cancelSoloQuadrantSync();
  soloQuadrantKey.value = null;
}

function syncSoloQuadrantFromActiveElement() {
  if (width.value > 650 || !settingStore.settings.kanbanQuadrantMode) {
    soloQuadrantKey.value = null;
    return;
  }
  const root = quadrantGridRef.value;
  if (!root) {
    soloQuadrantKey.value = null;
    return;
  }
  const active = document.activeElement;
  if (!active || active === document.body || !(active instanceof HTMLElement)) {
    soloQuadrantKey.value = null;
    return;
  }
  if (!isEditableFocusTarget(active)) {
    soloQuadrantKey.value = null;
    return;
  }
  if (!root.contains(active)) {
    soloQuadrantKey.value = null;
    return;
  }
  const quad = active.closest(".activity-quadrant");
  if (!quad || !root.contains(quad)) {
    soloQuadrantKey.value = null;
    return;
  }
  const attr = quad.getAttribute("data-quadrant");
  if (attr && isActivityQuadrantKey(attr)) {
    soloQuadrantKey.value = attr;
  } else {
    soloQuadrantKey.value = null;
  }
}

function onQuadrantGridFocusIn(e: FocusEvent) {
  if (width.value > 650 || !settingStore.settings.kanbanQuadrantMode) return;
  cancelSoloQuadrantSync();
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  if (!isEditableFocusTarget(t)) return;
  const quad = t.closest(".activity-quadrant");
  if (!quad || !quadrantGridRef.value?.contains(quad)) return;
  const attr = quad.getAttribute("data-quadrant");
  if (attr && isActivityQuadrantKey(attr)) {
    soloQuadrantKey.value = attr;
  }
}

function onQuadrantGridFocusOut() {
  scheduleSoloQuadrantSync();
}

function quadrantVisible(key: ActivityQuadrantKey): boolean {
  if (width.value > 650) return true;
  if (!soloQuadrantKey.value) return true;
  return soloQuadrantKey.value === key;
}

const quadrantGridSoloStyle = computed(() => {
  if (!soloQuadrantKey.value || width.value > 650) return {};
  const areaMap: Record<ActivityQuadrantKey, string> = {
    importantOnly: "imp",
    urgentImportant: "both",
    urgentOnly: "urg",
    neither: "nor",
  };
  const a = areaMap[soloQuadrantKey.value];
  return {
    gridTemplateColumns: "1fr",
    gridTemplateRows: "minmax(0, 1fr)",
    gridTemplateAreas: `"${a}"`,
  };
});

watch(
  () => settingStore.settings.kanbanQuadrantMode,
  (on) => {
    if (!on) soloQuadrantKey.value = null;
  },
);

watch(width, (w) => {
  if (w > 650) soloQuadrantKey.value = null;
});

/** activeId 与 selectedActivityId 经 Tracker 同步后可能只存其一，业务上需统一解析 */
const sheetPrimaryActivityId = computed(() => {
  const a = activeId.value;
  if (a != null && a !== undefined) return a;
  return selectedActivityId.value;
});

// ========================
// Emits 定义
// ========================
const emit = defineEmits<{
  (e: "pick-activity", activity: Activity): void; // 选择活动待办
  (e: "add-activity", activity: Activity): void; // 添加新活动
  (e: "delete-activity", id: number | null | undefined): void; // 删除活动
  (e: "update-active-id", id: number | null | undefined): void; // 更新选中活动ID
  (e: "toggle-pomo-type", id: number | null | undefined): void; // 切换番茄钟类型
  (e: "create-child-activity", id: number | null | undefined): void; // 构建选中活动的子活动
  (e: "increase-child-activity", id: number | null | undefined): void; // 取消子项（名称含义建议确认）
}>();

// ========================
// 响应式数据
// ========================
// 筛选选项配置
const filterOptions = [
  { label: "全部活动", key: "all" },
  { label: "今日到期", key: "today" },
  { label: "内外打扰", key: "interrupt" },
  { label: "待办活动", key: "todo" },
  { label: "预约活动", key: "schedule" },
  { label: "已删活动", key: "deleted" },
];

/** 象限模式下列头 + 四列表格共用排序 */
const quadrantSharedSortKey = ref<ActivitySectionSortKey>("rank");
provide(ACTIVITY_QUADRANT_SORT_KEY, quadrantSharedSortKey);

function handleQuadrantDragEnd(payload: QuadrantDragEndPayload) {
  if (!settingStore.settings.kanbanQuadrantMode) return;
  const key = findQuadrantKeyFromPoint(payload.clientX, payload.clientY);
  if (!key) return;
  applyQuadrantToActivity(dataStore, payload.activity.id, key);
}

provide(ACTIVITY_QUADRANT_DRAG_END_KEY, handleQuadrantDragEnd);
provide(ACTIVITY_QUADRANT_SOLO_KEY, { soloQuadrantKey, exitSolo: exitQuadrantSolo });

let quadrantDueUrgentInterval: ReturnType<typeof setInterval> | null = null;
let unregisterNavigatorApi: (() => void) | null = null;
let unregisterActivityCommandApi: (() => void) | null = null;

/** 四象限：按主到期日同步 urgent / Later（过期进 neither）*/
function runQuadrantDueUrgentSync() {
  if (!settingStore.settings.kanbanQuadrantMode) return;
  syncQuadrantTagsFromPrimaryDue(dataStore, activeActivities.value);
}

watch([activeActivities, () => settingStore.settings.kanbanQuadrantMode], () => runQuadrantDueUrgentSync(), { deep: true });

watch(
  () => settingStore.settings.kanbanQuadrantMode,
  (quad) => {
    if (quadrantDueUrgentInterval) {
      clearInterval(quadrantDueUrgentInterval);
      quadrantDueUrgentInterval = null;
    }
    if (quad) {
      runQuadrantDueUrgentSync();
      quadrantDueUrgentInterval = setInterval(runQuadrantDueUrgentSync, 60_000);
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (settingStore.settings.kanbanSetting.length !== 6) {
    // 版本切换校正一次
    settingStore.resetSettings(["kanbanSetting"]);
  }
  if (settingStore.settings.kanbanQuadrantMode && !settingStore.settings.kanbanQuadrantSnapshot) {
    settingStore.settings.kanbanQuadrantMode = false;
  }
  unregisterNavigatorApi = registerActivityNavigatorApi({
    enter: enterNavigatorMode,
    move: moveNavigator,
    moveVisible: moveVisibleRowSelection,
    pickByDigit: pickNavigatorDigit,
    moveField: moveNavigatorField,
    activateField: activateNavigatorField,
    confirmField: confirmNavigatorField,
    navigateSubSelection: () => false,
    exit: exitNavigatorMode,
    isActive: () => navigatorActive.value,
  });
  unregisterActivityCommandApi = registerActivityKeyboardCommandApi({
    pickActivity: keyboardPickActivity,
    deleteOrRecoverActivity: keyboardDeleteOrRecoverActivity,
    toggleChild: keyboardtoggleChild,
    addTodo: keyboardAddTodo,
    addSchedule: keyboardAddSchedule,
    addUntaetigkeit: keyboardAddUntaetigkeit,
    toggleQuadrant: keyboardToggleQuadrant,
    addKanbanSection: keyboardAddKanbanSection,
    removeKanbanSection: keyboardremoveKanbanSection,
    editField: keyboardEditField,
  });
});

onUnmounted(() => {
  if (unregisterNavigatorApi) {
    unregisterNavigatorApi();
    unregisterNavigatorApi = null;
  }
  if (unregisterActivityCommandApi) {
    unregisterActivityCommandApi();
    unregisterActivityCommandApi = null;
  }
  cancelSoloQuadrantSync();
  if (quadrantDueUrgentInterval) {
    clearInterval(quadrantDueUrgentInterval);
    quadrantDueUrgentInterval = null;
  }
});
// 响应式可直接用
const sections = computed(() => settingStore.settings.kanbanSetting.filter((s) => s.show));

const firstKanbanSection = computed(() => settingStore.settings.kanbanSetting.find((s) => s.id === 1));

const firstSectionIdx = computed(() => {
  const list = settingStore.settings.kanbanSetting.filter((s) => s.show);
  const idx = list.findIndex((s) => s.id === 1);
  return idx >= 0 ? idx : 0;
});

const quadrantPreFiltered = computed(() => {
  const sec = firstKanbanSection.value;
  if (!sec) return [];
  return filteredBySection(sec);
});

const quadrantImportantOnly = computed(() => filterActivitiesForQuadrantKey(quadrantPreFiltered.value, "importantOnly"));
const quadrantUrgentImportant = computed(() => filterActivitiesForQuadrantKey(quadrantPreFiltered.value, "urgentImportant"));
const quadrantUrgentOnly = computed(() => filterActivitiesForQuadrantKey(quadrantPreFiltered.value, "urgentOnly"));
const quadrantNeither = computed(() => filterActivitiesForQuadrantKey(quadrantPreFiltered.value, "neither"));

const navigatorActive = ref(false);
const navigatorCursor = ref(0);
const navigatorFieldIndex = ref(0);

const keyboardRowCandidates = computed(() => {
  const list: Activity[] = [];
  const seen = new Set<number>();

  const appendItems = (items: Activity[]) => {
    for (const item of items) {
      if (item.status === "done") continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      list.push(item);
    }
  };

  if (settingStore.settings.kanbanQuadrantMode) {
    appendItems(quadrantPreFiltered.value);
    return list;
  }

  for (const section of sections.value) {
    appendItems(filteredBySection(section));
  }
  return list;
});

const navigatorNumberById = computed<Record<number, number>>(() => {
  const out: Record<number, number> = {};
  const list = keyboardRowCandidates.value;
  const length = Math.min(9, list.length);
  for (let i = 0; i < length; i += 1) {
    const item = list[i];
    if (!item) continue;
    out[item.id] = i + 1;
  }
  return out;
});

const navigatorCurrentRowId = computed<number | null>(() => {
  const list = keyboardRowCandidates.value;
  const item = list[navigatorCursor.value];
  return item?.id ?? null;
});

const navigatorCurrentFieldKey = computed<"title" | "dueDate" | "place" | "duration" | "scheduleTime" | "pomoEstimate" | null>(() => {
  const rowActivityId = navigatorCurrentRowId.value;
  if (rowActivityId == null) return null;
  const activity = activityById.value.get(rowActivityId);
  if (!activity) return null;
  const fields = getNavigatorFieldsForActivity(activity);
  if (!fields.length) return null;
  const clamped = Math.max(0, Math.min(fields.length - 1, navigatorFieldIndex.value));
  return fields[clamped] ?? null;
});

function focusNavigatorIndex(nextIndex: number): boolean {
  const list = keyboardRowCandidates.value;
  if (!list.length) return false;
  const last = list.length - 1;
  const clamped = Math.max(0, Math.min(last, nextIndex));
  navigatorCursor.value = clamped;
  const target = list[clamped];
  if (!target) return false;
  handleFocusRow(target.id);
  return true;
}

function moveVisibleRowSelection(delta: 1 | -1): boolean {
  const rowEls = Array.from(document.querySelectorAll<HTMLElement>(".activity-row[data-row-id]"));
  if (!rowEls.length) return false;
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const el of rowEls) {
    const raw = el.dataset.rowId;
    if (!raw) continue;
    const id = Number(raw);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  if (!ids.length) return false;
  const currentId = sheetPrimaryActivityId.value;
  const currentIndex = currentId == null ? -1 : ids.indexOf(currentId);
  let nextIndex = currentIndex === -1 ? (delta > 0 ? 0 : ids.length - 1) : currentIndex + delta;
  if (nextIndex < 0) nextIndex = ids.length - 1;
  if (nextIndex >= ids.length) nextIndex = 0;
  const targetId = ids[nextIndex];
  if (targetId == null) return false;
  navigatorActive.value = false;
  navigatorFieldIndex.value = 0;
  handleFocusRow(targetId);
  return true;
}

function enterNavigatorMode(): boolean {
  const list = keyboardRowCandidates.value;
  if (!list.length) return false;
  navigatorActive.value = true;
  navigatorFieldIndex.value = 0;
  const selectedId = sheetPrimaryActivityId.value;
  const initial = selectedId != null ? list.findIndex((item) => item.id === selectedId) : -1;
  return focusNavigatorIndex(initial >= 0 ? initial : 0);
}

function moveNavigator(delta: 1 | -1): boolean {
  if (!navigatorActive.value) return false;
  const list = keyboardRowCandidates.value;
  if (!list.length) return false;
  const last = list.length - 1;
  let next = navigatorCursor.value + delta;
  if (next < 0) next = last;
  if (next > last) next = 0;
  return focusNavigatorIndex(next);
}

function pickNavigatorDigit(digit: number): boolean {
  if (!navigatorActive.value) return false;
  const idx = digit - 1;
  const ok = focusNavigatorIndex(idx);
  if (ok) navigatorActive.value = false;
  return ok;
}

function exitNavigatorMode() {
  navigatorActive.value = false;
}

function getNavigatorFieldsForActivity(
  activity: Activity,
): Array<"title" | "dueDate" | "place" | "duration" | "scheduleTime" | "pomoEstimate"> {
  // 按 ActivityRow 实际从左到右的可编辑列顺序导航
  if (activity.class === "T") return ["title", "pomoEstimate", "dueDate"];
  if (activity.class === "S") return ["title", "place", "duration", "scheduleTime"];
  return ["title"];
}

function moveNavigatorField(delta: 1 | -1): boolean {
  if (!navigatorActive.value) return false;
  const rowActivityId = sheetPrimaryActivityId.value;
  if (rowActivityId == null) return false;
  const activity = activityById.value.get(rowActivityId);
  if (!activity) return false;
  const fields = getNavigatorFieldsForActivity(activity);
  if (!fields.length) return false;
  let next = navigatorFieldIndex.value + delta;
  if (next < 0) next = fields.length - 1;
  if (next >= fields.length) next = 0;
  navigatorFieldIndex.value = next;
  return true;
}

function activateNavigatorField(): boolean {
  if (!navigatorActive.value) return false;
  const rowActivityId = sheetPrimaryActivityId.value;
  if (rowActivityId == null) return false;
  const activity = activityById.value.get(rowActivityId);
  if (!activity) return false;
  const fields = getNavigatorFieldsForActivity(activity);
  if (!fields.length) return false;
  const field = fields[Math.max(0, Math.min(fields.length - 1, navigatorFieldIndex.value))];
  if (!field) return false;
  return keyboardEditField(field);
}

function confirmNavigatorField(): boolean {
  if (!navigatorActive.value) return false;
  const activeEl = document.activeElement;
  if (activeEl instanceof HTMLElement) {
    const isInputLike = activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT";
    if (isInputLike || activeEl.isContentEditable) {
      activeEl.blur();
      return true;
    }
  }
  return false;
}

const noSelectedActivity = computed(() => selectedRowId.value == null && selectedActivityId.value == null && activeId.value == null);
const isSelectedClassS = computed(() => selectedActivity.value?.class === "S");
const isDeletedSelectedActivity = computed(() => Boolean(selectedActivity.value?.deleted));
const hasParentSelectedActivity = computed(() => selectedActivity.value?.parentId != null);

function keyboardPickActivity(): boolean {
  if (isDeletedSelectedActivity.value || isSelectedRowDone.value || noSelectedActivity.value) return false;
  pickActivity();
  return true;
}

function keyboardDeleteOrRecoverActivity(): boolean {
  if (noSelectedActivity.value || isSelectedRowDone.value) return false;
  deleteActiveRow();
  return true;
}

function keyboardtoggleChild(): boolean {
  // 与 ActivityButtons 的 v-if/v-else 分支保持一致
  if (!hasParentSelectedActivity.value && !selectedRowHasParent.value) {
    if (isSelectedRowDone.value || isSelectedClassS.value || isDeletedSelectedActivity.value || noSelectedActivity.value) return false;
    createChildActivity();
    return true;
  }
  if (sheetPrimaryActivityId.value == null || isSelectedClassS.value) return false;
  increaseChildActivity();
  return true;
}

function keyboardAddTodo(): boolean {
  addTodoRow();
  return true;
}

function keyboardAddSchedule(): boolean {
  addScheduleRow();
  return true;
}

function keyboardAddUntaetigkeit(): boolean {
  addUntaetigkeitRow();
  return true;
}

function keyboardToggleQuadrant(): boolean {
  settingStore.toggleKanbanQuadrantMode();
  return true;
}

function keyboardAddKanbanSection(): boolean {
  const before = settingStore.settings.kanbanSetting.filter((s) => s.show).length;
  addSection();
  const after = settingStore.settings.kanbanSetting.filter((s) => s.show).length;
  return after > before;
}

function keyboardremoveKanbanSection(): boolean {
  if (settingStore.settings.kanbanQuadrantMode) return false;
  const visible = sections.value.filter((s) => s.show);
  if (visible.length <= 1) return false;
  const last = visible[visible.length - 1];
  if (!last || last.id === 1) return false;
  removeSection(last.id);
  return true;
}

function focusRowFieldInput(rowActivityId: number, selector: string): boolean {
  const rowEl = document.querySelector(`[data-row-id="${rowActivityId}"]`);
  if (!(rowEl instanceof HTMLElement)) return false;
  const input = rowEl.querySelector(selector) as HTMLElement | null;
  if (!input) return false;
  handleFocusRow(rowActivityId);
  requestAnimationFrame(() => {
    (input as HTMLInputElement).focus?.();
    if ("select" in input && typeof (input as HTMLInputElement).select === "function") {
      (input as HTMLInputElement).select();
    }
  });
  return true;
}

function keyboardEditField(field: "title" | "dueDate" | "place" | "duration" | "scheduleTime" | "pomoEstimate"): boolean {
  const rowActivityId = sheetPrimaryActivityId.value;
  if (rowActivityId == null) return false;
  const activity = activityById.value.get(rowActivityId);
  if (!activity) return false;

  if (field === "title") return focusRowFieldInput(rowActivityId, ".activity-field-title input");
  if (field === "dueDate") return activity.class === "T" && focusRowFieldInput(rowActivityId, ".activity-field-due-date input");
  if (field === "place") return activity.class === "S" && focusRowFieldInput(rowActivityId, ".activity-field-place input");
  if (field === "duration") return activity.class === "S" && focusRowFieldInput(rowActivityId, ".activity-field-duration input");
  if (field === "scheduleTime") return activity.class === "S" && focusRowFieldInput(rowActivityId, ".activity-field-schedule-time input");
  if (field === "pomoEstimate") return activity.class === "T" && focusRowFieldInput(rowActivityId, ".activity-field-pomo input");
  return false;
}

watch(keyboardRowCandidates, (list) => {
  if (!navigatorActive.value) return;
  if (!list.length) {
    navigatorActive.value = false;
    return;
  }
  if (navigatorCursor.value > list.length - 1) {
    navigatorCursor.value = list.length - 1;
  }
});

provide(activityNavigatorInjectKey, {
  isActive: computed(() => navigatorActive.value),
  numberById: navigatorNumberById,
  currentRowId: navigatorCurrentRowId,
  currentFieldKey: navigatorCurrentFieldKey,
});

// 错误提示弹窗相关
const showPopover = ref(false);
const popoverMessage = ref("");

function addSection() {
  if (settingStore.settings.kanbanQuadrantMode) return;

  const visibleCount = settingStore.settings.kanbanSetting.filter((s) => s.show).length;
  if (visibleCount >= 6) return;

  // 找到第一个隐藏的section（id从小到大）
  const nextHidden = settingStore.settings.kanbanSetting.find((s) => !s.show);
  if (nextHidden) {
    nextHidden.show = true;
  }

  // 重新计算宽度
  const newVisibleCount = settingStore.settings.kanbanSetting.filter((s) => s.show).length;
  settingStore.settings.rightWidth = 250 * newVisibleCount;
}

function removeSection(id: number) {
  if (settingStore.settings.kanbanQuadrantMode) return;
  if (id === 1) return; // id=1不能隐藏

  const section = settingStore.settings.kanbanSetting.find((s) => s.id === id);
  if (section) {
    section.show = false;
  }

  // 重新计算宽度
  const visibleCount = settingStore.settings.kanbanSetting.filter((s) => s.show).length;
  if (visibleCount === 1) {
    settingStore.settings.rightWidth = 300;
  } else {
    settingStore.settings.rightWidth = 250 * visibleCount;
  }
}

// ========================
// 计算属性
// ========================
// 根据筛选条件过滤活动列表
function filteredBySection(section: ActivitySectionConfig) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 如果filterKey有（不为null），直接switch分支
  if (section.filterKey) {
    switch (section.filterKey) {
      case "all":
        // 全部活动中不显示已取消的活动
        return activeActivities.value.filter((item: Activity) => item.status !== "cancelled");
      case "deleted":
        // 筛选已删除的活动（保持 filterKey 为 "deleted" 以向后兼容）
        // 需要使用完整的 activityList，因为 activeActivities 已过滤掉 deleted 的活动
        // 注意：cancelled 的活动被删除后仍会显示在这里，这是有意的设计：
        // cancelled 是完成状态的一种，被删除的 cancelled 活动需要在"已删活动"视图中可找回
        return activityList.value.filter((item: Activity) => item.deleted === true);
      case "today":
        return activeActivities.value.filter((item: Activity) => {
          // 过滤掉已取消的活动
          if (item.status === "cancelled") return false;
          if (item.class === "T") {
            if (!item.dueDate) return true; // 允许没有日期的项目在今日到期显示
            if (!item.dueDate && item.parentId) return false; // 不允许没有日期的子项目在今日到期显示
            const due = new Date(item.dueDate);
            due.setHours(0, 0, 0, 0);
            return due.getTime() === now.getTime();
          } else if (item.class === "S") {
            if (!item.dueRange || !item.dueRange[0]) return true; // 允许没有日期的项目在今日到期显示
            const start = new Date(item.dueRange[0]);
            start.setHours(0, 0, 0, 0);
            return start.getTime() === now.getTime();
          }
          return false;
        });
      case "interrupt":
        return activeActivities.value.filter((item: Activity) => item.status !== "cancelled" && !!item.interruption);
      case "todo":
        return activeActivities.value.filter((item: Activity) => item.status !== "cancelled" && item.class === "T");
      case "schedule":
        return activeActivities.value.filter((item: Activity) => item.status !== "cancelled" && item.class === "S");
      default:
        break;
    }
  }

  // 没有 filterKey，再看search
  if (section.search) {
    const keyword = section.search.trim().toLowerCase();
    // 搜索中也不显示已取消的活动
    return activeActivities.value.filter(
      (item: Activity) => item.status !== "cancelled" && item.title && item.title.toLowerCase().includes(keyword),
    );
  }

  // 什么条件都没有，返回空
  return [];
}

// 活动筛选，由 section 单独管理
function handleSectionFilter(idx: number, filterKey: string) {
  emit("update-active-id", null);
  const option = filterOptions.find((opt) => opt.key === filterKey);
  if (option) {
    sections.value[idx].filterKey = filterKey;
    sections.value[idx].search = option.label; // 输入框内容显示label
  }
}

// 搜索
function handleSectionSearch(id: number, val: string) {
  const section = settingStore.settings.kanbanSetting.find((s) => s.id === id);
  if (section) {
    section.search = val;
    console.log(val);
    // 支持用label和key来判断
    const match = filterOptions.find(
      (opt) => opt.label.trim().toLowerCase() === val.trim().toLowerCase() || opt.key.trim().toLowerCase() === val.trim().toLowerCase(),
    );
    section.filterKey = match ? match.key : null;
  }
}

// ========================
// 方法函数
// ========================

// 显示错误提示弹窗
function showErrorPopover(message: string) {
  popoverMessage.value = message;
  showPopover.value = true;
  // 3秒后自动隐藏
  setTimeout(() => {
    showPopover.value = false;
  }, 3000);
}

// 选择活动处理函数，提示
function pickActivity() {
  const id = sheetPrimaryActivityId.value;
  // 1. 检查是否有选中的活动
  if (id == null || id === undefined) {
    showErrorPopover("请选择一个活动！");
    return;
  }

  // 2. 查找todo中是否有对应的活动
  const relatedTodo = todoByActivityId.value.get(id);
  if (relatedTodo && !relatedTodo.deleted) {
    showErrorPopover("【" + timestampToDatetime(relatedTodo.id) + "】启动待办");
    dateService.navigateTo(new Date(relatedTodo.id));
    emit("update-active-id", id);
    return;
  }

  const relatedSchedule = scheduleByActivityId.value.get(id);
  if (relatedSchedule) {
    if (relatedSchedule.activityDueRange[0]) {
      dateService.navigateTo(new Date(relatedSchedule.activityDueRange[0]));
      emit("update-active-id", id);
    } else {
      showErrorPopover("预约尚未设置时间！");
    }

    return;
  }

  const picked = activityById.value.get(id);
  if (!picked) return;

  // 4. 触发事件并重置选中状态
  emit("pick-activity", picked);
}

// 添加新的预约活动
function addScheduleRow() {
  emit("add-activity", {
    id: Date.now(),
    class: "S",
    title: "",
    dueRange: [null, ""],
    status: "",
    parentId: null,
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  });
}

// 添加新的无所事事
function addUntaetigkeitRow() {
  emit("add-activity", {
    id: Date.now(),
    class: "S",
    title: "",
    dueRange: [Date.now(), ""],
    status: "",
    isUntaetigkeit: true,
    parentId: null,
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  });
}

// 添加新的待办任务
function addTodoRow() {
  emit("add-activity", {
    id: Date.now(),
    class: "T",
    title: "",
    estPomoI: "",
    pomoType: "🍅",
    status: "",
    dueDate: Date.now(), // 默认今天
    parentId: null,
    synced: false,
    deleted: false,
    lastModified: Date.now(),
  });
}

// 删除当前选中的活动
function deleteActiveRow() {
  emit("delete-activity", activeId.value || selectedActivityId.value || null);
}

// 处理行聚焦事件
function handleFocusRow(id: number) {
  emit("update-active-id", id);
}

function handleFocusSearch() {
  emit("update-active-id", null);
}

// 切换番茄钟类型
function togglePomoType() {
  const id = sheetPrimaryActivityId.value;
  if (id != null && id !== undefined) {
    emit("toggle-pomo-type", id);
  }
}

// 构建选中活动的子活动
function createChildActivity() {
  emit("create-child-activity", activeId.value || selectedActivityId.value || null);
}

// 恢复选中活动的子活动
function increaseChildActivity() {
  emit("increase-child-activity", activeId.value || selectedActivityId.value || null);
}
</script>

<style scoped>
/*
 * 纵向 flex 分配高度：与 MainLayout --app-vvh 单一来源，不在此用 calc 扣键盘。
 * 横向仅 kanban-columns；纵向仅 ActivitySection 内列表。
 */
.activity-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.activity-button-container {
  flex: 0 0 auto;
  height: 40px;
  overflow: hidden;
}

.kanban-columns {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
}

.kanban-column {
  flex: 1 0 0;
  min-width: 240px;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 650px) {
  .activity-button-container {
    height: 0;
    min-height: 0;
  }
}

.activity-quadrant-head-wrap {
  flex-shrink: 0;
  width: 100%;
  min-width: 0;
}

.activity-quadrant-grid {
  flex: 1 1 0;
  min-height: 0;
  display: grid;
  gap: 6px;
  margin-bottom: 6px;
  margin-top: 2px;
  /* 勿在此层做 overflow-y: auto：窄屏 .right 已 overflow-y:hidden（见 HomeView），再嵌套纵滚会触发 iOS 异常 scrollExtent、无限条与灰带；靠 minmax(0,1fr) 压缩行 + 象限内 .section-content-container 滚动 */
  overflow: hidden;
}

@media (min-width: 651px) {
  .activity-quadrant-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      "imp both"
      "urg nor";
  }
}

@media (max-width: 650px) {
  .activity-quadrant-grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, minmax(0, 1fr));
    grid-template-areas:
      "both"
      "imp"
      "urg"
      "nor";
    margin-bottom: calc(env(safe-area-inset-bottom) + 2px);
  }
}
</style>
