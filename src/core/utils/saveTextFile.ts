import { isTauri } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

export type SaveTextResult =
  | { ok: true; mode: "tauri" | "download" | "share"; path?: string }
  | { ok: false; reason: "cancelled" | "error"; detail?: string };

export type SaveTextFileInput = {
  contents: string;
  filename: string;
  mime?: string;
};

/** 浏览器/PWA：Blob 触发下载 */
function downloadBlob(contents: string, filename: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type ShareAttempt = "shared" | "unavailable" | "cancelled";

function isShareAbort(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const name = "name" in e ? String((e as { name: unknown }).name) : "";
  // 用户关掉分享面板：AbortError；部分 WebView 用 CancellationError
  return name === "AbortError" || name === "CancellationError";
}

async function tryShareFile(contents: string, filename: string, mime: string): Promise<ShareAttempt> {
  try {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return "unavailable";
    const file = new File([contents], filename, { type: mime });
    const data: ShareData = { files: [file], title: filename };
    if (typeof navigator.canShare === "function" && !navigator.canShare(data)) return "unavailable";
    await navigator.share(data);
    return "shared";
  } catch (e) {
    if (isShareAbort(e)) return "cancelled";
    return "unavailable";
  }
}

/**
 * 文本落盘：Tauri 用另存为；非 Tauri 优先 Web Share（可），否则 Blob 下载。
 * 用户取消分享 → cancelled，不再兜底下载。
 */
export async function saveTextFile(input: SaveTextFileInput): Promise<SaveTextResult> {
  const mime = input.mime ?? "text/plain;charset=utf-8";
  try {
    if (isTauri()) {
      const ext = input.filename.includes(".") ? input.filename.split(".").pop()! : "txt";
      const path = await save({
        defaultPath: input.filename,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      });
      if (!path) return { ok: false, reason: "cancelled" };
      await writeTextFile(path, input.contents);
      return { ok: true, mode: "tauri", path };
    }

    const share = await tryShareFile(input.contents, input.filename, mime);
    if (share === "shared") return { ok: true, mode: "share" };
    if (share === "cancelled") return { ok: false, reason: "cancelled" };
    downloadBlob(input.contents, input.filename, mime);
    return { ok: true, mode: "download" };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: "error", detail };
  }
}

export type SaveTextFilesInDirInput = {
  files: SaveTextFileInput[];
};

/**
 * 多文件：Tauri 选目录写入；非 Tauri 逐个 saveTextFile（分享/下载）。
 */
export async function saveTextFiles(input: SaveTextFilesInDirInput): Promise<SaveTextResult> {
  if (!input.files.length) return { ok: false, reason: "error", detail: "no files" };
  try {
    if (isTauri()) {
      if (input.files.length === 1) {
        return saveTextFile(input.files[0]!);
      }
      const dirPath = await open({ directory: true, multiple: false });
      if (!dirPath || typeof dirPath !== "string") return { ok: false, reason: "cancelled" };
      for (const f of input.files) {
        const path = `${dirPath}/${f.filename}`;
        await writeTextFile(path, f.contents);
      }
      return { ok: true, mode: "tauri", path: dirPath };
    }

    for (const f of input.files) {
      const r = await saveTextFile(f);
      if (!r.ok && r.reason === "error") return r;
      if (!r.ok && r.reason === "cancelled") return r;
    }
    return { ok: true, mode: "download" };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: "error", detail };
  }
}
