import { describe, expect, it } from "vitest";
import {
  fillEmptyTaskHeading,
  readTaskHeadingTitle,
  replaceTaskHeadingFromActivity,
} from "@/services/task/taskHeadingTitle";

describe("taskHeadingTitle", () => {
  it("只认第一行一级标题", () => {
    expect(readTaskHeadingTitle("#")).toBe("");
    expect(readTaskHeadingTitle("# 写周报")).toBe("写周报");
    expect(readTaskHeadingTitle("# 写周报\n\n正文")).toBe("写周报");
    expect(readTaskHeadingTitle("## 二级")).toBeNull();
    expect(readTaskHeadingTitle("正文")).toBeNull();
    expect(readTaskHeadingTitle("")).toBeNull();
  });

  it("空标题行补 activity.title，并保留正文", () => {
    expect(fillEmptyTaskHeading("#", "写周报")).toBe("# 写周报\n");
    expect(fillEmptyTaskHeading("#\n\n- 下一步", "写周报")).toBe("# 写周报\n\n- 下一步");
    expect(fillEmptyTaskHeading("# 已有", "写周报")).toBe("# 已有");
    expect(fillEmptyTaskHeading("没有标题", "写周报")).toBe("没有标题");
  });

  it("activity.title 变化时改写已有 # 行", () => {
    expect(replaceTaskHeadingFromActivity("# 旧题\n\n正文", "新题")).toBe("# 新题\n\n正文");
    expect(replaceTaskHeadingFromActivity("#\n正文", "新题")).toBe("# 新题\n正文");
    expect(replaceTaskHeadingFromActivity("正文", "新题")).toBe("正文");
    expect(replaceTaskHeadingFromActivity("# 新题", "新题")).toBe("# 新题");
  });
});
