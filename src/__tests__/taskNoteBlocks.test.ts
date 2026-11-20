import { describe, expect, it } from "vitest";
import {
  appendEmptyNote,
  replaceNoteInner,
  splitTaskNotes,
} from "@/services/task/taskNoteBlocks";
import {
  applyHighlightMarkupInSource,
  removeHighlightMarkupInSource,
} from "@/services/task/taskRecordService";
import { createTaskMarkdown } from "@/core/utils/taskMarkdown";

describe("taskNoteBlocks", () => {
  it("splits :::note fences out of body", () => {
    const src = `# Title\n\nbody\n\n:::note\nhello\n:::\n\nmore`;
    const { body, notes } = splitTaskNotes(src);
    expect(notes).toHaveLength(1);
    expect(notes[0].inner).toBe("hello");
    expect(body).toContain("body");
    expect(body).toContain("more");
    expect(body).not.toContain(":::note");
  });

  it("replaceNoteInner only rewrites one fence", () => {
    const src = `a\n\n:::note\nold\n:::\n\nb`;
    const next = replaceNoteInner(src, 0, "new");
    expect(next).toContain(":::note\nnew\n:::");
    expect(next).not.toContain("old");
    expect(next).toContain("a");
    expect(next).toContain("b");
  });

  it("appendEmptyNote adds a fence", () => {
    expect(appendEmptyNote("hi")).toContain(":::note");
  });
});

describe("post highlight markup", () => {
  it("wraps unique selection", () => {
    const r = applyHighlightMarkupInSource("alpha beta gamma", "beta", "r");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.next).toBe("alpha ==r:beta== gamma");
  });

  it("rejects ambiguous selection", () => {
    const r = applyHighlightMarkupInSource("xx yy xx", "xx", "g");
    expect(r.ok).toBe(false);
  });

  it("unwraps unique post highlight", () => {
    const r = removeHighlightMarkupInSource("alpha ==r:beta== gamma", "beta", "r");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.next).toBe("alpha beta gamma");
  });

  it("unwraps plain yellow highlight", () => {
    const r = removeHighlightMarkupInSource("a ==plain== b", "plain", null);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.next).toBe("a plain b");
  });

  it("rejects ambiguous unwrap", () => {
    const r = removeHighlightMarkupInSource("==r:x== y ==r:x==", "x", "r");
    expect(r.ok).toBe(false);
  });

  it("renders post colors via shared marked", () => {
    const engine = createTaskMarkdown({ interactiveCheckboxes: false });
    const html = String(engine.parse("a ==r:red== ==g:green== ==plain=="));
    expect(html).toContain("highlight-r");
    expect(html).toContain("highlight-g");
    expect(html).toContain('class="highlight-text">plain<');
  });
});
