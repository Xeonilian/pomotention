// 待办 / 日程的勾选与时间：空值不能盖掉已有值；明确的新值或主动清空可以覆盖。

/** 上传「用户主动取消勾选」时写入 status，下载再还原成空 */
export const CLEARED_STATUS = "cleared";

/** 上传「用户主动清空时间」时写入时间列，下载再还原成未设置 */
export const CLEARED_TIME = -1;

export type PlannerMergeMode = "cloud-wins" | "fill-only";

export type PlannerFields = {
  status?: string;
  startTime?: number;
  doneTime?: number;
  statusCleared?: boolean;
  startTimeCleared?: boolean;
  doneTimeCleared?: boolean;
};

export type PlannerCloudFields = {
  status?: string | null;
  startTime?: number | null;
  doneTime?: number | null;
};

export type PlannerMergeResult = {
  status: string;
  startTime: number | undefined;
  doneTime: number | undefined;
  statusCleared: boolean;
  startTimeCleared: boolean;
  doneTimeCleared: boolean;
  /** 本地有值、云端是空的：留下本地并标脏，下一轮传回去 */
  reupload: boolean;
  changed: boolean;
};

export type SyncSkip = {
  id: number;
  reason: "unsynced" | "not-newer";
  detail: string;
};

function realTime(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return undefined;
}

function realStatus(value: unknown): string | undefined {
  if (typeof value !== "string" || value === "" || value === CLEARED_STATUS) return undefined;
  return value;
}

function isClearedTime(value: unknown): boolean {
  return value === CLEARED_TIME;
}

function sameTime(a: number | undefined, b: number | undefined): boolean {
  return a === b;
}

/** 云端更新时整行套用；云端不更新时只补本地的空格，不拿旧值盖新值 */
export function mergePlannerFields(local: PlannerFields, cloud: PlannerCloudFields, mode: PlannerMergeMode): PlannerMergeResult {
  let reupload = false;

  let status = realStatus(local.status) ?? "";
  let statusCleared = local.statusCleared === true;
  const cloudStatus = cloud.status;
  if (mode === "cloud-wins" && cloudStatus === CLEARED_STATUS) {
    status = "";
    statusCleared = false;
  } else if (realStatus(cloudStatus) && (mode === "cloud-wins" || !realStatus(local.status))) {
    status = realStatus(cloudStatus) as string;
    statusCleared = false;
  } else if (!realStatus(cloudStatus) && cloudStatus !== CLEARED_STATUS && realStatus(local.status)) {
    reupload = true;
  }

  let startTime = realTime(local.startTime);
  let startTimeCleared = local.startTimeCleared === true;
  const cloudStart = cloud.startTime;
  if (mode === "cloud-wins" && isClearedTime(cloudStart)) {
    startTime = undefined;
    startTimeCleared = false;
  } else if (realTime(cloudStart) !== undefined && (mode === "cloud-wins" || startTime === undefined)) {
    startTime = realTime(cloudStart);
    startTimeCleared = false;
  } else if (realTime(cloudStart) === undefined && !isClearedTime(cloudStart) && startTime !== undefined) {
    reupload = true;
  }

  let doneTime = realTime(local.doneTime);
  let doneTimeCleared = local.doneTimeCleared === true;
  const cloudDone = cloud.doneTime;
  if (mode === "cloud-wins" && isClearedTime(cloudDone)) {
    doneTime = undefined;
    doneTimeCleared = false;
  } else if (realTime(cloudDone) !== undefined && (mode === "cloud-wins" || doneTime === undefined)) {
    doneTime = realTime(cloudDone);
    doneTimeCleared = false;
  } else if (realTime(cloudDone) === undefined && !isClearedTime(cloudDone) && doneTime !== undefined) {
    reupload = true;
  }

  const changed =
    (realStatus(local.status) ?? "") !== status ||
    !sameTime(realTime(local.startTime), startTime) ||
    !sameTime(realTime(local.doneTime), doneTime);

  return {
    status,
    startTime,
    doneTime,
    statusCleared,
    startTimeCleared,
    doneTimeCleared,
    reupload,
    changed,
  };
}

export function plannerSkipDetail(local: PlannerCloudFields, cloud: PlannerCloudFields): string {
  const statusText = (value?: string | null) => (realStatus(value) ? value : "空");
  const timeText = (value?: number | null) => (realTime(value) ? "有" : "空");
  return `本地 ${statusText(local.status)}/${timeText(local.startTime)}/${timeText(local.doneTime)} 云端 ${statusText(cloud.status)}/${timeText(cloud.startTime)}/${timeText(cloud.doneTime)}`;
}

export function formatDownloadDetails(
  details: { name: string; fetched: number; downloaded: number; cloudDeleted?: number; skipped?: SyncSkip[] }[],
): string {
  const lines: string[] = [];
  for (const row of details) {
    const skipped = row.skipped?.length ?? 0;
    const deleted = row.cloudDeleted ?? 0;
    const balanced = row.fetched === row.downloaded + deleted + skipped;
    lines.push(
      `${row.name}: 拉取 ${row.fetched}，写入 ${row.downloaded}，云端删除 ${deleted}，跳过 ${skipped} ${balanced ? "✓" : "?"}`,
    );
    const shown = row.skipped?.slice(0, 30) ?? [];
    for (const skip of shown) {
      const reason = skip.reason === "unsynced" ? "未同步" : "云端不更新";
      lines.push(`  ${skip.id} ${reason} ${skip.detail}`);
    }
    if (skipped > shown.length) lines.push(`  …还有 ${skipped - shown.length} 条`);
  }
  return lines.join("\n");
}

export function isTimeoutMessage(message: string): boolean {
  return /超时|TIMEOUT|AbortError|aborted/i.test(message);
}
