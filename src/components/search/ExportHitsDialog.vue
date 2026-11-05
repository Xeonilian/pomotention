<template>
  <n-modal
    :show="show"
    preset="card"
    title="导出筛选结果"
    style="width: min(520px, 94vw)"
    :mask-closable="!busy"
    @update:show="onUpdateShow"
  >
    <div class="export-hits">
      <p class="export-hits__scope">{{ scopeSummary }}</p>
      <p v-if="hitCount > 0" class="export-hits__count">
        命中 {{ hitCount }} 条（Todo / Schedule 按类型分列）
      </p>
      <p v-else class="export-hits__empty">当前无命中，无法导出。</p>

      <div class="export-hits__format">
        <span class="export-hits__label">格式</span>
        <n-radio-group v-model:value="format" :disabled="busy || hitCount === 0">
          <n-radio value="markdown">Markdown 复盘报告</n-radio>
          <n-radio value="json">JSON</n-radio>
          <n-radio value="csv">CSV（Todo / Schedule 分文件）</n-radio>
        </n-radio-group>
      </div>
    </div>

    <template #footer>
      <div class="export-hits__footer">
        <n-button :disabled="busy" @click="close">取消</n-button>
        <n-button :disabled="busy || hitCount === 0" @click="openMarkdownPreview">
          预览 Markdown
        </n-button>
        <n-button type="primary" :loading="busy" :disabled="hitCount === 0" @click="runExport">
          导出
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useNotification } from "naive-ui";
import type { ActivityRow } from "@/composables/search/useSearchFilter";
import type { ExportScopeMeta } from "@/services/search/exportFilteredHits";
import {
  buildExportHits,
  defaultExportBasename,
  toExportJson,
  toMarkdownReport,
  toScheduleCsv,
  toTodoCsv,
} from "@/services/search/exportFilteredHits";
import { saveTextFile, saveTextFiles } from "@/core/utils/saveTextFile";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { openExportMarkdownPreview } from "@/services/search/openExportPreview";

const props = withDefaults(
  defineProps<{
    show: boolean;
    hits?: ActivityRow[];
    scope?: ExportScopeMeta;
  }>(),
  {
    hits: () => [],
    scope: () => ({
      projectLabel: "全库（当前筛选）",
      tagsLabel: "",
      query: "",
      starredOnly: false,
      activityClass: null,
    }),
  },
);

const emit = defineEmits<{
  "update:show": [boolean];
}>();

const notification = useNotification();
const dataStore = useDataStore();
const tagStore = useTagStore();
const projectStore = useProjectStore();
const format = ref<"markdown" | "json" | "csv">("markdown");
const busy = ref(false);

const safeHits = computed(() => (Array.isArray(props.hits) ? props.hits : []));
const hitCount = computed(() => safeHits.value.length);

function notifySuccess(content: string) {
  notification.success({ content, duration: 2500 });
}
function notifyError(content: string) {
  notification.error({ content, duration: 4000 });
}
function notifyWarning(content: string) {
  notification.warning({ content, duration: 3000 });
}

const scopeSummary = computed(() => {
  const s = props.scope;
  if (!s) return "";
  const bits = [
    `范围：${s.projectLabel}`,
    s.tagsLabel ? `标签：${s.tagsLabel}` : null,
    s.query ? `关键字：${s.query}` : null,
    s.starredOnly ? "仅星标" : null,
    s.activityClass === "T" ? "仅 Todo" : s.activityClass === "S" ? "仅 Schedule" : null,
  ].filter(Boolean);
  return bits.join(" · ");
});

watch(
  () => props.show,
  (open) => {
    if (open) format.value = "markdown";
  },
);

function onUpdateShow(v: boolean) {
  if (!busy.value) emit("update:show", v);
}
function close() {
  if (!busy.value) emit("update:show", false);
}

function buildBundle() {
  const ids = safeHits.value.map((h) => h.activityId);
  const scope = props.scope ?? {
    projectLabel: "全库（当前筛选）",
    tagsLabel: "",
    query: "",
    starredOnly: false,
    activityClass: null,
  };
  return buildExportHits(
    ids,
    {
      getActivity: (id) => dataStore.activityById.get(id),
      getTodo: (activityId) => dataStore.todoByActivityId.get(activityId),
      getSchedule: (activityId) => dataStore.scheduleByActivityId.get(activityId),
      getTask: (activityId) => dataStore.taskByActivityId.get(activityId),
      getTagNames: (tagIds) => tagStore.getTagsByIds(tagIds ?? []).map((t) => t.name),
      getProjectTitle: (projectId) => {
        if (projectId == null) return "";
        return projectStore.getProject(projectId)?.title ?? "";
      },
    },
    scope,
  );
}

function openMarkdownPreview() {
  if (hitCount.value === 0) return;
  try {
    const md = toMarkdownReport(buildBundle());
    const label = props.scope?.projectLabel?.trim() || "筛选";
    openExportMarkdownPreview(md, `导出 · ${label}`);
    emit("update:show", false);
  } catch (e) {
    notifyError(e instanceof Error ? e.message : String(e));
  }
}

async function runExport() {
  if (busy.value || hitCount.value === 0) return;
  busy.value = true;
  try {
    const bundle = buildBundle();
    const base = defaultExportBasename();

    if (format.value === "markdown") {
      const r = await saveTextFile({
        contents: toMarkdownReport(bundle),
        filename: `${base}.md`,
        mime: "text/markdown;charset=utf-8",
      });
      if (!r.ok) {
        if (r.reason !== "cancelled") notifyError(r.detail || "导出失败");
        return;
      }
      notifySuccess("已导出 Markdown");
      emit("update:show", false);
      return;
    }

    if (format.value === "json") {
      const r = await saveTextFile({
        contents: toExportJson(bundle),
        filename: `${base}.json`,
        mime: "application/json;charset=utf-8",
      });
      if (!r.ok) {
        if (r.reason !== "cancelled") notifyError(r.detail || "导出失败");
        return;
      }
      notifySuccess("已导出 JSON");
      emit("update:show", false);
      return;
    }

    const files = [];
    if (bundle.todos.length) {
      files.push({
        contents: toTodoCsv(bundle),
        filename: `${base}-todos.csv`,
        mime: "text/csv;charset=utf-8",
      });
    }
    if (bundle.schedules.length) {
      files.push({
        contents: toScheduleCsv(bundle),
        filename: `${base}-schedules.csv`,
        mime: "text/csv;charset=utf-8",
      });
    }
    if (!files.length) {
      notifyWarning("没有可写入的 CSV 行");
      return;
    }
    const r = await saveTextFiles({ files });
    if (!r.ok) {
      if (r.reason !== "cancelled") notifyError(r.detail || "导出失败");
      return;
    }
    notifySuccess(files.length > 1 ? "已导出 CSV（Todo / Schedule）" : "已导出 CSV");
    emit("update:show", false);
  } catch (e) {
    notifyError(e instanceof Error ? e.message : String(e));
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.export-hits__scope,
.export-hits__count {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--n-text-color-2, #666);
}
.export-hits__label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
}
.export-hits__empty {
  color: var(--n-text-color-3, #999);
  font-size: 13px;
}
.export-hits__format {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.export-hits__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
