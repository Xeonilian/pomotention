// 模块无类声明自建textarea-caret.d.ts
declare module "textarea-caret" {
  /**
   * @param element textarea元素
   * @param position 光标下标
   * @returns {left: number, top: number}
   */
  export default function caret(
    element: HTMLTextAreaElement,
    position: number
  ): { top: number; left: number };
}
