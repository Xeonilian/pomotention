# Supabase 同步机制说明

## 1. 整体流程

- **触发**：登录成功（含 INITIAL_SESSION / SIGNED_IN）→ `handleSignedInSession` → `initSyncLifecycle()` → **先上传再下载** 的 `syncAll()`。
- **时间戳来源**：`lastSyncTimestamp` 存在 `useSettingStore.settings.supabaseSync[0]`，下载时传入各 SyncService，用于增量查询（`last_modified > lastSyncTimestamp`）；全量时传 `0`（如新设备/重置）。
- **上传**：各表只上传 `synced === false` 的本地项，upsert 后回填 `synced = true`、`cloudModified`。
- **下载**：按表从 Supabase 拉取（直接表查询或 RPC），再在本地做「时间戳/冲突」判断，决定是否写入或跳过（见下）。

## 1.1 每次同步：先查库再在本地比对（问题出在「查库」这一步）

- **不是**「先全量下载到内存再比对」：每一张表都是 **先向数据库发查询**（表 select 或 RPC），**只拿到当前这一批行**，再在客户端用这批行和本地内存里的数据做比对、合并。
- **流程**：  
  1. **查库**：对 activities/tasks/todos/… 分别发请求（带 `user_id` 和可选的 `last_modified > lastSyncTimestamp`），拿到一批行（**若 DB/PostgREST 有 1000 行上限，这里最多就 1000 行**）。  
  2. **本地比对**：用这批行的 id 在本地找对应项，按「云端删除 / 本地不存在则新增 / 本地存在则比时间戳决定是否覆盖」等规则合并。  
- **结论**：若某表超过 1000 行，且查库那一步被 1000 行限制截断，则**没被查出来的行根本不会参与比对**，所以会「少数据」。问题在 **数据库查询阶段**（返回行数被截断），不是「比对逻辑」写错。

## 2. 数据层 vs 应用层

- **数据层（云端是否缺失）**：若某条 task/activity 从未被上传成功，则云端表里没有该行，下载再怎么做也不会出现。可能原因：上传前未把 `synced` 置为 false、上传失败未重试、或上传时机晚于下载（如登录后先下载再本地编辑未上传）。
- **应用层（放行/时间戳比对）**：云端有数据，但下载时被过滤掉。可能原因：
  - **增量查询**：`last_modified > lastSyncTimestamp`，若 `lastSyncTimestamp` 被更新得比云端记录的 `last_modified` 还新，则该条不会被拉取。
  - **本地未同步保护**：若本地已有同 id 且 `synced === false`，下载会跳过该条（避免覆盖未上传的本地修改）。
  - **时间戳比较**：增量时若 `cloudTimestamp <= localItem.cloudModified` 会跳过更新。

## 3. 各实体下载入口

| 实体       | 下载方式           | 增量条件                         |
|------------|--------------------|----------------------------------|
| activities | BaseSyncService    | `last_modified > lastSyncTimestamp` |
| todos      | RPC `get_full_todos`   | 同上（RPC 内用 `p_last_modified`） |
| schedules  | RPC `get_full_schedules`| 同上 |
| tasks      | RPC `get_full_tasks`   | 同上 |
| tags       | BaseSyncService    | 同上 |
| templates  | BaseSyncService    | 同上 |

## 4. 关键指标（诊断用）

- **lastSyncTimestamp**：下载前/后的值；若下载后更新，则下次下载为增量。
- **fetched**：从 DB/RPC 拿到的行数。
- **applied（downloaded）**：通过时间戳/冲突判断后实际写入本地的条数。
- **清除后本底**：清除本地数据并重置 lastSyncTimestamp 后，本地列表应为空；再全量下载可验证「本底空 + 云端拉取数 = 写入数」。

## 5. 编辑后 debounce 上传（已实现）

- **本地写入链**：业务侧 `saveAllDebounced()`（约 800ms 合并）→ `useDataStore.saveAllNow` 写 activities/todos/schedules/tasks → 成功后 **动态** `import("@/core/utils/autoSync")` 调用 `uploadAllDebounced()`（**5s** 合并多次保存，再执行 `uploadAll()`）。
- **前置条件**：`settings.autoSupabaseSync` 开启且已登录；否则 `uploadAllDebounced` 内部会直接返回。
- **其它触发**仍保留：失焦/切后台 `src/services/appCloseHandler.ts` 短防抖上传、回前台防抖下载/全量同步；`BaseSyncService.scheduleAutoUpload` 仍为表级可选能力，当前主路径不依赖它。
