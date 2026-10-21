import { nextTick, ref, watch } from "vue";
import { describe, expect, it } from "vitest";
import { useTaskRecordShortcuts } from "@/composables/task/useTaskRecordShortcuts";

function setup(initial: string) {
  const content = ref(initial);
  const el = document.createElement("textarea");
  el.value = initial;
  const textarea = ref<HTMLTextAreaElement | null>(el);
  const { handleKeydown } = useTaskRecordShortcuts({
    content,
    textarea,
    stopEditing: () => {},
  });
  el.addEventListener("keydown", handleKeydown);
  // 模拟 v-model：内容先写回 textarea，nextTick 里才能把光标放到新长度之后
  watch(content, (value) => {
    el.value = value;
  }, { flush: "sync" });
  return { content, el };
}

async function press(el: HTMLTextAreaElement, cursor: number, init: KeyboardEventInit) {
  el.selectionStart = cursor;
  el.selectionEnd = cursor;
  el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
  await nextTick();
}

describe("task record markdown shortcuts", () => {
  it("最后一行没有换行时 Alt+Up 不把两行粘在一起", async () => {
    const { content, el } = setup("line1\nline2");
    await press(el, 8, { key: "ArrowUp", altKey: true });
    expect(content.value).toBe("line2\nline1");
    expect(el.selectionStart).toBe(2);
  });

  it("最后一行有换行时 Alt+Up 仍整行交换", async () => {
    const { content, el } = setup("line1\nline2\n");
    await press(el, 8, { key: "ArrowUp", altKey: true });
    expect(content.value).toBe("line2\nline1\n");
    expect(el.selectionStart).toBe(2);
  });

  it("把上一行 Alt+Down 到没有换行的文末行时不粘连", async () => {
    const { content, el } = setup("line1\nline2");
    await press(el, 2, { key: "ArrowDown", altKey: true });
    expect(content.value).toBe("line2\nline1");
    expect(el.selectionStart).toBe(8);
  });

  it("光标在任务标记内回车：整行下移，上面新开未勾选标记", async () => {
    const { content, el } = setup("- [x] milk");
    await press(el, 3, { key: "Enter" });
    expect(content.value).toBe("- [ ] \n- [x] milk");
    expect(el.selectionStart).toBe(6);
  });

  it("光标在无序列表标记内回车：整行下移并续同样的 -", async () => {
    const { content, el } = setup("keep\n- milk");
    await press(el, 5, { key: "Enter" });
    expect(content.value).toBe("keep\n- \n- milk");
    expect(el.selectionStart).toBe(7);
  });

  it("光标在标题标记内回车：整行下移，上面新开 -", async () => {
    const { content, el } = setup("# Title");
    await press(el, 1, { key: "Enter" });
    expect(content.value).toBe("- \n# Title");
    expect(el.selectionStart).toBe(2);
  });

  it("光标已在正文上时回车仍从光标处拆开", async () => {
    const { content, el } = setup("- [ ] milk");
    await press(el, 8, { key: "Enter" });
    expect(content.value).toBe("- [ ] mi\n- [ ] lk");
    expect(el.selectionStart).toBe(15);
  });

  it("空任务标记回车仍退出列表", async () => {
    const { content, el } = setup("keep\n- [ ] ");
    await press(el, 8, { key: "Enter" });
    expect(content.value).toBe("keep\n");
  });
});
