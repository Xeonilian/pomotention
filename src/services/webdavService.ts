// src/utils/webdavService.ts
import { createClient, WebDAVClient } from "webdav";

/**
 * 初始化 WebDAV 客户端
 */
export function getWebDAVClient({
  id,
  website,
  key,
}: {
  id: string;
  website: string;
  key: string;
}): WebDAVClient {
  return createClient(website, {
    username: id,
    password: key,
  });
}

/**
 * 登录测试
 */
export async function testLogin({
  id,
  website,
  key,
}: {
  id: string;
  website: string;
  key: string;
}) {
  const client = getWebDAVClient({ id, website, key });
  try {
    await client.getDirectoryContents("/");
    console.log("WebDAV 登录成功");
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
 * 创建应用主文件夹
 */
export async function ensureMainFolder(
  options: { id: string; website: string; key: string },
  folderName = "PomotentionBackup"
) {
  const client = getWebDAVClient(options);
  try {
    await client.createDirectory(`/${folderName}`);
    console.log("主文件夹创建成功:", folderName);
    return true;
  } catch (err: any) {
    if (err?.response?.status === 405) {
      console.log("主文件夹已存在:", folderName);
      return true;
    }
    console.error(
      "主文件夹创建失败:",
      err instanceof Error ? err.message : "未知错误"
    );
    return false;
  }
}

/**
 * 写文件（保存数据到WebDAV）
 */
export async function saveData(
  options: { id: string; website: string; key: string },
  folderName: string,
  fileName: string,
  data: string
) {
  const client = getWebDAVClient(options);
  const filePath = `/${folderName}/${fileName}`;
  try {
    await client.putFileContents(filePath, data, { overwrite: true });
    console.log("保存数据到WebDAV成功:", filePath, `[${data.length} 字符]`);
    return true;
  } catch (err) {
    console.error(
      "保存到WebDAV失败:",
      err instanceof Error ? err.message : "未知错误"
    );
    return false;
  }
}

/**
 * 读文件（从WebDAV获取数据）
 */
export async function readData(
  options: { id: string; website: string; key: string },
  folderName: string,
  fileName: string
) {
  const client = getWebDAVClient(options);
  const filePath = `/${folderName}/${fileName}`;
  try {
    const content = await client.getFileContents(filePath, { format: "text" });
    console.log(
      "读取WebDAV文件成功:",
      filePath,
      `[${String(content).length} 字符]`
    );
    return content;
  } catch (err) {
    console.error(
      "读取WebDAV文件失败:",
      err instanceof Error ? err.message : "未知错误"
    );
    return null;
  }
}
