<template>
  <div class="setting-subpage">
    <n-card size="small">
      <div class="shortcut-toolbar">
        <n-input v-model:value="keyword" clearable placeholder="搜索组合 / 动作 / 说明，例如 ptd、番茄、Planner" />
        <n-tag size="small" round class="shortcut-count" type="info">{{ filteredCount }} / {{ allCount }}</n-tag>
      </div>
      <div class="shortcut-table-wrap">
        <n-collapse :default-expanded-names="defaultExpandedNames">
          <n-collapse-item v-for="group in filteredGroups" :key="group.key" :name="group.key" :title="group.title">
            <table class="shortcut-table">
              <thead>
                <tr>
                  <th>组合</th>
                  <th>动作</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in group.rows" :key="row.sequence">
                  <td>
                    <code>{{ row.sequence }}</code>
                  </td>
                  <td>{{ row.action }}</td>
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
import type { ShortcutCategory, ShortcutDefinition } from "@/composables/keyboard/shortcutCatalog";
import { SHORTCUT_DEFINITIONS } from "@/composables/keyboard/shortcutCatalog";

type ShortcutDisplayRow = Omit<ShortcutDefinition, "actionId">;
type ShortcutGroup = {
  key: ShortcutCategory;
  title: string;
  rows: ShortcutDisplayRow[];
};

const keyword = ref("");

const categoryMeta: Record<ShortcutCategory, string> = {
  navigation: "导航与面板",
  activity: "Activity",
  task: "Task",
  planner: "Planner",
  timetable: "Timetable",
  timer: "Timer",
};

const allRows = computed<ShortcutDisplayRow[]>(() => {
  const base = SHORTCUT_DEFINITIONS.map(({ actionId: _actionId, ...rest }) => rest);
  base.push({
    sequence: "Esc（输入框内）",
    mode: "sequence",
    category: "navigation",
    action: "退出输入编辑",
    note: "保留当前选中状态，不清空选择",
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
          row.action.toLowerCase().includes(q) ||
          row.note.toLowerCase().includes(q) ||
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
.setting-subpage {
  padding-right: 2px;
}

.shortcut-toolbar {
  display: flex;
  margin-bottom: 6px;
  gap: 8px;
  margin-right: 6px;
}

.shortcut-count {
  margin: auto 0;
}

.shortcut-table-wrap {
  max-height: calc(100vh - 180px);
  overflow-x: auto;
  overflow-y: auto;
  padding-bottom: 2px;
}

.shortcut-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.shortcut-table th,
.shortcut-table td {
  border: 1px solid var(--n-border-color);
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}

.shortcut-table th {
  background: var(--n-color-target);
  font-weight: 600;
}

.shortcut-table code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
