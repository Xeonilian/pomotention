<template>
  <n-space vertical size="large" class="settings-page">
    <n-tabs v-model:value="tab" type="line" animated size="small">
      <n-tab-pane name="general" tab="通用设置">
        <n-card size="small" title="通用信息">
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
          <n-space class="general-actions">
            <!-- <n-button size="small" @click="refreshGeneral">刷新状态</n-button> -->
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
      </n-tab-pane>

      <n-tab-pane name="pomo" tab="番茄设置">
        <n-card size="small" title="番茄参数与样式">
          <n-form>
            <n-form-item label="工作时长（分钟）">
              <n-input-number
                v-model:value="settingStore.settings.durations.workDuration"
                @update:value="(val) => console.log('workDuration 更新为:', val)"
                :min="1"
                :max="60"
              />
            </n-form-item>
            <n-form-item label="休息时长（分钟）">
              <n-select v-model:value="settingStore.settings.durations.breakDuration" :options="breakOptions" />
            </n-form-item>

            <n-form-item label="工作内层进度条颜色">
              <n-color-picker v-model:value="settingStore.settings.style.redBarColor" show-alpha />
            </n-form-item>
            <n-form-item label="工作外层进度条颜色">
              <n-color-picker v-model:value="settingStore.settings.style.blueBarColor" show-alpha />
            </n-form-item>
          </n-form>
          <n-space>
            <n-button @click="resetDurations" type="error">恢复默认时长</n-button>
            <n-button @click="resetStyle" type="error">恢复默认样式</n-button>
          </n-space>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="debug" tab="调试与诊断">
        <!-- 调试 / 诊断：默认折叠 -->
        <n-card size="small" class="settings-diagnostics-card" :bordered="true">
          <template #header>
            <span class="settings-diagnostics-header">调试与诊断</span>
            <span class="settings-diagnostics-sub">设备检测、音频日志、同步测试等，点击各分区标题展开</span>
          </template>
          <n-collapse :default-expanded-names="[]" display-directive="show">
            <n-collapse-item title="设备检测测试" name="device">
              <n-code :code="uaString" language="text" word-wrap style="font-size: 12px; max-height: 80px; overflow: auto" />
              <n-descriptions label-placement="left" :column="1" bordered style="margin-top: 12px">
                <n-descriptions-item label="useDevice.isMobile">{{ device.isMobile }}</n-descriptions-item>
                <n-descriptions-item label="useDevice.isTablet">{{ device.isTablet }}</n-descriptions-item>
                <n-descriptions-item label="useDevice.isDesktop">{{ device.isDesktop }}</n-descriptions-item>
                <n-descriptions-item label="useDevice.isTouchSupported">{{ device.isTouchSupported }}</n-descriptions-item>
                <n-descriptions-item label="useDevice.width">{{ device.width }}</n-descriptions-item>
                <n-descriptions-item label="useDevice.isIOSDevice (仅 iPad)">
                  {{ device.isIOSDevice }}
                  <span class="detection-hint">仅匹配 iPad</span>
                </n-descriptions-item>
                <n-descriptions-item label="useDevice.isIOS">
                  {{ device.isIOS }}
                  <span class="detection-hint">当前逻辑：仅 iPhone</span>
                </n-descriptions-item>
                <n-descriptions-item label="usePwaInstall.isIOS">
                  {{ pwaIsIOS }}
                  <span class="detection-hint">iPhone | iPad | iPod</span>
                </n-descriptions-item>
                <n-descriptions-item label="原始 /iphone/.test(ua)">{{ raw.iphone }}</n-descriptions-item>
                <n-descriptions-item label="原始 /ipad/.test(ua)">{{ raw.ipad }}</n-descriptions-item>
                <n-descriptions-item label="原始 /ipod/.test(ua)">{{ raw.ipod }}</n-descriptions-item>
                <n-descriptions-item label="原始 /iphone|ipad|ipod/.test(ua)">{{ raw.anyIos }}</n-descriptions-item>
              </n-descriptions>
            </n-collapse-item>

            <n-collapse-item title="视口与 safe-area（布局调试）" name="viewport">
              <p class="audio-dbg-hint">
                采集 window / visualViewport / documentElement / #app / .app-layout 等数据，用于排查
                <strong>iOS 横竖屏</strong>
                下白边、顶栏点击偏移、safe-area 与 --app-vvh 是否一致。旋转设备或缩放页面后会自动更新（短时防抖）。
              </p>
              <p class="audio-dbg-hint audio-dbg-hint--secondary">
                「env 解析值」通过与页面相同的
                <code>env(safe-area-inset-*)</code>
                离屏节点读取，可与
                <code>global.css</code>
                中 #app 的 padding 对照。
              </p>
              <n-space style="margin-bottom: 8px">
                <n-button size="small" @click="refreshViewportSnapshot">立即刷新</n-button>
                <n-button size="small" :loading="viewportDbgCopyLoading" @click="copyViewportDbgReport">复制完整报告</n-button>
              </n-space>
              <n-descriptions v-if="viewportSnapshot" label-placement="left" :column="1" bordered size="small" style="margin-bottom: 12px">
                <n-descriptions-item label="inner (window)">
                  {{ viewportSnapshot.inner.w }} × {{ viewportSnapshot.inner.h }}
                </n-descriptions-item>
                <n-descriptions-item label="visualViewport">
                  <template v-if="viewportSnapshot.visualViewport">
                    {{ viewportSnapshot.visualViewport.width }} × {{ viewportSnapshot.visualViewport.height }} · scale
                    {{ viewportSnapshot.visualViewport.scale }} · offset {{ viewportSnapshot.visualViewport.offsetTop }}/{{
                      viewportSnapshot.visualViewport.offsetLeft
                    }}
                  </template>
                  <template v-else>（无）</template>
                </n-descriptions-item>
                <n-descriptions-item label="docEl client">
                  {{ viewportSnapshot.docEl.clientW }} × {{ viewportSnapshot.docEl.clientH }}
                </n-descriptions-item>
                <n-descriptions-item label="orientation (matchMedia)">
                  {{ viewportSnapshot.orientation.landscapeMm ? "landscape" : "portrait" }} · type
                  {{ viewportSnapshot.orientation.type ?? "-" }} · angle {{ viewportSnapshot.orientation.angle ?? "-" }}
                </n-descriptions-item>
                <n-descriptions-item label="safe-area（解析）">
                  t {{ viewportSnapshot.safeArea.top }} · r {{ viewportSnapshot.safeArea.right }} · b
                  {{ viewportSnapshot.safeArea.bottom }} · l {{ viewportSnapshot.safeArea.left }}
                </n-descriptions-item>
                <n-descriptions-item label="--app-vvh">
                  {{ viewportSnapshot.cssVars.appVvh || "（未设置）" }}
                </n-descriptions-item>
                <n-descriptions-item label="#app rect">
                  {{ viewportDbgSnapshotAppLine }}
                </n-descriptions-item>
                <n-descriptions-item label=".app-layout rect">
                  {{ viewportDbgSnapshotLayoutLine }}
                </n-descriptions-item>
                <n-descriptions-item label=".app-layout__header rect">
                  {{ viewportDbgSnapshotHeaderLine }}
                </n-descriptions-item>
              </n-descriptions>
              <n-input
                type="textarea"
                readonly
                :value="viewportDbgTextarea"
                :autosize="{ minRows: 10, maxRows: 24 }"
                class="audio-dbg-textarea"
                placeholder="暂无快照"
              />
            </n-collapse-item>

            <n-collapse-item title="环境诊断" name="env">
              <p class="audio-dbg-hint">
                查看运行环境、
                <strong>登录/同步快照（无 token）</strong>
                与网络连通测试。
              </p>
              <n-space style="margin-bottom: 8px">
                <n-button
                  v-if="showExitLocalOnly"
                  size="small"
                  type="primary"
                  :loading="exitLocalOnlyLoading"
                  @click="handleExitLocalOnlyMode"
                >
                  启用云同步（关闭仅本地）
                </n-button>
                <n-button size="small" :loading="envLoading" @click="runEnvDiag">执行检测</n-button>
                <n-button size="small" :loading="envCopyLoading" @click="copyEnvDiag">复制结果</n-button>
                <n-button size="small" :loading="envMaskCopyLoading" @click="copyEnvDiagMask">复制脱敏</n-button>
              </n-space>
              <n-input
                type="textarea"
                readonly
                :value="envText"
                :autosize="{ minRows: 8, maxRows: 22 }"
                class="audio-dbg-textarea"
                placeholder="暂无结果，点击“执行检测”"
              />
            </n-collapse-item>

            <n-collapse-item title="音频诊断（iOS / PWA）" name="audio">
              <p class="audio-dbg-hint">
                记录提示音与白噪音的关键事件。白噪音为 HTML 双轨 crossfade；iOS 在 AudioContext 已 running 时定时提示音多走 Web
                Audio，否则仍以 HTML 为主。仅内存，刷新清空。出现
                <code>[cue] FAIL</code>
                或
                <code>statechange suspended</code>
                时可对照现象。
              </p>
              <p class="audio-dbg-hint audio-dbg-hint--secondary">
                排查「白噪音完全没声」：先在同一页内复现（开始专注、确认白噪音已开），
                <strong>不要刷新</strong>
                ，立刻展开本项看下方日志或点「一键复制」。重点关注
                <code>[WN] crossfade 起播</code>
                、
                <code>[cue] work_xxx web</code>
                和
                <code>[SW]</code>
                相关日志。
              </p>
              <n-space style="margin-bottom: 8px">
                <n-button size="small" :loading="audioDebugCopyLoading" @click="copyAudioDebugLogs">一键复制日志</n-button>
                <n-button size="small" @click="settingStore.clearAudioDebugLogs()">清空日志</n-button>
              </n-space>
              <n-descriptions label-placement="left" :column="1" bordered size="small" style="margin-bottom: 12px">
                <n-descriptions-item label="isAppleTouchWebKitDevice">{{ isAppleTouchWebKitDevice() }}</n-descriptions-item>
                <n-descriptions-item label="isAndroidTouchDevice">{{ isAndroidTouchDevice() }}</n-descriptions-item>
                <n-descriptions-item label="preferHtmlAudioCueFirst">{{ preferHtmlAudioCueFirst() }}</n-descriptions-item>
              </n-descriptions>
              <p class="audio-dbg-hint audio-dbg-hint--secondary">若一键复制失败，可长按下方文本框全选后复制；三项布尔与导出内容一致。</p>
              <n-input
                type="textarea"
                readonly
                :value="audioDebugText"
                :autosize="{ minRows: 8, maxRows: 22 }"
                class="audio-dbg-textarea"
                placeholder="暂无记录"
              />
            </n-collapse-item>

            <n-collapse-item v-if="supabaseEnabled && syncStore.isLoggedIn && isDev" title="同步诊断（Supabase）" name="sync">
              <n-descriptions label-placement="left" :column="1" bordered size="small" style="margin-bottom: 12px">
                <n-descriptions-item label="lastSyncTimestamp">
                  {{ syncStore.lastSyncTimestamp }} ({{ lastSyncDisplay }})
                </n-descriptions-item>
                <n-descriptions-item label="本地条数">
                  activities: {{ dataStore.activityList.length }}, tasks: {{ dataStore.taskList.length }}, todos:
                  {{ dataStore.todoList.length }}, schedules: {{ dataStore.scheduleList.length }}
                </n-descriptions-item>
                <n-descriptions-item label="未同步">
                  {{ dataStore.unsyncedDataSummary?.activities ?? 0 }} activities, {{ dataStore.unsyncedDataSummary?.tasks ?? 0 }} tasks
                </n-descriptions-item>
              </n-descriptions>
              <n-space>
                <n-button type="primary" :loading="diagnosticLoading" @click="runDownloadTest">下载测试（全量，不更新时间戳）</n-button>
                <n-button type="warning" :loading="diagnosticLoading" @click="runClearThenDownloadTest">清除后下载测试</n-button>
              </n-space>
              <div
                v-if="diagnosticResult"
                style="margin-top: 12px; font-size: 12px; white-space: pre-wrap; max-height: 320px; overflow: auto"
                class="diagnostic-log"
              >
                {{ diagnosticResult }}
              </div>
              <p class="sync-diag-footer">
                用于确认：本底是否为空、从 DB 拉取条数(fetched) vs 实际写入条数(applied)、lastSyncTimestamp 前后变化。结果会发送到调试端点。
              </p>
            </n-collapse-item>

            <n-collapse-item v-if="isDev" title="番茄序列 / 计时器（PWA 恢复评估）" name="pomo-sequence-timer">
              <div class="pomo-seq-diag-guide">
                <p class="pomo-seq-diag-guide-title">什么时候点</p>
                <ol class="pomo-seq-diag-ol">
                  <li>
                    <strong>真机出问题后</strong>
                    ：先点下方「复制完整诊断包」把现状发给调试；再按需点 ①②③ 做
                    <strong>人工复现链</strong>
                    （会改计时器状态，仅用于对照代码路径）。
                  </li>
                  <li>
                    <strong>① 墙钟校准</strong>
                    ：模拟从后台回到前台；平时也可在计时器异常时点一次看时间是否被墙钟收束。
                  </li>
                  <li>
                    <strong>② 注入过期休息</strong>
                    ：仅在
                    <strong>没有真实番茄在跑</strong>
                    时点；会把 store 设成「序列、休息段已过期、无内存回调」，用来观察是否出现
                    <code>pending=true</code>
                    。
                  </li>
                  <li>
                    <strong>③ 测试 flush</strong>
                    ：在②之后点；验证「pending 能否被消费」。会通过
                    <strong>测试用</strong>
                    回调里执行 reset，不会推进真实下一颗番茄。
                  </li>
                </ol>
                <p class="pomo-seq-diag-guide-title">结果怎么读（摘要）</p>
                <ul class="pomo-seq-diag-ul">
                  <li>
                    <code>pendingSequencePhaseFinalize=true</code>
                    ：阶段该结束了，但当时没人注册 continuation，先挂着；真机对应冷启动里 main 比组件早 reconcile。
                  </li>
                  <li>
                    <code>pending=false</code>
                    且刚点过②：多半已直接 finalize 或走了别的分支，看下方「最近一次输出」里的解读行。
                  </li>
                  <li>
                    <code>continuationInvoked=true</code>
                    （③之后）：说明 flush 确实调到了回调；线上应由 PomodoroSequence 注册的
                    <strong>真实</strong>
                    回调推进序列。
                  </li>
                </ul>
              </div>
              <n-space vertical size="small" style="width: 100%; margin-bottom: 12px" :item-style="{ width: '100%' }">
                <n-button
                  type="info"
                  secondary
                  block
                  class="pomo-seq-diag-btn"
                  :loading="pomoSequenceCopyLoading"
                  @click="copyPomoSequenceDiagReport"
                >
                  复制完整诊断包（含 UA、store 快照、解读，便于贴到 issue / 聊天）
                </n-button>
              </n-space>
              <n-descriptions label-placement="left" :column="1" bordered size="small" style="margin-bottom: 12px">
                <n-descriptions-item label="pomodoroState">{{ timerStore.pomodoroState }}</n-descriptions-item>
                <n-descriptions-item label="isFromSequence">{{ timerStore.isFromSequence }}</n-descriptions-item>
                <n-descriptions-item label="sequenceStepIndex">{{ timerStore.sequenceStepIndex }}</n-descriptions-item>
                <n-descriptions-item label="sequenceInputSnapshot（前 80 字）">
                  {{ sequenceSnapshotPreview }}
                </n-descriptions-item>
                <n-descriptions-item label="pendingSequencePhaseFinalize">
                  {{ timerStore.pendingSequencePhaseFinalize }}
                </n-descriptions-item>
                <n-descriptions-item label="sequenceContinuationRegistered">
                  {{ timerStore.sequenceContinuationRegistered }}
                </n-descriptions-item>
                <n-descriptions-item label="timeRemaining / totalTime">
                  {{ timerStore.timeRemaining }} / {{ timerStore.totalTime }}
                </n-descriptions-item>
                <n-descriptions-item label="phaseEndsAt">{{ timerStore.phaseEndsAt ?? "null" }}</n-descriptions-item>
              </n-descriptions>
              <n-space vertical size="small" style="width: 100%; margin-bottom: 8px" :item-style="{ width: '100%' }">
                <n-button size="small" block class="pomo-seq-diag-btn" @click="runTimerReconcile">① 墙钟校准（reconcile）</n-button>
                <n-button size="small" block class="pomo-seq-diag-btn" type="warning" @click="injectSequenceExpiredBreakNoCallback">
                  ② 注入：序列休息已过期、无 phase 回调（测试用，会 reset 再写入假状态）
                </n-button>
                <n-button size="small" block class="pomo-seq-diag-btn" type="primary" @click="registerTestContinuationAndFlush">
                  ③ 注册测试 continuation 并 flush（接在②后；会 reset 计时器）
                </n-button>
              </n-space>
              <p class="sync-diag-footer pomo-seq-diag-footnote">
                主布局内 PomodoroSequence 为 v-show 常驻挂载，从设置页即可观察 store；术语与实现见代码
                <code>useTimerStore</code>
                /
                <code>PomodoroSequence</code>
                。
              </p>
              <div
                v-if="pomoSequenceDiagResult"
                style="margin-top: 8px; font-size: 12px; white-space: pre-wrap; max-height: 240px; overflow: auto"
                class="diagnostic-log"
              >
                {{ pomoSequenceDiagResult }}
              </div>
            </n-collapse-item>

            <n-collapse-item v-if="isDev" title="开发工具" name="dev">
              <n-button type="error" @click="handleClearLocal">清除本地数据</n-button>
              <p class="sync-diag-footer">仅在 dev 预览环境显示，正式站不显示。</p>
            </n-collapse-item>
          </n-collapse>
        </n-card>
      </n-tab-pane>
    </n-tabs>
  </n-space>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from "vue";
import {
  NSpace,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NButton,
  NColorPicker,
  NSelect,
  NCode,
  NDescriptions,
  NDescriptionsItem,
  NCollapse,
  NCollapseItem,
  NTabs,
  NTabPane,
  NPopconfirm,
  NTag,
  NSwitch,
  useNotification,
} from "naive-ui";
import { useSettingStore } from "../stores/useSettingStore";
import { useTimerStore } from "../stores/useTimerStore";
import { useDataStore } from "../stores/useDataStore";
import { useSyncStore } from "../stores/useSyncStore";
import { clearAllAppStorage } from "../services/localStorageService";
import { clearLocalData } from "@/services/downloadService";
import { downloadAllWithDiagnostics } from "@/services/sync";
import { isSupabaseEnabled, supabase } from "@/core/services/supabase";
import { getAppHttpFetchSnapshot } from "@/utils/appHttpFetch";
import { xhrFetch } from "@/utils/xhrFetch";
import { useDevice } from "@/composables/useDevice";
import { useViewportDebugSnapshot } from "@/composables/useViewportDebugSnapshot";
import { usePwaInstall } from "@/composables/usePwaInstall";
import { copyTextToClipboard } from "@/utils/clipboard";
import { isAndroidTouchDevice, isAppleTouchWebKitDevice, preferHtmlAudioCueFirst } from "@/core/sounds/platform";
import { dbgSwStatus } from "@/core/sounds/debug";
import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentUser, getSession, purgeSupabaseAuthStorage } from "@/core/services/authService";
import { applySignedInSession, subscribeAuthStateChanges } from "@/core/auth/signedInSessionLifecycle";
import { appHttpFetch } from "@/utils/appHttpFetch";

const settingStore = useSettingStore();
const timerStore = useTimerStore();
const notification = useNotification();
const tab = ref("general");
const userEmail = ref("-");
const viteVersionRaw = import.meta.env.VITE_APP_VERSION || "";
/** Tauri getVersion() 返回值，不含 v 前缀 */
const tauriRuntimeVersion = ref("");

const generalVersionDisplay = computed(() => {
  if (isTauri()) {
    return tauriRuntimeVersion.value ? `v${tauriRuntimeVersion.value}` : "加载中…";
  }
  return viteVersionRaw ? `v${viteVersionRaw}` : "未知";
});

/** 桌面端：GitHub latest release */
const remoteReleaseVersion = ref("…");
const remoteReleaseOk = ref(false);
const remoteReleaseError = ref("");

function normalizeVersionTag(v: string): string {
  return v.replace(/^v/i, "").trim();
}

/** 与线上 tag 比较：本地新返回 1，相等 0，本地旧 -1 */
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

const sequenceSnapshotPreview = computed(() => {
  const s = timerStore.sequenceInputSnapshot || "";
  return s.length > 80 ? `${s.slice(0, 80)}…` : s || "（空）";
});

const pomoSequenceDiagResult = ref("");
const pomoSequenceCopyLoading = ref(false);

function buildPomoSequenceInterpretation(): string {
  const lines: string[] = [];
  if (timerStore.pendingSequencePhaseFinalize) {
    lines.push(
      "- pending=true：阶段已到期但当时没有 continuation，处于「延后 finalize」；真机上常见于冷启动时 main 早于 PomodoroSequence 执行 reconcile。",
    );
  } else {
    lines.push("- pending=false：当前没有在等待延后的阶段结束。");
  }
  if (timerStore.sequenceContinuationRegistered) {
    lines.push("- sequenceContinuationRegistered=true：已有续跑回调（正常序列运行时由 PomodoroSequence 注册，或你刚点了③的测试回调）。");
  } else {
    lines.push("- sequenceContinuationRegistered=false：未挂续跑回调；若正在跑序列却长期如此，检查组件是否挂载或是否被 reset。");
  }
  if (timerStore.isFromSequence && timerStore.isActive) {
    lines.push("- isFromSequence 且 isActive：当前被判定为「序列计时进行中」。");
  }
  return lines.join("\n");
}

function buildPomoSequenceDiagReport(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const fullSnap = timerStore.sequenceInputSnapshot || "";
  const settingSeq = settingStore.settings.pomoSequenceInput ?? "";
  return [
    "=== Pomotention 番茄序列 / 计时器 诊断包 ===",
    `采集时间(ISO): ${new Date().toISOString()}`,
    `User-Agent: ${ua}`,
    "",
    "[sounds 平台（提示音 HTML 优先）]",
    `isAppleTouchWebKitDevice: ${isAppleTouchWebKitDevice()}`,
    `isAndroidTouchDevice: ${isAndroidTouchDevice()}`,
    `preferHtmlAudioCueFirst: ${preferHtmlAudioCueFirst()}`,
    "",
    "[计时器 store]",
    `pomodoroState: ${timerStore.pomodoroState}`,
    `isActive: ${timerStore.isActive}`,
    `isFromSequence: ${timerStore.isFromSequence}`,
    `sequenceStepIndex: ${timerStore.sequenceStepIndex}`,
    `sequenceInputSnapshot (full):\n${fullSnap || "(empty)"}`,
    `pendingSequencePhaseFinalize: ${timerStore.pendingSequencePhaseFinalize}`,
    `sequenceContinuationRegistered: ${timerStore.sequenceContinuationRegistered}`,
    `timeRemaining / totalTime: ${timerStore.timeRemaining} / ${timerStore.totalTime}`,
    `phaseEndsAt: ${timerStore.phaseEndsAt ?? "null"}`,
    "",
    "[设置 pomoSequenceInput]",
    settingSeq || "(empty)",
    "",
    "[本页「最近一次按钮」输出]",
    pomoSequenceDiagResult.value || "(尚无)",
    "",
    "[自动解读]",
    buildPomoSequenceInterpretation(),
  ].join("\n");
}

async function copyPomoSequenceDiagReport() {
  pomoSequenceCopyLoading.value = true;
  const text = buildPomoSequenceDiagReport();
  try {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      notification.success({
        title: "已复制",
        content: "完整诊断包已写入剪贴板，可直接粘贴到 issue 或聊天。",
        duration: 2800,
      });
    } else {
      notification.warning({
        title: "复制未成功",
        content: "请在本页番茄序列区展开输出后长按全选复制，或换 HTTPS/系统浏览器重试。",
        duration: 5000,
      });
    }
  } finally {
    pomoSequenceCopyLoading.value = false;
  }
}

function runTimerReconcile() {
  timerStore.reconcilePhaseFromWallClock();
  pomoSequenceDiagResult.value = [
    "[① 墙钟 reconcile]",
    `pending=${timerStore.pendingSequencePhaseFinalize} state=${timerStore.pomodoroState} timeLeft=${timerStore.timeRemaining}`,
    "解读：timeRemaining 应按墙钟与 startTime/totalTime 对齐；从后台回前台后若仍偏差，记录此三值与 phaseEndsAt 一并复制诊断包。",
  ].join("\n");
}

/** 模拟冷启动后休息段已结束、phaseFinishCallback 丢失；若尚无 continuation 则进入 pending */
function injectSequenceExpiredBreakNoCallback() {
  const snap = (settingStore.settings.pomoSequenceInput ?? "").trim() || "🍅+02+🍅+02";
  timerStore.resetTimer();
  timerStore.registerSequenceContinuation(null);
  timerStore.sequenceInputSnapshot = snap;
  timerStore.sequenceStepIndex = 1;
  timerStore.isFromSequence = true;
  timerStore.pomodoroState = "breaking";
  const segSec = 2 * 60;
  timerStore.totalTime = segSec;
  timerStore.timeRemaining = 0;
  const phaseEnds = Date.now() - 30_000;
  timerStore.phaseEndsAt = phaseEnds;
  timerStore.isGray = false;
  timerStore.reconcilePhaseFromWallClock();
  const pending = timerStore.pendingSequencePhaseFinalize;
  const interpret = pending
    ? "解读：pending=true 符合预期（无 continuation 时先挂起）；请接着点③验证 flush。"
    : `解读：pending=false（可能已有 continuation 注册，或 reconcile 直接走了 finalize）；state=${timerStore.pomodoroState}，请复制诊断包对照。`;
  pomoSequenceDiagResult.value = [
    "[② 注入：过期休息、无回调]",
    `pending=${pending} state=${timerStore.pomodoroState} registered=${timerStore.sequenceContinuationRegistered}`,
    interpret,
  ].join("\n");
}

/** 验证 flush：应先 register 再 flush；测试 handler 会 reset 并打日志 */
function registerTestContinuationAndFlush() {
  let invoked = false;
  timerStore.registerSequenceContinuation(() => {
    invoked = true;
    timerStore.resetTimer();
  });
  timerStore.flushPendingSequenceFinalize();
  const interpret = invoked
    ? "解读：continuationInvoked=true，延后队列已被消费（测试回调内 reset）；真机序列应由真实 continuation 推进下一步而非 reset。"
    : "解读：continuationInvoked=false，多半当前没有 pending（未先点②或已被别处 finalize）；可看 pending 与 state。";
  pomoSequenceDiagResult.value = [
    "[③ 测试 continuation + flush]",
    `continuationInvoked=${invoked} pendingAfter=${timerStore.pendingSequencePhaseFinalize} state=${timerStore.pomodoroState}`,
    interpret,
  ].join("\n");
}

const audioDebugText = computed(() => {
  const lines = settingStore.audioDebugLogs;
  return lines.length ? lines.join("\n") : "暂无记录。请先在同一标签页内开始专注（或开关白噪音）以产生日志；勿先刷新页面。";
});

const audioDebugCopyLoading = ref(false);

function buildAudioDebugExportBlock(): string {
  const logPart = settingStore.audioDebugLogs.length ? settingStore.audioDebugLogs.join("\n") : audioDebugText.value;
  return [
    "=== Pomotention 音频诊断（v3 SW 优化）===",
    `采集时间(ISO): ${new Date().toISOString()}`,
    "",
    "=== 平台（sounds / cuePlayback）===",
    `isAppleTouchWebKitDevice: ${isAppleTouchWebKitDevice()}`,
    `isAndroidTouchDevice: ${isAndroidTouchDevice()}`,
    `preferHtmlAudioCueFirst: ${preferHtmlAudioCueFirst()}`,
    "",
    "=== SW & 日志 ===",
    logPart,
  ].join("\n");
}

async function copyAudioDebugLogs() {
  audioDebugCopyLoading.value = true;
  try {
    const ok = await copyTextToClipboard(buildAudioDebugExportBlock());
    if (ok) {
      notification.success({
        title: "已复制",
        content: "已包含平台判定与日志；可直接粘贴。",
        duration: 2800,
      });
    } else {
      notification.warning({
        title: "复制未成功",
        content: "请长按下方文本框全选后复制；本页已展示三项平台布尔，可与代码预期对照。",
        duration: 5000,
      });
    }
  } finally {
    audioDebugCopyLoading.value = false;
  }
}

const device = useDevice();
const { isIOS: pwaIsIOS, isStandalone } = usePwaInstall();

const {
  snapshot: viewportSnapshot,
  refresh: refreshViewportSnapshot,
  buildReport: buildViewportDebugReportText,
} = useViewportDebugSnapshot();
const viewportDbgCopyLoading = ref(false);

function formatViewportDomRectBrief(r: { w: number; h: number; top: number; left: number } | null | undefined): string {
  if (!r) return "（未找到）";
  return `${r.w}×${r.h} @ (${r.left}, ${r.top})`;
}

const viewportDbgSnapshotAppLine = computed(() => formatViewportDomRectBrief(viewportSnapshot.value?.dom.app));
const viewportDbgSnapshotLayoutLine = computed(() => formatViewportDomRectBrief(viewportSnapshot.value?.dom.appLayout));
const viewportDbgSnapshotHeaderLine = computed(() => formatViewportDomRectBrief(viewportSnapshot.value?.dom.header));
const viewportDbgTextarea = computed(() => buildViewportDebugReportText());

async function copyViewportDbgReport() {
  viewportDbgCopyLoading.value = true;
  try {
    refreshViewportSnapshot();
    await nextTick();
    const ok = await copyTextToClipboard(buildViewportDebugReportText());
    if (ok) {
      notification.success({ title: "已复制", content: "视口调试报告已复制，可发给开发者或附在 issue。", duration: 2800 });
    } else {
      notification.warning({ title: "复制失败", content: "请手动全选下方文本框复制。", duration: 4000 });
    }
  } finally {
    viewportDbgCopyLoading.value = false;
  }
}

/** Tauri 非 PWA standalone，不能与「浏览器标签页」混为一谈 */
const openModeLabel = computed(() => {
  if (isTauri()) return "桌面窗口（Tauri 内嵌 WebView）";
  if (isStandalone.value) return "PWA（独立窗口）";
  return "浏览器标签页";
});

const generalSystemLine = ref("-");
const generalBrowserLine = ref("-");

const uaString = ref("");
const raw = ref({ iphone: false, ipad: false, ipod: false, anyIos: false });
const envText = ref("");
const envLoading = ref(false);
const envCopyLoading = ref(false);
const envMaskCopyLoading = ref(false);
const NET_APP = "https://pomotention.pages.dev/";
const NET_DOCS = "https://pomotention-docs.pages.dev/";
const NET_SUPA = "https://supabase.com/";
const NET_BAIDU = "https://www.baidu.com/";
const NET_GITHUB = "https://github.com/";
const NET_GOOGLE = "https://www.google.com/";
/** 与 appHttpFetch 一致：fetch，不成再 xhr（GitHub API） */
const NET_GITHUB_RELEASE_API = "https://api.github.com/repos/Xeonilian/pomotention/releases/latest";

/** 带 Abort 的超时探测 */
async function pingWithAbort(
  label: "fetch",
  url: string,
  init: RequestInit,
  timeoutMs: number,
  exec: (url: string, merged: RequestInit) => Promise<Response>,
): Promise<{ line: string; ok: boolean }> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), timeoutMs);
  const started = performance.now();
  try {
    const resp = await exec(url, { ...init, signal: ctl.signal });
    window.clearTimeout(timer);
    const ms = Math.round(performance.now() - started);
    if (resp.ok) return { line: `${label}: ok http ${resp.status} (${ms}ms)`, ok: true };
    return { line: `${label}: fail http ${resp.status} (${ms}ms)`, ok: false };
  } catch (e: any) {
    window.clearTimeout(timer);
    const ms = Math.round(performance.now() - started);
    const msg = e?.name === "AbortError" ? "timeout" : (e?.message ?? "failed");
    return { line: `${label}: fail (${msg}) (${ms}ms)`, ok: false };
  }
}

/** xhrFetch 无 signal，仅用 Promise.race 做超时 */
async function pingXhrOnly(url: string, init: RequestInit, timeoutMs: number): Promise<{ line: string; ok: boolean }> {
  const started = performance.now();
  try {
    const resp = (await Promise.race([
      xhrFetch(url, init),
      new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error("timeout")), timeoutMs)),
    ])) as Response;
    const ms = Math.round(performance.now() - started);
    if (resp.ok) return { line: `xhr: ok http ${resp.status} (${ms}ms)`, ok: true };
    return { line: `xhr: fail http ${resp.status} (${ms}ms)`, ok: false };
  } catch (e: any) {
    const ms = Math.round(performance.now() - started);
    const msg = e?.message === "timeout" ? "timeout" : (e?.message ?? "failed");
    return { line: `xhr: fail (${msg}) (${ms}ms)`, ok: false };
  }
}

/** 跨域：fetch → xhr，与 appHttpFetch 一致（无 fetchCORS 插件） */
async function buildCrossOriginTransportCascadeLines(timeoutMs = 8000): Promise<string[]> {
  const init: RequestInit = {
    method: "GET",
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Pomotention-EnvDiag",
    },
  };
  const lines: string[] = [`[cross_origin_cascade] ${NET_GITHUB_RELEASE_API}`, "  顺序: fetch → xhr；fetch 已 2xx 则不再测 xhr。"];

  const r1 = await pingWithAbort("fetch", NET_GITHUB_RELEASE_API, init, timeoutMs, (u, i) => fetch(u, i));
  lines.push(`  ${r1.line}`);
  if (r1.ok) {
    lines.push("  chosen_for_cross_origin: fetch");
    return lines;
  }

  const r2 = await pingXhrOnly(NET_GITHUB_RELEASE_API, init, timeoutMs);
  lines.push(`  ${r2.line}`);
  lines.push(r2.ok ? "  chosen_for_cross_origin: xhr" : "  chosen_for_cross_origin: (none)");

  return lines;
}

function buildAppHttpFetchDiagLines(): string[] {
  const s = getAppHttpFetchSnapshot();
  return [
    "[app_http_fetch]",
    `  viteProd: ${s.viteProd}`,
    `  isTauri: ${s.isTauri}`,
    `  macDesktopUa: ${s.macDesktopUa}`,
    `  transport: ${s.transport}`,
  ];
}

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

/** UA 中的系统族名 → 展示用中文 */
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

/** 从 UA 尽量解析系统版本号（无则空串） */
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

/** 从 UA 解析浏览器产品名与主版本（Tauri WebView 多为 Chromium / WebKit） */
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

/** 通用信息区：系统 / 浏览器；Chromium 系可再补 Client Hints */
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

function buildEnvMasked(src: string) {
  if (!src) return "暂无诊断结果";
  const lines = src.split("\n");
  const uaLine = lines.find((l) => l.startsWith("ua: "));
  const rawUa = uaLine ? uaLine.slice(4).trim() : "";
  const b = uaBrief(rawUa);
  return lines
    .map((l) => {
      if (l.startsWith("ua: ")) return `ua: [masked] os=${b.os} browser=${b.browser}`;
      if (l.startsWith("session_user_id_hint:")) return "session_user_id_hint: [masked]";
      if (l.startsWith("last_logged_user_id:")) return "last_logged_user_id: [masked]";
      return l;
    })
    .join("\n");
}

function testUrl(name: string, url: string, timeout = 6000): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  const started = performance.now();
  return fetch(url, { method: "GET", mode: "no-cors", cache: "no-store", signal: ctl.signal })
    .then(() => {
      const ms = Math.round(performance.now() - started);
      return `${name}: ok (${ms}ms)`;
    })
    .catch((e: any) => {
      const msg = e?.name === "AbortError" ? "timeout" : (e?.message ?? "failed");
      return `${name}: fail (${msg})`;
    })
    .finally(() => {
      clearTimeout(timer);
    });
}

async function runEnvDiag() {
  envLoading.value = true;
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const swSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
    const swControlled = swSupported ? !!navigator.serviceWorker.controller : false;
    const online = typeof navigator !== "undefined" ? navigator.onLine : false;
    const lang = typeof navigator !== "undefined" ? navigator.language : "unknown";
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
    const runtime = isTauri() ? "tauri" : "web";
    const mode = isTauri() ? "tauri" : isStandalone.value ? "pwa" : "tab";
    const cloudSyncActive = isSupabaseEnabled();
    const supaLegacy = cloudSyncActive ? "on" : "off";
    const localOnly = settingStore.settings.localOnlyMode ? "on" : "off";

    const authLines = await buildAuthSyncDiagLines();

    const cascadeLines = await buildCrossOriginTransportCascadeLines(8000);

    const tests = await Promise.all([
      testUrl(`app (${NET_APP})`, NET_APP),
      testUrl(`docs (${NET_DOCS})`, NET_DOCS),
      testUrl(`supa (${NET_SUPA})`, NET_SUPA),
      testUrl(`baidu (${NET_BAIDU})`, NET_BAIDU),
      testUrl(`github (${NET_GITHUB})`, NET_GITHUB),
      testUrl(`google (${NET_GOOGLE})`, NET_GOOGLE),
    ]);

    let hint = "网络无明显异常。";
    const fail = tests.filter((x) => x.includes(": fail")).length;
    if (settingStore.settings.localOnlyMode) {
      hint =
        "仅本地已开启：云同步入口会关闭，legacy「supa: off」属预期。请到「调试与诊断」→「环境诊断」点击「启用云同步（关闭仅本地）」，或在登录页成功登录。";
    } else if (fail >= 3) hint = "多站点失败，优先检查网络/代理/防火墙。";
    else if (tests.find((x) => x.startsWith(`docs (${NET_DOCS}): fail`))) hint = "文档站失败，可能是网络区域或 DNS 问题。";
    else if (tests.find((x) => x.startsWith(`supa (${NET_SUPA}): fail`)))
      hint =
        "访问 supabase.com 探测失败（多为浏览器策略/区域网络）；不一定表示你的项目不可用，请看 auth_sync 里 session 与 cloud_sync_active。";

    envText.value = [
      "=== Pomotention 环境诊断 ===",
      `time: ${new Date().toISOString()}`,
      `runtime: ${runtime}`,
      `mode: ${mode}`,
      `online: ${online}`,
      `lang: ${lang}`,
      `tz: ${tz}`,
      `sw: ${swSupported ? "yes" : "no"} / ctrl: ${swControlled ? "yes" : "no"}`,
      `legacy_supa_supabaseEnabled: ${supaLegacy} / localOnly: ${localOnly}`,
      `cloud_sync_active (isSupabaseEnabled): ${cloudSyncActive ? "on" : "off"}`,
      `vite_PROD: ${import.meta.env.PROD}`,
      `system_display: ${buildSystemDisplayFromUa(ua)}`,
      `browser_display: ${buildBrowserDisplayFromUa(ua)}`,
      `ua: ${ua || "(empty)"}`,
      "",
      ...authLines,
      "",
      ...buildAppHttpFetchDiagLines(),
      "",
      ...cascadeLines,
      "",
      "[net]",
      ...tests,
      "",
      `[hint] ${hint}`,
    ].join("\n");
  } finally {
    envLoading.value = false;
  }
}

async function copyEnvDiag() {
  envCopyLoading.value = true;
  try {
    if (!envText.value) await runEnvDiag();
    const ok = await copyTextToClipboard(envText.value || "暂无诊断结果");
    if (ok) {
      notification.success({ title: "已复制", content: "环境诊断已复制，可直接发给开发者。", duration: 2800 });
    } else {
      notification.warning({ title: "复制失败", content: "请手动全选下方文本复制。", duration: 4000 });
    }
  } finally {
    envCopyLoading.value = false;
  }
}

async function copyEnvDiagMask() {
  envMaskCopyLoading.value = true;
  try {
    if (!envText.value) await runEnvDiag();
    const text = buildEnvMasked(envText.value);
    const ok = await copyTextToClipboard(text);
    if (ok) {
      notification.success({ title: "已复制", content: "脱敏结果已复制，可放心发给开发者。", duration: 2800 });
    } else {
      notification.warning({ title: "复制失败", content: "请手动全选下方文本复制。", duration: 4000 });
    }
  } finally {
    envMaskCopyLoading.value = false;
  }
}

onMounted(() => {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  uaString.value = ua || "(无)";
  const lower = ua.toLowerCase();
  raw.value = {
    iphone: /iphone/.test(lower),
    ipad: /ipad/.test(lower),
    ipod: /ipod/.test(lower),
    anyIos: /iphone|ipad|ipod/.test(lower),
  };

  // v3: 检查SW状态 for iPhone sound debug
  setTimeout(() => {
    dbgSwStatus();
  }, 2000);
  void refreshGeneral();
});

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
const dataStore = useDataStore();
const syncStore = useSyncStore();

/** 是否有 Supabase 客户端（与是否仅本地无关） */
const hasSupabaseClient = computed(() => !!supabase);
/** 通用设置：关闭「仅本地」 */
const showExitLocalOnly = computed(() => hasSupabaseClient.value && settingStore.settings.localOnlyMode);
const exitLocalOnlyLoading = ref(false);

async function handleExitLocalOnlyMode() {
  if (!supabase) return;
  exitLocalOnlyLoading.value = true;
  try {
    settingStore.settings.localOnlyMode = false;
    settingStore.settings.autoSupabaseSync = true;
    let session = await getSession();
    if (!session) {
      await new Promise((r) => setTimeout(r, 150));
      session = await getSession();
    }
    if (session) {
      await applySignedInSession(session);
    } else {
      await syncStore.checkLoginStatus();
    }
    subscribeAuthStateChanges();
    await refreshGeneral();
    notification.success({
      title: "已启用云同步",
      content: session ? "已关闭仅本地并与当前会话对齐。" : "已关闭仅本地，可使用下方「去登录」。",
      duration: 3800,
    });
  } finally {
    exitLocalOnlyLoading.value = false;
  }
}

/** 统计 Supabase 在 localStorage 中的键数量（不读取值） */
function countSbStorageKeys(): number {
  if (typeof localStorage === "undefined") return 0;
  let n = 0;
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith("sb-")) n += 1;
  }
  return n;
}

/**
 * 登录/同步快照：不含 access_token，便于远程排查「界面未登录 vs 实际有 session」
 */
async function buildAuthSyncDiagLines(): Promise<string[]> {
  const lines: string[] = ["[auth_sync]"];
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const hashLen = typeof window !== "undefined" ? window.location.hash.length : 0;
  lines.push(`  route_path: ${path || "-"}`);
  lines.push(`  url_hash_length: ${hashLen}`);
  lines.push(`  syncStore.isLoggedIn: ${syncStore.isLoggedIn}`);
  lines.push(`  localOnlyMode: ${settingStore.settings.localOnlyMode}`);
  lines.push(`  autoSupabaseSync: ${settingStore.settings.autoSupabaseSync}`);

  const envUrl = typeof import.meta.env.VITE_SUPABASE_URL === "string" ? import.meta.env.VITE_SUPABASE_URL : "";
  const envKey = typeof import.meta.env.VITE_SUPABASE_ANON_KEY === "string" ? import.meta.env.VITE_SUPABASE_ANON_KEY : "";
  lines.push(`  vite_supabase_env: ${envUrl && envKey ? "present" : "missing"}`);

  let hostHint = "-";
  if (envUrl) {
    try {
      hostHint = new URL(envUrl).hostname;
    } catch {
      hostHint = "(invalid_url)";
    }
  }
  lines.push(`  supabase_api_host: ${hostHint}`);

  if (!supabase) {
    lines.push(`  supabase_js_client: null`);
    lines.push(`  getSession: (skipped — no client)`);
    lines.push(`  sb_localStorage_keys: ${countSbStorageKeys()}`);
    return lines;
  }

  lines.push(`  supabase_js_client: ok`);
  lines.push(`  cloud_sync_active (isSupabaseEnabled): ${isSupabaseEnabled()}`);

  const lastUid = settingStore.settings.lastLoggedInUserId;
  if (lastUid) {
    lines.push(`  last_logged_user_id: ${lastUid.length > 12 ? `${lastUid.slice(0, 6)}…${lastUid.slice(-4)}` : "[short]"}`);
  } else {
    lines.push(`  last_logged_user_id: (none)`);
  }

  lines.push(`  sb_localStorage_keys: ${countSbStorageKeys()}`);

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      lines.push(`  getSession_error: ${error.message}`);
      return lines;
    }
    const sess = data.session;
    lines.push(`  session_present: ${!!sess}`);
    if (sess?.expires_at) {
      lines.push(`  session_expires_at_utc: ${new Date(sess.expires_at * 1000).toISOString()}`);
    }
    if (sess?.user) {
      const uid = sess.user.id;
      lines.push(`  session_user_id_hint: ${uid.length > 12 ? `${uid.slice(0, 8)}…${uid.slice(-4)}` : "[short]"}`);
      lines.push(`  email_confirmed_at: ${sess.user.email_confirmed_at ? "set" : "null"}`);
    }
    const mismatch = !!sess !== syncStore.isLoggedIn;
    lines.push(`  ui_vs_session_mismatch: ${mismatch ? "YES" : "no"}`);
  } catch (e: unknown) {
    lines.push(`  getSession_exception: ${e instanceof Error ? e.message : String(e)}`);
  }
  return lines;
}

/** 是否启用云端能力（仅本地关闭且配置了 Supabase 时为 true） */
const supabaseEnabled = computed(() => isSupabaseEnabled());
const diagnosticLoading = ref(false);
const diagnosticResult = ref("");

const lastSyncDisplay = computed(() => {
  const ts = syncStore.lastSyncTimestamp;
  if (!ts) return "0 (全量)";
  try {
    return new Date(ts).toISOString();
  } catch {
    return String(ts);
  }
});

function snapshot() {
  return {
    lastSyncTimestamp: syncStore.lastSyncTimestamp,
    activities: dataStore.activityList.length,
    tasks: dataStore.taskList.length,
    todos: dataStore.todoList.length,
    schedules: dataStore.scheduleList.length,
  };
}

async function runDownloadTest() {
  diagnosticLoading.value = true;
  diagnosticResult.value = "";
  try {
    const before = snapshot();
    const out = await downloadAllWithDiagnostics(0, { updateTimestamp: false });
    const after = snapshot();
    const lines = [
      "[下载测试 - 全量，不更新时间戳]",
      `before: lastSync=${before.lastSyncTimestamp} | activities=${before.activities} tasks=${before.tasks} todos=${before.todos} schedules=${before.schedules}`,
      `after:  lastSync=${after.lastSyncTimestamp} | activities=${after.activities} tasks=${after.tasks} todos=${after.todos} schedules=${after.schedules}`,
      `success=${out.success} errors=${out.errors.join("; ") || "-"}`,
      "details (fetched / applied / cloudDeleted，若 applied+cloudDeleted=fetched 则未写入的全是云端已删除):",
      ...(out.details || []).map(
        (d) =>
          `  ${d.name}: fetched=${d.fetched} applied=${d.downloaded} cloudDeleted=${d.cloudDeleted ?? "-"}  ${d.fetched === d.downloaded + (d.cloudDeleted ?? 0) ? "✓" : "?"}`,
      ),
    ];
    diagnosticResult.value = lines.join("\n");
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    diagnosticResult.value = `[下载测试] 异常: ${msg}`;
  } finally {
    diagnosticLoading.value = false;
  }
}

async function runClearThenDownloadTest() {
  diagnosticLoading.value = true;
  diagnosticResult.value = "";
  try {
    // 只清业务数据键（与下载替换的键一致），保留登录态；内存清空并重置 lastSync 以便全量拉取
    clearLocalData();
    dataStore.clearData();
    syncStore.resetSync();
    await Promise.resolve();
    const afterClear = snapshot();
    const out = await downloadAllWithDiagnostics(0, { updateTimestamp: true });
    const after = snapshot();
    const lines = [
      "[清除后下载测试] 本底空 + 全量拉取（获得数据库全部数据需已执行 RPC 分页迁移）",
      `afterClear (本底): lastSync=${afterClear.lastSyncTimestamp} | activities=${afterClear.activities} tasks=${afterClear.tasks} todos=${afterClear.todos} schedules=${afterClear.schedules}`,
      `after download: lastSync=${after.lastSyncTimestamp} | activities=${after.activities} tasks=${after.tasks} todos=${after.todos} schedules=${after.schedules}`,
      `success=${out.success} errors=${out.errors.join("; ") || "-"}`,
      "details (fetched / applied / cloudDeleted，若 applied+cloudDeleted=fetched 则未写入的全是云端已删除):",
      ...(out.details || []).map(
        (d) =>
          `  ${d.name}: fetched=${d.fetched} applied=${d.downloaded} cloudDeleted=${d.cloudDeleted ?? "-"}  ${d.fetched === d.downloaded + (d.cloudDeleted ?? 0) ? "✓" : "?"}`,
      ),
    ];
    diagnosticResult.value = lines.join("\n");
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    diagnosticResult.value = `[清除后下载测试] 异常: ${msg}`;
  } finally {
    diagnosticLoading.value = false;
  }
}

// 本地 pnpm dev 时 DEV 为 true；或 Cloudflare Preview 配置了 VITE_APP_DEV；正式站两者皆无故不显示
const isDev = computed(() => !!import.meta.env.VITE_APP_DEV || import.meta.env.DEV);

const breakOptions = [
  { label: "2", value: 2 },
  { label: "5", value: 5 },
  { label: "15", value: 15 },
  { label: "30", value: 30 },
];

function resetDurations() {
  settingStore.resetDurations();
}

function resetStyle() {
  settingStore.resetStyle();
}

function handleClearLocal() {
  clearAllAppStorage();
  dataStore.clearData();
  syncStore.resetSync();
  window.location.reload();
}

function handleFactoryReset() {
  // 清业务 localStorage + Supabase 会话键，避免重装后自动带回本地登录态
  clearAllAppStorage();
  purgeSupabaseAuthStorage();
  dataStore.clearData();
  syncStore.resetSync();
  window.location.reload();
}
</script>

<style scoped>
.settings-page {
  max-width: 900px;
  width: 92%;
  margin: 12px auto;
  padding: 8px 10px 20px;
  max-height: calc(100vh - 90px);
  overflow-y: auto;
}

.general-actions {
  margin-top: 12px;
  flex-wrap: wrap;
}

.settings-localonly-hint {
  display: block;
  margin-top: 6px;
  color: var(--n-text-color-3);
  font-size: 12px;
  line-height: 1.45;
}

.detection-hint {
  margin-left: 8px;
  color: var(--n-text-color-3);
  font-size: 12px;
}

.recommendation {
  margin-top: 12px;
  padding: 10px;
  background: var(--n-color-target);
  border-radius: 6px;
  font-size: 13px;
}

.recommendation code {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--n-color-target);
  border: 1px solid var(--n-border-color);
}

.diagnostic-log {
  font-family: monospace;
  padding: 8px;
  background: var(--n-color-target);
  border-radius: 4px;
  border: 1px solid var(--n-border-color);
  color: var(--color-background);
}

.audio-dbg-hint {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--n-text-color-3);
  line-height: 1.5;
}

.audio-dbg-hint code {
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--color-blue-light);
  border: 1px solid var(--n-border-color);
}

.audio-dbg-hint--secondary {
  margin-top: 0;
  font-size: 11px;
}

.audio-dbg-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.audio-dbg-textarea :deep(textarea) {
  word-break: break-all;
}

.settings-diagnostics-header {
  font-weight: 600;
  display: block;
}

.settings-diagnostics-sub {
  display: block;
  font-size: 12px;
  font-weight: normal;
  color: var(--n-text-color-3);
  margin-top: 4px;
}

.settings-diagnostics-card :deep(.n-collapse-item__header) {
  padding-top: 10px;
  padding-bottom: 10px;
}

.settings-diagnostics-card :deep(.n-collapse-item__content-wrapper) {
  padding-bottom: 8px;
}

.sync-diag-footer {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--n-text-color-3);
  line-height: 1.5;
}

.pomo-seq-diag-guide {
  margin-bottom: 14px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--n-text-color-2);
}

.pomo-seq-diag-guide-title {
  margin: 0 0 6px;
  font-weight: 600;
  color: var(--n-text-color-1);
}

.pomo-seq-diag-ol,
.pomo-seq-diag-ul {
  margin: 0 0 10px;
  padding-left: 1.25rem;
}

.pomo-seq-diag-ol li,
.pomo-seq-diag-ul li {
  margin-bottom: 6px;
}

.pomo-seq-diag-footnote {
  margin-top: 0;
}

.pomo-seq-diag-btn {
  white-space: normal !important;
  height: auto !important;
  min-height: 36px;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
  line-height: 1.35;
}
</style>
