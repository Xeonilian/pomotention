<template>
  <div class="editor-wrap">
    <!-- 上：切换类型、退出编辑 -->
    <div class="editor-top-bar">
      <n-button
        secondary
        circle
        type="info"
        size="small"
        :title="props.currentType === 'work' ? '切换到娱乐时间表' : '切换到工作时间表'"
        @click="emit('toggle-type')"
      >
        <template #icon>
          <n-icon>
            <Backpack24Regular v-if="props.currentType === 'work'" />
            <Beach24Regular v-else />
          </n-icon>
        </template>
      </n-button>
      <n-button secondary circle type="default" size="small" title="完成编辑" @click="emit('exit')">
        <template #icon>
          <n-icon><Dismiss24Regular /></n-icon>
        </template>
      </n-button>
    </div>
    <!-- 表格：可滚动，不拉伸高度 -->
    <div class="editor-table-scroll">
      <table class="compact-table">
        <thead>
          <tr>
            <th style="width: 45px">分类</th>
            <th style="width: 60px">开始</th>
            <th style="width: 60px">结束</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(block, _idx) in currentBlocks" :key="block.id">
            <td style="width: 54px">
              <n-select
                size="small"
                :value="block.category"
                :options="categoryOptions"
                @update:value="(val) => handleCategoryChange(val, block.id)"
                :show-arrow="true"
              />
            </td>
            <td style="width: 80px">
              <n-time-picker
                size="small"
                :value="getTimestampForTimeString(block.start, systemDate)"
                :show-icon="false"
                format="HH:mm"
                @update:value="(val) => handleTimeChange(val, block.id, 'start')"
              />
            </td>
            <td style="width: 80px">
              <n-time-picker
                size="small"
                :value="getTimestampForTimeString(block.end, systemDate)"
                format="HH:mm"
                :show-icon="false"
                @update:value="(val) => handleTimeChange(val, block.id, 'end')"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- 下：复位、新增、删除 -->
    <div class="editor-bottom-bar">
      <n-popconfirm @positive-click="handleReset" negative-text="取消" positive-text="确定">
        <template #trigger>
          <n-button secondary circle size="small" type="default" title="复位为默认时间表">
            <template #icon>
              <n-icon><ArrowReset48Filled /></n-icon>
            </template>
          </n-button>
        </template>
        <span>确定要将当前时间表复位为默认吗？</span>
      </n-popconfirm>
      <n-button circle secondary type="success" size="small" :disabled="!canAddBlock" @click="addBlock" title="新增最后一行">
        <template #icon>
          <n-icon><AddCircle24Regular /></n-icon>
        </template>
      </n-button>
      <n-button
        circle
        secondary
        type="error"
        size="small"
        :disabled="currentBlocks.length === 0"
        @click="deleteLastBlock"
        title="删除最后一行"
      >
        <template #icon>
          <n-icon><Delete24Regular /></n-icon>
        </template>
      </n-button>
    </div>
    <span v-if="!canAddBlock" class="editor-hint">24小时添加完毕</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { NSelect, NTimePicker, NButton, NIcon, NPopconfirm } from "naive-ui";
import { getTimestampForTimeString, timestampToTimeString } from "@/core/utils";
import { useTimetableStore } from "@/stores/useTimetableStore";
import { CategoryColors } from "@/core/constants";
import {
  AddCircle24Regular,
  Delete24Regular,
  ArrowReset48Filled,
  Backpack24Regular,
  Beach24Regular,
  Dismiss24Regular,
} from "@vicons/fluent";
const labelMap = { sleeping: "睡眠", living: "生活", working: "工作" };
type Category = keyof typeof CategoryColors;
const categories = Object.keys(CategoryColors) as Category[];
const categoryOptions = categories.map((c) => ({
  label: labelMap[c],
  value: c,
  color: CategoryColors[c],
}));

const props = defineProps<{
  currentType: "work" | "entertainment";
}>();

const emit = defineEmits<{
  exit: [];
  "toggle-type": [];
}>();

const timetableStore = useTimetableStore();
const { allWorkBlocks, allEntertainmentBlocks } = storeToRefs(timetableStore);

const systemDate = Date.now();

const currentBlocks = computed(() => {
  return props.currentType === "work" ? allWorkBlocks.value : allEntertainmentBlocks.value;
});

function addMinutesToTime(str: string, add: number) {
  const timestamp = getTimestampForTimeString(str, systemDate) + add * 60 * 1000;
  const max = getTimestampForTimeString("24:00", systemDate);
  return timestampToTimeString(Math.min(timestamp, max));
}

function addBlock() {
  const blocks = currentBlocks.value;
  const prev = blocks[blocks.length - 1];
  if (prev && !canAddBlock.value) return;

  const start = prev ? prev.end : "00:00";
  let end: string;

  if (getTimestampForTimeString(start, systemDate) >= getTimestampForTimeString("22:00", systemDate)) {
    end = "24:00";
  } else {
    end = addMinutesToTime(start, 120);
    if (getTimestampForTimeString(end, systemDate) >= getTimestampForTimeString("22:00", systemDate)) {
      end = "24:00";
    }
  }

  timetableStore.addBlock(props.currentType, categories[0], start, end);
}

function deleteLastBlock() {
  const blocks = currentBlocks.value;
  if (blocks.length === 0) return;
  const lastBlock = blocks[blocks.length - 1];
  timetableStore.removeBlock(lastBlock.id);
}

function handleReset() {
  timetableStore.resetToDefaults(props.currentType);
}

function handleTimeChange(val: number | null, id: number, field: "start" | "end") {
  if (val == null) return;
  const timeStr = timestampToTimeString(val);
  timetableStore.updateBlock(id, { [field]: timeStr });

  // 处理联动
  const blocks = currentBlocks.value;
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx === -1) return;

  if (field === "end") {
    onEndTimeChange(idx);
  } else {
    onStartTimeChange(idx);
  }
}

function handleCategoryChange(val: Category, id: number) {
  timetableStore.updateBlock(id, { category: val });
}

function onEndTimeChange(idx: number) {
  const blocks = currentBlocks.value;
  const b = blocks[idx];
  const dayEnd = "24:00";

  // 修正当前块
  if (b.end < b.start) {
    timetableStore.updateBlock(b.id, { end: b.start });
  }
  if (b.end > dayEnd) {
    timetableStore.updateBlock(b.id, { end: dayEnd });
  }

  // 联动后续块
  for (let i = idx + 1; i < blocks.length; ++i) {
    const prev = blocks[i - 1];
    const curr = blocks[i];
    if (curr.start !== prev.end) {
      timetableStore.updateBlock(curr.id, { start: prev.end });
    }
    if (curr.end < curr.start) {
      timetableStore.updateBlock(curr.id, { end: curr.start });
    }
  }
}

function onStartTimeChange(idx: number) {
  if (idx === 0) return;
  const blocks = currentBlocks.value;
  const curr = blocks[idx];
  const prev = blocks[idx - 1];

  if (curr.start < prev.start) {
    timetableStore.updateBlock(curr.id, { start: prev.start });
  }
  if (prev.end !== curr.start) {
    timetableStore.updateBlock(prev.id, { end: curr.start });
  }
}

const canAddBlock = computed(() => {
  const blocks = currentBlocks.value;
  return (
    !blocks.length || getTimestampForTimeString(blocks[blocks.length - 1].end, systemDate) < getTimestampForTimeString("24:00", systemDate)
  );
});
</script>

<style scoped>
.editor-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.editor-top-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  padding: 6px 0;
}

/* 表格区域贴表格高度，可滚动；按钮紧贴表格下缘 */
.editor-table-scroll {
  flex: 0 0 auto;
  max-height: min(60vh, 400px);
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.compact-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
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

.editor-bottom-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  padding: 10px 0;
}

.editor-hint {
  flex-shrink: 0;
  color: #999;
  font-size: 12px;
  margin: 0 auto;
}
</style>
