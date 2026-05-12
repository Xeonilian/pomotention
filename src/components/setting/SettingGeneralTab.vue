<template>
  <div class="setting-tab-page setting-tab-page--scroll">
    <n-card size="small" class="setting-tab-card">
      <n-descriptions label-placement="left" :column="1" bordered size="small">
        <n-descriptions-item label="当前版本">{{ generalVersionDisplay }}</n-descriptions-item>
        <n-descriptions-item v-if="isTauri()" label="线上最新">
          <template v-if="remoteReleaseOk">
            <n-tag type="default" size="small" round>{{ remoteReleaseVersion }}</n-tag>
          </template>
          <n-tag v-else type="warning" size="small" round>
            获取失败
            <span v-if="remoteReleaseError">（{{ remoteReleaseError }}）</span>
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item v-if="isTauri()" label="是否最新">
          <n-tag v-if="!remoteReleaseOk" type="default" size="small" round>未知</n-tag>
          <n-tag v-else-if="!versionCompareLabel" type="default" size="small" round>计算中…</n-tag>
          <n-tag v-else-if="versionCompareLabel === '已是最新'" type="success" size="small" round>已是最新</n-tag>
          <n-tag v-else-if="versionCompareLabel === '有新版本'" type="warning" size="small" round>有新版本</n-tag>
          <n-tag v-else type="info" size="small" round>{{ versionCompareLabel }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item v-if="isTauri()" label="自动检查更新">
          <n-switch
            v-model:value="settingStore.settings.checkForUpdate"
            size="small"
            :title="settingStore.settings.checkForUpdate ? '关闭后将不在启动时检查更新' : '开启后将在启动时检查更新'"
          />
        </n-descriptions-item>
        <n-descriptions-item label="运行环境">{{ isTauri() ? "桌面应用(Tauri)" : "Web" }}</n-descriptions-item>
        <n-descriptions-item label="打开方式">{{ openModeLabel }}</n-descriptions-item>
        <n-descriptions-item label="系统">{{ generalSystemLine }}</n-descriptions-item>
        <n-descriptions-item label="浏览器">{{ generalBrowserLine }}</n-descriptions-item>
        <n-descriptions-item label="登录状态">{{ syncStore.isLoggedIn ? "已登录" : "未登录" }}</n-descriptions-item>
        <n-descriptions-item label="当前用户">{{ userEmail }}</n-descriptions-item>
        <n-descriptions-item label="同步状态">{{ syncStore.syncMessage }}</n-descriptions-item>
        <n-descriptions-item label="最近同步">{{ lastSyncDisplay }}</n-descriptions-item>
        <n-descriptions-item label="仅本地模式">
          {{ settingStore.settings.localOnlyMode ? "开启（不同步云端）" : "关闭" }}
          <span v-if="settingStore.settings.localOnlyMode && hasSupabaseClient" class="settings-localonly-hint">
            需关闭时请打开「调试与诊断」→「环境诊断」内按钮；或登录页成功登录后也会自动关闭。
          </span>
        </n-descriptions-item>
      </n-descriptions>
      <n-space class="setting-tab-actions">
        <n-button v-if="supabaseEnabled && !syncStore.isLoggedIn" size="small" type="primary" @click="syncStore.handleLogin">
          去登录
        </n-button>
        <n-popconfirm
          v-if="supabaseEnabled && syncStore.isLoggedIn"
          @positive-click="syncStore.handleLogout"
          positive-text="确认"
          negative-text="取消"
        >
          <template #trigger>
            <n-button size="small" type="warning" :loading="syncStore.loggingOut">退出登录</n-button>
          </template>
          确认退出当前账号吗？
        </n-popconfirm>
        <n-popconfirm @positive-click="handleFactoryReset" positive-text="确认清空" negative-text="取消">
          <template #trigger>
            <n-button size="small" type="error">清空本地数据</n-button>
          </template>
          将清空当前设备上的本地业务数据与登录会话。
          <br />
          本地数据不会被删除，重新登录后能会同步回来。
          <br />
          确认继续吗？
        </n-popconfirm>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { NCard, NDescriptions, NDescriptionsItem, NButton, NTag, NPopconfirm, NSpace, NSwitch } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";
import { useSyncStore } from "@/stores/useSyncStore";
import { clearAllAppStorage } from "@/services/data/localStorageService";
import { isSupabaseEnabled, supabase } from "@/core/services/supabase";
import { usePwaInstall } from "@/composables/platform/usePwaInstall";
import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentUser, purgeSupabaseAuthStorage } from "@/core/services/authService";
import { appHttpFetch } from "@/utils/appHttpFetch";

const settingStore = useSettingStore();
const dataStore = useDataStore();
const syncStore = useSyncStore();

const userEmail = ref("-");
const viteVersionRaw = import.meta.env.VITE_APP_VERSION || "";
const tauriRuntimeVersion = ref("");

const remoteReleaseVersion = ref("…");
const remoteReleaseOk = ref(false);
const remoteReleaseError = ref("");
const generalSystemLine = ref("-");
const generalBrowserLine = ref("-");

const { isStandalone } = usePwaInstall();

const generalVersionDisplay = computed(() => {
  if (isTauri()) {
    return tauriRuntimeVersion.value ? `v${tauriRuntimeVersion.value}` : "加载中…";
  }
  return viteVersionRaw ? `v${viteVersionRaw}` : "未知";
});

const openModeLabel = computed(() => {
  if (isTauri()) return "桌面窗口（Tauri 内嵌 WebView）";
  if (isStandalone.value) return "PWA（独立窗口）";
  return "浏览器标签页";
});

const lastSyncDisplay = computed(() => {
  const ts = syncStore.lastSyncTimestamp;
  if (!ts) return "0 (全量)";
  try {
    return new Date(ts).toISOString();
  } catch {
    return String(ts);
  }
});

const hasSupabaseClient = computed(() => !!supabase);
const supabaseEnabled = computed(() => isSupabaseEnabled());

function normalizeVersionTag(v: string): string {
  return v.replace(/^v/i, "").trim();
}

function compareSemverLocalToRemote(localRaw: string, remoteRaw: string): number {
  const a = normalizeVersionTag(localRaw)
    .split(".")
    .map((x) => parseInt(x, 10) || 0);
  const b = normalizeVersionTag(remoteRaw)
    .split(".")
    .map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const da = a[i] ?? 0;
    const db = b[i] ?? 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

const versionCompareLabel = computed(() => {
  const rv = remoteReleaseVersion.value;
  if (!isTauri() || !remoteReleaseOk.value || !tauriRuntimeVersion.value || !rv || rv === "…" || rv.startsWith("(")) {
    return "";
  }
  const cmp = compareSemverLocalToRemote(tauriRuntimeVersion.value, rv);
  if (cmp === 0) return "已是最新";
  if (cmp < 0) return "有新版本";
  return "本地较新";
});

async function fetchGitHubLatestRelease() {
  if (!isTauri()) return;
  remoteReleaseError.value = "";
  try {
    const resp = await appHttpFetch("https://api.github.com/repos/Xeonilian/pomotention/releases/latest", {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Pomotention-App",
      },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    remoteReleaseVersion.value = data.tag_name ?? data.name ?? "(未知)";
    remoteReleaseOk.value = true;
  } catch (e: any) {
    remoteReleaseError.value = e.message || String(e);
    remoteReleaseVersion.value = "(获取失败)";
    remoteReleaseOk.value = false;
  }
}

watch(
  () => settingStore.settings.checkForUpdate,
  (on) => {
    if (on && isTauri()) {
      void fetchGitHubLatestRelease();
    }
  },
);

function uaBrief(ua: string) {
  const s = ua.toLowerCase();
  const os = /windows/.test(s)
    ? "windows"
    : /mac os x|macintosh/.test(s)
      ? "mac"
      : /iphone|ipad|ipod|ios/.test(s)
        ? "ios"
        : /android/.test(s)
          ? "android"
          : "other";
  const browser = /edg\//.test(s)
    ? "edge"
    : /chrome\//.test(s) && !/edg\//.test(s)
      ? "chrome"
      : /safari\//.test(s) && !/chrome\//.test(s)
        ? "safari"
        : /firefox\//.test(s)
          ? "firefox"
          : "other";
  return { os, browser };
}

function osDisplayNameKey(os: string): string {
  const map: Record<string, string> = {
    windows: "Windows",
    mac: "macOS",
    ios: "iOS",
    android: "Android",
    other: "其他",
  };
  return map[os] ?? os;
}

function formatOsVersionFromUa(ua: string): string {
  if (!ua) return "";
  const win = /Windows NT ([\d.]+)/i.exec(ua);
  if (win) {
    const v = win[1];
    return v === "10.0" ? "NT 10.0（Windows 10/11）" : `NT ${v}`;
  }
  const mac = /Mac OS X ([\d_]+)/i.exec(ua);
  if (mac) return mac[1].replace(/_/g, ".");
  const ios = /CPU (?:iPhone )?OS ([\d_]+)/i.exec(ua);
  if (ios) return ios[1].replace(/_/g, ".");
  const android = /Android ([\d.]+)/i.exec(ua);
  if (android) return android[1];
  if (/Linux x86_64/i.test(ua)) return "x86_64";
  if (/Linux armv/i.test(ua)) return "ARM";
  return "";
}

function formatBrowserProductFromUa(ua: string): string {
  if (!ua) return "";
  if (/Edg\//i.test(ua)) {
    const m = /Edg\/([\d.]+)/i.exec(ua);
    return m ? `Edge ${m[1].split(".")[0]}` : "Edge";
  }
  if (/OPR\//i.test(ua)) {
    const m = /OPR\/([\d.]+)/.exec(ua);
    return m ? `Opera ${m[1].split(".")[0]}` : "Opera";
  }
  if (/Firefox\//i.test(ua)) {
    const m = /Firefox\/([\d.]+)/.exec(ua);
    return m ? `Firefox ${m[1]}` : "Firefox";
  }
  if (/\bwv\b/i.test(ua)) return "系统 WebView";
  if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) {
    const m = /Chrome\/([\d.]+)/.exec(ua);
    return m ? `Chromium ${m[1].split(".")[0]}` : "Chromium";
  }
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
    const m = /Version\/([\d.]+)/.exec(ua);
    return m ? `Safari ${m[1]}` : "Safari (WebKit)";
  }
  return "";
}

function buildSystemDisplayFromUa(ua: string): string {
  const b = uaBrief(ua);
  const ver = formatOsVersionFromUa(ua);
  const name = osDisplayNameKey(b.os);
  return ver ? `${name}（${ver}）` : name;
}

function buildBrowserDisplayFromUa(ua: string): string {
  const detail = formatBrowserProductFromUa(ua);
  if (detail) return detail;
  const b = uaBrief(ua);
  return b.browser;
}

function refreshGeneralEnvDisplay() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  generalSystemLine.value = ua ? buildSystemDisplayFromUa(ua) : "-";
  generalBrowserLine.value = ua ? buildBrowserDisplayFromUa(ua) : "-";

  const nav = navigator as Navigator & {
    userAgentData?: {
      brands?: { brand: string; version: string }[];
      platform?: string;
      getHighEntropyValues?: (keys: string[]) => Promise<Record<string, unknown>>;
    };
  };
  const uad = nav.userAgentData;
  if (!uad?.getHighEntropyValues) return;
  void uad
    .getHighEntropyValues(["fullVersionList", "platformVersion"])
    .then((h) => {
      const fvl = h.fullVersionList as { brand: string; version: string }[] | undefined;
      if (fvl?.length) {
        const main =
          fvl.find((x) => /Chrome|Chromium|Microsoft Edge|Opera|Firefox|Safari/i.test(x.brand) && !/Not/i.test(x.brand)) ??
          fvl[fvl.length - 1];
        if (main) generalBrowserLine.value = `${main.brand} ${main.version}`;
      }
      const pv = h.platformVersion as string | undefined;
      if (pv && uad.platform) {
        const b = uaBrief(ua);
        generalSystemLine.value = `${osDisplayNameKey(b.os)}（${uad.platform} ${pv}）`;
      }
    })
    .catch(() => {});
}

async function refreshGeneral() {
  refreshGeneralEnvDisplay();
  await syncStore.checkLoginStatus();
  try {
    const user = await getCurrentUser();
    userEmail.value = user?.email ?? "-";
  } catch {
    userEmail.value = "-";
  }
  if (isTauri()) {
    try {
      tauriRuntimeVersion.value = await getVersion();
    } catch {
      tauriRuntimeVersion.value = "";
    }
    await fetchGitHubLatestRelease();
  }
}

function handleFactoryReset() {
  clearAllAppStorage();
  purgeSupabaseAuthStorage();
  dataStore.clearData();
  syncStore.resetSync();
  window.location.reload();
}

onMounted(() => {
  void refreshGeneral();
});
</script>

<style scoped>
.settings-localonly-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--n-text-color-3);
  line-height: 1.5;
}
</style>

<style scoped src="./settingShared.css"></style>
