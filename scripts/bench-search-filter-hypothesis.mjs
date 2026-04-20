/**
 * 纯 Node 基准：验证「取消星标筛选变慢」相关假设（不含浏览器 DOM / Vue 补丁）。
 * 运行：node scripts/bench-search-filter-hypothesis.mjs
 */

function now() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function bench(name, iterations, fn) {
  // 预热
  for (let i = 0; i < Math.min(50, iterations); i++) fn();
  const t0 = now();
  for (let i = 0; i < iterations; i++) fn();
  const ms = now() - t0;
  const perRunMs = ms / iterations;
  return { name, iterations, totalMs: ms, perRunMs };
}

/** 单次执行耗时（毫秒），用于「一整次筛选重算」对比 */
function onceMs(fn) {
  for (let i = 0; i < 20; i++) fn();
  const t0 = now();
  fn();
  return now() - t0;
}

// ---------- 构造与生产代码同形状的数据（简化但保留「多次 Map + some」）----------

function buildSynthetic(N, tagCount, starredFraction) {
  const activityIds = Array.from({ length: N }, (_, i) => i + 1);
  const tasksBySource = {
    activity: new Map(),
    todo: new Map(),
    schedule: new Map(),
  };
  const todoByActivityId = new Map();
  const scheduleByActivityId = new Map();
  const todoById = new Map();
  const scheduleById = new Map();

  for (const aid of activityIds) {
    const tasks = [{ starred: Math.random() < starredFraction }];
    tasksBySource.activity.set(aid, tasks);
    const td = { id: aid + 100000, activityId: aid };
    todoByActivityId.set(aid, td);
    todoById.set(td.id, td);
    tasksBySource.todo.set(td.id, [{ starred: false }]);
    const sch = { id: aid + 200000, activityId: aid };
    scheduleByActivityId.set(aid, sch);
    scheduleById.set(sch.id, sch);
    tasksBySource.schedule.set(sch.id, [{ starred: false }]);
  }

  const allTags = Array.from({ length: tagCount }, (_, i) => ({
    id: i + 1,
    name: `tag-${i}`,
    color: "#000",
    backgroundColor: "#fff",
    count: 1,
  }));

  return { activityIds, tasksBySource, todoByActivityId, scheduleByActivityId, todoById, scheduleById, allTags };
}

/** 与优化前 hasStarredTaskForActivity 等价的判定（保留分支结构） */
function hasStarredLegacy(activityId, ctx) {
  const { tasksBySource, todoByActivityId, scheduleByActivityId, todoById, scheduleById } = ctx;
  const tasksOfAct = tasksBySource.activity.get(activityId);
  if (tasksOfAct?.some((t) => t.starred)) return true;
  const relatedTodo = todoByActivityId.get(activityId);
  if (relatedTodo) {
    const tasksOfTodo = tasksBySource.todo.get(relatedTodo.id);
    if (tasksOfTodo?.some((t) => t.starred)) return true;
  }
  const relatedSchedule = scheduleByActivityId.get(activityId);
  if (relatedSchedule) {
    const tasksOfSch = tasksBySource.schedule.get(relatedSchedule.id);
    if (tasksOfSch?.some((t) => t.starred)) return true;
  }
  const relatedBugTodo = todoById.get(activityId);
  if (relatedBugTodo) {
    const tasksOfTodo = tasksBySource.todo.get(relatedBugTodo.id);
    if (tasksOfTodo?.some((t) => t.starred)) return true;
  }
  const relatedBugSchedule = scheduleById.get(activityId);
  if (relatedBugSchedule) {
    const tasksOfSch = tasksBySource.schedule.get(relatedBugSchedule.id);
    if (tasksOfSch?.some((t) => t.starred)) return true;
  }
  return false;
}

function buildStarredSet(ctx) {
  const out = new Set();
  const { tasksBySource, todoById, scheduleById } = ctx;
  for (const [actId, tasks] of tasksBySource.activity) {
    if (tasks.some((t) => t.starred)) out.add(actId);
  }
  for (const [todoId, tasks] of tasksBySource.todo) {
    if (!tasks.some((t) => t.starred)) continue;
    const todo = todoById.get(todoId);
    if (todo?.activityId != null) out.add(todo.activityId);
    out.add(todoId);
  }
  for (const [schId, tasks] of tasksBySource.schedule) {
    if (!tasks.some((t) => t.starred)) continue;
    const sch = scheduleById.get(schId);
    if (sch?.activityId != null) out.add(sch.activityId);
    out.add(schId);
  }
  return out;
}

function runScenario(N, tagCount, rowsSimulatingTagRenderer) {
  const ctx = buildSynthetic(N, tagCount, 0.08);
  const activityIds = ctx.activityIds;

  const itLegacy = Math.max(1, Math.floor(2000 / Math.max(1, N / 500)));
  const r1 = bench(
    `星标：逐条 legacy hasStar（N=${N}）`,
    itLegacy,
    () => {
      let c = 0;
      for (const aid of activityIds) {
        if (hasStarredLegacy(aid, ctx)) c++;
      }
      return c;
    },
  );

  const itSetHasOnly = Math.max(1, Math.floor(8000 / Math.max(1, N / 500)));
  const starredSetFrozen = buildStarredSet(ctx);
  const r2 = bench(
    `星标：仅 N 次 Set.has（Set 已建好，N=${N}）`,
    itSetHasOnly,
    () => {
      let c = 0;
      const s = starredSetFrozen;
      for (const aid of activityIds) {
        if (s.has(aid)) c++;
      }
      return c;
    },
  );

  const msBuildSet = onceMs(() => buildStarredSet(ctx));
  const msLegacyOnce = onceMs(() => {
    let c = 0;
    for (const aid of activityIds) {
      if (hasStarredLegacy(aid, ctx)) c++;
    }
    return c;
  });
  const s0 = buildStarredSet(ctx);
  const msSetPathOnce = onceMs(() => {
    let c = 0;
    for (const aid of activityIds) {
      if (s0.has(aid)) c++;
    }
    return c;
  });
  const rStarSingle = {
    name: `星标：单次重算对比（N=${N}）`,
    legacyFullMs: msLegacyOnce,
    buildSetMs: msBuildSet,
    scanHasOnlyMs: msSetPathOnce,
    setPathTotalMs: msBuildSet + msSetPathOnce,
  };

  // 每行 3 个 tagId，从 allTags 里解析
  const tagIdsPerRow = activityIds.slice(0, rowsSimulatingTagRenderer).map((aid) => [aid % tagCount || 1, (aid + 1) % tagCount || 1, (aid + 2) % tagCount || 1]);

  const itMapOld = Math.max(1, Math.floor(800 / Math.max(1, rowsSimulatingTagRenderer / 2000)));
  const r3 = bench(
    `标签：每行 new Map(allTags) + 3×get（行数=${rowsSimulatingTagRenderer}，|tags|=${tagCount}）`,
    itMapOld,
    () => {
      let sum = 0;
      for (const ids of tagIdsPerRow) {
        const m = new Map(ctx.allTags.map((t) => [t.id, t]));
        for (const id of ids) {
          const t = m.get(id);
          if (t) sum += t.id;
        }
      }
      return sum;
    },
  );

  const itMapShared = Math.max(1, Math.floor(8000 / Math.max(1, rowsSimulatingTagRenderer / 2000)));
  const r4 = bench(
    `标签：共享 Map 一次 + 每行 3×get（同上）`,
    itMapShared,
    () => {
      const m = new Map(ctx.allTags.map((t) => [t.id, t]));
      let sum = 0;
      for (const ids of tagIdsPerRow) {
        for (const id of ids) {
          const t = m.get(id);
          if (t) sum += t.id;
        }
      }
      return sum;
    },
  );

  const primaryTimes = activityIds.map((id) => id * 9973);
  const itSort = Math.max(1, Math.floor(400 / Math.max(1, N / 2000)));
  const r5 = bench(
    `排序：复制 primaryTime 数组并 sort（N=${N}）`,
    itSort,
    () => {
      const rows = activityIds.map((activityId, i) => ({ activityId, primaryTime: primaryTimes[i] }));
      rows.sort((a, b) => (b.primaryTime ?? 0) - (a.primaryTime ?? 0));
      return rows.length;
    },
  );

  return { loopResults: [r1, r2, r3, r4, r5], starSingle: rStarSingle };
}

function fmt(r) {
  const us = (r.perRunMs * 1000).toFixed(2);
  return `${r.name}\n  迭代=${r.iterations} 总耗时=${r.totalMs.toFixed(2)}ms 单次≈${us}μs（${r.perRunMs.toFixed(4)}ms）\n`;
}

function fmtStarSingle(r) {
  return (
    `${r.name}\n` +
    `  legacy 整段扫描一次 ≈ ${r.legacyFullMs.toFixed(3)}ms\n` +
    `  优化：建 Set 一次 ≈ ${r.buildSetMs.toFixed(3)}ms；再 N 次 .has 一段 ≈ ${r.scanHasOnlyMs.toFixed(3)}ms；合计 ≈ ${r.setPathTotalMs.toFixed(3)}ms\n`
  );
}

const lines = [];
lines.push("=== 假设验证：纯 JS（Node），不含 Vue DOM / 布局 / Naive 组件 ===\n");

const scales = [
  { N: 2000, tagCount: 80, rows: 2000 },
  { N: 8000, tagCount: 120, rows: 8000 },
];

for (const s of scales) {
  lines.push(`--- 规模 N=${s.N}, |tags|=${s.tagCount}, TagRenderer 等效行数=${s.rows} ---\n`);
  const { loopResults, starSingle } = runScenario(s.N, s.tagCount, s.rows);
  lines.push(fmtStarSingle(starSingle));
  for (const r of loopResults) lines.push(fmt(r));
  lines.push("");
}

lines.push("解读（简要）：\n");
lines.push("- 「单次重算」里若 legacy 与（建Set+has）同一量级，说明星标这段不是主瓶颈；体感主要来自别处。\n");
lines.push("- 「每行 new Map」与「共享 Map」倍数差大，说明 JS 里标签解析能省很多，但浏览器仍可能把总时间花在 DOM 上。\n");
lines.push("- 本脚本不测量：Vue 补丁、布局、绘制、Naive n-tag 实例化——这些常占关筛选卡顿的大头。\n");

const out = lines.join("");
process.stdout.write(out);
