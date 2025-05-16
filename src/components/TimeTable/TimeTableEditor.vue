<!--
Component: TimeTableEditor.vue 
Description: 编辑界面，接收数据，回传
Props:
Emits:
Parent: HomeView.vue  
-->
<template>
  <table class="compact-table">
    <thead>
      <tr>
        <th>分类</th>
        <th>开始时间</th>
        <th>结束时间</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(block, idx) in Blocks" :key="block.id || idx">
        <td>
          <n-select
            size="small"
            :value="block.category"
            :options="categoryOptions"
            @update:value="(val) => handleCategoryChange(val, idx)"
          />
        </td>
        <td>
          <n-time-picker
            size="small"
            v-model:value="block.start"
            use-12-hours
            format="h:mm a"
            :minutes="5"
            @update:value="(val) => handleTimeChange(val, idx, 'start')"
          />
        </td>
        <td>
          <n-time-picker
            size="small"
            v-model:value="block.end"
            use-12-hours
            format="h:mm a"
            :minutes="5"
            @update:value="
              (val) => {
                handleTimeChange(val, idx, 'end');
                onEndTimeChange(idx);
              }
            "
          />
        </td>
      </tr>
    </tbody>
  </table>
  <div class="editor-botton-container">
    <n-button
      round
      secondary
      type="success"
      :disabled="!canAddBlock"
      @click="addBlock"
      title="新增最后一行"
      >Add</n-button
    >
    <n-button
      round
      secondary
      type="error"
      :disabled="Blocks.length === 0"
      @click="deleteLastBlock"
      title="删除最后一行"
      >Delete</n-button
    >
  </div>
  <span v-if="!canAddBlock" style="margin-left: 8px; color: #999">
    24小时添加完毕
  </span>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { NSelect, NTimePicker, NButton } from "naive-ui";
import { getEndOfDayTimestamp, getTimestampForTimeString } from "@/core/utils";
import type { Block } from "@/core/types/Block";
import { CategoryColors, STORAGE_KEYS } from "@/core/constants";

// ----- 常量和选项配置 -------
const labelMap = { sleeping: "睡眠", living: "生活", working: "工作" };
type Category = keyof typeof CategoryColors;
const categories = Object.keys(CategoryColors) as Category[];
const categoryOptions = categories.map((c) => ({
  label: labelMap[c],
  value: c,
  color: CategoryColors[c],
}));

// ------ Props & Emits -------
const props = defineProps<{ blocks: Block[] }>();
const emit = defineEmits<{ (e: "update-blocks", val: Block[]): void }>();

// ------ 数据流 & 本地存储 -------
const Blocks = ref<Block[]>([]);
let hasLoadedFromLocal = false;

function loadFromLocal() {
  const saved = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
  if (!saved) return false;
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      Blocks.value = parsed;
      hasLoadedFromLocal = true;
      return true;
    }
  } catch (e) {
    console.warn("localStorage 取数据失败", e);
  }
  return false;
}

// 初始化（优先用本地存储）
loadFromLocal() || syncFromProps(props.blocks);

// 根据props.blocks同步（如果不是本地导入才会用）
function syncFromProps(arr: Block[]) {
  if (arr?.length) Blocks.value = arr.map((b) => ({ ...b }));
}

function syncToParentAndLocal() {
  emit(
    "update-blocks",
    Blocks.value.map((b) => ({ ...b }))
  );
  localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(Blocks.value));
}

// --------- Block 增删改查 --------
let maxId = 0;
function initMaxId() {
  maxId = Blocks.value.length
    ? Math.max(...Blocks.value.map((b) => Number(b.id)))
    : 0;
}
function generateId() {
  return (++maxId).toString();
}

function addBlock() {
  const prev = Blocks.value[Blocks.value.length - 1];
  if (prev && !canAddBlock.value) return;
  const start = prev ? prev.end : getTimestampForTimeString("00:00");
  const end = Math.min(getDayEndTimestamp(), start + 2 * 60 * 60 * 1000);
  Blocks.value.push({
    id: generateId(),
    category: categories[0],
    start,
    end,
  });
  syncToParentAndLocal();
}

function deleteLastBlock() {
  Blocks.value.pop();
  syncToParentAndLocal();
}

// 时间选择、分类选择
function handleTimeChange(
  val: number | null,
  idx: number,
  field: "start" | "end"
) {
  if (val == null) return;
  Blocks.value[idx][field] = val;
  syncToParentAndLocal();
}

function handleCategoryChange(val: Category, idx: number) {
  Blocks.value[idx].category = val;
  syncToParentAndLocal();
}

// 结束时间变更的窗口，带与下一块联动
function onEndTimeChange(idx: number) {
  const b = Blocks.value[idx],
    dayEnd = getDayEndTimestamp();

  if (b.end < b.start) b.end = b.start;
  if (b.end > dayEnd) b.end = dayEnd;

  if (Blocks.value[idx + 1]) {
    const next = Blocks.value[idx + 1];
    if (next.start !== b.end) next.start = b.end;
    if (next.end < b.end) next.end = b.end;
  }
  syncToParentAndLocal();
}

// ------- 业务辅助 -------
function getDayEndTimestamp() {
  return Blocks.value.length
    ? getEndOfDayTimestamp(Blocks.value[Blocks.value.length - 1].start)
    : getEndOfDayTimestamp(Date.now());
}
const canAddBlock = computed(
  () =>
    !Blocks.value.length ||
    Blocks.value[Blocks.value.length - 1].end < getDayEndTimestamp()
);

// -------- 副作用 watch --------
watch(
  () => props.blocks,
  (newBlocks) => {
    if (!hasLoadedFromLocal && newBlocks?.length) {
      syncFromProps(newBlocks);
      initMaxId();
    }
  },
  { immediate: true }
);

watch(
  Blocks,
  () => {
    initMaxId();
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
.compact-table {
  width: 100%;
  border-collapse: collapse;
}
.compact-table th,
.compact-table td {
  text-align: center;
  border: 1px solid #ddd;
  padding: 0px 0px;
  font-size: 13px;
  vertical-align: middle;
  width: 60px;
  height: 20px;
}
.editor-botton-container {
  width: 100%;
  margin: auto;
  text-align: center;
  align-items: center;
  display: flex;
  justify-content: center;
  padding-top: 10px;
}
</style>
