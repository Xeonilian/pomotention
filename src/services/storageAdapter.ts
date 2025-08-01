// src/services/storageAdapter.ts

/**
 * 存储适配器
 *
 * 为不同的云存储服务提供统一的接口，支持数据的保存、加载和元数据查询。
 *
 * 支持的存储类型：
 * - WebDAV：通过 WebDAV 协议访问各种云存储（坚果云、Nextcloud 等）
 * - API Server：自建服务器 API 接口
 * - 未来可扩展：Google Drive、Dropbox、OneDrive 等
 *
 * 使用示例：
 * ```typescript
 * // WebDAV 存储
 * const webdavAdapter = new WebDAVStorageAdapter(webdavConfig);
 *
 * // 自建服务器
 * const apiAdapter = new APIStorageAdapter(apiUrl, token);
 *
 * // 统一使用方式
 * const success = await adapter.save(syncData);
 * const data = await adapter.load();
 * ```
 *
 * 设计原则：
 * - 统一接口：所有存储适配器实现相同的 StorageAdapter 接口
 * - 错误处理：适配器内部处理网络错误，返回明确的成功/失败状态
 * - 类型安全：完整的 TypeScript 类型定义和数据验证
 */

import { WebDAVConfig, writeData, readData } from "./webdavService";
import type { SyncData, SyncMetadata } from "@/core/types/Sync";

export interface StorageAdapter {
  save(data: SyncData): Promise<boolean>;
  load(): Promise<SyncData | null>;
  exists(): Promise<boolean>;
  getMetadata(): Promise<SyncMetadata | null>;
}

export class WebDAVStorageAdapter implements StorageAdapter {
  constructor(private config: WebDAVConfig) {}

  async save(data: SyncData): Promise<boolean> {
    try {
      return await writeData(
        this.config,
        JSON.stringify(data, null, 2),
        "sync-data.json"
      );
    } catch (error) {
      console.error("WebDAV save failed:", error);
      return false;
    }
  }

  async load(): Promise<SyncData | null> {
    try {
      const content = await readData(this.config, "sync-data.json");
      return content ? (JSON.parse(content) as SyncData) : null;
    } catch (error) {
      console.error("WebDAV load failed:", error);
      return null;
    }
  }

  async exists(): Promise<boolean> {
    const data = await this.load();
    return data !== null;
  }

  async getMetadata(): Promise<SyncMetadata | null> {
    const data = await this.load();
    return data?.metadata || null;
  }
}

// // 未来的 API 适配器
// export class APIStorageAdapter implements StorageAdapter {
//   constructor(private apiUrl: string, private token: string) {}

//   async save(data: SyncData): Promise<boolean> {
//     // TODO: 实现 API 上传
//     throw new Error("Not implemented yet");
//   }

//   async load(): Promise<SyncData | null> {
//     // TODO: 实现 API 下载
//     throw new Error("Not implemented yet");
//   }

//   async exists(): Promise<boolean> {
//     // TODO: 实现存在性检查
//     throw new Error("Not implemented yet");
//   }

//   async getMetadata(): Promise<SyncMetadata | null> {
//     // TODO: 实现元数据获取
//     throw new Error("Not implemented yet");
//   }
// }
