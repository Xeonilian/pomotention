// src/core/types/Template.ts

export interface Template {
  id: number; // 模板的唯一标识符，timestamp
  title: string; // 模板的标题
  content: string; // 模板的内容
  synced: boolean; // 是否已同步
  deleted: boolean; // 是否已删除
  lastModified: number; // 最后修改时间
}
