/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
  /** AI Gateway Worker 基址，如 http://127.0.0.1:8787 */
  readonly VITE_AI_WORKER_URL?: string;
  /** 爱发电订阅方案 id；未设则打开创作者主页 */
  readonly VITE_AFDIAN_PLAN_ID?: string;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
