import type { Activity } from "@/core/types/Activity";
import type { Task, EnergyRecord, RewardRecord, InterruptionRecord } from "@/core/types/Task";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import {
  formatExportClock,
  formatExportDateTime,
  formatExportDay,
  formatExportRangeText,
  formatExportStartText,
  resolveExportTimeZone,
} from "@/core/utils/exportDateTime";
import { getEnergyScoreEmoji, getRewardScoreEmoji } from "@/core/scoreEmojis";

export type ExportRecordRow = {
  at: string;
  atDay: string;
  atClock: string;
  value?: number;
  type?: string;
  description: string;
};

export type ExportTodoHit = {
  activityId: number;
  title: string;
  projectName: string;
  tags: string;
  tagIds: number[];
  tagNames: string[];
  starred: "true" | "false";
  description: string;
  status: string;
  priority: number | "";
  pomoType: string;
  estPomo: string;
  realPomo: string;
  dueAt: string;
  dueDay: string;
  startAt: string;
  startDay: string;
  startTime: string;
  startText: string;
  doneAt: string;
  interruption: string;
  energyRecords: ExportRecordRow[];
  rewardRecords: ExportRecordRow[];
  interruptionRecords: ExportRecordRow[];
};

export type ExportScheduleHit = {
  activityId: number;
  title: string;
  projectName: string;
  tags: string;
  tagIds: number[];
  tagNames: string[];
  starred: "true" | "false";
  description: string;
  status: string;
  startAt: string;
  whenDay: string;
  whenTime: string;
  whenText: string;
  durationMin: string;
  endAt: string;
  endDay: string;
  endTime: string;
  location: string;
  doneAt: string;
  interruption: string;
  isUntaetigkeit: "true" | "false";
  energyRecords: ExportRecordRow[];
  rewardRecords: ExportRecordRow[];
  interruptionRecords: ExportRecordRow[];
};

export type ExportScopeMeta = {
  projectLabel: string;
  tagsLabel: string;
  query: string;
  starredOnly: boolean;
  activityClass: "" | "T" | "S" | null;
};

export type ExportSummary = {
  daySpan: string;
  dayCount: number;
  starredCount: number;
  doneCount: number;
  tagCounts: { name: string; count: number }[];
  energyAvg: string;
  energyN: number;
  rewardAvg: string;
  rewardN: number;
  interruptionCount: number;
  topInterruptions: { text: string; count: number }[];
};

export type ExportBundle = {
  meta: {
    app: "pomotention";
    exportedAt: string;
    timeZone: string;
    todoCount: number;
    scheduleCount: number;
    scope: ExportScopeMeta;
    summary: ExportSummary;
  };
  todos: ExportTodoHit[];
  schedules: ExportScheduleHit[];
};

export type BuildExportHitsDeps = {
  getActivity: (id: number) => Activity | undefined;
  getTodo: (activityId: number) => Todo | undefined;
  getSchedule: (activityId: number) => Schedule | undefined;
  getTask: (activityId: number) => Task | undefined;
  getTagNames: (tagIds: number[] | undefined) => string[];
  getProjectTitle: (projectId: number | undefined) => string;
};

const STATUS_ZH: Record<string, string> = {
  "": "未标注",
  ongoing: "进行中",
  done: "已完成",
  delayed: "延期",
  cancelled: "已取消",
  suspended: "搁置",
};

function statusZh(s: string): string {
  return STATUS_ZH[s] ?? (s || "未标注");
}

function msOrNull(v: number | null | undefined): number | null {
  if (v == null || typeof v !== "number" || Number.isNaN(v)) return null;
  return v;
}

function mapEnergy(rows: EnergyRecord[] | undefined): ExportRecordRow[] {
  if (!rows?.length) return [];
  return rows.map((r) => {
    const ms = r.recordedAt ?? r.id;
    return {
      at: formatExportDateTime(ms),
      atDay: formatExportDay(ms),
      atClock: formatExportClock(ms),
      value: r.value,
      description: r.description ?? "",
    };
  });
}

function mapReward(rows: RewardRecord[] | undefined): ExportRecordRow[] {
  if (!rows?.length) return [];
  return rows.map((r) => {
    const ms = r.recordedAt ?? r.id;
    return {
      at: formatExportDateTime(ms),
      atDay: formatExportDay(ms),
      atClock: formatExportClock(ms),
      value: r.value,
      description: r.description ?? "",
    };
  });
}

function mapInterruption(rows: InterruptionRecord[] | undefined): ExportRecordRow[] {
  if (!rows?.length) return [];
  return rows.map((r) => {
    const ms = r.recordedAt ?? r.id;
    return {
      at: formatExportDateTime(ms),
      atDay: formatExportDay(ms),
      atClock: formatExportClock(ms),
      type: r.interruptionType === "E" ? "外扰" : r.interruptionType === "I" ? "内扰" : r.interruptionType,
      description: r.description ?? "",
    };
  });
}

function formatEstPomo(est: number[] | undefined): string {
  if (!est?.length) return "";
  return est.join("+");
}

function formatRealPomo(real: number[] | undefined): string {
  if (!real?.length) return "";
  const total = real.length;
  const done = real.filter((x) => x === 1).length;
  return `${done}/${total}`;
}

function avgRecordValues(rows: ExportRecordRow[]): { avg: string; n: number } {
  const vals = rows.map((r) => r.value).filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (!vals.length) return { avg: "", n: 0 };
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { avg: (Math.round(avg * 10) / 10).toFixed(1), n: vals.length };
}

function hitDay(todo: ExportTodoHit | null, sch: ExportScheduleHit | null): string {
  if (sch) return sch.whenDay;
  if (todo) return todo.startDay || todo.dueDay;
  return "";
}

function rangeForHit(todo: ExportTodoHit | null, sch: ExportScheduleHit | null): string {
  if (sch) {
    const startMs = sch.startAt ? Date.parse(sch.startAt) : null;
    const endMs = sch.endAt ? Date.parse(sch.endAt) : null;
    return formatExportRangeText(
      startMs != null && !Number.isNaN(startMs) ? startMs : null,
      endMs != null && !Number.isNaN(endMs) ? endMs : null,
    );
  }
  if (todo) {
    const startMs = todo.startAt ? Date.parse(todo.startAt) : null;
    const endMs = todo.doneAt ? Date.parse(todo.doneAt) : null;
    return formatExportRangeText(
      startMs != null && !Number.isNaN(startMs) ? startMs : null,
      endMs != null && !Number.isNaN(endMs) ? endMs : null,
    );
  }
  return "";
}

function buildSummary(todos: ExportTodoHit[], schedules: ExportScheduleHit[]): ExportSummary {
  const days = new Set<string>();
  const tagCounts = new Map<string, number>();
  let starredCount = 0;
  let doneCount = 0;
  const energyAll: ExportRecordRow[] = [];
  const rewardAll: ExportRecordRow[] = [];
  const interruptionAll: ExportRecordRow[] = [];
  const interruptText = new Map<string, number>();

  const bumpTag = (names: string[]) => {
    if (!names.length) {
      tagCounts.set("（无标签）", (tagCounts.get("（无标签）") ?? 0) + 1);
      return;
    }
    for (const n of names) tagCounts.set(n, (tagCounts.get(n) ?? 0) + 1);
  };

  for (const t of todos) {
    const d = hitDay(t, null);
    if (d) days.add(d);
    bumpTag(t.tagNames);
    if (t.starred === "true") starredCount++;
    if (t.status === "done") doneCount++;
    energyAll.push(...t.energyRecords);
    rewardAll.push(...t.rewardRecords);
    interruptionAll.push(...t.interruptionRecords);
  }
  for (const s of schedules) {
    const d = hitDay(null, s);
    if (d) days.add(d);
    bumpTag(s.tagNames);
    if (s.starred === "true") starredCount++;
    if (s.status === "done") doneCount++;
    energyAll.push(...s.energyRecords);
    rewardAll.push(...s.rewardRecords);
    interruptionAll.push(...s.interruptionRecords);
  }

  for (const r of interruptionAll) {
    const key = (r.description || r.type || "（未写说明）").trim() || "（未写说明）";
    interruptText.set(key, (interruptText.get(key) ?? 0) + 1);
  }

  const sortedDays = [...days].sort();
  const daySpan =
    sortedDays.length === 0
      ? "（无发生日）"
      : sortedDays.length === 1
        ? sortedDays[0]!
        : `${sortedDays[0]} → ${sortedDays[sortedDays.length - 1]}（${sortedDays.length} 天有记录）`;

  const e = avgRecordValues(energyAll);
  const rw = avgRecordValues(rewardAll);

  const tagList = [...tagCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const topInterruptions = [...interruptText.entries()]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
    .slice(0, 5);

  return {
    daySpan,
    dayCount: sortedDays.length,
    starredCount,
    doneCount,
    tagCounts: tagList,
    energyAvg: e.avg,
    energyN: e.n,
    rewardAvg: rw.avg,
    rewardN: rw.n,
    interruptionCount: interruptionAll.length,
    topInterruptions,
  };
}

export function buildExportHits(activityIds: number[], deps: BuildExportHitsDeps, scope: ExportScopeMeta): ExportBundle {
  const todos: ExportTodoHit[] = [];
  const schedules: ExportScheduleHit[] = [];

  for (const id of activityIds) {
    const act = deps.getActivity(id);
    if (!act || act.deleted) continue;
    const task = deps.getTask(id);
    const tagIds = act.tagIds ?? [];
    const tagNames = deps.getTagNames(tagIds);
    const tags = tagNames.join(" · ");
    const projectName = deps.getProjectTitle(act.projectId);
    const starred: "true" | "false" = task?.starred ? "true" : "false";
    const description = task?.description ?? "";
    const energyRecords = mapEnergy(task?.energyRecords);
    const rewardRecords = mapReward(task?.rewardRecords);
    const interruptionRecords = mapInterruption(task?.interruptionRecords);

    if (act.class === "T") {
      const todo = deps.getTodo(id);
      const dueMs = msOrNull(todo?.dueDate);
      const startMs = msOrNull(todo?.startTime);
      const doneMs = msOrNull(todo?.doneTime);
      todos.push({
        activityId: id,
        title: act.title || "",
        projectName,
        tags,
        tagIds: [...tagIds],
        tagNames: [...tagNames],
        starred,
        description,
        status: todo?.status ?? "",
        priority: todo?.priority ?? "",
        pomoType: todo?.pomoType ?? "",
        estPomo: formatEstPomo(todo?.estPomo),
        realPomo: formatRealPomo(todo?.realPomo),
        dueAt: dueMs != null ? formatExportDateTime(dueMs) : "",
        dueDay: dueMs != null ? formatExportDay(dueMs) : "",
        startAt: startMs != null ? formatExportDateTime(startMs) : "",
        startDay: startMs != null ? formatExportDay(startMs) : "",
        startTime: startMs != null ? formatExportClock(startMs) : "",
        startText: startMs != null ? formatExportStartText(startMs) : "",
        doneAt: doneMs != null ? formatExportDateTime(doneMs) : "",
        interruption: todo?.interruption ?? "",
        energyRecords,
        rewardRecords,
        interruptionRecords,
      });
    } else {
      const sch = deps.getSchedule(id);
      const startMs = msOrNull(sch?.activityDueRange?.[0] ?? undefined);
      const durRaw = sch?.activityDueRange?.[1];
      const durationMin = durRaw != null && durRaw !== "" ? String(durRaw) : "";
      const durNum = durationMin ? Number(durationMin) : NaN;
      const endMs = startMs != null && !Number.isNaN(durNum) ? startMs + Math.round(durNum * 60_000) : null;
      const doneMs = msOrNull(sch?.doneTime);
      schedules.push({
        activityId: id,
        title: act.title || "",
        projectName,
        tags,
        tagIds: [...tagIds],
        tagNames: [...tagNames],
        starred,
        description,
        status: sch?.status ?? "",
        startAt: startMs != null ? formatExportDateTime(startMs) : "",
        whenDay: startMs != null ? formatExportDay(startMs) : "",
        whenTime: startMs != null ? formatExportClock(startMs) : "",
        whenText: startMs != null ? formatExportStartText(startMs) : "",
        durationMin,
        endAt: endMs != null ? formatExportDateTime(endMs) : "",
        endDay: endMs != null ? formatExportDay(endMs) : "",
        endTime: endMs != null ? formatExportClock(endMs) : "",
        location: sch?.location ?? "",
        doneAt: doneMs != null ? formatExportDateTime(doneMs) : "",
        interruption: sch?.interruption ?? "",
        isUntaetigkeit: sch?.isUntaetigkeit ? "true" : "false",
        energyRecords,
        rewardRecords,
        interruptionRecords,
      });
    }
  }

  const sortTodo = (a: ExportTodoHit, b: ExportTodoHit) => {
    const da = a.startDay || a.dueDay || "\uffff";
    const db = b.startDay || b.dueDay || "\uffff";
    if (da !== db) return da.localeCompare(db);
    const ta = a.startTime || "";
    const tb = b.startTime || "";
    if (ta !== tb) return ta.localeCompare(tb);
    return a.title.localeCompare(b.title);
  };
  const sortSch = (a: ExportScheduleHit, b: ExportScheduleHit) => {
    const ka = `${a.whenDay} ${a.whenTime}`;
    const kb = `${b.whenDay} ${b.whenTime}`;
    if (!a.whenDay && b.whenDay) return 1;
    if (a.whenDay && !b.whenDay) return -1;
    if (ka !== kb) return ka.localeCompare(kb);
    return a.title.localeCompare(b.title);
  };
  todos.sort(sortTodo);
  schedules.sort(sortSch);

  const now = Date.now();
  return {
    meta: {
      app: "pomotention",
      exportedAt: formatExportDateTime(now),
      timeZone: resolveExportTimeZone(),
      todoCount: todos.length,
      scheduleCount: schedules.length,
      scope,
      summary: buildSummary(todos, schedules),
    },
    todos,
    schedules,
  };
}

function csvEscape(cell: string | number): string {
  const s = String(cell ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const r of rows) lines.push(r.map(csvEscape).join(","));
  return `\uFEFF${lines.join("\n")}`;
}

function bodyExcerpt(md: string, max = 120): string {
  const plain = String(md ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max)}…`;
}

function doneText(iso: string): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? "" : formatExportStartText(ms);
}

/** Todo CSV：中文表头 + 人读字段，便于表格软件直接读 */
export function toTodoCsv(bundle: ExportBundle): string {
  const headers = [
    "标题",
    "文件夹",
    "标签",
    "星标",
    "状态",
    "到期日",
    "开始",
    "结束",
    "估计番茄",
    "完成番茄",
    "精力均分",
    "奖赏均分",
    "分心次数",
    "正文摘要",
  ];
  const rows = bundle.todos.map((t) => {
    const e = avgRecordValues(t.energyRecords);
    const r = avgRecordValues(t.rewardRecords);
    return [
      t.title,
      t.projectName,
      t.tags,
      t.starred === "true" ? "是" : "否",
      statusZh(t.status),
      t.dueDay,
      t.startText,
      doneText(t.doneAt),
      t.estPomo,
      t.realPomo,
      e.avg,
      r.avg,
      t.interruptionRecords.length,
      bodyExcerpt(t.description),
    ];
  });
  return toCsv(headers, rows);
}

export function toScheduleCsv(bundle: ExportBundle): string {
  const headers = [
    "标题",
    "文件夹",
    "标签",
    "星标",
    "状态",
    "开始",
    "结束",
    "时长分钟",
    "地点",
    "精力均分",
    "奖赏均分",
    "分心次数",
    "无所事事",
    "正文摘要",
  ];
  const rows = bundle.schedules.map((s) => {
    const e = avgRecordValues(s.energyRecords);
    const r = avgRecordValues(s.rewardRecords);
    const end = s.endDay && s.endTime ? `${s.endDay} ${s.endTime}` : s.endDay || doneText(s.doneAt);
    return [
      s.title,
      s.projectName,
      s.tags,
      s.starred === "true" ? "是" : "否",
      statusZh(s.status),
      s.whenText,
      end,
      s.durationMin,
      s.location,
      e.avg,
      r.avg,
      s.interruptionRecords.length,
      s.isUntaetigkeit === "true" ? "是" : "否",
      bodyExcerpt(s.description),
    ];
  });
  return toCsv(headers, rows);
}

function slimRecords(rows: ExportRecordRow[]) {
  return rows.map((r) => {
    const out: { at: string; value?: number; type?: string; description?: string } = { at: r.at };
    if (r.value != null) out.value = r.value;
    if (r.type) out.type = r.type;
    if (r.description) out.description = r.description;
    return out;
  });
}

/** JSON：时刻只留一条 ISO；去掉 dueDay/startText 等重复人读字段 */
export function toExportJson(bundle: ExportBundle): string {
  const { meta } = bundle;
  const payload = {
    meta: {
      app: meta.app,
      exportedAt: meta.exportedAt,
      timeZone: meta.timeZone,
      scope: meta.scope,
      summary: meta.summary,
      todoCount: meta.todoCount,
      scheduleCount: meta.scheduleCount,
    },
    todos: bundle.todos.map((t) => ({
      activityId: t.activityId,
      title: t.title,
      project: t.projectName || null,
      tags: t.tagNames,
      starred: t.starred === "true",
      status: t.status || null,
      priority: t.priority === "" ? null : t.priority,
      pomoType: t.pomoType || null,
      estPomo: t.estPomo || null,
      realPomo: t.realPomo || null,
      due: t.dueAt || null,
      start: t.startAt || null,
      done: t.doneAt || null,
      interruption: t.interruption || null,
      description: t.description,
      energy: slimRecords(t.energyRecords),
      reward: slimRecords(t.rewardRecords),
      interruptions: slimRecords(t.interruptionRecords),
    })),
    schedules: bundle.schedules.map((s) => ({
      activityId: s.activityId,
      title: s.title,
      project: s.projectName || null,
      tags: s.tagNames,
      starred: s.starred === "true",
      status: s.status || null,
      start: s.startAt || null,
      end: s.endAt || null,
      durationMin: s.durationMin ? Number(s.durationMin) || s.durationMin : null,
      location: s.location || null,
      done: s.doneAt || null,
      interruption: s.interruption || null,
      isUntaetigkeit: s.isUntaetigkeit === "true",
      description: s.description,
      energy: slimRecords(s.energyRecords),
      reward: slimRecords(s.rewardRecords),
      interruptions: slimRecords(s.interruptionRecords),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

function mdEscapeCell(s: string): string {
  return String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");
}

function mdTable(headers: string[], rows: string[][]): string {
  if (!headers.length) return "_（无）_";
  const head = `| ${headers.map(mdEscapeCell).join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  if (!rows.length) return `${head}\n${sep}`;
  const body = rows.map((r) => `| ${r.map(mdEscapeCell).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

/** 标签用行内 code 标记 */
function mdTagCode(name: string): string {
  const safe = String(name ?? "").replace(/`/g, "'");
  return `\`${safe || " "}\``;
}

/** 标签频次 list：- `tag` 次数 */
function tagFrequencyList(tagCounts: { name: string; count: number }[]): string {
  if (!tagCounts.length) return "- （无标签）";
  return tagCounts.map((t) => `- ${mdTagCode(t.name)} ${t.count}`).join("\n");
}

/** 估计番茄个数；无则 0 */
function tomatoCountFromEst(estPomo: string): number {
  const s = estPomo.trim();
  if (!s) return 0;
  return s.split("+").reduce((acc, part) => acc + (Number(part) || 0), 0);
}

type ReportRow = {
  no: number;
  /** 待办：番茄数；预约：/ */
  typeMark: string;
  activityId: number;
  title: string;
  day: string;
  range: string;
  sortKey: string;
  project: string;
  tagNames: string[];
  starred: boolean;
  energy: string;
  reward: string;
  description: string;
};

function collectReportRows(bundle: ExportBundle): ReportRow[] {
  const rows: ReportRow[] = [];
  for (const t of bundle.todos) {
    const day = hitDay(t, null);
    const startMs = t.startAt ? Date.parse(t.startAt) : 0;
    const e = avgRecordValues(t.energyRecords);
    const r = avgRecordValues(t.rewardRecords);
    rows.push({
      no: 0,
      typeMark: String(tomatoCountFromEst(t.estPomo)),
      activityId: t.activityId,
      title: t.title || "（无标题）",
      day,
      range: rangeForHit(t, null),
      sortKey: `${day || "\uffff"}-${String(startMs || 0).padStart(15, "0")}-T-${t.activityId}`,
      project: t.projectName,
      tagNames: t.tagNames,
      starred: t.starred === "true",
      energy: e.avg,
      reward: r.avg,
      description: t.description ?? "",
    });
  }
  for (const s of bundle.schedules) {
    const day = hitDay(null, s);
    const startMs = s.startAt ? Date.parse(s.startAt) : 0;
    const e = avgRecordValues(s.energyRecords);
    const r = avgRecordValues(s.rewardRecords);
    rows.push({
      no: 0,
      typeMark: "/",
      activityId: s.activityId,
      title: s.title || "（无标题）",
      day,
      range: rangeForHit(null, s),
      sortKey: `${day || "\uffff"}-${String(startMs || 0).padStart(15, "0")}-S-${s.activityId}`,
      project: s.projectName,
      tagNames: s.tagNames,
      starred: s.starred === "true",
      energy: e.avg,
      reward: r.avg,
      description: s.description ?? "",
    });
  }
  rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  rows.forEach((r, i) => {
    r.no = i + 1;
  });
  return rows;
}

function projectLine(rows: ReportRow[]): string {
  const names = [...new Set(rows.map((r) => r.project.trim()).filter(Boolean))];
  const projects = names.length ? names.join("、") : "（无）";
  return `项目：${projects}`;
}

function scoreCell(avg: string, kind: "energy" | "reward"): string {
  if (!avg) return "—";
  const n = Number(avg);
  if (!Number.isFinite(n)) return "—";
  return kind === "energy" ? getEnergyScoreEmoji(n) : getRewardScoreEmoji(n);
}

/** 加星 + 精力/满足感（core/scoreEmojis 1–10 映射） */
function signalEmojis(starred: boolean, energy: string, reward: string): string {
  const bits: string[] = [];
  if (starred) bits.push("⭐");
  if (energy) {
    const n = Number(energy);
    if (Number.isFinite(n)) bits.push(getEnergyScoreEmoji(n));
  }
  if (reward) {
    const n = Number(reward);
    if (Number.isFinite(n)) bits.push(getRewardScoreEmoji(n));
  }
  return bits.join(" ");
}

function fenceDescription(raw: string): string {
  const body = String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
  // 正文里若有围栏，略抬级避免提前闭合；标注 markdown 便于阅读器语法高亮
  const ticks = body.match(/^`{3,}/gm);
  const n = ticks ? Math.max(...ticks.map((t) => t.length)) + 1 : 3;
  const fence = "`".repeat(Math.max(3, n));
  if (!body) return `${fence}markdown\n${fence}`;
  return `${fence}markdown\n${body}\n${fence}`;
}

/** 筛选结果 what 汇总：复盘 + 条目详录（无「详录」标题） */
export function toMarkdownReport(bundle: ExportBundle): string {
  const { meta } = bundle;
  const exportDay = formatExportDay(Date.parse(meta.exportedAt) || Date.now());
  const rows = collectReportRows(bundle);
  const parts: string[] = [];

  parts.push("## 复盘");
  parts.push("");
  parts.push(`日期：${exportDay}`);
  parts.push("");
  parts.push(projectLine(rows));
  parts.push("");
  parts.push("标签频次：");
  parts.push(tagFrequencyList(meta.summary.tagCounts));
  parts.push("");

  parts.push("");
  parts.push(
    mdTable(
      ["编号", "日期", "时间范围", "番茄", "题目", "精力", "满足感"],
      rows.map((r) => [
        `[${r.no}](#n-${r.no})`,
        r.day || "0000-00-00",
        r.range || "—",
        r.typeMark,
        r.title,
        scoreCell(r.energy, "energy"),
        scoreCell(r.reward, "reward"),
      ]),
    ),
  );
  parts.push("");

  for (const r of rows) {
    const day = r.day || "0000-00-00";
    const signals = signalEmojis(r.starred, r.energy, r.reward);
    const heading = `### ${r.no} ${day} ${r.title}${signals ? ` ${signals}` : ""}`;
    parts.push(`<a id="n-${r.no}"></a>`);
    parts.push(heading);
    parts.push("");
    const tags = r.tagNames.length ? r.tagNames.map(mdTagCode).join("；") : "（无）";
    parts.push(`- 标签：${tags}`);
    parts.push("");
    parts.push(fenceDescription(r.description));
    parts.push("");
  }

  return parts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function defaultExportBasename(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `pomotention-export-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
