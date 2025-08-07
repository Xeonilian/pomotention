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
        <th style="width: 45px">分类</th>
        <th style="width: 60px">开始</th>
        <th style="width: 60px">结束</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(block, idx) in Blocks" :key="block.id || idx">
        <td style="width: 54px">
          <n-select
            size="small"
            :value="block.category"
            :options="categoryOptions"
            @update:value="(val) => handleCategoryChange(val, idx)"
            :show-arrow="true"
          />
        </td>
        <td style="width: 80px">
          <n-time-picker
            size="small"
            :value="getTimestampForTimeString(block.start, systemDate)"
            :show-icon="false"
            format="HH:mm"
            @update:value="
              (val) => {
                handleTimeChange(val, idx, 'start');
                onStartTimeChange(idx);
              }
            "
          />
        </td>
        <td style="width: 80px">
          <n-time-picker
            size="small"
            :value="getTimestampForTimeString(block.end, systemDate)"
            format="HH:mm"
            :show-icon="false"
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
      circle
      secondary
      type="success"
      size="small"
      :disabled="!canAddBlock"
      @click="addBlock"
      title="新增最后一行"
    >
      <template #icon
        ><n-icon><AddCircle24Regular /></n-icon>
      </template>
    </n-button>
    <n-button
      circle
      secondary
      type="error"
      size="small"
      :disabled="Blocks.length === 0"
      @click="deleteLastBlock"
      title="删除最后一行"
    >
      <template #icon
        ><n-icon><Delete24Regular /></n-icon> </template
    ></n-button>
  </div>
  <span v-if="!canAddBlock" style="margin-left: 8px; color: #999">
    24小时添加完毕
  </span>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { NSelect, NTimePicker, NButton } from "naive-ui";
import { getTimestampForTimeString, timestampToTimeString } from "@/core/utils";
import type { Block } from "@/core/types/Block";
import { CategoryColors, STORAGE_KEYS } from "@/core/constants";
import { AddCircle24Regular, Delete24Regular } from "@vicons/fluent";

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
const props = defineProps<{
  blocks: Block[];
  currentType: "work" | "entertainment"; // 新增
}>();
const emit = defineEmits<{ (e: "update-blocks", val: Block[]): void }>();

// ------ 数据流 & 本地存储 -------
const Blocks = ref<Block[]>([]);
let hasLoadedFromLocal = false;

const systemDate = Date.now();

function loadFromLocal() {
  // 使用类型特定的存储键
  const storageKey =
    props.currentType === "work"
      ? STORAGE_KEYS.TIMETABLE_WORK
      : STORAGE_KEYS.TIMETABLE_ENTERTAINMENT;
  const saved = localStorage.getItem(storageKey);
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
  const storageKey =
    props.currentType === "work"
      ? STORAGE_KEYS.TIMETABLE_WORK
      : STORAGE_KEYS.TIMETABLE_ENTERTAINMENT;
  localStorage.setItem(storageKey, JSON.stringify(Blocks.value));
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

function addMinutesToTime(str: string, add: number) {
  const timestamp =
    getTimestampForTimeString(str, systemDate) + add * 60 * 1000;
  // 限制不超过 24:00
  const max = getTimestampForTimeString("24:00", systemDate);
  return timestampToTimeString(Math.min(timestamp, max));
}

function addBlock() {
  const prev = Blocks.value[Blocks.value.length - 1];
  if (prev && !canAddBlock.value) return;

  const start = prev ? prev.end : "00:00";
  let end;

  // 如果开始时间在22:00之后，直接设置为24:00
  if (
    getTimestampForTimeString(start, systemDate) >=
    getTimestampForTimeString("22:00", systemDate)
  ) {
    end = "24:00";
  } else {
    end = addMinutesToTime(start, 120); // +2小时
    // 如果加2小时后超过22:00，也直接设置为24:00
    if (
      getTimestampForTimeString(end, systemDate) >=
      getTimestampForTimeString("22:00", systemDate)
    ) {
      end = "24:00";
    }
  }

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
  Blocks.value[idx][field] = timestampToTimeString(val);
  syncToParentAndLocal();
}

function handleCategoryChange(val: Category, idx: number) {
  Blocks.value[idx].category = val;
  syncToParentAndLocal();
}

// 结束时间变更的窗口，带与下一块联动
function onEndTimeChange(idx: number) {
  const b = Blocks.value[idx],
    dayEnd = "24:00";

  // 保持自身合法
  if (b.end < b.start) b.end = b.start;
  if (b.end > dayEnd) b.end = dayEnd;

  // 依次调整所有后续块
  for (let i = idx + 1; i < Blocks.value.length; ++i) {
    const prev = Blocks.value[i - 1];
    const curr = Blocks.value[i];
    if (curr.start !== prev.end) curr.start = prev.end;
    if (curr.end < curr.start) curr.end = curr.start;
    // 如需阻止超日末，也可加判断
  }

  syncToParentAndLocal();
}
// 开始时间变更的窗口，带与上一块联动
function onStartTimeChange(idx: number) {
  if (idx === 0) return; // 第一行前面没块
  const curr = Blocks.value[idx];
  const prev = Blocks.value[idx - 1];
  if (curr.start < prev.start) {
    curr.start = prev.start; // 不允许重叠
  }
  if (prev.end !== curr.start) {
    prev.end = curr.start;
  }
  syncToParentAndLocal();
}

// ------- 业务辅助 -------

const canAddBlock = computed(
  () =>
    !Blocks.value.length ||
    getTimestampForTimeString(
      Blocks.value[Blocks.value.length - 1].end,
      systemDate
    ) < getTimestampForTimeString("24:00", systemDate)
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

// 添加一个新的 watch 专门监听数据重置
watch(
  () => props.blocks,
  (newBlocks, oldBlocks) => {
    // 检测是否为重置操作（数据发生显著变化）
    if (
      newBlocks?.length &&
      (!oldBlocks?.length ||
        JSON.stringify(newBlocks) !== JSON.stringify(oldBlocks))
    ) {
      console.log(
        "检测到 blocks 数据重大变化，可能是reset操作，强制更新编辑器"
      );
      syncFromProps(newBlocks);
      initMaxId();
    }
  },
  { deep: true } // 深度监听以检测内容变化
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
  padding: 0px;
  font-size: 13px;
  vertical-align: middle;
  width: 60px;
  height: 20px;
}

:deep(.n-input-wrapper) {
  padding: 0 !important;
}

.editor-botton-container {
  display: flex;
  justify-content: center;
  gap: 16px;
  width: 100%;
  margin: 10px;
}
</style>
