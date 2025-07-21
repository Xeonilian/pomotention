// core/types/Tag.ts

/**
 * 标签基本数据结构
 */
export interface Tag {
  id: number;
  name: string;
  color: string; // 文字颜色
  backgroundColor: string; // 背景颜色
  count: number;
}

export type TagSelectorInstance = {
  navigateDown: () => void;
  navigateUp: () => void;
  selectHighlighted: () => void;
  close: () => void;
};
