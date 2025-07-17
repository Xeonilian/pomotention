<template>
  <div class="tag-manager">
    <div class="tag-search">
      <n-input
        v-model:value="inputText"
        placeholder="搜索或新建标签"
        @input="onInput"
        @keydown.enter="onAddOrSelect"
        size="medium"
        clearable
        style="width: 100%"
      >
        <template #prefix>
          <n-icon color="var(--color-text)">
            <TagSearch20Filled />
          </n-icon>
        </template>
      </n-input>
      <n-button
        type="default"
        secondary
        :disabled="!inputText.trim()"
        @click="onAddOrSelect"
      >
        <n-icon size="18px"> <Add20Filled /></n-icon>
      </n-button>
    </div>
    <div class="tag-suggestions">
      <template v-for="t in filteredTags" :key="t.id">
        <div
          class="custom-tag"
          :class="{ selected: isTagSelected(t.id) }"
          :style="{
            color: t.color,
            backgroundColor: t.backgroundColor,
          }"
        >
          <span
            v-if="editingId !== t.id"
            @dblclick="startEdit(t)"
            @click="onClickTag(t)"
            style="
              max-width: 110px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            "
          >
            {{ t.name }}
          </span>
          <n-input
            v-else
            v-model:value="editValue"
            size="tiny"
            :style="{
              width: editInputWidth(t) + 'px',
              minWidth: '30px',
              transition: 'width 0.2s',
            }"
            ref="editInputRef"
            autofocus
            @blur="onEditFinish(t)"
            @input="onEditInput"
            @keydown.enter.prevent="onEditFinish(t)"
          />
          <n-button text @click="onPickColor(t)" :color="t.color">
            <n-icon><Heart16Filled /></n-icon>
          </n-button>
          <n-button text @click="onPickBgColor(t)">
            <n-icon><HeartCircle16Regular /></n-icon>
          </n-button>
          <n-button text @click="removeTag(t.id)">
            <n-icon><TagDismiss16Regular /></n-icon>
          </n-button>
          <span>{{ t.count }}</span>
        </div>
      </template>
      <!-- 补满 10 行的透明占位符，保证固定高度不跑位 -->
      <div
        v-for="idx in emptyCount"
        :key="'empty-tag-' + idx"
        class="custom-tag empty-tag"
        style="opacity: 0; pointer-events: none"
      >
        -
      </div>
    </div>
    <!-- 颜色选择弹窗 -->
    <n-modal
      v-model:show="colorPicker.visible"
      @after-leave="onColorPickerClose"
      @mask-click="onColorPickerClose"
      :close-on-esc="true"
    >
      <n-card style="width: 220px" @click.stop>
        <n-color-picker
          v-model:value="colorPicker.color"
          :show-alpha="false"
          style="margin: 20px 0"
        />
      </n-card>
    </n-modal>
    <!-- 用于测量 input 宽度 -->
    <span
      ref="sizerRef"
      class="input-sizer"
      style="
        position: absolute;
        visibility: hidden;
        white-space: pre;
        font-size: 13px;
        font-family: inherit;
        font-weight: 500;
        padding: 0 7px;
      "
      >{{ editValue || editingTagName }}</span
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useTagStore } from "@/stores/useTagStore";
import {
  TagSearch20Filled,
  Add20Filled,
  HeartCircle16Regular,
  Heart16Filled,
  TagDismiss16Regular,
} from "@vicons/fluent";
import { NInput, NButton, NModal, NCard, NColorPicker, NIcon } from "naive-ui";
import { Tag } from "@/core/types/Tag";

const { allTags, addTag, updateTag, removeTag, findByName } = useTagStore();

const inputText = ref("");
const editingId = ref<number | null>(null);
const editValue = ref("");
const editingTagName = ref(""); // 防止 editValue 清空后无法回显
const colorPicker = ref<{
  visible: boolean;
  tagId: number | null;
  target: "bg" | "fg" | null;
  color: string;
  originalColor: string; // 保存原始颜色，用于取消时恢复
}>({
  visible: false,
  tagId: null,
  target: null,
  color: "",
  originalColor: "",
});

const props = defineProps<{
  modelValue: number[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: number[]];
}>();

// 计算tag排序，搜索时全部，否则只显示count前10
const filteredTags = computed(() => {
  if (inputText.value.trim()) {
    return findByName(inputText.value);
  }
  return [...allTags.value]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10);
});

// 空位数量补满10
const emptyCount = computed(() => Math.max(0, 10 - filteredTags.value.length));

// 判断标签是否已选中
function isTagSelected(tagId: number): boolean {
  return props.modelValue.includes(tagId);
}

function startEdit(tag: Tag) {
  editingId.value = tag.id;
  editValue.value = tag.name;
  editingTagName.value = tag.name;
  updateInputWidth();
  nextTick(() => {
    updateInputWidth();
  });
}

function onClickTag(tag: Tag) {
  const currentTagIds = [...props.modelValue];
  const index = currentTagIds.indexOf(tag.id);

  if (index > -1) {
    currentTagIds.splice(index, 1);
  } else {
    currentTagIds.push(tag.id);
  }

  emit("update:modelValue", currentTagIds);
}

function onEditInput() {
  updateInputWidth();
}

function onInput(val: string) {
  inputText.value = val;
}

function onAddOrSelect() {
  let input = inputText.value.trim().replace(/^#+/, "");
  if (!input) return;
  const exist = filteredTags.value.find(
    (t) => t.name.toLowerCase() === input.toLowerCase()
  );
  if (exist) {
    // 如果存在，直接选中该标签
    onClickTag(exist);
    inputText.value = "";
    return;
  }
  // 如果不存在，创建新标签并选中
  const newTag = addTag(input, "#333", "#eee");
  if (newTag) {
    const currentTagIds = [...props.modelValue];
    if (!currentTagIds.includes(newTag.id)) {
      currentTagIds.push(newTag.id);
      emit("update:modelValue", currentTagIds);
    }
  }
  inputText.value = "";
}

function onEditFinish(tag: Tag) {
  let newVal = editValue.value.trim().replace(/^#+/, "");
  if (newVal && newVal !== tag.name) {
    updateTag(tag.id, { name: newVal });
  }
  editingId.value = null;
  editValue.value = "";
  editingTagName.value = "";
}

// 颜色选择器关闭时保存（点击非面板区域或按ESC）
function onColorPickerClose() {
  if (!colorPicker.value.tagId) return;

  const val = colorPicker.value.color;

  if (colorPicker.value.target === "bg") {
    updateTag(colorPicker.value.tagId, { backgroundColor: val });
  }
  if (colorPicker.value.target === "fg") {
    updateTag(colorPicker.value.tagId, { color: val });
  }

  // 重置状态
  colorPicker.value.tagId = null;
  colorPicker.value.target = null;
  colorPicker.value.color = "";
  colorPicker.value.originalColor = "";
}

function onPickBgColor(tag: Tag) {
  colorPicker.value.visible = true;
  colorPicker.value.tagId = tag.id;
  colorPicker.value.target = "bg";
  colorPicker.value.color = tag.backgroundColor;
  colorPicker.value.originalColor = tag.backgroundColor;
}

function onPickColor(tag: Tag) {
  colorPicker.value.visible = true;
  colorPicker.value.tagId = tag.id;
  colorPicker.value.target = "fg";
  colorPicker.value.color = tag.color;
  colorPicker.value.originalColor = tag.color;
}

// --- input 宽自适应相关 ---
const sizerRef = ref<HTMLElement | null>(null);
function editInputWidth(t?: Tag) {
  if (editingId.value === t?.id && sizerRef.value) {
    return Math.max(32, sizerRef.value.offsetWidth);
  }
  return 40;
}

function updateInputWidth() {
  nextTick(() => {
    // 强制触发dom更新
  });
}
</script>

<style scoped>
.tag-manager {
  width: 400px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
}

.tag-search {
  display: flex;
  gap: 6px;
  width: 370px;
}

.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  width: 380px;
  overflow-y: auto;
}

.custom-tag {
  display: flex;
  align-items: center;
  border-radius: 16px;
  padding: 0 10px;
  height: 32px;
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 1px 3px #0001;
  cursor: pointer;
  min-width: 80px;
}

.custom-tag.hover {
  box-shadow: 0 1px 3px blue !important;
}

.empty-tag {
  background: transparent !important;
  box-shadow: none !important;
}

.custom-tag span {
  padding: 0 4px;
  user-select: none;
}

.input-sizer {
  pointer-events: none;
}
</style>
