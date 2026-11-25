/** 任务描述第一行的一级标题（`# `）。`##` 与没有标题行都不参与和 activity.title 的同步。 */

const H1_LINE = /^#(?!#)\s?(.*)$/;

/** `null`：第一行不是一级标题；`""`：只有 `#`；否则是标题正文 */
export function readTaskHeadingTitle(description: string): string | null {
  const first = description.split(/\r?\n/, 1)[0] ?? "";
  const matched = H1_LINE.exec(first);
  if (!matched) return null;
  return matched[1].trim();
}

/** 替换已有的一级标题行。没有 `#` 行时原样返回，不另起标题。 */
export function withTaskHeadingTitle(description: string, title: string): string {
  const lines = description.split(/\r?\n/);
  const first = lines[0] ?? "";
  if (!H1_LINE.test(first)) return description;
  const text = title.trim();
  const nextFirst = text ? `# ${text}` : "#";
  if (first === nextFirst) return description;
  lines[0] = nextFirst;
  return lines.join("\n");
}

/** activity.title 写进已有的 `#` 行（含空标题）。没有 `#` 行则不动。 */
export function replaceTaskHeadingFromActivity(description: string, activityTitle: string): string {
  if (readTaskHeadingTitle(description) == null) return description;
  return withTaskHeadingTitle(description, activityTitle);
}

/** 仅当第一行是空的 `#` 时，用 activity.title 补上。整篇只有 `#` 时补一个换行，方便接着写正文。 */
export function fillEmptyTaskHeading(description: string, activityTitle: string): string {
  if (readTaskHeadingTitle(description) !== "") return description;
  const text = activityTitle.trim();
  if (!text) return description;
  const next = withTaskHeadingTitle(description, text);
  if (!description.includes("\n") && description.trim() === "#") return `${next}\n`;
  return next;
}
