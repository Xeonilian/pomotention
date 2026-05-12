<template>
  <div class="setting-tab-page">
    <n-card size="small" class="setting-tab-card">
      <div class="shortcut-toolbar">
        <n-input v-model:value="keyword" clearable placeholder="搜索组合 / 功能 / 说明，例如 app、activity.pick、选择活动" />
        <n-tag size="small" round class="shortcut-count" type="info">{{ filteredCount }} / {{ allCount }}</n-tag>
      </div>
      <div class="shortcut-table-wrap">
        <n-collapse :default-expanded-names="defaultExpandedNames">
          <n-collapse-item v-for="group in filteredGroups" :key="group.key" :name="group.key" :title="group.title">
            <table class="setting-table shortcut-table">
              <colgroup>
                <col class="shortcut-col-sequence" />
                <col class="shortcut-col-feature" />
                <col class="shortcut-col-note" />
              </colgroup>
              <thead>
                <tr>
                  <th>快捷键</th>
                  <th>功能</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in group.rows" :key="`${row.sequence}-${row.feature}`">
                  <td>
                    <code>{{ row.sequence }}</code>
                  </td>
                  <td class="shortcut-feature-cell">
                    <code>{{ row.feature }}</code>
                  </td>
                  <td>{{ row.note }}</td>
                </tr>
              </tbody>
            </table>
          </n-collapse-item>
        </n-collapse>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { ShortcutCategory } from "@/composables/keyboard/shortcutCatalog";
import { SHORTCUT_DEFINITIONS } from "@/composables/keyboard/shortcutCatalog";

type ShortcutDisplayRow = {
  sequence: string;
  category: ShortcutCategory;
  feature: string;
  note: string;
};
type ShortcutGroup = {
  key: ShortcutCategory;
  title: string;
  rows: ShortcutDisplayRow[];
};

const keyword = ref("");

const categoryMeta: Record<ShortcutCategory, string> = {
  navigation: "导航与面板",
  activity: "活动（Activity）",
  task: "Task",
  planner: "Planner",
  timetable: "Timetable",
  timer: "Timer",
};

const allRows = computed<ShortcutDisplayRow[]>(() => {
  const base = SHORTCUT_DEFINITIONS.map<ShortcutDisplayRow>((item) => {
    if (item.category === "activity" && item.sequence === "app") {
      return {
        sequence: "app",
        category: item.category,
        feature: "activity.picker.select",
        note: "选择活动",
      };
    }
    const detail = item.action ? `${item.action}：${item.note}` : item.note;
    return {
      sequence: item.sequence,
      category: item.category,
      feature: String(item.actionId),
      note: detail,
    };
  });
  base.push({
    sequence: "Esc",
    category: "navigation",
    feature: "app.input.escape",
    note: "输入框内：退出输入编辑；保留当前选中状态，不清空选择",
  });
  return base;
});

const groupedRows = computed<ShortcutGroup[]>(() => {
  const order: ShortcutCategory[] = ["navigation", "activity", "task", "planner", "timetable", "timer"];
  return order
    .map((key) => ({
      key,
      title: categoryMeta[key],
      rows: allRows.value.filter((row) => row.category === key),
    }))
    .filter((group) => group.rows.length > 0);
});

const filteredGroups = computed<ShortcutGroup[]>(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return groupedRows.value;
  return groupedRows.value
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        (row) =>
          row.sequence.toLowerCase().includes(q) ||
          row.note.toLowerCase().includes(q) ||
          row.feature.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q),
      ),
    }))
    .filter((group) => group.rows.length > 0);
});

const allCount = computed(() => allRows.value.length);
const filteredCount = computed(() => filteredGroups.value.reduce((acc, group) => acc + group.rows.length, 0));
const defaultExpandedNames = computed(() => groupedRows.value.map((group) => group.key));
</script>

<style scoped>
.shortcut-toolbar {
  display: flex;
  margin-bottom: 8px;
  gap: 8px;
}

.shortcut-count {
  margin: auto 0;
}

.shortcut-table-wrap {
  max-height: var(--setting-shortcut-wrap-max-height);
  overflow-x: auto;
  overflow-y: auto;
  padding-bottom: 2px;
}

.setting-table code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.shortcut-table {
  table-layout: fixed;
}

.shortcut-col-sequence {
  width: 65px;
}

.shortcut-col-feature {
  width: 220px;
}

.shortcut-col-note {
  width: auto;
}

.shortcut-feature-cell {
  word-break: break-all;
}
</style>

<style scoped src="./settingShared.css"></style>
