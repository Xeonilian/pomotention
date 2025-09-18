// aiDialogService.ts
// 基于本地对话构建日程制定 prompt

import type { TaskPlanningContext, GuideQuestion } from "@/core/types/Dialog";

export const guideQuestions: GuideQuestion[] = [
  { key: "goal", question: "请详细描述您的项目目标是什么？" },
  { key: "criteria", question: "什么情况下算作项目完成？有哪些具体的成功标准？" },
  { key: "progress", question: "目前项目进展如何？已经完成了哪些部分？" },
  { key: "constraints", question: "有什么限制条件吗？比如时间、资源、技术限制等。" },
  // 添加更多如果需要
];

export const shouldStartTaskPlanning = (input: string): boolean => {
  const triggers = ["规划", "计划", "拆解", "任务", "项目", "制定", "安排", "管理", "分解"];
  return triggers.some((trigger) => input.toLowerCase().includes(trigger));
};

export function getNextQuestion(context: TaskPlanningContext): string | null {
  if (context.currentStep >= guideQuestions.length) return null;
  return guideQuestions[context.currentStep].question;
}

export const buildTaskPrompt = (context: TaskPlanningContext): string => {
  const { gatheredInfo } = context;
  return `请帮我制定一个详细的任务执行计划：

项目目标：${gatheredInfo.goal || "未指定"}
完成标准：${gatheredInfo.criteria || "未指定"}  // 修复：原为 timeline
当前进展：${gatheredInfo.progress || "未指定"}  // 修复：原为 experience
限制条件：${gatheredInfo.constraints || "未指定"}  // 修复：原为 resources

请基于WOOP和SMART原理制定今日计划：

1. 难度评估：影响范围(S) + 可控性(C) + 他人可感知性(UV)
   - S1/S2/S3：局部操作/多技能整合/系统性变化
   - C1/C2：流程清晰/存在未知
   - UV0/UV1：仅自己知晓/他人可直接感知

2. 任务拆解（列出3-8个主要任务+产出）
3. 时间估算（每个任务的预计用时，单位个番茄=25min，上限20个）
4. 优先级排序
5. 具体行动步骤，包括if-then执行意图

请确保计划具体可执行，适合导入到时间管理系统中。`;
};

// 兜底对话
export const getFallbackReply = (input: string): string => {
  if (input.includes("你好") || input.toLowerCase().includes("hello")) {
    return "喵喵喵~";
  } else if (input.includes("时间") || input.includes("几点")) {
    return `现在是 ${new Date().toLocaleTimeString()}，希望你的时间管理很顺利！`;
  } else if (input.includes("番茄") || input.toLowerCase().includes("pomodoro")) {
    return "番茄工作法是一个很好的时间管理技巧！建议你专注工作25分钟，然后休息5分钟。";
  } else {
    return "喵喵喵~";
  }
};
