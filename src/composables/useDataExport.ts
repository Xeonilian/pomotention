import { ref, Ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { collectLocalData } from "@/services/localStorageService";

interface UseDataExportReturn {
  message: Ref<string>;
  isLoading: Ref<boolean>;
  exportData: () => Promise<void>;
}

/**
 * 数据导出 Composable
 * 封装本地数据导出为 JSON 文件的功能
 */
export function useDataExport(): UseDataExportReturn {
  const message = ref<string>("");
  const isLoading = ref<boolean>(false);

  const exportData = async (): Promise<void> => {
    if (isLoading.value) return;

    try {
      isLoading.value = true;
      message.value = "";

      const localdata = collectLocalData();

      // 选择目录
      const dirPath = await open({
        directory: true,
        multiple: false,
      });

      if (!dirPath || typeof dirPath !== "string") {
        return;
      }

      // 分别保存每个数据类型
      const savePromises = Object.entries(localdata).map(async ([key, value]) => {
        const fileName = `${key}.json`;
        const filePath = `${dirPath}/${fileName}`;
        const jsonData = JSON.stringify(value, null, 2);
        await writeTextFile(filePath, jsonData);
        return fileName;
      });

      await Promise.all(savePromises);

      message.value = "✔️所有数据文件导出成功: " + dirPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      message.value = "⚠️导出失败: " + errorMessage;
      console.error("数据导出失败:", error);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    message,
    isLoading,
    exportData,
  };
}
