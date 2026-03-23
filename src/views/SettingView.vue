<template>
  <n-space
    vertical
    size="large"
    style="max-width: 800px; width: 90%; margin: 20px auto; padding: 20px; max-height: calc(100vh - 100px); overflow-y: auto"
  >
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

        <n-collapse-item title="音频诊断（iOS / PWA）" name="audio">
          <p class="audio-dbg-hint">
            记录阶段提示音（HTMLAudio）与白噪音（Web Audio）的关键事件；仅保存在内存，刷新页面会清空。出现
            <code>play FAIL</code>
            或
            <code>statechange suspended</code>
            时可与现象对照。
          </p>
          <n-space style="margin-bottom: 8px">
            <n-button size="small" @click="settingStore.clearAudioDebugLogs()">清空日志</n-button>
          </n-space>
          <div class="audio-dbg-log">
            {{ audioDebugText }}
          </div>
        </n-collapse-item>

        <n-collapse-item v-if="supabaseEnabled && syncStore.isLoggedIn" title="同步诊断（Supabase）" name="sync">
          <n-descriptions label-placement="left" :column="1" bordered size="small" style="margin-bottom: 12px">
            <n-descriptions-item label="lastSyncTimestamp">{{ syncStore.lastSyncTimestamp }} ({{ lastSyncDisplay }})</n-descriptions-item>
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

        <n-collapse-item title="番茄序列 / 计时器（PWA 恢复评估）" name="pomo-sequence-timer">
          <div class="pomo-seq-diag-guide">
            <p class="pomo-seq-diag-guide-title">什么时候点</p>
            <ol class="pomo-seq-diag-ol">
              <li>
                <strong>真机出问题后</strong>：先点下方「复制完整诊断包」把现状发给调试；再按需点 ①②③ 做<strong>人工复现链</strong>（会改计时器状态，仅用于对照代码路径）。
              </li>
              <li><strong>① 墙钟校准</strong>：模拟从后台回到前台；平时也可在计时器异常时点一次看时间是否被墙钟收束。</li>
              <li>
                <strong>② 注入过期休息</strong>：仅在<strong>没有真实番茄在跑</strong>时点；会把 store 设成「序列、休息段已过期、无内存回调」，用来观察是否出现
                <code>pending=true</code>。
              </li>
              <li><strong>③ 测试 flush</strong>：在②之后点；验证「pending 能否被消费」。会通过<strong>测试用</strong>回调里执行 reset，不会推进真实下一颗番茄。</li>
            </ol>
            <p class="pomo-seq-diag-guide-title">结果怎么读（摘要）</p>
            <ul class="pomo-seq-diag-ul">
              <li><code>pendingSequencePhaseFinalize=true</code>：阶段该结束了，但当时没人注册 continuation，先挂着；真机对应冷启动里 main 比组件早 reconcile。</li>
              <li><code>pending=false</code> 且刚点过②：多半已直接 finalize 或走了别的分支，看下方「最近一次输出」里的解读行。</li>
              <li><code>continuationInvoked=true</code>（③之后）：说明 flush 确实调到了回调；线上应由 PomodoroSequence 注册的<strong>真实</strong>回调推进序列。</li>
            </ul>
          </div>
          <n-space vertical size="small" style="width: 100%; margin-bottom: 12px" :item-style="{ width: '100%' }">
            <n-button type="info" secondary block class="pomo-seq-diag-btn" :loading="pomoSequenceCopyLoading" @click="copyPomoSequenceDiagReport">
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
            <n-descriptions-item label="pendingSequencePhaseFinalize">{{ timerStore.pendingSequencePhaseFinalize }}</n-descriptions-item>
            <n-descriptions-item label="sequenceContinuationRegistered">{{ timerStore.sequenceContinuationRegistered }}</n-descriptions-item>
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
            <code>useTimerStore</code> / <code>PomodoroSequence</code>。
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

    <n-card title="设置番茄时长">
      <n-form>
        <n-form-item label="工作时长（分钟）">
          <n-input-number
            v-model:value="settingStore.settings.durations.workDuration"
            @update:value="(val) => console.log('workDuration 更新为:', val)"
            :min="1"
            :max="60"
            style="width: 250px"
          />
        </n-form-item>
        <n-form-item label="休息时长（分钟）">
          <n-select v-model:value="settingStore.settings.durations.breakDuration" :options="breakOptions" style="width: 250px" />
        </n-form-item>
      </n-form>
      <n-button @click="resetDurations" type="error" style="margin-top: 12px">恢复默认时长</n-button>
    </n-card>

    <n-card title="设置样式">
      <n-form>
        <n-form-item label="进度条长度">
          <n-input v-model:value="settingStore.settings.style.barLength" />
        </n-form-item>
        <n-form-item label="红色条颜色">
          <n-color-picker v-model:value="settingStore.settings.style.redBarColor" show-alpha />
        </n-form-item>
        <n-form-item label="蓝色条颜色">
          <n-color-picker v-model:value="settingStore.settings.style.blueBarColor" show-alpha />
        </n-form-item>
      </n-form>
      <n-button @click="resetStyle" type="error" style="margin-top: 12px">恢复默认样式</n-button>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
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
  useNotification,
} from "naive-ui";
import { useSettingStore } from "../stores/useSettingStore";
import { useTimerStore } from "../stores/useTimerStore";
import { useDataStore } from "../stores/useDataStore";
import { useSyncStore } from "../stores/useSyncStore";
import { clearAllAppStorage } from "../services/localStorageService";
import { clearLocalData } from "@/services/downloadService";
import { downloadAllWithDiagnostics } from "@/services/sync";
import { isSupabaseEnabled } from "@/core/services/supabase";
import { useDevice } from "@/composables/useDevice";
import { usePwaInstall } from "@/composables/usePwaInstall";

const settingStore = useSettingStore();
const timerStore = useTimerStore();
const notification = useNotification();

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
    lines.push(
      "- sequenceContinuationRegistered=true：已有续跑回调（正常序列运行时由 PomodoroSequence 注册，或你刚点了③的测试回调）。",
    );
  } else {
    lines.push(
      "- sequenceContinuationRegistered=false：未挂续跑回调；若正在跑序列却长期如此，检查组件是否挂载或是否被 reset。",
    );
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
    await navigator.clipboard.writeText(text);
    notification.success({
      title: "已复制",
      content: "完整诊断包已写入剪贴板，可直接粘贴到 issue 或聊天。",
      duration: 2800,
    });
  } catch {
    notification.error({
      title: "复制失败",
      content: "浏览器未允许剪贴板或环境不支持；请展开下方输出区手动全选复制（若需可再告知加只读文本框）。",
      duration: 4500,
    });
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
  return lines.length ? lines.join("\n") : "暂无记录。请先开始番茄钟、切换阶段或开关白噪音。";
});

const device = useDevice();
const { isIOS: pwaIsIOS } = usePwaInstall();

const uaString = ref("");
const raw = ref({ iphone: false, ipad: false, ipod: false, anyIos: false });

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
});
const dataStore = useDataStore();
const syncStore = useSyncStore();

const supabaseEnabled = isSupabaseEnabled();
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
</script>

<style scoped>
.container {
  margin: 0 auto;
  padding: 20px;
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
  background: var(--n-color-target);
  border: 1px solid var(--n-border-color);
}

.audio-dbg-log {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 320px;
  overflow: auto;
  padding: 10px;
  background: var(--n-color-target);
  border-radius: 6px;
  border: 1px solid var(--n-border-color);
  color: var(--color-background);
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
