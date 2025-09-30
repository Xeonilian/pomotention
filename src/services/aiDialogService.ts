// aiDialogService.ts
// 基于本地对话构建日程制定 prompt
import type { TaskPlanningContext, GuideQuestion } from "@/core/types/Dialog";

export const guideQuestions: GuideQuestion[] = [
  // { key: "goal", question: "你的项目目标和动机是什么？" },
  // { key: "criteria", question: "什么情况下算作项目完成？有哪些具体的成功标准？" },
  // { key: "progress", question: "目前项目进展如何？已经完成了哪些部分？" },
  // { key: "constraints", question: "有什么限制条件吗？比如参与人、时间、资源、技术限制等。" },
  {
    key: "vision",
    question: "想象一下项目成功完成的那一天，你最希望看到的成果是什么？它解决了什么问题或带来了什么价值？",
  },
  {
    key: "deliverables",
    question: "为了实现这个成果，我们需要创建或交付哪些最核心的东西？（比如：一个网站、一份报告、一个活动）",
  },
  {
    key: "success_criteria",
    question: "我们如何判断这件事做成了？有没有一两个关键的衡量标准？（比如：100个早期用户、完成第一笔订单）",
  },
  {
    key: "timeline",
    question: "关于时间，有必须遵守的截止日期吗？或者你期望在大概什么时候看到初步成果？",
  },
  {
    key: "team_resource",
    question: "这个项目由谁来主导？除了你之外，还有哪些关键的参与人或需要的核心资源？",
  },
  {
    key: "blockers",
    question: "预想一下，在推进过程中，可能会遇到最大的挑战或障碍是什么？",
  },
  // 添加更多如果需要
];

export const shouldStartTaskPlanning = (input: string): boolean => {
  const triggers = ["规划", "计划", "拆解", "任务", "项目", "制定", "安排", "管理", "分解", "重置", "重新"];
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
完成标准：${gatheredInfo.criteria || "未指定"}  
当前进展：${gatheredInfo.progress || "未指定"}
限制条件：${gatheredInfo.constraints || "未指定"}  
`;
};

export const buildTaskPromptV2 = (context: TaskPlanningContext): string => {
  const { gatheredInfo } = context;

  // 使用新的、更精炼的6个维度来构建提示
  return `
最终愿景与价值：${gatheredInfo.vision || "尚未明确具体的最终成果和价值"}
核心交付物：${gatheredInfo.deliverables || "尚未明确需要产出的核心交付物"}
关键成功标准：${gatheredInfo.success_criteria || "尚未设定明确的衡量标准"}
时间规划与节点：${gatheredInfo.timeline || "尚未确定关键的时间节点或截止日期"}
参与人与核心资源：${gatheredInfo.team_resource || "尚未明确项目的主导者和所需资源"}
预见的挑战与障碍：${gatheredInfo.blockers || "尚未预估潜在的挑战"}
`;
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
