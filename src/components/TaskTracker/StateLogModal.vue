<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="状态快记"
    class="mobile-dialog-top"
    :on-after-leave="handleCancel"
    @keyup.enter="handleModalEnterKeyup"
    @after-enter="focusEnergySlider"
  >
    <n-space vertical>
      <div class="state-log-slider-grid">
        <div>
          <div class="state-log-slider-label">⚡精力值：{{ energyValue }}</div>
          <n-slider ref="energySliderRef" v-model:value="energyValue" :min="1" :max="10" :step="1" />
        </div>
        <div>
          <div class="state-log-slider-label">🏵️愉悦值：{{ rewardValue }}</div>
          <n-slider v-model:value="rewardValue" :min="1" :max="10" :step="1" />
        </div>
      </div>

      <div class="state-log-tag-slots">
        <div v-for="slot in [0, 1]" :key="slot" class="state-log-tag-slot-row">
          <n-checkbox :checked="isSlotChecked(slot)" @update:checked="(v) => setSlotChecked(slot, v)" />
          <TagPickerPopover
            v-model:show="slotPickerVisible[slot]"
            v-model:searchTerm="slotSearchTerms[slot]"
            input-mode="internal"
            :allow-create="true"
            @select-tag="(tagId) => handleSelectSlotTag(slot, tagId)"
            @create-tag="(name) => handleCreateSlotTag(slot, name)"
          >
            <template #trigger>
              <n-button size="small" secondary class="state-log-tag-slot-button" @click="handleOpenSlotPicker(slot)">
                <span class="state-log-tag-slot-label">{{ getSlotLabel(slot) }}</span>
              </n-button>
            </template>
          </TagPickerPopover>
          <n-button size="small" text :disabled="stateLogTagSlotIds[slot] == null" @click="clearSlotTag(slot)">
            <template #icon>
              <n-icon><Dismiss24Regular /></n-icon>
            </template>
          </n-button>
        </div>
      </div>

      <n-date-picker v-model:value="recordedAt" type="datetime" size="large" class="state-log-input" />
      <n-input v-model:value="title" placeholder="状态描述" maxlength="60" show-count size="large" class="state-log-input" />
    </n-space>
    <template #action>
      <n-button type="primary" @click="handleConfirm">确认</n-button>
      <n-button @click="handleCancel">取消</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { NButton, NCheckbox, NDatePicker, NInput, NModal, NSlider, NSpace } from "naive-ui";
import { flushPickerValueToVue, pickRecordedAtMs, isEventFromDateTimePickerDeep } from "@/utils/recordedAtPick";
import TagPickerPopover from "@/components/TagSystem/TagPickerPopover.vue";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { Dismiss24Regular } from "@vicons/fluent";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "confirm", value: { energyValue: number; rewardValue: number; title?: string; recordedAt: number }): void;
}>();

const dataStore = useDataStore();
const tagStore = useTagStore();

const energyValue = ref(6);
const rewardValue = ref(6);
const title = ref("");
const recordedAt = ref<number | null>(Date.now());
const slotPickerVisible = ref<boolean[]>([false, false]);
const slotSearchTerms = ref<string[]>(["", ""]);
const energySliderRef = ref<any>(null);

const showModal = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const stateLogTagSlotIds = computed<Array<number | null>>({
  get: () => [dataStore.stateLogTagSlotIds?.[0] ?? null, dataStore.stateLogTagSlotIds?.[1] ?? null],
  set: (value) => {
    dataStore.stateLogTagSlotIds = [value[0] ?? null, value[1] ?? null];
  },
});

watch(
  () => props.show,
  (open) => {
    if (!open) return;
    energyValue.value = 6;
    rewardValue.value = 6;
    title.value = "";
    recordedAt.value = Date.now();
    slotSearchTerms.value = ["", ""];
  },
);

async function focusEnergySlider() {
  await nextTick();
  if (energySliderRef.value?.focus) {
    energySliderRef.value.focus();
    return;
  }
  const el: HTMLElement | null = energySliderRef.value?.$el ?? energySliderRef.value;
  el?.querySelector<HTMLElement>('[tabindex], input, button, [role="slider"]')?.focus();
}

function getSlotLabel(slot: number): string {
  const tagId = stateLogTagSlotIds.value[slot];
  if (tagId == null) return `标签 ${slot + 1}`;
  return tagStore.getTag(tagId)?.name ?? `标签#${tagId}`;
}

function handleSelectSlotTag(slot: number, tagId: number) {
  const next = [...stateLogTagSlotIds.value];
  next[slot] = tagId;
  stateLogTagSlotIds.value = next;
  slotPickerVisible.value[slot] = false;
}

function handleCreateSlotTag(slot: number, name: string) {
  const newTag = tagStore.addTag(name, "#1f2937", "#dbeafe");
  handleSelectSlotTag(slot, newTag.id);
}

function handleOpenSlotPicker(slot: number) {
  // 关闭另一个槽位，避免两个选择器同时展开
  slotPickerVisible.value = [false, false];
  slotPickerVisible.value[slot] = true;
}

function clearSlotTag(slot: number) {
  const next = [...stateLogTagSlotIds.value];
  next[slot] = null;
  stateLogTagSlotIds.value = next;
}

function isSlotChecked(slot: number): boolean {
  const key = slot + 1;
  return dataStore.stateLogTagSlotChecks?.[key] === true;
}

function setSlotChecked(slot: number, checked: boolean) {
  const key = slot + 1;
  dataStore.stateLogTagSlotChecks = {
    ...(dataStore.stateLogTagSlotChecks ?? {}),
    [key]: checked,
  };
}

function handleModalEnterKeyup(e: KeyboardEvent) {
  if (isEventFromDateTimePickerDeep(e.target)) return;
  void handleConfirm();
}

const handleConfirm = async () => {
  await flushPickerValueToVue();
  emit("confirm", {
    energyValue: energyValue.value,
    rewardValue: rewardValue.value,
    title: title.value.trim(),
    recordedAt: pickRecordedAtMs(recordedAt.value),
  });
  emit("update:show", false);
};

const handleCancel = () => {
  emit("update:show", false);
};
</script>

<style scoped>
.state-log-slider-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.state-log-slider-label {
  font-size: 16px;
  margin-top: 8px;
}

.state-log-tag-slots {
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.state-log-tag-slot-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1 1 0;
  min-width: 0;
  margin: 8px 0px;
}

.state-log-tag-slot-button {
  width: 100%;
  min-width: 0;
  justify-content: flex-start;
}

.state-log-tag-slot-label {
  display: inline-block;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.state-log-input {
  margin: 0px 0px 4px 0px;
}
</style>
