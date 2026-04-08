<template>
  <!-- 标签筛选：选中项用 TagRenderer；无筛选时点图标打开 TagPickerPopover -->
  <span class="home-tag-filter__trigger">
    <span v-if="filterTagIds.length > 0" class="home-tag-filter__chips-wrap" @click.stop @pointerdown.stop>
      <TagRenderer
        class="home-tag-filter__chips"
        :tag-ids="filterTagIds"
        :display-length="tagNameDisplayLength"
        size="tiny"
        @remove-tag="dataStore.toggleFilterTagId"
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
          :title="filterTagIds.length > 0 ? '清除全部标签筛选' : '标签筛选'"
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
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { TagReset20Filled, TagSearch20Regular } from "@vicons/fluent";
import { useDataStore } from "@/stores/useDataStore";
import { useDevice } from "@/composables/useDevice";
import TagPickerPopover from "@/components/TagSystem/TagPickerPopover.vue";
import TagRenderer from "@/components/TagSystem/TagRenderer.vue";

const dataStore = useDataStore();
const { filterTagIds } = storeToRefs(dataStore);
const { isMobile } = useDevice();

/** 手机：标签名最多 3 字；电脑：不截断 */
const tagNameDisplayLength = computed(() => (isMobile.value ? 3 : null));

const showPopover = ref(false);
const searchTerm = ref("");

function onTriggerClick() {
  if (filterTagIds.value.length > 0) {
    dataStore.clearFilterTags();
    showPopover.value = false;
    return;
  }
  searchTerm.value = "";
  showPopover.value = true;
}

function onSelectTag(tagId: number) {
  dataStore.toggleFilterTagId(tagId);
  showPopover.value = false;
}
</script>

<style scoped>
.home-tag-filter__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
}

.home-tag-filter__chips-wrap {
  min-width: 0;
  max-width: min(220px, 40vw);
  overflow: visible;
}

.home-tag-filter__chips {
  min-width: 0;
}
</style>
