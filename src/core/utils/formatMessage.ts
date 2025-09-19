// utils/formatMessage.ts
import { marked } from "marked";
export const formatMessage = (content: string) => {
  // 可选：配置 marked（根据需要启用/禁用特性）
  marked.setOptions({
    breaks: true, // 让单个换行也渲染为 <br>
    gfm: true, // GitHub 风格 Markdown（表格、任务列表等）
  });

  return marked.parse(content); // 返回 HTML 字符串
};
