import { describe, it, expect } from "vitest";
import { highlightSearchInText, highlightSearchInHtml } from "@/core/utils/highlightSearchQuery";

describe("highlightSearchInText", () => {
  it("wraps case-insensitive matches and escapes html", () => {
    expect(highlightSearchInText("确定测试功能与测试", "测试")).toBe(
      '确定<mark class="search-hit">测试</mark>功能与<mark class="search-hit">测试</mark>',
    );
    expect(highlightSearchInText("A <b> B", "x")).toBe("A &lt;b&gt; B");
  });

  it("returns escaped text only when query empty", () => {
    expect(highlightSearchInText("ab", "  ")).toBe("ab");
    expect(highlightSearchInText("a<b", "")).toBe("a&lt;b");
  });
});

describe("highlightSearchInHtml", () => {
  it("highlights text nodes only", () => {
    const html = "<p>确定测试</p><span class=\"x\">测</span>";
    expect(highlightSearchInHtml(html, "测试")).toBe(
      '<p>确定<mark class="search-hit">测试</mark></p><span class="x">测</span>',
    );
  });

  it("no-ops when query empty", () => {
    expect(highlightSearchInHtml("<p>a</p>", "")).toBe("<p>a</p>");
  });
});
