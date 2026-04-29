// useTaskRecordShortcuts.ts
import { nextTick, type Ref } from "vue";

/** 仅列表标记、无正文：再次回车应退出列表而非续写前缀 */
function isEmptyMarkdownListLine(lineText: string): boolean {
  const line = lineText.replace(/\r$/, "");
  if (/^\s*---/.test(line)) return false;
  if (/^\s*-\s*\[\s*[xX ]\s*\]\s*$/.test(line)) return true;
  if (/^\s*-\s*$/.test(line)) return true;
  return false;
}

/** 无序/任务列表行：回车后下一行接续相同前缀（含缩进空格）；与 --- 分隔线区分；空列表行不续写 */
function getMarkdownListContinuationSuffix(lineText: string): string | null {
  const line = lineText.replace(/\r$/, "");
  if (/^\s*---/.test(line)) return null;
  if (isEmptyMarkdownListLine(lineText)) return null;
  const task = line.match(/^(\s*)-\s*\[\s*([xX ])\s*\]\s*/);
  if (task) {
    return `${task[1]}- [ ] `;
  }
  const bullet = line.match(/^(\s*-\s+)/);
  if (bullet) {
    return bullet[1];
  }
  const bareDash = line.match(/^(\s*)-\s*$/);
  if (bareDash) {
    return `${bareDash[1]}- `;
  }
  return null;
}

interface TaskRecordShortcutsOptions {
  content: Ref<string>;
  textarea: Ref<HTMLTextAreaElement | null>;
  stopEditing: () => void;
}

/**
 * 任务记录编辑器的快捷键处理逻辑
 * 集中管理所有键盘快捷键，便于后续扩展维护
 */
export function useTaskRecordShortcuts({
  content,
  textarea,
  stopEditing,
}: TaskRecordShortcutsOptions) {
  const handleKeydown = (event: KeyboardEvent) => {
    // 阻止默认行为的通用检查
    if (event.key === "Tab" || (event.altKey && event.shiftKey && event.key === "ArrowDown")) {
      event.preventDefault();
    }

    const textArea = event.target as HTMLTextAreaElement;
    if (!textArea) return;

    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const originalContent = content.value;

    // 1. Escape 键: 退出编辑
    if (event.key === "Escape") {
      stopEditing();
      return;
    }

    // 回车：空列表项（仅 - / - [ ] 等）删除标记并换行；有正文时续写列表前缀
    const isEnter =
      (event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter") &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      start === end;

    if (isEnter && !event.isComposing) {
      const lineStart = originalContent.lastIndexOf("\n", start - 1) + 1;
      let lineEnd = originalContent.indexOf("\n", start);
      if (lineEnd === -1) {
        lineEnd = originalContent.length;
      }
      const lineText = originalContent.substring(lineStart, lineEnd);

      if (isEmptyMarkdownListLine(lineText)) {
        event.preventDefault();
        const prefix = originalContent.substring(0, lineStart);
        const tail = originalContent.substring(lineEnd);
        content.value = prefix + tail;
        const newPos = tail.length > 0 ? lineStart : prefix.length;
        nextTick(() => {
          if (textarea.value) {
            textarea.value.selectionStart = textarea.value.selectionEnd = newPos;
            textarea.value.focus();
          }
        });
        return;
      }

      const listSuffix = getMarkdownListContinuationSuffix(lineText);
      if (listSuffix !== null) {
        event.preventDefault();
        const insert = "\n" + listSuffix;
        content.value = originalContent.substring(0, start) + insert + originalContent.substring(end);
        nextTick(() => {
          const pos = start + insert.length;
          if (textarea.value) {
            textarea.value.selectionStart = pos;
            textarea.value.selectionEnd = pos;
            textarea.value.focus();
          }
        });
        return;
      }
    }

    // 2. Alt+Shift+ArrowDown: 重复当前行
    if (event.altKey && event.shiftKey && event.key === "ArrowDown") {
      // 找到当前行的起始和结束位置
      const lineStart = originalContent.lastIndexOf("\n", start - 1) + 1;
      let lineEnd = originalContent.indexOf("\n", end);
      // 如果是最后一行，则行尾就是字符串的结尾
      if (lineEnd === -1) {
        lineEnd = originalContent.length;
      }

      const currentLineContent = originalContent.substring(lineStart, lineEnd);
      const contentToInsert = "\n" + currentLineContent;

      // 将复制的内容插入到当前行之后
      content.value = originalContent.substring(0, lineEnd) + contentToInsert + originalContent.substring(lineEnd);

      // 更新光标位置到新行的相同位置
      nextTick(() => {
        const newCursorPos = start + contentToInsert.length;
        if (textarea.value) {
          textarea.value.selectionStart = newCursorPos;
          textarea.value.selectionEnd = newCursorPos;
          textarea.value.focus();
        }
      });
      return; // 功能完成，提前返回
    }

    // --- 移动当前行：Alt + ArrowDown ---
    if (event.altKey && !event.shiftKey && event.key === "ArrowDown") {
      event.preventDefault(); // 阻止默认行为（如滚动页面）

      // 1. 定位当前行
      const lineStart = originalContent.lastIndexOf("\n", start - 1) + 1;
      let lineEnd = originalContent.indexOf("\n", start);
      if (lineEnd === -1) {
        lineEnd = originalContent.length;
      }

      // 如果当前行已经是最后一行，则无需移动
      if (lineEnd === originalContent.length) {
        return;
      }

      // 2. 提取当前行内容（包括换行符）
      const lineWithNewline = originalContent.substring(lineStart, lineEnd + 1);

      // 3. 定位下一行
      let nextLineEnd = originalContent.indexOf("\n", lineEnd + 1);
      if (nextLineEnd === -1) {
        nextLineEnd = originalContent.length;
      }

      // 4. 重组内容
      const partBefore = originalContent.substring(0, lineStart);
      const nextLineContent = originalContent.substring(lineEnd + 1, nextLineEnd + 1);
      const partAfter = originalContent.substring(nextLineEnd + 1);

      content.value = partBefore + nextLineContent + lineWithNewline + partAfter;

      // 5. 更新光标位置
      nextTick(() => {
        const newCursorPos = start + nextLineContent.length;
        if (textarea.value) {
          textarea.value.selectionStart = newCursorPos;
          textarea.value.selectionEnd = newCursorPos;
        }
      });

      return;
    }

    // --- 移动当前行：Alt + ArrowUp ---
    if (event.altKey && !event.shiftKey && event.key === "ArrowUp") {
      event.preventDefault();

      // 1. 定位当前行
      const lineStart = originalContent.lastIndexOf("\n", start - 1) + 1;
      let lineEnd = originalContent.indexOf("\n", start);
      if (lineEnd === -1) {
        lineEnd = originalContent.length;
      }

      // 如果当前行已经是第一行，则无需移动
      if (lineStart === 0) {
        return;
      }

      // 2. 提取当前行内容
      const currentLineContent = originalContent.substring(lineStart, lineEnd + 1);

      // 3. 定位上一行
      const prevLineStart = originalContent.lastIndexOf("\n", lineStart - 2) + 1;

      // 4. 重组内容
      const partBefore = originalContent.substring(0, prevLineStart);
      const prevLineContent = originalContent.substring(prevLineStart, lineStart);
      const partAfter = originalContent.substring(lineEnd + 1);

      content.value = partBefore + currentLineContent + prevLineContent + partAfter;

      // 5. 更新光标位置
      nextTick(() => {
        const newCursorPos = start - prevLineContent.length;
        if (textarea.value) {
          textarea.value.selectionStart = newCursorPos;
          textarea.value.selectionEnd = newCursorPos;
        }
      });

      return;
    }

    // 3. Tab 或 Shift+Tab: 缩进/取消缩进
    if (event.key === "Tab") {
      // 情况一：处理多行选择 (start 和 end 不在同一位置)
      if (start !== end) {
        let lineStart = originalContent.lastIndexOf("\n", start - 1) + 1;
        const selectedText = originalContent.substring(lineStart, end);
        let newSelectedText = "";
        let changeInLength = 0;

        if (event.shiftKey) {
          // Shift+Tab: 减少缩进
          newSelectedText = selectedText
            .split("\n")
            .map((line) => {
              if (line.startsWith("    ")) {
                changeInLength -= 4;
                return line.substring(4);
              } else if (line.startsWith("\t")) {
                changeInLength -= 1;
                return line.substring(1);
              }
              return line;
            })
            .join("\n");
        } else {
          // Tab: 增加缩进
          newSelectedText = selectedText
            .split("\n")
            .map((line) => {
              // 只为非空行增加缩进
              if (line.length > 0) {
                changeInLength += 4;
                return "    " + line;
              }
              return line;
            })
            .join("\n");
        }

        content.value = originalContent.substring(0, lineStart) + newSelectedText + originalContent.substring(end);

        nextTick(() => {
          if (textarea.value) {
            textarea.value.selectionStart = lineStart;
            textarea.value.selectionEnd = end + changeInLength;
            textarea.value.focus();
          }
        });
      } else {
        // 情况二：处理单行（光标在一点）
        if (event.shiftKey) {
          // Shift+Tab: 减少缩进
          const lineStart = originalContent.lastIndexOf("\n", start - 1) + 1;
          const lineContentBeforeCursor = originalContent.substring(lineStart, start);

          if (lineContentBeforeCursor.startsWith("    ")) {
            content.value = originalContent.substring(0, lineStart) + originalContent.substring(lineStart + 4);
            nextTick(() => {
              if (textarea.value) {
                textarea.value.selectionStart = textarea.value.selectionEnd = Math.max(start - 4, lineStart);
                textarea.value.focus();
              }
            });
          } else if (lineContentBeforeCursor.startsWith("\t")) {
            content.value = originalContent.substring(0, lineStart) + originalContent.substring(lineStart + 1);
            nextTick(() => {
              if (textarea.value) {
                textarea.value.selectionStart = textarea.value.selectionEnd = Math.max(start - 1, lineStart);
                textarea.value.focus();
              }
            });
          }
        } else {
          // Tab: 增加缩进
          const indent = "    ";
          content.value = originalContent.substring(0, start) + indent + originalContent.substring(end);

          nextTick(() => {
            if (textarea.value) {
              textarea.value.selectionStart = textarea.value.selectionEnd = start + indent.length;
              textarea.value.focus();
            }
          });
        }
      }
    }
  };

  return {
    handleKeydown,
  };
}
