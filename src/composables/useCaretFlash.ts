// useCaretFlash.ts
import { ref } from "vue";
import caret from "textarea-caret"; // 直接导入默认的函数

export function useCaretFlash(duration = 800) {
  const showCaretFlash = ref(false);
  const caretFlashStyle = ref({
    left: "0px",
    top: "0px",
    height: "20px",
  });

  function flashCaretFlash(ta: HTMLTextAreaElement | null | undefined) {
    if (
      !ta ||
      !(ta instanceof HTMLTextAreaElement) ||
      typeof ta.selectionStart !== "number" ||
      !document.body.contains(ta)
    ) {
      return;
    }
    // 调用 caret 函数，传入 textarea 元素和光标位置
    const coords = caret(ta, ta.selectionStart);

    // 获取行高（从计算样式中）
    const style = getComputedStyle(ta);
    let lineHeight = parseFloat(style.lineHeight);
    if (isNaN(lineHeight)) {
      // 如果 lineHeight 为 'normal'，则设置为字体大小的1.2倍
      const fontSize = parseFloat(style.fontSize);
      lineHeight = fontSize ? fontSize * 1.2 : 20; // 默认20px
    }

    // 设置动画的位置和高度
    caretFlashStyle.value = {
      left: `${coords.left}px`,
      top: `${coords.top}px`,
      height: `${lineHeight}px`,
    };
    showCaretFlash.value = true;
    setTimeout(() => (showCaretFlash.value = false), duration);
  }

  return {
    showCaretFlash,
    caretFlashStyle,
    flashCaretFlash,
  };
}
