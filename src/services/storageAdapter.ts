import {
  writeData,
  readData,
  deleteData,
  createFolder,
  testLogin,
} from "./webdavService";
import type { SyncData, SyncMetadata } from "@/core/types/Sync";

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  save(data: SyncData): Promise<boolean>;
  load(): Promise<SyncData | null>;
  exists(): Promise<boolean>;
  getMetadata(): Promise<SyncMetadata | null>;
  login(): Promise<boolean>;
}

/**
 * WebDAV 存储适配器
 */
export class WebDAVStorageAdapter implements StorageAdapter {
  constructor() {}
  async login(): Promise<boolean> {
    return await testLogin();
  }

  async save(data: SyncData): Promise<boolean> {
    const { metadata, data: payload } = data;
    // console.log("Saving data:", data);

    if (
      !metadata ||
      !metadata.timestamp ||
      !metadata.deviceId ||
      !metadata.version
    ) {
      console.error("Invalid metadata.");
      return false;
    }

    // metadata 构造
    const metadataContent = JSON.stringify(metadata);
    const metadataFileName = "metadata.json";

    // 写入文件
    const saveMetadataSuccess = await writeData(
      metadataFileName,
      metadataContent
    );
    if (!saveMetadataSuccess) {
      console.error("Failed to save sync data.");
      return false;
    }
    for (const key in payload) {
      if (payload.hasOwnProperty(key)) {
        const content = JSON.stringify(payload[key]); // 将 value 转换为 JSON 字符串
        const fileName = `${key}.json`; // 文件名使用 key

        const saveSuccess = await writeData(fileName, content);
        if (!saveSuccess) {
          console.error(`Failed to save ${fileName} to WebDAV.`);
          return false;
        }
      }
    }
    return true;
  }

  // 在 WebDAVStorageAdapter.ts 中修改

  async load(): Promise<SyncData | null> {
    const metadataFileName = "metadata.json";
    try {
      const metadataContent = await readData(metadataFileName);
      if (!metadataContent) {
        console.warn("未在云端找到 metadata.json 文件。");
        return null;
      }

      // 1. 解析元数据
      const metadata = JSON.parse(metadataContent) as SyncMetadata;

      // 2. TODO: 将来在这里也需要加载 payload 数据
      //    例如，遍历所有 .json 文件（除了 metadata.json）
      const payload = {}; // 暂时为空

      // 3. 按照 SyncData 结构返回
      return {
        metadata: metadata,
        data: payload,
      };
    } catch (error) {
      console.error("加载元数据失败:", error);
      return null;
    }
  }

  async getMetadata(): Promise<SyncMetadata | null> {
    try {
      const metadataFileName = "metadata.json";
      const metadataContent = await readData(metadataFileName);

      if (!metadataContent) {
        return null;
      }

      // 直接解析并返回元数据
      return JSON.parse(metadataContent) as SyncMetadata;
    } catch (error) {
      console.error("获取元数据时出错:", error);
      return null;
    }
  }

  async exists(): Promise<boolean> {
    try {
      const content = await readData("sync-data.json");
      return !!content; // 如果能读取到内容，则文件存在
    } catch (error) {
      console.warn("Error checking file existence:", error);
      return false; // 发生错误认为文件不存在
    }
  }
}
