import { describe, expect, it } from "vitest";
import { parseMarkdownWithToc, slugifyHeading } from "@/core/utils/markdownToc";

describe("markdownToc", () => {
  it("slugify keeps CJK and uniquifies duplicates via parse", () => {
    expect(slugifyHeading("中文 标题")).toBe("中文-标题");
    const { html, toc } = parseMarkdownWithToc("# A\n\n## B\n\n## B\n\n### 你好");
    expect(toc.map((t) => t.id)).toEqual(["a", "b", "b-1", "你好"]);
    expect(html).toContain('id="a"');
    expect(html).toContain('id="b-1"');
    expect(html).toContain('id="你好"');
  });
});
