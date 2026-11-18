import { ref, Ref } from "vue";
import { collectLocalData } from "@/services/data/localStorageService";
import { saveTextFiles } from "@/core/utils/saveTextFile";

interface UseDataExportReturn {
  message: Ref<string>;
  isLoading: Ref<boolean>;
  exportData: () => Promise<void>;
}

/**
 * 数据导出 Composable
 * 全量本地 JSON：Tauri 选目录；PWA/网页走分享或逐个下载
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
      const files = Object.entries(localdata)
        .filter(([key]) => key !== "globalSettings")
        .map(([key, value]) => ({
          filename: `${key}.json`,
          contents: JSON.stringify(value, null, 2),
          mime: "application/json;charset=utf-8",
        }));

      if (!files.length) {
        message.value = "⚠️没有可导出的数据";
        return;
      }

      const result = await saveTextFiles({ files });
      if (!result.ok) {
        if (result.reason === "cancelled") {
          message.value = "";
          return;
        }
        message.value = "⚠️导出失败: " + (result.detail || "unknown");
        return;
      }

      if (result.mode === "tauri") {
        message.value = "✔️所有数据文件导出成功" + (result.path ? `: ${result.path}` : "");
      } else if (result.mode === "share") {
        message.value = "✔️已通过系统分享导出";
      } else {
        message.value = "✔️已触发下载（多文件时可能逐个保存）";
      }
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
