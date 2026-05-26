<template>
  <div class="timer-stats-root">
    <header class="timer-stats-header">
      <n-button text title="返回计时器" @click="goBack">
        <template #icon>
          <n-icon :component="ArrowLeft24Regular" />
        </template>
      </n-button>
      <span class="timer-stats-title">本周统计</span>
      <n-button text title="分类规则" class="timer-stats-rules-btn" @click="showRules = true">
        <template #icon>
          <n-icon :component="Settings24Regular" />
        </template>
      </n-button>
    </header>

    <main class="timer-stats-body">
      <div class="timer-stats-inner">
        <p class="timer-stats-summary">共 {{ totalSessions }} 段 · 番茄 {{ tomatoCount }} · 作废 {{ voidCount }}</p>

        <div v-for="day in weekDays" :key="day.key" class="timer-stats-day" :class="{ 'timer-stats-day--today': day.isToday }">
          <div class="timer-stats-day-label">
            <span class="timer-stats-dow">{{ day.label }}</span>
            <span class="timer-stats-dom">{{ day.dateNum }}</span>
          </div>
          <div class="timer-stats-emojis">
            <template v-if="day.sessions.length">
              <button
                v-for="session in day.sessions"
                :key="session.id"
                type="button"
                class="timer-stats-emoji"
                :title="sessionTitle(session)"
                @click="selectedSession = session"
              >
                {{ session.emoji }}
              </button>
            </template>
            <span v-else class="timer-stats-empty">—</span>
          </div>
        </div>

        <section v-if="recentClicks.length" class="timer-stats-clicks">
          <h3 class="timer-stats-clicks-heading">最近按钮记录</h3>
          <ul>
            <li v-for="click in recentClicks" :key="click.id">
              {{ click.label }} · {{ formatTs(click.timestamp) }}
            </li>
          </ul>
        </section>
      </div>
    </main>

    <n-modal v-model:show="detailVisible" preset="card" :title="detailTitle" class="timer-detail-modal" size="small">
      <dl v-if="selectedSession" class="timer-detail-dl">
        <dt>类型</dt>
        <dd>{{ categoryLabel(selectedSession.category) }} {{ selectedSession.emoji }}</dd>
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
        <dt v-if="selectedSession.buttonLabel">按钮</dt>
        <dd v-if="selectedSession.buttonLabel">{{ selectedSession.buttonLabel }}</dd>
      </dl>
    </n-modal>

    <TimerSessionRulesDialog v-model:show="showRules" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { NButton, NIcon, NModal } from "naive-ui";
import { ArrowLeft24Regular, Settings24Regular } from "@vicons/fluent";
import { useTimerWeekStats } from "@/composables/timer/useTimerWeekStats";
import { useTimerSessionStore } from "@/stores/useTimerSessionStore";
import { clickStatsStore } from "@/stores/useClickStatsStore";
import type { TimerSessionRecord, TimerSessionCategory } from "@/core/types/TimerSession";
import { formatDurationMs } from "@/services/timer/timerSessionClassifier";
import TimerSessionRulesDialog from "./TimerSessionRulesDialog.vue";

const router = useRouter();
const sessionStore = useTimerSessionStore();
const clickStore = clickStatsStore();
const { weekDays } = useTimerWeekStats();

const showRules = ref(false);
const selectedSession = ref<TimerSessionRecord | null>(null);

const detailVisible = computed({
  get: () => selectedSession.value != null,
  set: (v) => {
    if (!v) selectedSession.value = null;
  },
});

const totalSessions = computed(() => sessionStore.sessions.length);
const tomatoCount = computed(() => sessionStore.sessions.filter((s) => s.emoji === "🍅").length);
const voidCount = computed(() => sessionStore.sessions.filter((s) => s.category === "work_void").length);

const recentClicks = computed(() => [...clickStore.clicks].slice(-8).reverse());

const detailTitle = computed(() => (selectedSession.value ? `${selectedSession.value.emoji} 详情` : "详情"));

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

function sessionTitle(s: TimerSessionRecord): string {
  return `${s.emoji} ${formatDurationMs(s.durationMs)}`;
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
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-background-light, #efefef);
}

.timer-stats-title {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
}

.timer-stats-rules-btn {
  margin-left: auto;
}

.timer-stats-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.timer-stats-inner {
  width: 100%;
  max-width: min(420px, 100%);
  margin: 0 auto;
}

.timer-stats-summary {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--color-text-secondary, var(--n-text-color-3));
}

.timer-stats-day {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-background-light, #f0f0f0);
}

.timer-stats-day--today .timer-stats-dom {
  font-weight: 700;
  color: var(--color-blue, #4098fc);
}

.timer-stats-day-label {
  flex: 0 0 52px;
  display: flex;
  align-items: baseline;
  gap: 6px;
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
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  min-height: 28px;
}

.timer-stats-emoji {
  border: none;
  background: var(--color-background-light, #f5f5f5);
  border-radius: 6px;
  font-size: 18px;
  line-height: 1;
  padding: 4px 6px;
  cursor: pointer;
}

.timer-stats-emoji:hover {
  background: var(--color-background-light-transparent, #eee);
}

.timer-stats-empty {
  color: var(--n-text-color-3);
  font-size: 13px;
}

.timer-stats-clicks {
  margin-top: 20px;
  font-size: 12px;
}

.timer-stats-clicks-heading {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
}

.timer-stats-clicks ul {
  margin: 0;
  padding-left: 1.1em;
  color: var(--color-text-secondary, var(--n-text-color-3));
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
.timer-detail-modal.n-modal {
  width: min(300px, calc(100vw - 24px));
}
</style>
