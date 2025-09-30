import { describe, it, expect } from "vitest";
import { shouldStartTaskPlanning, getNextQuestion, buildTaskPrompt, guideQuestions } from "../services/aiDialogService";
import { DialogState } from "@/core/types/Dialog";
import type { TaskPlanningContext } from "@/core/types/Dialog";

describe("AI 对话服务测试", () => {
  // 测试 1: 检测任务规划触发词
  it("应该正确识别任务规划触发词", () => {
    // 这些输入应该触发任务规划
    expect(shouldStartTaskPlanning("帮我规划学习Vue3")).toBe(true);
    expect(shouldStartTaskPlanning("制定一个项目计划")).toBe(true);
    expect(shouldStartTaskPlanning("我想做个任务拆解")).toBe(true);

    // 这些输入不应该触发
    expect(shouldStartTaskPlanning("你好")).toBe(false);
    expect(shouldStartTaskPlanning("今天天气怎么样")).toBe(false);
  });

  // 测试 2: 问题流程
  it("应该按顺序返回引导问题", () => {
    // 创建一个测试上下文
    const context: TaskPlanningContext = {
      state: DialogState.GATHERING_INFO,
      gatheredInfo: {},
      currentStep: 0,
    };

    // 测试第一个问题
    const firstQuestion = getNextQuestion(context);
    expect(firstQuestion).toBe(guideQuestions[0].question);

    // 模拟回答第一个问题
    context.currentStep = 1;
    const secondQuestion = getNextQuestion(context);
    expect(secondQuestion).toBe(guideQuestions[1].question);

    // 模拟回答所有问题后
    context.currentStep = guideQuestions.length;
    const noMoreQuestions = getNextQuestion(context);
    expect(noMoreQuestions).toBeNull();
  });

  // 测试 3: 生成最终 Prompt
  it("应该根据收集的信息生成完整的任务规划 Prompt", () => {
    const context: TaskPlanningContext = {
      state: DialogState.GATHERING_INFO,
      gatheredInfo: {
        goal: "学习Vue3框架",
        criteria: "2个月",
        progress: "有基础的JavaScript经验",
        constraints: "有时间，想要实战项目",
      },
      currentStep: 4,
    };

    const prompt = buildTaskPrompt(context);

    // 检查 prompt 包含所有必要信息
    expect(prompt).toContain("学习Vue3框架");
    expect(prompt).toContain("2个月");
    expect(prompt).toContain("有基础的JavaScript经验");
    expect(prompt).toContain("有时间，想要实战项目");
    expect(prompt).toContain("任务拆解");
  });

  // 测试 4: 完整流程模拟
  it("完整的任务规划流程测试", () => {
    console.log("🚀 开始完整流程测试...");

    // 1. 检测触发
    const userInput = "帮我规划学习Vue3";
    const shouldStart = shouldStartTaskPlanning(userInput);
    console.log(`📝 输入: "${userInput}"`);
    console.log(`✅ 触发任务规划: ${shouldStart}`);
    expect(shouldStart).toBe(true);

    // 2. 初始化上下文
    const context: TaskPlanningContext = {
      state: DialogState.GATHERING_INFO,
      gatheredInfo: {},
      currentStep: 0,
    };

    // 3. 模拟问答流程
    const answers = ["学习Vue3框架，做一个完整的项目", "2个月时间", "有JavaScript基础，用过一点React", "每天2小时，想做实战项目"];

    answers.forEach((answer, index) => {
      const question = getNextQuestion(context);
      console.log(`❓ 问题 ${index + 1}: ${question}`);

      // 模拟用户回答 - 添加类型断言
      const questionKey = guideQuestions[index].key;
      context.gatheredInfo[questionKey] = answer;
      context.currentStep++;
      console.log(`💬 回答: ${answer}`);
    });

    // 4. 生成最终 prompt
    const finalPrompt = buildTaskPrompt(context);
    console.log("📋 生成的最终 Prompt:");
    console.log(finalPrompt);

    expect(context.currentStep).toBe(4);
    expect(Object.keys(context.gatheredInfo)).toHaveLength(4);
  });
});
