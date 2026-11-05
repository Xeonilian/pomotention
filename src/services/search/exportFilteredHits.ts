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

export type ExportBundle = {
  meta: {
    app: "pomotention";
    exportedAt: string;
    timeZone: string;
    todoCount: number;
    scheduleCount: number;
    scope: ExportScopeMeta;
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
      type: r.interruptionType,
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

function occurrenceDay(todo: ExportTodoHit | null, sch: ExportScheduleHit | null): string {
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

export function buildExportHits(
  activityIds: number[],
  deps: BuildExportHitsDeps,
  scope: ExportScopeMeta,
): ExportBundle {
  const todos: ExportTodoHit[] = [];
  const schedules: ExportScheduleHit[] = [];

  for (const id of activityIds) {
    const act = deps.getActivity(id);
    if (!act || act.deleted) continue;
    const task = deps.getTask(id);
    const tagIds = act.tagIds ?? [];
    const tagNames = deps.getTagNames(tagIds);
    const tags = tagNames.join("; ");
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
      const endMs =
        startMs != null && !Number.isNaN(durNum) ? startMs + Math.round(durNum * 60_000) : null;
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
    const da = a.dueDay || "\uffff";
    const db = b.dueDay || "\uffff";
    if (da !== db) return da.localeCompare(db);
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

export function toTodoCsv(bundle: ExportBundle): string {
  const headers = [
    "activityId",
    "title",
    "projectName",
    "tags",
    "starred",
    "status",
    "priority",
    "pomoType",
    "estPomo",
    "realPomo",
    "dueAt",
    "dueDay",
    "startAt",
    "startDay",
    "startTime",
    "startText",
    "doneAt",
    "interruption",
    "description",
  ];
  const rows = bundle.todos.map((t) => [
    t.activityId,
    t.title,
    t.projectName,
    t.tags,
    t.starred,
    t.status,
    t.priority,
    t.pomoType,
    t.estPomo,
    t.realPomo,
    t.dueAt,
    t.dueDay,
    t.startAt,
    t.startDay,
    t.startTime,
    t.startText,
    t.doneAt,
    t.interruption,
    t.description,
  ]);
  return toCsv(headers, rows);
}

export function toScheduleCsv(bundle: ExportBundle): string {
  const headers = [
    "activityId",
    "title",
    "projectName",
    "tags",
    "starred",
    "status",
    "startAt",
    "whenDay",
    "whenTime",
    "whenText",
    "durationMin",
    "endAt",
    "location",
    "doneAt",
    "interruption",
    "isUntaetigkeit",
    "description",
  ];
  const rows = bundle.schedules.map((s) => [
    s.activityId,
    s.title,
    s.projectName,
    s.tags,
    s.starred,
    s.status,
    s.startAt,
    s.whenDay,
    s.whenTime,
    s.whenText,
    s.durationMin,
    s.endAt,
    s.location,
    s.doneAt,
    s.interruption,
    s.isUntaetigkeit,
    s.description,
  ]);
  return toCsv(headers, rows);
}

export function toExportJson(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

function mdEscapeCell(s: string): string {
  return String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function mdTable(headers: string[], rows: string[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map(mdEscapeCell).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

function buildPunchCard(bundle: ExportBundle): string {
  type Key = string;
  const counts = new Map<string, Map<Key, number>>(); // day -> tag -> n
  const tagTotals = new Map<Key, number>();

  const bump = (day: string, tag: string) => {
    if (!day) return;
    let m = counts.get(day);
    if (!m) {
      m = new Map();
      counts.set(day, m);
    }
    m.set(tag, (m.get(tag) ?? 0) + 1);
    tagTotals.set(tag, (tagTotals.get(tag) ?? 0) + 1);
  };

  for (const t of bundle.todos) {
    const day = t.startDay || t.dueDay;
    if (!day) continue;
    if (t.tagNames.length === 0) bump(day, "（无标签）");
    else for (const name of t.tagNames) bump(day, name);
  }
  for (const s of bundle.schedules) {
    const day = s.whenDay;
    if (!day) continue;
    if (s.tagNames.length === 0) bump(day, "（无标签）");
    else for (const name of s.tagNames) bump(day, name);
  }

  if (counts.size === 0) return "_（无可用发生日，打卡图省略）_";

  const UNTAGGED = "（无标签）";
  const OTHER = "其它";
  let tags = [...tagTotals.keys()].filter((t) => t !== UNTAGGED);
  tags.sort((a, b) => (tagTotals.get(b)! - tagTotals.get(a)!) || a.localeCompare(b));
  let extra: string[] = [];
  if (tags.length > 8) {
    extra = tags.slice(7);
    tags = tags.slice(0, 7);
  }
  const cols = [...tags];
  if (extra.length) cols.push(OTHER);
  if (tagTotals.has(UNTAGGED)) cols.push(UNTAGGED);

  let days = [...counts.keys()].sort();
  if (days.length > 31) {
    days = days.slice(-31);
  }

  const headers = ["日", ...cols];
  const rows = days.map((day) => {
    const m = counts.get(day)!;
    const cells = cols.map((tag) => {
      if (tag === OTHER) {
        let n = 0;
        for (const t of extra) n += m.get(t) ?? 0;
        return n > 0 ? String(n) : "";
      }
      const n = m.get(tag) ?? 0;
      return n > 0 ? String(n) : "";
    });
    return [day, ...cells];
  });

  let note = "";
  if ([...counts.keys()].length > 31) note = "\n\n_仅近 31 个有数据日_\n";
  return `### 日 × Tag 打卡\n\n${mdTable(headers, rows)}${note}`;
}

function recordsTable(
  title: string,
  rows: ExportRecordRow[],
  kind: "energy" | "reward" | "interruption",
): string {
  if (!rows.length) return "";
  if (kind === "interruption") {
    return `#### ${title}\n\n${mdTable(
      ["时刻", "类型", "说明"],
      rows.map((r) => [`${r.atDay} ${r.atClock}`.trim(), r.type ?? "", r.description]),
    )}\n`;
  }
  return `#### ${title}\n\n${mdTable(
    ["时刻", "值", "说明"],
    rows.map((r) => [`${r.atDay} ${r.atClock}`.trim(), String(r.value ?? ""), r.description]),
  )}\n`;
}

function overviewNavRows(bundle: ExportBundle): string[][] {
  type Row = { kind: string; title: string; id: number; day: string; range: string; sortKey: string };
  const rows: Row[] = [];
  for (const t of bundle.todos) {
    const day = occurrenceDay(t, null);
    const range = rangeForHit(t, null);
    const startMs = t.startAt ? Date.parse(t.startAt) : 0;
    rows.push({
      kind: "Todo",
      title: t.title,
      id: t.activityId,
      day,
      range,
      sortKey: `${day || "\uffff"}-${startMs || 0}`,
    });
  }
  for (const s of bundle.schedules) {
    const day = occurrenceDay(null, s);
    const range = rangeForHit(null, s);
    const startMs = s.startAt ? Date.parse(s.startAt) : 0;
    rows.push({
      kind: "Schedule",
      title: s.title,
      id: s.activityId,
      day,
      range,
      sortKey: `${day || "\uffff"}-${startMs || 0}`,
    });
  }
  rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return rows.map((r) => [
    r.kind,
    `[${r.title || "（无标题）"}](#a-${r.id})`,
    r.day,
    r.range,
  ]);
}

export function toMarkdownReport(bundle: ExportBundle): string {
  const { meta } = bundle;
  const scopeParts = [
    `Project「${meta.scope.projectLabel}」`,
    meta.scope.tagsLabel ? `标签「${meta.scope.tagsLabel}」` : null,
    meta.scope.query ? `关键字「${meta.scope.query}」` : null,
    meta.scope.starredOnly ? "仅星标" : "未限星标",
    meta.scope.activityClass === "T"
      ? "仅 Todo"
      : meta.scope.activityClass === "S"
        ? "仅 Schedule"
        : null,
  ].filter(Boolean);

  const exportDay = formatExportDay(Date.parse(meta.exportedAt) || Date.now());
  const parts: string[] = [];
  parts.push(`# 筛选导出 · ${exportDay}`);
  parts.push("");
  parts.push("## 导出信息");
  parts.push("");
  parts.push(`- 应用：${meta.app}`);
  parts.push(`- 导出时刻：${meta.exportedAt}`);
  parts.push(`- 时区：${meta.timeZone}`);
  parts.push(`- 范围：${scopeParts.join(" · ")}`);
  parts.push(`- 条数：Todo ${meta.todoCount} · Schedule ${meta.scheduleCount}`);
  parts.push("");
  parts.push("## 概览");
  parts.push("");
  parts.push(mdTable(["类型", "标题", "日期", "开始-结束"], overviewNavRows(bundle)));
  parts.push("");
  parts.push(buildPunchCard(bundle));
  parts.push("");

  if (bundle.todos.length) {
    parts.push("## Todo");
    parts.push("");
    parts.push(
      mdTable(
        ["标题", "到期", "开始", "结束", "状态", "优先级", "估计/实绩", "加星"],
        bundle.todos.map((t) => [
          `[${t.title || "（无标题）"}](#a-${t.activityId})`,
          t.dueDay,
          t.startText,
          t.doneAt ? formatExportStartText(Date.parse(t.doneAt)) : "",
          t.status,
          String(t.priority),
          [t.estPomo, t.realPomo].filter(Boolean).join(" / "),
          t.starred === "true" ? "是" : "否",
        ]),
      ),
    );
    parts.push("");
    for (const t of bundle.todos) {
      parts.push(`<a id="a-${t.activityId}"></a>`);
      parts.push(`### ${t.title || "（无标题）"}`);
      parts.push("");
      parts.push(
        mdTable(
          ["字段", "值"],
          [
            ["状态", t.status],
            ["优先级", String(t.priority)],
            ["番茄", [t.pomoType, t.estPomo && `估计 ${t.estPomo}`, t.realPomo && `实绩 ${t.realPomo}`].filter(Boolean).join(" · ")],
            ["到期", t.dueDay || "（无）"],
            ["开始", t.startText || "（无）"],
            ["标签", t.tags || "（无）"],
            ["文件夹", t.projectName || "（无）"],
            ["加星", t.starred === "true" ? "是" : "否"],
            ["打扰", t.interruption || "（无）"],
          ],
        ),
      );
      parts.push("");
      parts.push("#### 正文");
      parts.push("");
      parts.push(t.description.trim() ? t.description : "（无正文）");
      parts.push("");
      parts.push(recordsTable("精力", t.energyRecords, "energy"));
      parts.push(recordsTable("奖赏", t.rewardRecords, "reward"));
      parts.push(recordsTable("分心", t.interruptionRecords, "interruption"));
    }
  }

  if (bundle.schedules.length) {
    parts.push("## Schedule");
    parts.push("");
    parts.push(
      mdTable(
        ["标题", "开始", "结束", "时长", "地点", "状态"],
        bundle.schedules.map((s) => [
          `[${s.title || "（无标题）"}](#a-${s.activityId})`,
          s.whenText,
          s.endDay ? `${s.endDay}${s.endTime ? ` ${s.endTime}` : ""}` : "",
          s.durationMin,
          s.location,
          s.status,
        ]),
      ),
    );
    parts.push("");
    for (const s of bundle.schedules) {
      parts.push(`<a id="a-${s.activityId}"></a>`);
      parts.push(`### ${s.title || "（无标题）"}`);
      parts.push("");
      parts.push(
        mdTable(
          ["字段", "值"],
          [
            ["状态", s.status],
            ["何时", s.whenText || "（无）"],
            ["时长", s.durationMin ? `${s.durationMin} 分钟` : "（无）"],
            ["地点", s.location || "（无）"],
            ["标签", s.tags || "（无）"],
            ["文件夹", s.projectName || "（无）"],
            ["加星", s.starred === "true" ? "是" : "否"],
            ["无所事事", s.isUntaetigkeit === "true" ? "是" : "否"],
            ["打扰", s.interruption || "（无）"],
          ],
        ),
      );
      parts.push("");
      parts.push("#### 正文");
      parts.push("");
      parts.push(s.description.trim() ? s.description : "（无正文）");
      parts.push("");
      parts.push(recordsTable("精力", s.energyRecords, "energy"));
      parts.push(recordsTable("奖赏", s.rewardRecords, "reward"));
      parts.push(recordsTable("分心", s.interruptionRecords, "interruption"));
    }
  }

  parts.push("## 复盘支架（ORID）");
  parts.push("");
  parts.push("### O · Objective（客观）");
  parts.push("");
  parts.push("- 这批材料里实际发生了什么？（只述事实，可引用上表）");
  parts.push("");
  parts.push("### R · Reflective（反应）");
  parts.push("");
  parts.push("- 哪里顺/卡？情绪或身体信号？");
  parts.push("");
  parts.push("### I · Interpretive（诠释）");
  parts.push("");
  parts.push("- 模式或假设是什么？与目标的关系？");
  parts.push("");
  parts.push("### D · Decisional（决策）");
  parts.push("");
  parts.push("- 下一步保留 / 停止 / 尝试什么？");
  parts.push("");
  parts.push("---");
  parts.push("");
  parts.push(`<!-- machine: exportedAt=${meta.exportedAt} timeZone=${meta.timeZone} -->`);
  parts.push("");

  return parts.filter((p, i, arr) => !(p === "" && arr[i - 1] === "")).join("\n");
}

export function defaultExportBasename(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `pomotention-export-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}
