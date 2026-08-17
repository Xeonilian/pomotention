/** 收费底座本关打开记一句入口；生产须配置 VITE_AI_WORKER_URL */
export const CAPTURE_UI_ENABLED = true;

export { runCapture, type CaptureRunResult } from "./runCapture";
export { CaptureTodoIntentSchema, TODO_KINDS_HINT } from "./schema";
