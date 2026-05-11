import type { AppActionId } from "@/actions/appActions";

export type ShortcutCategory = "navigation" | "activity" | "task" | "planner" | "timetable" | "timer";
export type ShortcutMode = "single" | "sequence";

export interface ShortcutDefinition {
  sequence: string;
  actionId: AppActionId;
  mode: ShortcutMode;
  category: ShortcutCategory;
  action: string;
  note: string;
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { sequence: "aa", actionId: "view.toggle.activity", mode: "single", category: "navigation", action: "切换区域显示", note: "Activity" },
  { sequence: "tt", actionId: "view.toggle.task", mode: "single", category: "navigation", action: "切换区域显示", note: "Task" },
  { sequence: "pp", actionId: "view.toggle.planner", mode: "single", category: "navigation", action: "切换区域显示", note: "Planner" },
  { sequence: "mm", actionId: "view.toggle.timetable", mode: "single", category: "navigation", action: "切换区域显示", note: "Timetable" },
  { sequence: "uu", actionId: "view.toggle.pomodoro", mode: "single", category: "navigation", action: "切换区域显示", note: "Timer" },
  { sequence: "vh", actionId: "route.go.home", mode: "sequence", category: "navigation", action: "页面跳转", note: "Home" },
  { sequence: "vp", actionId: "route.go.help", mode: "sequence", category: "navigation", action: "页面跳转", note: "Help" },
  { sequence: "vs", actionId: "route.go.search", mode: "sequence", category: "navigation", action: "页面跳转", note: "Search" },
  { sequence: "vd", actionId: "route.go.chart", mode: "sequence", category: "navigation", action: "页面跳转", note: "Data" },
  { sequence: "ve", actionId: "route.go.settings", mode: "sequence", category: "navigation", action: "页面跳转", note: "Setting" },
  { sequence: "an", actionId: "activity.navigator.enter", mode: "sequence", category: "activity", action: "进入 Activity 行选择模式", note: "随后可用 ↑/↓ 移动，数字选中，Enter/Esc 退出" },
  { sequence: "app", actionId: "activity.pick", mode: "sequence", category: "activity", action: "Activity 常用操作", note: "选中" },
  { sequence: "add", actionId: "activity.deleteOrRecover", mode: "sequence", category: "activity", action: "Activity 常用操作", note: "删改状态" },
  { sequence: "ach", actionId: "activity.adjustChildRelation", mode: "sequence", category: "activity", action: "Activity 常用操作", note: "子级关系" },
  { sequence: "ato", actionId: "activity.addTodo", mode: "sequence", category: "activity", action: "Activity 快速加入", note: "加入 Todo" },
  { sequence: "asc", actionId: "activity.addSchedule", mode: "sequence", category: "activity", action: "Activity 快速加入", note: "加入 Schedule" },
  { sequence: "aun", actionId: "activity.addUntaetigkeit", mode: "sequence", category: "activity", action: "Activity 快速加入", note: "加入 Untaetigkeit" },
  { sequence: "aqu", actionId: "activity.toggleQuadrant", mode: "sequence", category: "activity", action: "Activity 结构操作", note: "切象限" },
  { sequence: "aka", actionId: "activity.addKanbanSection", mode: "sequence", category: "activity", action: "Activity 结构操作", note: "增看板" },
  { sequence: "akd", actionId: "activity.removeLastKanbanSection", mode: "sequence", category: "activity", action: "Activity 结构操作", note: "删最后看板" },
  { sequence: "aet", actionId: "activity.editTitle", mode: "sequence", category: "activity", action: "Activity 编辑字段", note: "标题" },
  { sequence: "aed", actionId: "activity.editDueDate", mode: "sequence", category: "activity", action: "Activity 编辑字段", note: "日期" },
  { sequence: "aew", actionId: "activity.editPlace", mode: "sequence", category: "activity", action: "Activity 编辑字段", note: "地点" },
  { sequence: "ael", actionId: "activity.editDuration", mode: "sequence", category: "activity", action: "Activity 编辑字段", note: "时长" },
  { sequence: "aes", actionId: "activity.editScheduleTime", mode: "sequence", category: "activity", action: "Activity 编辑字段", note: "起始" },
  { sequence: "aep", actionId: "activity.editPomoEstimate", mode: "sequence", category: "activity", action: "Activity 编辑字段", note: "番茄估算" },
  { sequence: "are", actionId: "activity.repeatActivity", mode: "sequence", category: "activity", action: "仅重复 Activity", note: "复制活动并保持在 Activity 侧编辑" },
  { sequence: "tee", actionId: "task.openEditor", mode: "sequence", category: "task", action: "Task 操作", note: "编辑区" },
  { sequence: "tst", actionId: "task.toggleStar", mode: "sequence", category: "task", action: "Task 操作", note: "星标" },
  { sequence: "ttg", actionId: "task.openTagManager", mode: "sequence", category: "task", action: "Task 操作", note: "标签" },
  { sequence: "ten", actionId: "task.openEnergyDialog", mode: "sequence", category: "task", action: "Task 操作", note: "能量" },
  { sequence: "trw", actionId: "task.openRewardDialog", mode: "sequence", category: "task", action: "Task 操作", note: "奖励" },
  { sequence: "tin", actionId: "task.openInterruptionDialog", mode: "sequence", category: "task", action: "Task 操作", note: "打断" },
  { sequence: "ttm", actionId: "task.openTemplateDialog", mode: "sequence", category: "task", action: "Task 操作", note: "模板" },
  { sequence: "tpr", actionId: "task.goPrev", mode: "sequence", category: "task", action: "Task 切换", note: "上一个任务" },
  { sequence: "tnx", actionId: "task.goNext", mode: "sequence", category: "task", action: "Task 切换", note: "下一个任务" },
  { sequence: "pn", actionId: "planner.navigator.enter", mode: "sequence", category: "planner", action: "进入 Planner 行选择模式", note: "随后可用 ↑/↓ 移动，数字选中，Enter/Esc 退出" },
  { sequence: "pgp", actionId: "planner.gotoPrev", mode: "sequence", category: "planner", action: "Planner 日期翻页", note: "上一周期" },
  { sequence: "pgn", actionId: "planner.gotoNext", mode: "sequence", category: "planner", action: "Planner 日期翻页", note: "下一周期" },
  { sequence: "ptn", actionId: "planner.gotoCurrent", mode: "sequence", category: "planner", action: "Planner 定位当前", note: "当前周期" },
  { sequence: "ptd", actionId: "planner.gotoTodayDay", mode: "sequence", category: "planner", action: "Planner 定位当前", note: "今日并切 day 视图" },
  { sequence: "pdd", actionId: "planner.gotoDay", mode: "sequence", category: "planner", action: "Planner 视图切换", note: "day" },
  { sequence: "pww", actionId: "planner.gotoWeek", mode: "sequence", category: "planner", action: "Planner 视图切换", note: "week" },
  { sequence: "pmm", actionId: "planner.gotoMonth", mode: "sequence", category: "planner", action: "Planner 视图切换", note: "month" },
  { sequence: "pyy", actionId: "planner.gotoYear", mode: "sequence", category: "planner", action: "Planner 视图切换", note: "year" },
  { sequence: "pto", actionId: "planner.addTodo", mode: "sequence", category: "planner", action: "Planner 快速新增", note: "新增 Todo" },
  { sequence: "psc", actionId: "planner.addSchedule", mode: "sequence", category: "planner", action: "Planner 快速新增", note: "新增 Schedule（Untaetigkeit 归入 Schedule）" },
  { sequence: "pet", actionId: "planner.editTitle", mode: "sequence", category: "planner", action: "Planner 编辑字段", note: "标题" },
  { sequence: "pes", actionId: "planner.editStart", mode: "sequence", category: "planner", action: "Planner 编辑字段", note: "开始时间" },
  { sequence: "ped", actionId: "planner.editDone", mode: "sequence", category: "planner", action: "Planner 编辑字段", note: "完成状态" },
  { sequence: "peu", actionId: "planner.editDuration", mode: "sequence", category: "planner", action: "Planner 编辑字段", note: "时长" },
  { sequence: "pel", actionId: "planner.editLocation", mode: "sequence", category: "planner", action: "Planner 编辑字段", note: "地点" },
  { sequence: "pre", actionId: "planner.repeatActivity", mode: "sequence", category: "planner", action: "Planner 重复活动（含关联项）", note: "会连同 Todo 或 Schedule 关系一起重复" },
  { sequence: "pic", actionId: "planner.exportIcs", mode: "sequence", category: "planner", action: "Planner 导出 ICS", note: "需要当前行可导出" },
  { sequence: "med", actionId: "timetable.toggleEditor", mode: "sequence", category: "timetable", action: "Timetable 操作", note: "编辑开关" },
  { sequence: "mex", actionId: "timetable.exitEditor", mode: "sequence", category: "timetable", action: "Timetable 操作", note: "退出编辑" },
  { sequence: "mtt", actionId: "timetable.toggleType", mode: "sequence", category: "timetable", action: "Timetable 操作", note: "类型切换" },
  { sequence: "uwu", actionId: "timer.startWork", mode: "sequence", category: "timer", action: "计时器控制", note: "开始番茄工作（遵循可执行条件）" },
  { sequence: "ubr", actionId: "timer.startBreak", mode: "sequence", category: "timer", action: "计时器控制", note: "开始休息（遵循可执行条件）" },
  { sequence: "ust", actionId: "timer.stop", mode: "sequence", category: "timer", action: "计时器控制", note: "停止当前计时（遵循可执行条件）" },
];

export function buildShortcutActionMap(mode: ShortcutMode): Record<string, AppActionId> {
  const entries = SHORTCUT_DEFINITIONS.filter((item) => item.mode === mode).map((item) => [item.sequence, item.actionId] as const);
  return Object.fromEntries(entries);
}
