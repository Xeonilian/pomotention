<template>
  <span class="timer-tag-filter__trigger">
    <span v-if="filterTagIds.length > 0" class="timer-tag-filter__chips-wrap" @click.stop @pointerdown.stop>
      <TagRenderer
        class="timer-tag-filter__chips"
        :tag-ids="filterTagIds"
        size="tiny"
        @remove-tag="sessionStore.toggleStatsFilterTagId"
      />
    </span>
    <TagPickerPopover
      v-model:show="showPopover"
      v-model:search-term="searchTerm"
      input-mode="internal"
      placement="bottom"
      :allow-create="false"
      :popover-style="{ '--n-padding': '0px' }"
      @select-tag="onSelectTag"
    >
      <template #trigger>
        <n-button
          size="small"
          text
          :type="filterTagIds.length > 0 ? 'info' : 'default'"
          :title="filterTagIds.length > 0 ? '清除全部标签筛选' : '按标签筛选'"
          @click.stop="onTriggerClick"
        >
          <template #icon>
            <n-icon>
              <TagReset20Filled v-if="filterTagIds.length > 0" />
              <TagSearch20Regular v-else />
            </n-icon>
          </template>
        </n-button>
      </template>
    </TagPickerPopover>
  </span>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { NButton, NIcon } from "naive-ui";
import { TagReset20Filled, TagSearch20Regular } from "@vicons/fluent";
import { useTimerSessionStore } from "@/stores/useTimerSessionStore";
import TagPickerPopover from "@/components/TagSystem/TagPickerPopover.vue";
import TagRenderer from "@/components/TagSystem/TagRenderer.vue";

const sessionStore = useTimerSessionStore();
const { statsFilterTagIds: filterTagIds } = storeToRefs(sessionStore);

const showPopover = ref(false);
const searchTerm = ref("");

function onTriggerClick() {
  if (filterTagIds.value.length > 0) {
    sessionStore.clearStatsFilterTags();
    showPopover.value = false;
    return;
  }
  searchTerm.value = "";
  showPopover.value = true;
}

function onSelectTag(tagId: number) {
  sessionStore.toggleStatsFilterTagId(tagId);
  showPopover.value = false;
}
</script>

<style scoped>
.timer-tag-filter__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
}

.timer-tag-filter__chips-wrap {
  min-width: 0;
  max-width: min(200px, 50vw);
  overflow: visible;
}

.timer-tag-filter__chips {
  min-width: 0;
}
</style>
