// src/services/taskRecordService.ts
/**
 * 提取点击上下文的“文本片段”
 */
export function getClickContextFragments(
  target: HTMLElement,
  container: HTMLElement
): string[] {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }
  // 找到被点击的文本节点
  let clickedNode = textNodes.find(
    (n) => n.parentElement === target || n.parentNode === target
  );
  if (!clickedNode && target.childNodes.length > 0) {
    clickedNode = Array.from(target.childNodes).find(
      (child) => child.nodeType === Node.TEXT_NODE
    ) as Text | undefined;
  }
  if (!clickedNode) return [];
  const idx = textNodes.indexOf(clickedNode);
  const windowSize = 2;
  return textNodes
    .slice(
      Math.max(0, idx - windowSize),
      Math.min(textNodes.length, idx + windowSize + 1)
    )
    .map((n) => n.textContent?.trim() || "")
    .filter(Boolean);
}

/**
 * 在 source 文本中查找片段序列的最后结尾位置
 * 用于快速精确“锚定”原markdown行
 */
export function findFragmentSequenceInSource(
  source: string,
  fragments: string[]
): number | null {
  let currIdx = 0;
  for (let frag of fragments) {
    const foundIdx = source.indexOf(frag, currIdx);
    if (foundIdx === -1) return null;
    currIdx = foundIdx + frag.length;
  }
  return currIdx;
}
