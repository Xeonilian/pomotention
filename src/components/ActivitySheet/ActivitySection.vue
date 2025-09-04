<!-- 
  Component: ActivitySection.vue 

-->
<template>
  <div class="section-container">
    <!-- 筛选区 -->
    <div class="section-header">
      <n-input
        :placeholder="currentFilterLabel"
        title="请输入筛选条件..."
        :value="props.search"
        @update:value="(val) => $emit('update:search', val)"
        @focus="$emit('focus-search')"
      >
        <template #prefix>
          <n-dropdown
            :options="filterOptions"
            @select="(key) => $emit('filter', key)"
          >
            <n-button text type="default" title="筛选活动">
              <template #icon>
                <n-icon><DocumentTableSearch24Regular /></n-icon>
              </template>
            </n-button>
          </n-dropdown>
        </template>
      </n-input>

      <n-button
        v-if="isAddButton"
        type="default"
        title="增加一列"
        @click="$emit('add-section', props.sectionId)"
      >
        <template #icon>
          <n-icon><Add16Regular /></n-icon>
        </template>
      </n-button>
      <n-button
        v-if="isRemoveButton"
        type="default"
        secondary
        strong
        title="删除本列"
        @click="$emit('remove-section', props.sectionId)"
      >
        <template #icon>
          <n-icon><Subtract16Regular /></n-icon>
        </template>
      </n-button>
    </div>

    <!-- 内容区 -->
    <div v-for="item in sortedDisplaySheet" :key="item.id">
      <div
        v-if="item.status !== 'done'"
        class="activity-row"
        :class="{ 'highlight-line': item.id === activityId }"
      >
        <div class="activity-content">
          <n-popover
            :show="popoverTargetId === item.id"
            @update:show="(show) => !show && (popoverTargetId = null)"
            trigger="manual"
            placement="bottom-start"
            :trap-focus="false"
            :show-arrow="false"
            style="padding: 0; border-radius: 6px"
            :to="false"
            ><template #trigger>
              <n-input
                v-model:value="item.title"
                :ref="(el) => setRowInputRef(el as InputInst | null, item.id)"
                type="text"
                :placeholder="item.isUntaetigkeit ? '无所事事' : '任务描述'"
                style="flex: 1"
                @input="handleTitleInput(item, $event)"
                @keydown="handleInputKeydown($event, item)"
                @focus="$emit('focus-row', item.id)"
                :class="{
                  'force-hover': hoveredRowId === item.id,
                  'child-activity': item.parentId,
                }"
              >
                <template #prefix>
                  <div
                    class="icon-drag-area"
                    @mousedown="startDrag($event, item)"
                    @mouseenter="handleIconMoveMouseEnter(item.id)"
                    @mouseleave="handleIconMoveMouseLeave"
                    :title="
                      item.status !== 'cancelled'
                        ? '拖拽调整顺序'
                        : '不支持顺序修改'
                    "
                  >
                    <n-icon
                      v-if="item.isUntaetigkeit"
                      :color="'var(--color-blue)'"
                      ><Cloud24Regular
                    /></n-icon>
                    <n-icon
                      v-if="item.interruption === 'I'"
                      :color="
                        item.status === 'ongoing'
                          ? 'var(--color-red)'
                          : item.status === 'delayed'
                          ? 'var(--color-blue)'
                          : item.status === 'suspended'
                          ? 'var(--color-orange)'
                          : item.status === 'cancelled'
                          ? 'var(--color-text-primary)'
                          : 'var(--color-text-secondary)'
                      "
                      ><Chat24Regular
                    /></n-icon>
                    <n-icon
                      v-else-if="item.interruption === 'E'"
                      :color="
                        item.status === 'ongoing'
                          ? 'var(--color-red)'
                          : item.status === 'delayed'
                          ? 'var(--color-blue)'
                          : item.status === 'suspended'
                          ? 'var(--color-orange)'
                          : item.status === 'cancelled'
                          ? 'var(--color-text-primary)'
                          : 'var(--color-text-secondary)'
                      "
                      ><VideoPersonCall24Regular
                    /></n-icon>
                    <n-icon
                      v-else-if="item.class === 'T'"
                      :color="
                        item.status === 'ongoing'
                          ? 'var(--color-red)'
                          : item.status === 'delayed'
                          ? 'var(--color-blue)'
                          : item.status === 'suspended'
                          ? 'var(--color-orange)'
                          : item.status === 'cancelled'
                          ? 'var(--color-text-primary)'
                          : 'var(--color-text-secondary)'
                      "
                      ><ApprovalsApp24Regular
                    /></n-icon>
                    <n-icon
                      v-else-if="item.class === 'S' && !item.isUntaetigkeit"
                      :color="
                        item.status === 'ongoing'
                          ? 'var(--color-red)'
                          : item.status === 'delayed'
                          ? 'var(--color-blue)'
                          : item.status === 'suspended'
                          ? 'var(--color-orange)'
                          : item.status === 'cancelled'
                          ? 'var(--color-text-primary)'
                          : 'var(--color-text-secondary)'
                      "
                      ><CalendarCheckmark20Regular
                    /></n-icon>
                  </div>
                </template>
                <template #suffix>
                  <n-icon
                    v-if="!item.tagIds"
                    text
                    color="var(--color-text-secondary)"
                    @click="
                      showTagManager = true;
                      editingTagId = item.id;
                    "
                    class="icon-tag"
                    title="添加标签"
                    ><Tag16Regular
                  /></n-icon>
                  <n-icon
                    v-else
                    text
                    color="var(--color-blue)"
                    @click="handleTagIconClick($event, item)"
                    class="icon-tag"
                    title="Alt+点击=切换显示 | 点击=管理标签"
                    ><Tag16Regular
                  /></n-icon>
                </template>
              </n-input>
            </template>
            <TagSelector
              :ref="
                (el) => {
                  if (popoverTargetId === item.id) tagSelectorRef = el;
                }
              "
              :search-term="tagSearchTerm"
              :allow-create="true"
              @select-tag="(tagId: any) => handleTagSelected(item, tagId)"
              @create-tag="(tagName: any) => handleTagCreate(item, tagName)"
              @close-selector="popoverTargetId = null"
            />
          </n-popover>
          <n-modal
            v-model:show="showTagManager"
            @after-leave="onTagManagerClosed"
            role="dialog"
            aria-modal="true"
          >
            <n-card style="width: 420px">
              <TagManager v-model="tempTagIds" />
            </n-card>
          </n-modal>
          <n-input
            v-if="item.class === 'S'"
            v-model:value="item.location"
            style="max-width: 50px"
            @focus="$emit('nofocus-row', item.id)"
            placeholder="地点"
            :class="{ 'force-hover': hoveredRowId === item.id }"
            @click.stop
          />
          <n-input
            v-if="item.class === 'T'"
            maxlength="1"
            :value="getInputValue(item)"
            :placeholder="item.pomoType"
            :title="`输入估计${item.pomoType || '🍅'}数量`"
            style="max-width: 32px"
            class="pomo-input"
            :class="{
              'pomo-red': item.pomoType === '🍅',
              'pomo-purple': item.pomoType === '🍇',
              'pomo-green': item.pomoType === '🍒',
              'input-center': true, // 新增
              'input-clear-disabled': item.pomoType === '🍒',
              'force-hover': hoveredRowId === item.id,
            }"
            :disabled="item.pomoType === '🍒'"
            @update:value="(val) => onInputUpdate(item, val)"
            @focus="$emit('nofocus-row', item.id)"
          />
          <n-input
            v-else
            style="max-width: 32px; font-size: 14px; margin: 0 auto"
            :value="item.dueRange ? item.dueRange[1] : ''"
            @update:value="
              (val) =>
                item.dueRange
                  ? (item.dueRange[1] = val)
                  : (item.dueRange = [Date.now(), val])
            "
            @focus="$emit('nofocus-row', item.id)"
            title="持续时间(分钟)"
            placeholder="min"
            class="input-center input-min"
            :class="{ 'force-hover': hoveredRowId === item.id }"
          />
          <n-date-picker
            v-if="item.class === 'T'"
            v-model:value="item.dueDate"
            type="date"
            clearable
            style="max-width: 63px"
            format="MM/dd"
            @focus="$emit('nofocus-row', item.id)"
            title="死线日期"
            :class="getCountdownClass(item.dueDate)"
          />
          <n-date-picker
            v-else
            :value="item.dueRange ? item.dueRange[0] : 0"
            @update:value="
              (val) =>
                item.dueRange
                  ? (item.dueRange[0] = val)
                  : (item.dueRange = [Date.now(), ''])
            "
            type="datetime"
            style="max-width: 63px"
            clearable
            format="HH:mm"
            @focus="$emit('nofocus-row', item.id)"
            title="约定时间"
            :class="getCountdownClass(item.dueRange && item.dueRange[0])"
          />
        </div>
        <div
          v-if="
            item.tagIds &&
            item.tagIds.length > 0 &&
            settingStore.settings.kanbanSetting[props.sectionId].showTags
          "
          class="tag-content"
          :class="{ 'child-activity-tag': item.parentId }"
        >
          <TagRenderer
            :tag-ids="item.tagIds"
            :isCloseable="true"
            @remove-tag="handleRemoveTag(item, $event)"
            class="tagRenderer-container"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref, onMounted } from "vue";
import { NInput, NDatePicker, NIcon, NDropdown, NPopover } from "naive-ui";
import {
  VideoPersonCall24Regular,
  ApprovalsApp24Regular,
  CalendarCheckmark20Regular,
  Cloud24Regular,
  Chat24Regular,
  DocumentTableSearch24Regular,
  Add16Regular,
  Subtract16Regular,
  Tag16Regular,
} from "@vicons/fluent";
import type { Activity } from "@/core/types/Activity";
import { useSettingStore } from "@/stores/useSettingStore";
import TagManager from "../TagSystem/TagManager.vue";
import { useTagStore } from "@/stores/useTagStore";
import TagRenderer from "../TagSystem/TagRenderer.vue";
import TagSelector from "../TagSystem/TagSelector.vue";
import type { InputInst } from "naive-ui";

// 接收发射数据
const props = defineProps<{
  displaySheet: Activity[];
  filterOptions: any[];
  getCountdownClass: (dueDate: number | undefined | null) => string;
  activityId: number | null;
  currentFilter: string | null;
  isAddButton: boolean;
  isRemoveButton: boolean;
  sectionId: number;
  search: string;
  activeId: number | null | undefined;
}>();

defineEmits<{
  "focus-row": [id: number];
  "nofocus-row": [id: number];
  filter: [key: string];
  "add-section": [id: number];
  "remove-section": [id: number];
  "update:search": [value: string];
  "focus-search": [];
}>();

const settingStore = useSettingStore();
const showTagManager = ref(false);
const editingTagId = ref(0);
const tagStore = useTagStore();

const tempTagIds = ref<number[]>([]); // 临时编辑tagIds

onMounted(() => {
  settingStore.settings.kanbanSetting[props.sectionId].showTags ??= true;
});

const currentFilterLabel = computed(() => {
  const match = props.filterOptions.find((o) => o.key === props.currentFilter);
  return match?.label ?? "";
});

// Popover 相关状态
const tagSearchTerm = ref("");
const popoverTargetId = ref<number | null>(null);
const tagSelectorRef = ref<any>(null);
const inputRefs = ref<Record<number, any>>({});

// 拖拽相关状态
const isDragging = ref(false);
const draggedItem = ref<Activity | null>(null);
const dragStartY = ref(0);

// 新增：用于模拟 hover 效果的行 id
const hoveredRowId = ref<number | null>(null);

// 排序：先按自定义排序，再按类型排序
const sortedDisplaySheet = computed(() => {
  const activities = props.displaySheet
    .filter((activity: Activity) => activity.status !== "done")
    .slice();
  const activityMap = new Map<number, Activity[]>(); // 存储每个 parentId 对应的子活动列表
  const rootActivities: Activity[] = [];

  // 第一次遍历：构建父子关系的 Map，并分离出根活动
  activities.forEach((item) => {
    if (item.parentId === null || item.parentId === undefined) {
      rootActivities.push(item);
    } else {
      if (!activityMap.has(item.parentId)) {
        activityMap.set(item.parentId, []);
      }
      activityMap.get(item.parentId)!.push(item);
    }
  });

  const getRank = (id: number) =>
    settingStore.settings.activityRank[id] ?? Number.MAX_SAFE_INTEGER;

  // 对所有层级的活动列表进行排序
  // 1. 对根活动排序
  rootActivities.sort((a, b) => getRank(a.id) - getRank(b.id));

  // 2. 对每个子活动列表进行排序
  for (const children of activityMap.values()) {
    children.sort((a, b) => getRank(a.id) - getRank(b.id));
  }

  const result: Activity[] = [];

  // 第二次遍历：通过深度优先搜索（DFS）将树状结构展平为有序列表
  function dfs(activity: Activity) {
    result.push(activity);
    const children = activityMap.get(activity.id);
    if (children) {
      // 此时 children 已经是排好序的
      children.forEach(dfs);
    }
  }

  rootActivities.forEach(dfs);

  // 最终的 result 列表就保证了父子结构，并且同级之间按 rank 排序
  return result;
});

// 用 Map 保存每一行的 n-input 实例
const rowInputMap = ref(new Map<number, InputInst>());

function setRowInputRef(el: InputInst | null, id: number) {
  if (el) rowInputMap.value.set(id, el);
  else rowInputMap.value.delete(id);
}

// 监听 activeId，命中后聚焦对应行
watch(
  () => props.activeId,
  async (id) => {
    let targetFocusId = null;
    if (id === undefined) return;
    if (id === null) {
      const list = sortedDisplaySheet.value;
      const last = list[list.length - 1];
      if (last && last.id !== null && last.id !== undefined) {
        targetFocusId = last.id;
      } else {
        return;
      }
    } else {
      targetFocusId = id;
    }
    if (targetFocusId === null) return;
    await nextTick();
    const inst = rowInputMap.value.get(targetFocusId);
    if (!inst) return;
    if (typeof inst.focus === "function") {
      inst.focus();
    } else {
      inst.inputElRef?.focus?.();
    }
  }
);

// 在拖拽里用到
function handleIconMoveMouseEnter(id: number) {
  hoveredRowId.value = id;
}

function handleIconMoveMouseLeave() {
  hoveredRowId.value = null;
}

// 开始拖拽
function startDrag(event: MouseEvent, item: Activity) {
  event.preventDefault();
  event.stopPropagation();

  // 检查是否点击在输入框上
  const target = event.target as HTMLElement;
  const isInputElement = target.closest("input, textarea, .n-input__input");

  if (isInputElement) {
    return;
  }

  isDragging.value = true;
  draggedItem.value = item;
  dragStartY.value = event.clientY;

  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);
}

// 拖拽移动
function handleDragMove(event: MouseEvent) {
  if (!isDragging.value || !draggedItem.value) return;

  const hoverId = hoveredRowId.value;
  if (!hoverId) return;

  const flatList = sortedDisplaySheet.value;
  const dragItem = draggedItem.value;
  const targetItem = flatList.find((act) => act.id === hoverId);

  if (!targetItem || dragItem.id === targetItem.id) return;

  // 判定是否允许drop，只能同组拖
  if (!canDrop(dragItem, targetItem)) return;

  let newList: Activity[] = [];

  // 如果拖的是父（根活动），则父和所有子一起移动
  if (!dragItem.parentId) {
    const originalList = flatList.slice();
    const dragBlock = getFamilyBlock(dragItem.id, originalList);

    // 从列表中移除正在拖拽的块
    const listWithoutBlock = originalList.filter(
      (i) => !dragBlock.some((b) => b.id === i.id)
    );

    // 在新列表中找到目标位置的索引
    let targetIndexInNewList = listWithoutBlock.findIndex(
      (i) => i.id === targetItem.id
    );

    // 关键修正：判断原始拖拽方向，以决定插入点
    const originalDragIndex = originalList.findIndex(
      (i) => i.id === dragItem.id
    );
    const originalTargetIndex = originalList.findIndex(
      (i) => i.id === targetItem.id
    );

    // 如果是向下拖拽，插入点应该在目标元素的后面
    if (originalDragIndex < originalTargetIndex) {
      targetIndexInNewList++;
    }

    // 将拖拽的块插入到计算好的正确位置
    listWithoutBlock.splice(targetIndexInNewList, 0, ...dragBlock);
    newList = listWithoutBlock;
  } else {
    // 拖的是子活动，只在同一父活动的子活动组内重新排序
    const siblings = flatList.filter((i) => i.parentId === dragItem.parentId);
    const originalDragIndex = siblings.findIndex((i) => i.id === dragItem.id);
    const originalTargetIndex = siblings.findIndex(
      (i) => i.id === targetItem.id
    );

    if (originalDragIndex === -1 || originalTargetIndex === -1) return;

    const newSiblings = [...siblings];
    const [movedItem] = newSiblings.splice(originalDragIndex, 1); // 从副本中取出拖动的项

    // 在移除了拖动项的副本中找到目标的新索引
    let newTargetIndex = newSiblings.findIndex((i) => i.id === targetItem.id);

    // 根据原始拖动方向决定插入位置
    if (originalDragIndex < originalTargetIndex) {
      newSiblings.splice(newTargetIndex + 1, 0, movedItem);
    } else {
      newSiblings.splice(newTargetIndex, 0, movedItem);
    }

    // 使用新的子活动顺序重组整个列表
    const groupStartIndex = flatList.findIndex((i) => i.id === siblings[0].id);
    const groupEndIndex = flatList.findIndex(
      (i) => i.id === siblings[siblings.length - 1].id
    );
    newList = [
      ...flatList.slice(0, groupStartIndex),
      ...newSiblings,
      ...flatList.slice(groupEndIndex + 1),
    ];
  }

  // 使用新排好序的列表来更新排序 rank
  if (newList.length > 0) {
    updateActivityRankByList(newList);
  }

  // 可选：此时刷新起始Y，避免继续移动“误触”
  dragStartY.value = event.clientY;
}

// 拖拽结束
function handleDragEnd() {
  isDragging.value = false;
  draggedItem.value = null;

  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);
}

// 更新活动排序
/** 用排序后的扁平列表写入rank  */
function updateActivityRankByList(orderedList: Activity[]) {
  const newRank: Record<number, number> = {};
  orderedList.forEach((a, idx) => {
    newRank[a.id] = idx;
  });
  settingStore.settings.activityRank = newRank;
}

/** 取某 id 所有自身及子孙 activity，顺序一致扁平返回 */
function getFamilyBlock(activityId: number, flatList: Activity[]): Activity[] {
  const result: Activity[] = [];
  function dfs(id: number) {
    const act = flatList.find((item) => item.id === id);
    if (!act) return;
    result.push(act);
    flatList.forEach((item) => {
      if (item.parentId === id) dfs(item.id);
    });
  }
  dfs(activityId);
  return result;
}

// 判断是否拖拽合法
function canDrop(dragItem: Activity, targetItem: Activity): boolean {
  // 根活动之间的拖拽始终允许
  if (!dragItem.parentId && !targetItem.parentId) return true;

  // 子活动必须在同一父级下
  return dragItem.parentId === targetItem.parentId;
}

// 获取输入显示字符串
function getInputValue(item: Activity): string {
  if (item.pomoType === "🍒") return "4";
  return typeof item.estPomoI === "string" ? item.estPomoI : "";
}

// 响应用户输入
function onInputUpdate(item: Activity, value: string) {
  if (item.pomoType === "🍒") {
    item.estPomoI = "4";
    return;
  }
  item.estPomoI = value;
}

// Tag相关
function handleTagIconClick(event: MouseEvent, item: Activity) {
  if (event.altKey) {
    // --- Alt+Click 逻辑 ---
    // 阻止任何可能发生的默认行为（比如文本选择）
    event.preventDefault();

    // 切换 showTags 的值 (true -> false, false -> true)

    settingStore.settings.kanbanSetting[props.sectionId].showTags =
      !settingStore.settings.kanbanSetting[props.sectionId].showTags;
  } else {
    // --- 普通点击逻辑 (你之前的代码) ---
    // 如果没有按 Alt 键，就执行常规的打开标签管理器的操作
    showTagManager.value = true;
    editingTagId.value = item.id;
    tempTagIds.value = [...(item.tagIds || [])];
  }
}
// 保存Tags
function onTagManagerClosed() {
  // 只在弹窗关闭时才同步
  const activity = props.displaySheet.find(
    (act) => act.id === editingTagId.value
  );

  if (activity) {
    const existingTagIds = activity.tagIds || [];
    const mergedTagIds = [...new Set([...existingTagIds, ...tempTagIds.value])];

    // 计算实际新增的 tagIds
    const newlyAddedTagIds = mergedTagIds.filter(
      (id) => !existingTagIds.includes(id)
    );

    // 更新 activity
    activity.tagIds = mergedTagIds;

    // 只为新增的 tags 更新 count
    newlyAddedTagIds.forEach((tagId) => {
      tagStore.incrementTagCount(tagId);
    });
  }

  // 清空临时数据
  tempTagIds.value = [];
}

// 处理删除标签
// 修改标签删除逻辑
function handleRemoveTag(item: Activity, tagId: number) {
  if (item.tagIds) {
    const newTagIds = item.tagIds.filter((id) => id !== tagId);
    // 如果过滤后为空数组，赋为null，否则用新数组
    item.tagIds = newTagIds.length > 0 ? newTagIds : undefined;

    tagStore.decrementTagCount(tagId);
  }
}

// 更新 handleTitleInput 函数
function handleTitleInput(item: Activity, value: string) {
  const match = value.match(/#([\p{L}\p{N}_]*)$/u);

  // 存储当前输入框的引用
  inputRefs.value[item.id] = event?.target || null;

  if (match) {
    popoverTargetId.value = item.id;
    tagSearchTerm.value = match[1];
  } else {
    popoverTargetId.value = null;
  }
}

// 键盘事件处理函数
function handleInputKeydown(event: KeyboardEvent, item: Activity) {
  // 仅当当前输入框的popover开启时处理特殊按键
  if (popoverTargetId.value === item.id && tagSelectorRef.value) {
    switch (event.key) {
      case "ArrowDown":
        console.log("ArrowDown");
        tagSelectorRef.value.navigateDown();
        event.preventDefault(); // 阻止输入框光标移动
        break;
      case "ArrowUp":
        tagSelectorRef.value.navigateUp();
        event.preventDefault();
        break;
      case "Enter":
        console.log("Enter");
        tagSelectorRef.value.selectHighlighted();
        event.preventDefault(); // 阻止输入框换行
        break;
      case "Escape":
        console.log("Escape");
        popoverTargetId.value = null; // 直接关闭popover
        event.preventDefault();
        break;
    }
  }

  // 特殊处理：#键自动打开popover
  if (event.key === "#" && popoverTargetId.value === null) {
    popoverTargetId.value = item.id;
  }
}

// 标签选择处理函数
function handleTagSelected(item: Activity, tagId: number) {
  // 在标题中移除标签搜索符号
  item.title = item.title.replace(/#[\p{L}\p{N}_]*$/u, "").trim();

  // 添加标签ID
  if (!item.tagIds) item.tagIds = [];
  if (!item.tagIds.includes(tagId)) {
    item.tagIds.push(tagId);
    tagStore.incrementTagCount(tagId);
  }

  // 关闭popover
  popoverTargetId.value = null;
}

// 标签创建处理函数
function handleTagCreate(item: Activity, tagName: string) {
  // 创建新标签后自动更新标题
  item.title = item.title.replace(/#[\p{L}\p{N}_]*$/u, "").trim();

  // 创建新标签
  const newTag = tagStore.addTag(tagName, "#333", "#eee");
  if (newTag) {
    if (!item.tagIds) item.tagIds = [];
    item.tagIds.push(newTag.id);
    tagStore.setTagCount(newTag.id, 1);
  }

  // 关闭popover
  popoverTargetId.value = null;
}
</script>

<style scoped>
.section-container {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  padding: 2px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 4px;
}

.section-header :deep(.n-input__input-el) {
  font-weight: bold;
}
.activity-row {
  align-items: center;
  padding: 1px 0;
  gap: 0px;
  width: 100%;
}

.activity-content .child-activity {
  position: relative;
  margin-left: 20px;
}

.activity-content .child-activity::before {
  content: "";
  position: absolute;
  left: -12px; /* inside the 20px margin */
  top: 1em; /* vertically centered */
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  color: var(--color-text-secondary);
}
.activity-content {
  display: flex;
  flex-direction: row;
}
.tag-content {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
}
.child-activity-tag {
  margin-left: 20px;
}

.tagRenderer-container {
  margin-top: 2px;
  display: flex;
  flex-wrap: wrap;
}

.icon-drag-area {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  padding: 2px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.icon-drag-area:hover {
  background-color: var(--color-blue-light);
}

.icon-drag-area:active {
  cursor: grabbing;
  background-color: var(--color-red-light);
}

.icon-tag {
  display: flex;
  padding: 2px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.icon-tag:hover {
  cursor: pointer;
  background-color: var(--color-red-light);
}

.input-min :deep(.n-input-wrapper) {
  padding-left: 0px !important;
  padding-right: 0px !important;
}

:deep(.n-input .n-input-wrapper) {
  padding-left: 4px;
  padding-right: 4px;
}

.input-min :deep(.n-input__input) {
  font-size: 12px;
}

:deep(.n-input .n-input__suffix) {
  margin: 0px;
}

:deep(.n-input .n-input__prefix) {
  margin: 0px;
}

.input-min :deep(.n-input__placeholder) {
  font-size: 12px;
}

.countdown-0 :deep(.n-input) {
  background: var(--color-red-light-transparent);
}

.countdown-1 :deep(.n-input) {
  background: var(--color-background-light-transparent);
}
.countdown-2 :deep(.n-input) {
  background: var(--color-background-transparent);
}

.countdown-boom :deep(.n-input) {
  background: var(--color-blue-light-transparent);
}
.pomo-input :deep(.n-input__placeholder) {
  opacity: 0.45; /* 50% 透明度 */
  font-size: 10px;
}
.pomo-red {
  background: var(--color-background) !important;
}
.pomo-purple {
  background: var(--color-purple-light-transparent) !important;
}
.pomo-green {
  background: var(--color-green-light-transparent) !important;
}

/* 文本居中 */
.input-center :deep(.n-input__input) {
  text-align: center;
  color: var(--color-text-primary) !important;
  opacity: 1 !important;
}

/* 禁用也要高对比度且和普通同色 */
.input-clear-disabled :deep(.n-input__input-el[disabled]) {
  color: var(--color-text-primary) !important;
  opacity: 1 !important;
  -webkit-text-fill-color: var(--color-text-primary) !important;
}

.highlight-line {
  background-color: var(--color-yellow-light);
}

/* 强制 n-input 显示 hover 效果 */
.force-hover :deep(.n-input) {
  border-color: var(--n-border-hover) !important;
  box-shadow: var(--n-box-shadow-focus) !important;
  background-color: var(--n-color-hover) !important;
}
.force-hover :deep(.n-input__input) {
  background-color: var(--n-color-hover) !important;
}

.n-modal-mask {
  background-color: rgba(0, 0, 0, 0.1) !important;
}
</style>
