<!-- LifeRecordForm.vue -->
<!-- 生活记录分流：日视图 → *DayPanel；窄槽 → *Compact。喝水日面板与 DrinkSipTag 为完成态。 -->
<template>
  <div class="life-record-route">
    <DrinkDayPanel v-if="isDayView && kind === 'drink'" :task-id="taskId" />
    <EatDayPanel v-else-if="isDayView && kind === 'eat'" :task-id="taskId" />
    <ToiletDayPanel v-else-if="isDayView && kind === 'toilet'" :task-id="taskId" />
    <SleepDayPanel v-else-if="isDayView && kind === 'sleep'" :task-id="taskId" />
    <DrinkCompact v-else-if="kind === 'drink'" :task-id="taskId" />
    <EatCompact v-else-if="kind === 'eat'" :task-id="taskId" />
    <ToiletCompact v-else-if="kind === 'toilet'" :task-id="taskId" />
    <SleepCompact v-else-if="kind === 'sleep'" :task-id="taskId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { LifeRecordKind } from "@/core/lifeRecord";
import { useSettingStore } from "@/stores/useSettingStore";
import DrinkDayPanel from "@/components/LifeRecord/DrinkDayPanel.vue";
import EatDayPanel from "@/components/LifeRecord/EatDayPanel.vue";
import ToiletDayPanel from "@/components/LifeRecord/ToiletDayPanel.vue";
import SleepDayPanel from "@/components/LifeRecord/SleepDayPanel.vue";
import DrinkCompact from "@/components/LifeRecord/DrinkCompact.vue";
import EatCompact from "@/components/LifeRecord/EatCompact.vue";
import ToiletCompact from "@/components/LifeRecord/ToiletCompact.vue";
import SleepCompact from "@/components/LifeRecord/SleepCompact.vue";

defineProps<{ taskId: number; kind: LifeRecordKind }>();

const settingStore = useSettingStore();
const isDayView = computed(() => settingStore.settings.viewSet === "day");
</script>

<style scoped>
.life-record-route {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
}
.life-record-route > :deep(*) {
  flex: 1 1 0%;
  min-height: 0;
  min-width: 0;
}
</style>
