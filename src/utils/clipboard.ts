export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* 降级 */
    }
  }
  try {
    const active = document.activeElement as HTMLElement | null;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "0";
    ta.style.top = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = document.execCommand("copy");
    document.body.removeChild(ta);

    if (!ok) {
      const div = document.createElement("div");
      div.textContent = text;
      div.setAttribute("contenteditable", "true");
      div.style.position = "fixed";
      div.style.left = "0";
      div.style.top = "0";
      div.style.opacity = "0";
      div.style.pointerEvents = "none";
      div.style.whiteSpace = "pre-wrap";
      document.body.appendChild(div);

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(div);
      selection?.removeAllRanges();
      selection?.addRange(range);
      ok = document.execCommand("copy");
      selection?.removeAllRanges();
      document.body.removeChild(div);
    }

    if (active?.focus) active.focus();
    window.scrollTo(scrollX, scrollY);
    return ok;
  } catch {
    return false;
  }
}
