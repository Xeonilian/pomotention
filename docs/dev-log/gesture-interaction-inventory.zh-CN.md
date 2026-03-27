# 手势与点击实施盘点（第一步）

本文档只描述现状，不定义目标行为；Composable 抽取与跨平台语义统一见后续步骤。

## 1. 模式代号（与计划一致）

- **A**：纯鼠标/语义化点击——`@click` / `@dblclick`（无自定义触摸分支）。
- **B**：Pointer 按下 + 移动阈值 → 拖拽或单击分流（与双击/长按体系独立）。
- **C**：触摸：**延迟单击**（定时器）+ **两次点击间隔**判定双击——用于 DayTodo 意图列、DaySchedule 标题/地点。
- **D**：触摸：**第一次抬起即执行「单击」语义** + **间隔内第二次抬起**为双击——用于 ActivitySection 标题行。
- **E**：`useLongPress`——定时长按（默认 600ms）；当前仅年视图日格与 composable 定义相关。
- **F**：在元素或 `document` 上使用 `preventDefault`、`stop/stopPropagation`、capture 监听等，改变浏览器/Naive UI 默认点击或滚动链。

**Naive UI**：未改组件库源码；「改写」均来自业务层事件与全局 `touchHandler`。

## 2. 语义与参数总表

| 区域 / 组件 | 桌面：单击 | 桌面：双击 | 移动：单击 | 移动：双击 / 长按 | 关键毫秒 |
|-------------|------------|------------|------------|-------------------|----------|
| **YearPlanner** 日格（当月） | `handleDayClick`：设应用日期、选中任务 | `handleDayDblClick`：emit 日视图 | `touchend` 始终 `handleDayClick`（与触摸路径并行） | `touchstart` + `useLongPress(600)`：`onLongPress` emit 日视图 | 长按 **600**；`useLongPress` 结束触摸后内部重置延迟 **300** |
| **DayTodo** 意图列 | 子格 `click` → `handleRowClick`；`dblclick` → `startEditing(title)` | 同左 | `isMobile`：`touchstart/end/cancel`；首击 **300ms 后** `handleRowClick`；300ms 内第二击 → `startEditing(title)` | 无独立长按 | **300**（`DOUBLE_CLICK_DELAY`） |
| **DaySchedule** 意图列 | 同 DayTodo 模式 | 同左 | 同 DayTodo（`handleTitleTouch*`） | 无独立长按 | **300** |
| **DaySchedule** 地点列 | 同左（`location` 字段） | 同左 | `handleLocationTouch*`（同 C 模式） | 无 | **300** |
| **ActivitySection** 标题区 | 输入聚焦等（见组件内 `handleTitleInputFocus`） | 桌面另有番茄格等 mousedown 双击逻辑 | **第一次 `touchend` 即 `handleFocusRow`**；300ms 内第二次 → `titleEditAllowed` + 聚焦标题输入 | 无与年视图相同的长按 | **300** |
| **useLongPress** | — | — | `onLongPressStart` 接受 `TouchEvent \| MouseEvent` | 定时触发 `onLongPress` | 默认 **600**；触摸结束重置 **300** |

## 3. 主文件：模板事件 ↔ 脚本处理（行号以当前仓库为准）

### 3.1 [`YearPlanner.vue`](../../src/components/YearPlanner/YearPlanner.vue)

| 模板位置 | 绑定 | 处理函数 / 说明 | 平台 |
|----------|------|-----------------|------|
| L6 | `@click` | `handleMonthTitleClick` | 全平台 |
| L15 | `@click` | `handleWeekClick` | 全平台 |
| L29–33 | `@click` / `@dblclick.stop` / `@touchstart.stop` / `@touchend.stop` / `@touchcancel.stop` | `handleDayClick` / `handleDayDblClick` / `handleDayTouchStart` / `handleDayTouchEnd` / `handleDayTouchCancel`（仅 `day && day.isCurrentMonth`） | 触摸分支仅移动端生效 |

| 脚本位置 | 内容 |
|----------|------|
| L56–57 | `import useLongPress` |
| L86 | `dayLongPressHandler`：`ref<ReturnType<typeof useLongPress> \| null>`，**懒创建单例** |
| L217–253 | `handleDayClick`、`handleDayDblClick`、`handleDayTouchStart`（`preventDefault` + 首次创建 `useLongPress({ delay: 600, onLongPress })`）、`handleDayTouchEnd`（`onLongPressEnd` 后 **仍** `handleDayClick`）、`handleDayTouchCancel` |

### 3.2 [`DayTodo.vue`](../../src/components/DayPlanner/DayTodo.vue)

| 模板位置 | 绑定 | 说明 |
|----------|------|------|
| L132 | `tr`：`@click.stop` | `handleRowClick` |
| L132–263 | 各子格大量 `@click.stop` | 开始/结束时间单击编辑、排序 popover、意图列等 |
| L240–246 | 意图列 `col-intent` | `@click.stop` → `handleRowClick`；`@dblclick.stop` → `startEditing(title)`；`@touchstart` / `@touchend` / `@touchcancel` → `handleTitleTouch*` |
| L548–558 | `watch(rankPopoverTodoId)` | `document` **capture**：`mousedown` + `touchstart`（passive）→ `handleRankPopoverClickOutside`（**F**） |

| 脚本位置 | 内容 |
|----------|------|
| L519–521 | `DOUBLE_CLICK_DELAY = 300`，`titleTapTimers`，`titleLastTapInfo` |
| L954–970 | `handleRowClick` |
| L980–1009 | `startEditing` |
| L1273–1305 | `handleTitleTouchStart` / `End` / `Cancel`（`isMobile` 卫语句；**C**） |

### 3.3 [`DaySchedule.vue`](../../src/components/DayPlanner/DaySchedule.vue)

| 模板位置 | 绑定 | 说明 |
|----------|------|------|
| L101–111 | `tr`：`@click.stop` | `handleRowClick(schedule)` |
| L199–208 | 意图列 | 与 DayTodo 对齐：`handleRowClick` + `dblclick` + `handleTitleTouch*` |
| L238–244 | 地点列 | `handleRowClick` + `dblclick` + `handleLocationTouch*` |

| 脚本位置 | 内容 |
|----------|------|
| L361 | `DOUBLE_CLICK_DELAY = 300` |
| L698–777 | `clearTitleTapTimer`、`handleTitleTouch*`、`handleLocationTouch*`（**C**；`isMobile`） |

### 3.4 [`ActivitySection.vue`](../../src/components/ActivitySheet/ActivitySection.vue)

| 模板位置 | 绑定 | 说明 |
|----------|------|------|
| L25 | 筛选按钮 | `@pointerdown.stop` `@mousedown.prevent.stop` `@touchstart.stop`（避免触发异常；**F**） |
| L79 | `@click.stop` | `handleCollapseParent` |
| L93–95 | 标题行触摸 | `handleTitleTouchStart` / `End` / `Cancel`（**D**；`isMobile`） |
| L107–109 | 拖拽柄 | `@pointerdown.prevent.stop="onDragStart"` + `@mousedown.prevent.stop` + `@touchstart.stop`（**B**） |
| L185–190 | 标签图标等 | `click` + `pointerdown/mousedown/touch` stop，避免与拖拽/标题吞事件混淆 |
| L257–260 | 番茄输入 | `mousedown` / `touchstart` / `touchend` / `touchcancel` → `handlePomoInput*`（桌面双击 + 移动触摸，**混合**） |

| 脚本位置 | 内容 |
|----------|------|
| L488–519 | `DOUBLE_CLICK_DELAY`、`pomoDoubleClickTimers`、`clickDragState`、`DRAG_THRESHOLD`（**B**） |
| L633–669 | `handleTitleTouchStart` / `End` / `Cancel`（**D**） |
| L705–743 | `onDragStart`：`hasChildren` 时进入阈值检测，否则 `dragHandler.startDrag` |

### 3.5 [`useLongPress.ts`](../../src/composables/useLongPress.ts)

| 行号 | 行为 |
|------|------|
| L4–7 | 可选 `delay`（默认 600）、`onLongPress` |
| L18–31 | `onLongPressStart`：按 `touchstart` 设 `isTouch`；`setTimeout` 触发回调 |
| L35–47 | `onLongPressEnd`：清定时器；触摸时延迟 300ms 再重置内部状态 |
| L51–57 | `onLongPressCancel`：立即清状态 |

**调用方注意**：返回的 `longPressTriggered` 未被 YearPlanner 用于阻止 `touchend` 上的 `handleDayClick`。

## 4. Pointer / 拖拽 / 调整尺寸（非长按·非双击 C/D）

以下与「表格标题双击 / 年视图长按」体系无关，仅作并列索引，避免混谈。

| 文件 | 作用（一行） |
|------|----------------|
| [`useDraggable.ts`](../../src/composables/useDraggable.ts) | `@pointerdown` → `handleDragStart`；`preventDefault` + 阈值 5px 拖拽（迷你浮窗等） |
| [`MainLayout.vue`](../../src/views/MainLayout.vue) L106 | 布局上拖拽柄：`@pointerdown="handleDragStart"`，使用 `useDraggable(5)` |
| [`useActivityDrag.ts`](../../src/composables/useActivityDrag.ts) | Activity 列表拖拽；模板约定 `@pointerdown="startDrag($event, item)"` |
| [`useResize.ts`](../../src/composables/useResize.ts) | `startResize`：分隔条拖动调整高度/宽度 |
| [`HomeView.vue`](../../src/views/HomeView.vue) L19 / L280 / L295 | 左/中/右分隔：`@pointerdown` → `startLeftResize` / `startVerticalResize` / `startRightResize` |
| [`SearchView.vue`](../../src/views/SearchView.vue) L114 | 非移动：`resize-handle-horizontal` + `touch-action: none` + `@pointerdown="resizeSearch.startResize"` |
| [`TimeBlocks.vue`](../../src/components/TimeTable/TimeBlocks.vue) L53 / L70 | Todo 段：`@pointerdown="enhancedHandlePointerDown"`（逻辑在 `useTimeBlocks`：选中/拖拽时间条等） |
| [`PomodoroTimer.vue`](../../src/components/PomotentionTimer/PomodoroTimer.vue) L4 | 可编辑文案：`@click.stop` + `@pointerdown.stop`，避免父级抢事件 |

## 5. 全局触摸辅助

| 文件 | 作用 |
|------|------|
| [`touchHandler.ts`](../../src/core/utils/touchHandler.ts) | `document`：`touchstart`/`touchmove`/`touchend`；非交互元素横向快滑时 `touchmove` 上 `preventDefault`（与 **F** 同类但全局） |

## 6. 第三步之前的差异清单（Backlog）

1. **C vs D（标题「单击」时机）**  
   DayTodo / DaySchedule：移动上单次点击意图（或地点）**晚 300ms** 才等价 `handleRowClick`。  
   ActivitySection：标题 **第一次 `touchend` 立即** `handleFocusRow`。  
   → 用户在手心切换两处时体感不一致。

2. **YearPlanner `handleDayTouchEnd`**  
   每次 `touchend` 在 `onLongPressEnd` 之后 **始终** 调用 `handleDayClick`。若已触发长按，`onLongPress` 已 emit 日视图，仍会再选中日/任务。是否预期需在第三步与 PM/自测确认。

3. **`useLongPress` 实例化方式**  
   YearPlanner 在首次触摸日格时 **创建一次** composable 并复用；回调闭包捕获的 `dayStartTs` 为**首次创建时**的那一天。若长期不销毁组件、用户改点其它日期，需核对 `onLongPress` 是否仍针对**当前手指按下**的那一天（当前实现仅在 `handler` 为 null 时 new，**不会**按每次 `touchstart` 的 `dayStartTs` 更新）。→ 第三步应改为每次按下更新回调或每格独立 handler。

4. **`longPressTriggered` 未消费**  
   `touchend` 未根据「是否刚触发长按」跳过或合并 `handleDayClick`，与第 2 条相关。

5. **常量分散**  
   `DOUBLE_CLICK_DELAY = 300` 出现在 DayTodo、DaySchedule、ActivitySection；长按 600 在 YearPlanner 调用与 `useLongPress` 默认中重复出现。第三步可收敛配置。

---

*文档版本：与仓库第一步梳理同步；行号若因编辑漂移请以 IDE 为准。*
