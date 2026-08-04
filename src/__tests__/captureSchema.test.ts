import { describe, it, expect } from "vitest";
import { CaptureIntentListSchema } from "@/core/capture/schema";
import { extractJsonText } from "@/core/capture/aiMapper";

describe("capture schema / extractJsonText", () => {
  it("解析裸数组", () => {
    const raw = `[{"op":"create","kind":"todo","fields":{"title":"写周报","estPomo":2,"dueDayOffset":1},"confidence":"high"}]`;
    const parsed = CaptureIntentListSchema.parse(JSON.parse(extractJsonText(raw)));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].fields.title).toBe("写周报");
    expect(parsed[0].fields.estPomo).toBe(2);
    expect(parsed[0].fields.dueDayOffset).toBe(1);
  });

  it("解析 fenced json 与单对象", () => {
    const raw = "```json\n{\"op\":\"create\",\"kind\":\"todo\",\"fields\":{\"title\":\"买菜\"},\"confidence\":\"high\"}\n```";
    const parsed = CaptureIntentListSchema.parse(JSON.parse(extractJsonText(raw)));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].fields.title).toBe("买菜");
  });

  it("缺 op 时默认 create", () => {
    const parsed = CaptureIntentListSchema.parse([{ kind: "todo", fields: { title: "x" }, confidence: "high" }]);
    expect(parsed[0].op).toBe("create");
  });
});
