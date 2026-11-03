// Project.ts — 项目文件夹（本地一等实体，云同步对标 Tag）

/**
 * 本地 Project（文件夹一等实体；云同步对标 Tag）。
 * - id：本地 timestamp 数字（云表 timestamp_id）；云行另有 uuid，不同步进本类型
 * - parentId：嵌套子文件夹，语义对齐 Activity.parentId
 * - tagId：可选智能助手（混合模型，非纯 tag 派生）
 *   - 仅当 Activity 尚无 projectId 时，按 tagIds 顺序第一个命中写入
 *   - 已有 projectId 后智能不再改（删 tag 不自动踢出/换堆）
 *   - 另可「一次性收纳」；手动进/出永远有效
 * - 归属真相在 Activity.projectId（多对一）
 * - memberIds：预留口，本关不读写；日后成员/协作再用
 */
export interface Project {
  id: number;
  title: string;
  description?: string;
  status?: "" | "ongoing" | "done" | "cancelled";
  dueDate?: number;
  /** 父项目；根为 null */
  parentId: number | null;
  /** 智能收入绑定的标签；未绑定 = 普通文件夹 */
  tagId?: number;
  /** 预留：成员 id 列表；本关不用 */
  memberIds?: number[];
  synced: boolean;
  lastModified: number;
  deleted: boolean;
  cloudModified?: number;
}
