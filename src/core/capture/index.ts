/** 记一句入口与设置「解锁高级功能」共用；未走通付费前先关 */
export const CAPTURE_UI_ENABLED = false;

export { runCapture, type CaptureRunResult } from "./runCapture";
export { CaptureTodoIntentSchema, TODO_KINDS_HINT } from "./schema";
