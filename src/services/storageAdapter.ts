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
    try {
      const data = await this.load();
      return data !== null;
    } catch (error) {
      console.error("Check data existence failed:", error);
      return false;
    }
  }

  async getMetadata(): Promise<SyncMetadata | null> {
    try {
      const data = await this.load();
      return data?.metadata || null;
    } catch (error) {
      console.error("获取元数据失败:", error);
      return null;
    }
  }
}
