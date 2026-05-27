<template>
  <div class="timer-stats-root">
    <header class="timer-stats-header">
      <n-button text title="返回计时器" @click="goBack">
        <template #icon>
          <n-icon :component="ArrowLeft24Regular" />
        </template>
      </n-button>
      <span class="timer-stats-title">统计</span>
      <n-button v-if="canExport" text title="导出 CSV" class="timer-stats-header-btn" @click="exportCsv">
        <template #icon>
          <n-icon :component="ArrowDownload24Regular" />
        </template>
      </n-button>
      <n-button text title="规则" class="timer-stats-header-btn" @click="showRules = true">
        <template #icon>
          <n-icon :component="Settings24Regular" />
        </template>
      </n-button>
    </header>

    <main class="timer-stats-body">
      <div class="timer-stats-inner">
        <div class="timer-stats-week-nav">
          <n-button text size="small" @click="prevWeek">
            <template #icon><n-icon :component="ChevronLeft24Filled" /></template>
          </n-button>
          <span class="timer-stats-week-label">{{ weekYear }} Week {{ weekNumber }}</span>
          <n-button text size="small" :disabled="isCurrentWeek" @click="nextWeek">
            <template #icon><n-icon :component="ChevronRight24Filled" /></template>
          </n-button>
        </div>

        <TimerWeekChart :week-days="weekDays" :emojis="emojis" :stats-include="statsInclude" />

        <div v-for="day in weekDays" :key="day.key" class="timer-stats-day" :class="{ 'timer-stats-day--today': day.isToday }">
          <div class="timer-stats-day-content">
            <div class="timer-stats-day-label timer-stats-mono">
              <span class="timer-stats-dow">{{ day.label }}</span>
              <span class="timer-stats-dom">{{ day.dateLabel }}</span>
            </div>
            <div class="timer-stats-day-totals">
              <span>Work {{ (day.totals.workMinutes / 60).toFixed(1) }} h</span>
              <span>Break {{ (day.totals.breakMinutes / 60).toFixed(1) }} h</span>
            </div>
          </div>
          <div class="timer-stats-emojis">
            <button
              v-for="session in day.sessions"
              :key="session.id"
              type="button"
              class="timer-stats-emoji"
              :title="sessionTitle(session)"
              @click.stop="openSessionDetail(session)"
            >
              {{ sessionEmoji(session) }}
            </button>
            <span v-if="!day.sessions.length" class="timer-stats-empty"></span>
          </div>
        </div>
      </div>
    </main>

    <Teleport to="#timer-portal">
      <div v-if="showDetail && selectedSession" class="timer-detail-overlay" role="presentation" @click.self="closeDetail">
        <div class="timer-detail-panel" role="dialog" aria-modal="true" :aria-label="detailTitle">
          <header class="timer-detail-panel__head">
            <span class="timer-detail-panel__title">{{ detailTitle }}</span>
            <button type="button" class="timer-detail-panel__close" aria-label="关闭" @click="closeDetail">×</button>
          </header>
          <dl class="timer-detail-dl">
            <dt>类型</dt>
            <dd>{{ categoryLabel(selectedSession.category) }} {{ sessionEmoji(selectedSession) }}</dd>
            <dt>时长</dt>
            <dd>{{ formatDurationMs(selectedSession.durationMs) }}</dd>
            <dt>开始</dt>
            <dd>{{ formatTs(selectedSession.startedAt) }}</dd>
            <dt>结束</dt>
            <dd>{{ formatTs(selectedSession.endedAt) }}</dd>
            <dt>状态文案</dt>
            <dd>{{ selectedSession.stateMessage || "—" }}</dd>
            <dt>计划时长</dt>
            <dd>{{ selectedSession.plannedDurationMin }} 分钟</dd>
            <dt>结束方式</dt>
            <dd>{{ endReasonLabel(selectedSession.endReason) }}</dd>
          </dl>
        </div>
      </div>
    </Teleport>

    <TimerSessionRulesDialog v-model:show="showRules" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { isTauri } from "@tauri-apps/api/core";
import { NButton, NIcon } from "naive-ui";
import { ArrowDownload24Regular, ArrowLeft24Regular, ChevronLeft24Filled, ChevronRight24Filled, Settings24Regular } from "@vicons/fluent";
import { useTimerWeekStats } from "@/composables/timer/useTimerWeekStats";
import { useTimerSessionStore } from "@/stores/useTimerSessionStore";
import { useDevice } from "@/composables/platform/useDevice";
import type { TimerSessionRecord, TimerSessionCategory } from "@/core/types/TimerSession";
import { formatDurationMs, resolveSessionDisplayEmoji } from "@/services/timer/timerSessionClassifier";
import { downloadTimerSessionsCsv } from "@/services/timer/timerSessionExport";
import { getISOWeekYearAndNumber, getMondayOfWeekContaining, shiftWeekMonday } from "@/services/timer/timerWeekUtils";
import TimerSessionRulesDialog from "./TimerSessionRulesDialog.vue";
import TimerWeekChart from "./TimerWeekChart.vue";

const router = useRouter();
const sessionStore = useTimerSessionStore();
const { isMobile } = useDevice();

const weekMonday = ref(getMondayOfWeekContaining(new Date()));
const { weekDays, weekYear, weekNumber, weekSessions, isCurrentWeek } = useTimerWeekStats(weekMonday);

const showRules = ref(false);
const showDetail = ref(false);
const selectedSession = ref<TimerSessionRecord | null>(null);

const canExport = computed(() => isTauri() && !isMobile.value);
const emojis = computed(() => sessionStore.rules.emojis);
const statsInclude = computed(() => sessionStore.rules.statsInclude);

const detailTitle = computed(() => {
  const s = selectedSession.value;
  if (!s) return "详情";
  return `${sessionEmoji(s)} 详情`;
});

function sessionEmoji(session: TimerSessionRecord): string {
  return resolveSessionDisplayEmoji(session, sessionStore.rules);
}

function onEscapeKey(e: KeyboardEvent) {
  if (e.key === "Escape" && showDetail.value) closeDetail();
}

onMounted(() => {
  sessionStore.normalizeStoredRules();
  window.addEventListener("keydown", onEscapeKey);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onEscapeKey);
});

function openSessionDetail(session: TimerSessionRecord) {
  selectedSession.value = session;
  showDetail.value = true;
}

function closeDetail() {
  showDetail.value = false;
  selectedSession.value = null;
}

function prevWeek() {
  weekMonday.value = shiftWeekMonday(weekMonday.value, -1);
}

function nextWeek() {
  weekMonday.value = shiftWeekMonday(weekMonday.value, 1);
}

function exportCsv() {
  const { year, week } = getISOWeekYearAndNumber(weekMonday.value);
  downloadTimerSessionsCsv(weekSessions.value, `pomotention-timer-${year}-W${String(week).padStart(2, "0")}.csv`);
}

function goBack() {
  if (router.currentRoute.value.path !== "/") {
    void router.push("/");
  }
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString();
}

function categoryLabel(c: TimerSessionCategory): string {
  if (c === "work_void") return "作废工作";
  if (c === "work") return "工作";
  return "休息";
}

function endReasonLabel(r: string): string {
  if (r === "squash") return "提前结束（Squash）";
  if (r === "stop") return "提前结束（Stop）";
  return "自然结束";
}

function sessionTitle(s: TimerSessionRecord): string | undefined {
  const message = s.stateMessage.trim();
  return message || undefined;
}
</script>

<style scoped>
.timer-stats-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
  background-color: var(--color-background, #fff);
}

.timer-stats-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 8px 8px 4px;
  border-bottom: 1px solid var(--color-background-light, #efefef);
}

.timer-stats-title {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
  padding-left: 4px;
}

.timer-stats-header-btn {
  flex-shrink: 0;
}

.timer-stats-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.timer-stats-inner {
  width: 100%;
  max-width: min(480px, 100%);
  margin: 0 auto;
}

.timer-stats-week-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.timer-stats-week-label {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.timer-stats-mono {
  font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
  font-variant-numeric: tabular-nums;
}

.timer-stats-day {
  padding: 0 8px 4px 8px;
}

.timer-stats-day--today .timer-stats-dom {
  color: var(--color-blue, #4098fc);
  font-weight: 700;
}

.timer-stats-day-content {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.timer-stats-day-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
}

.timer-stats-dow {
  font-weight: 600;
  width: 28px;
}

.timer-stats-dom {
  color: var(--color-text-secondary, var(--n-text-color-3));
}

.timer-stats-emojis {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 2px;
  min-height: 20px;
  line-height: 20px;
}

.timer-stats-emoji {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  font: inherit;
  font-size: 15px;
  line-height: 20px;
  height: 20px;
  cursor: pointer;
}

.timer-stats-emoji:hover {
  opacity: 0.65;
}

.timer-stats-empty {
  font-size: 13px;
  line-height: 20px;
  color: var(--n-text-color-3);
}

.timer-stats-day-totals {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary, var(--n-text-color-3));
  font-variant-numeric: tabular-nums;
}

.timer-detail-dl {
  margin: 0;
  font-size: 13px;
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px 12px;
}

.timer-detail-dl dt {
  margin: 0;
  color: var(--color-text-secondary, var(--n-text-color-3));
}

.timer-detail-dl dd {
  margin: 0;
}
</style>

<style>
#timer-portal .timer-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.45);
}

#timer-portal .timer-detail-panel {
  width: min(300px, calc(100vw - 24px));
  max-height: min(420px, calc(100vh - 24px));
  overflow-y: auto;
  padding: 12px 14px 14px;
  border-radius: 8px;
  background: var(--color-background, #fff);
  color: var(--color-text-primary);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.2);
}

#timer-portal .timer-detail-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

#timer-portal .timer-detail-panel__title {
  font-weight: 600;
  font-size: 14px;
}

#timer-portal .timer-detail-panel__close {
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
  color: var(--color-text-secondary, #888);
}
</style>
