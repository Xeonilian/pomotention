import { writeData, readData, testLogin, readFolder } from "./webdavService";
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
        console.log(fileName);

        const saveSuccess = await writeData(fileName, content);
        if (!saveSuccess) {
          console.error(`Failed to save ${fileName} to WebDAV.`);
          return false;
        }
      }
    }
    return true;
  }

  // 在 从云端获取文件
  async load(): Promise<SyncData | null> {
    try {
      // 1. 获取云端所有文件列表
      console.log("[load] 正在获取云端文件列表...");
      const allFiles = await readFolder();
      console.log(`[load] 云端发现 ${allFiles.length} 个文件:`, allFiles);

      if (allFiles.length === 0) {
        console.warn("[load] 云端没有找到任何文件");
        return null;
      }

      // 2. 检查是否有 metadata.json
      if (!allFiles.includes("metadata.json")) {
        console.warn("[load] 云端没有找到必需的 metadata.json 文件");
        return null;
      }

      // 3. 下载所有文件并分类处理
      const payload: Record<string, any> = {};
      let metadata: SyncMetadata | null = null;
      const downloadedFiles: string[] = [];

      console.log(`[load] 开始下载所有文件...`);

      for (const fileName of allFiles) {
        console.log(`[load] 正在下载: ${fileName}`);
        const fileContent = await readData(fileName);

        if (!fileContent) {
          console.warn(`[load] ✗ ${fileName} (读取失败或为空)`);
          continue;
        }

        try {
          const parsedContent = JSON.parse(fileContent);

          if (fileName === "metadata.json") {
            // 处理 metadata
            metadata = parsedContent as SyncMetadata;
            console.log(`[load] ✓ ${fileName} (metadata 解析成功)`);
          } else {
            // 处理数据文件：去掉 .json 后缀作为字段名
            const fieldName = fileName.replace(".json", "");
            payload[fieldName] = parsedContent;
          }

          downloadedFiles.push(fileName);
        } catch (parseError) {
          if (fileName === "metadata.json") {
            console.error(`[load] metadata.json 解析失败:`, parseError);
            return null; // metadata 解析失败是致命错误
          } else {
            // 数据文件解析失败，保存为文本
            const fieldName = fileName.replace(".json", "");
            payload[fieldName] = fileContent;
            downloadedFiles.push(fileName);
          }
        }
      }

      // 4. 验证是否成功获取了 metadata
      if (!metadata) {
        console.error("[load] 未能成功解析 metadata");
        return null;
      }

      console.log(`[load] 数据字段: [${Object.keys(payload).join(", ")}]`);

      return {
        metadata: metadata,
        data: payload,
      };
    } catch (error) {
      console.error("[load] 加载过程出错:", error);
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
