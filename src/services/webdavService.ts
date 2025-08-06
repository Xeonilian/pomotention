// services/webdavService.ts
/**
 * WebDAV 服务模块
 *
 * 职责：提供基础的 WebDAV 文件操作功能
 * - 不处理业务逻辑，只负责文件的存取
 * - 不管理数据格式，只处理字符串和文件路径
 * - 为上层服务(syncService)提供简单可靠的文件操作接口
 *
 * 主要功能：
 * - getWebDAVClient: 初始化 WebDAV 客户端
 * - testLogin/checkConnection: 测试连接状态
 * - createFolder: 创建文件夹
 * - writeData: 写入文件（覆盖模式）
 * - readData: 读取文件内容
 * - deleteData: 删除文件

 **/

import { createClient, WebDAVClient } from "webdav";
import { useSettingStore } from "@/stores/useSettingStore";

/**
 * WebDAV 配置接口，与 SettingStore 保持一致
 */
export interface WebDAVConfig {
  webdavId: string;
  webdavKey: string;
  webdavWebsite: string;
  webdavPath: string;
}

/**
 * 获取 WebDAV 配置
 */
export function getWebDAVConfig(): WebDAVConfig {
  const settingStore = useSettingStore();
  return {
    webdavId: settingStore.settings.webdavId,
    webdavKey: settingStore.settings.webdavKey,
    webdavWebsite: settingStore.settings.webdavWebsite,
    webdavPath: settingStore.settings.webdavPath || "/PomotentionBackup",
  };
}

/**
 * 初始化 WebDAV 客户端
 */
function getWebDAVClient(): WebDAVClient {
  const config = getWebDAVConfig();
  return createClient(config.webdavWebsite, {
    username: config.webdavId,
    password: config.webdavKey,
  });
}

/**
 * 登录测试
 */
export async function testLogin() {
  const client = getWebDAVClient(); // 直接使用获取的 client
  try {
    await client.getDirectoryContents("/");
    // console.log("WebDAV 登录成功");
    return true;
  } catch (err) {
    console.error(
      "WebDAV 登录失败:",
      err instanceof Error ? err.message : "未知错误"
    );
    return false;
  }
}

/**
 * 创建应用文件夹
 */
export async function createFolder() {
  const config = getWebDAVConfig();
  const client = getWebDAVClient(); // 获取客户端

  try {
    const exists = await client.exists(config.webdavPath);
    if (exists) {
      console.log("应用文件夹已存在:", config.webdavPath);
      return true;
    }

    await client.createDirectory(config.webdavPath);
    console.log("应用文件夹创建成功:", config.webdavPath);
    return true;
  } catch (err: any) {
    if (err?.response?.status === 405) {
      console.log("应用文件夹已存在(通过错误判断):", config.webdavPath);
      return true;
    }
    console.error(
      "应用文件夹创建失败:",
      err instanceof Error ? err.message : "未知错误"
    );
    return false;
  }
}

/**
 * 写文件到应用文件夹
 */
export async function writeData(
  fileName: string,
  data: string,
  customFolderPath?: string
) {
  const config = getWebDAVConfig();
  const client = getWebDAVClient();
  const appFolderPath = customFolderPath || config.webdavPath;
  const filePath = `${appFolderPath}/${fileName}`;

  try {
    await client.putFileContents(filePath, data, { overwrite: true });
    // console.log("保存数据成功:", filePath);
    return true;
  } catch (err) {
    console.error(
      "保存数据失败:",
      err instanceof Error ? err.message : "未知错误"
    );
    return false;
  }
}

/**
 * 从应用文件夹读取文件
 */
export async function readData(fileName: string): Promise<string | null> {
  const config = getWebDAVConfig();
  const client = getWebDAVClient();
  const folderPath = config.webdavPath;
  const filePath = `${folderPath}/${fileName}`;

  try {
    const content = await client.getFileContents(filePath, { format: "text" });
    // console.log("读取文件成功:", filePath);

    // 安全的类型转换
    if (content instanceof ArrayBuffer) {
      return new TextDecoder("utf-8").decode(content);
    }

    return String(content);
  } catch (err) {
    console.error(
      "读取文件失败:",
      err instanceof Error ? err.message : "未知错误"
    );
    return null;
  }
}

/**
 * 删除应用文件夹中的文件
 */
export async function deleteData(fileName: string, customFolderPath?: string) {
  const config = getWebDAVConfig();
  const client = getWebDAVClient();
  const appFolderPath = customFolderPath || config.webdavPath;
  const filePath = `${appFolderPath}/${fileName}`;

  try {
    await client.deleteFile(filePath);
    console.log("删除文件成功:", filePath);
    return true;
  } catch (err) {
    console.error(
      "删除文件失败:",
      err instanceof Error ? err.message : "未知错误"
    );
    return false;
  }
}

/**
 * 检查连接状态（别名，与testLogin功能相同）
 */
export const checkConnection = testLogin;
