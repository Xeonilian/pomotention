<template>
  <div class="timer-help-root">
    <header class="timer-help-header">
      <n-button text title="返回计时器" @click="goBack">
        <template #icon>
          <n-icon :component="ArrowLeft24Regular" />
        </template>
      </n-button>
      <span class="timer-help-title">帮助</span>
      <div class="timer-help-header-actions">
        <n-button text type="default" title="全部展开" class="header-button" @click="expandAll">
          <template #icon>
            <n-icon :component="ChevronDown24Regular" />
          </template>
        </n-button>
        <n-button text type="default" title="全部收起" class="header-button" @click="collapseAll">
          <template #icon>
            <n-icon :component="ChevronUp24Regular" />
          </template>
        </n-button>
      </div>
    </header>
    <main class="timer-help-body">
      <div class="timer-help-inner">
        <aside class="timer-help-feedback" aria-label="测试反馈">
          <div class="timer-help-logos">
            <img :src="timerLogoSrc" alt="Pomotention Timer" class="timer-help-logo" width="80" height="80" />
            <img :src="pomotentionLogoSrc" alt="Pomotention" class="timer-help-logo" width="80" height="80" />
          </div>
          <p class="timer-help-feedback-title">
            Pomotention Timer
            <br />
            是番茄意图的计时器模块，目前处于Beta测试阶段，欢迎反馈问题与建议。
          </p>
          <ul class="timer-help-feedback-list">
            <li>
              <span class="timer-help-feedback-label">完整应用</span>
              <a :href="feedbackLinks.fullAppUrl" target="_blank" rel="noopener noreferrer">{{ feedbackLinks.fullAppUrl }}</a>
              <span class="timer-help-feedback-note"></span>
            </li>
            <li>
              <span class="timer-help-feedback-label">测试反馈</span>
              <a v-if="feedbackLinks.feishuTestUrl" :href="feedbackLinks.feishuTestUrl" target="_blank" rel="noopener noreferrer">
                打开测试反馈页
              </a>
              <span v-else class="timer-help-feedback-placeholder">链接待补充（需飞书账号）</span>
            </li>
            <li>
              <span class="timer-help-feedback-label">联系方式</span>
              <a v-if="feedbackLinks.contactEmail" :href="`mailto:${feedbackLinks.contactEmail}`">{{ feedbackLinks.contactEmail }}</a>
              <span v-else class="timer-help-feedback-placeholder">pomotention@163.com</span>
            </li>
          </ul>
        </aside>

        <section v-for="section in helpSections" :key="section.id" class="timer-help-section">
          <div class="timer-help-section-head">
            <h3 class="timer-help-heading">
              <span style="display: inline-block; width: 2em; text-align: center">{{ section.emoji }}</span>
              <span>{{ section.title }}</span>
            </h3>

            <n-button
              text
              type="default"
              class="header-button timer-help-section-toggle"
              :title="isSectionExpanded(section.id) ? '收起' : '展开'"
              @click="toggleSection(section.id)"
            >
              <template #icon>
                <n-icon
                  :component="ChevronDown24Regular"
                  class="timer-help-section-chevron"
                  :class="{ 'is-expanded': isSectionExpanded(section.id) }"
                />
              </template>
            </n-button>
          </div>
          <div v-show="isSectionExpanded(section.id)" class="timer-help-section-body">
            <ul v-if="section.id === 'single'">
              <li>
                <strong>Wind up</strong>
                ：开始工作。
              </li>
              <li>
                <strong>Squash</strong>
                ：提前结束当前工作。
              </li>
              <li>
                <strong>Break</strong>
                ：开始休息。
              </li>
              <li>
                <strong>Stop</strong>
                ：提前结束休息。
              </li>
              <li>待机时点击时长钮，可选 1 / 2 / 5 / 10 / 15 / 30 分钟休息。</li>
              <li>顶部状态文案可点击编辑，回车保存；清空后恢复默认。</li>
            </ul>

            <ul v-else-if="section.id === 'pizza'">
              <li>点击 🍅🍕 在单次与连续模式间切换。</li>
              <li>在序列输入框填写指令，例如：</li>
              <li class="timer-help-indent">
                <code>🍅+05</code>
                ：一轮工作后自动休息 5 分钟。
              </li>
              <li class="timer-help-indent">
                <code>05+05</code>
                ：连续两段 5 分钟休息。
              </li>
              <li>
                修改默认工作时长：
                <code>🍅=25min</code>
                ；默认工作时长（15–59 分钟）。
              </li>
              <li>连续界面可开关白噪音，并切换音轨。</li>
              <li>计时运行中不能在单次与连续模式间切换。</li>
            </ul>

            <ul v-else-if="section.id === 'mini'">
              <li>点击顶部 📌 进入无边框置顶小窗；退出后窗口回到置顶前的位置。</li>
              <li>在迷你界面点击展开图标退出置顶。</li>
              <li>桌面可在设置中配置置顶停靠偏移（0,0 为不改变位置）。</li>
              <li>若迷你窗尺寸异常，退出后重新进入置顶通常会恢复。</li>
            </ul>

            <ul v-else-if="section.id === 'stats'">
              <li>可切换上一周 / 下一周，标题显示年周。</li>
              <li>顶部双轴图</li>
              <li class="timer-help-indent">左轴为各档 emoji 次数折线（工作红系、休息蓝系）；</li>
              <li class="timer-help-indent">右轴为标签百分比柱；</li>

              <li class="timer-help-indent">悬停显示数值。</li>
              <li>每日点击 emoji 查看详情。</li>
              <li>桌面版可导出当周 CSV。</li>
            </ul>
            <ul v-else-if="section.id === 'tags'">
              <li>
                在计时器顶部文字区可输入
                <code># / @</code>
                添加标签，双击标签可删除。
              </li>
              <li>首页点击🏷可编辑当前所有标签包括：删除、修改颜色、修改名称。</li>
              <li>首个标签用于统计。</li>
            </ul>
            <ul v-else-if="section.id === 'settings'">
              <li>工作 / 休息默认时长、深色模式、正计时、分段提示音、白噪音开关与音轨、置顶停靠偏移。</li>
              <li>双击关闭背景动画，单击改变颜色。</li>
            </ul>

            <ul v-else-if="section.id === 'sound'">
              <li>开始 / 结束工作、开始 / 结束休息时的提示始终保留。</li>
              <li>「分段提示音」关闭后，不再播放工作阶段切换与休息进度中间的提示。</li>
              <li>开启时：</li>
              <li class="timer-help-indent">
                工作时在开始后
                <code>2 min review</code>
                ，结束前
                <code>2 min review</code>
                ，结束前
                <code>1 min track</code>
                ，以及剩余时长的中间节点提示。
              </li>
              <li class="timer-help-indent">
                休息中按进度分段
                <code>1 min</code>
                间隔提示。
              </li>
            </ul>

            <ul v-else-if="section.id === 'data'">
              <li>
                <strong>全部保存在本设备</strong>
                ：计时设置、会话统计、标签、界面偏好等仅写入本地存储（浏览器或桌面应用），
                <strong>默认不上传服务器</strong>
                ，本 Beta 版无账号登录与云同步。
              </li>
              <li>统计页可将当周记录导出为 CSV 到本机，由你自行保管。</li>
              <li>清除浏览器「本站数据」、卸载应用或重置系统存储后，本地记录会被删除且通常无法恢复，请先导出备份。</li>
              <li>反馈邮件或外链仅在您主动点击时才会离开本应用；日常使用不采集个人身份信息。</li>
              <li>完整版 Pomotention 的注册、云端同步与隐私说明见主应用文档，与本计时器独立发行。</li>
            </ul>

            <ul v-else-if="section.id === 'license'">
              <li>
                本软件以
                <strong>GNU General Public License v3.0（GPL-3.0）</strong>
                发布，你可自由使用、研究、修改与再分发（须遵守 GPL 义务，例如衍生作品同样开源）。
              </li>

              <li>
                <a :href="legalLinks.gplSummaryUrl" target="_blank" rel="noopener noreferrer">GPL-3.0 许可证说明（gnu.org）</a>
              </li>
              <li>当前版本：v0.0.1</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { useRouter } from "vue-router";
import { NButton, NIcon } from "naive-ui";
import { ArrowLeft24Regular, ChevronDown24Regular, ChevronUp24Regular } from "@vicons/fluent";
import pomotentionLogoSrc from "../../docs/public/logo.png";
import timerLogoSrc from "../../public-timer/icon-timer.png";

type HelpSectionId = "single" | "pizza" | "mini" | "stats" | "tags" | "settings" | "sound" | "data" | "license";

const helpSections: { id: HelpSectionId; emoji: string; title: string }[] = [
  { id: "single", emoji: "🍅", title: "单次计时 " },
  { id: "pizza", emoji: "🍕", title: "连续计时 " },
  { id: "mini", emoji: "📌", title: "迷你置顶" },
  { id: "stats", emoji: "📈", title: "统计" },
  { id: "tags", emoji: "🏷", title: "标签" },
  { id: "settings", emoji: "⚙️", title: "设置" },
  { id: "sound", emoji: "🔈", title: "提示音" },
  { id: "data", emoji: "🔒", title: "数据与隐私" },
  { id: "license", emoji: "📄", title: "开源许可" },
];

const router = useRouter();

/** 测试反馈入口；飞书链接与邮箱确定后替换占位 */
const feedbackLinks = {
  fullAppUrl: "https://pomotention.pages.dev",
  feishuTestUrl: "",
  contactEmail: "pomotention@163.com",
} as const;

const legalLinks = {
  gplSummaryUrl: "https://www.gnu.org/licenses/gpl-3.0.html",
  licenseFileUrl: "https://github.com/Xeonilian/pomotention/blob/main/LICENSE",
} as const;

const expandedSections = reactive<Record<HelpSectionId, boolean>>({
  single: true,
  pizza: true,
  mini: true,
  stats: true,
  tags: true,
  settings: true,
  sound: true,
  data: true,
  license: true,
});

function isSectionExpanded(id: HelpSectionId): boolean {
  return expandedSections[id];
}

function toggleSection(id: HelpSectionId): void {
  expandedSections[id] = !expandedSections[id];
}

function expandAll(): void {
  for (const section of helpSections) {
    expandedSections[section.id] = true;
  }
}

function collapseAll(): void {
  for (const section of helpSections) {
    expandedSections[section.id] = false;
  }
}

function goBack() {
  if (router.currentRoute.value.path !== "/") {
    void router.push("/");
  }
}
</script>

<style scoped>
.timer-help-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--color-background, #ffffff);
}

.timer-help-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-background-light, #efefef);
}

.timer-help-title {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
}

.timer-help-header-actions {
  display: flex;
  gap: 2px;
  align-items: center;
  flex-shrink: 0;
}

.header-button {
  width: 30px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.timer-help-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  box-sizing: border-box;
}

.timer-help-inner {
  width: 100%;
  max-width: min(510px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
  font-size: 13px;
  line-height: 1.55;
  color: var(--color-text-primary);
  margin-top: 5px;
}

.timer-help-feedback {
  margin-bottom: 16px;
  padding: 10px 12px;
  border: 1px solid var(--color-background-light-light, #e8e8e8);
  border-radius: 8px;
  background: var(--color-background-light-light, #fafafa);
}

.timer-help-logos {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 12px;
}

.timer-help-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  flex-shrink: 0;
}

.timer-help-feedback-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
}

.timer-help-feedback-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.timer-help-feedback-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 6px;
}

.timer-help-feedback-list li:last-child {
  margin-bottom: 0;
}

.timer-help-feedback-label {
  flex-shrink: 0;
  min-width: 4.5em;
  font-weight: 600;
  color: var(--color-text-, #666);
}

.timer-help-feedback-note {
  font-size: 12px;
  color: var(--color-text-secondary, #888);
}

.timer-help-feedback-placeholder {
  color: var(--color-text-secondary, #999);
  font-style: italic;
}

.timer-help-feedback a {
  color: var(--color-blue, #4098fc);
  text-decoration: none;
  word-break: break-all;
}

.timer-help-feedback a:hover {
  text-decoration: underline;
}

.timer-help-section + .timer-help-section {
  margin-top: 14px;
}

.timer-help-section-head {
  display: flex;
  align-items: center;
  gap: 4px;
}

.timer-help-heading {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.timer-help-section-toggle {
  flex-shrink: 0;
}

.timer-help-section-toggle :deep(.n-icon) {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
}

.timer-help-section-chevron {
  transition: transform 0.15s ease;
}

.timer-help-section-chevron.is-expanded {
  transform: rotate(180deg);
}

.timer-help-section-body {
  margin-top: 6px;
}

.timer-help-section-body a {
  color: var(--color-primary, #2080f0);
  text-decoration: none;
}

.timer-help-section-body a:hover {
  text-decoration: underline;
}

.timer-help-inner ul {
  margin: 0;
  padding-left: 2.1em;
}

.timer-help-inner li {
  margin-bottom: 4px;
}

.timer-help-inner li:last-child {
  margin-bottom: 0;
}

.timer-help-indent {
  list-style: circle;
  margin-left: 1.5em;
}

.timer-help-inner code {
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
  background: var(--color-blue-light, #f0f0f0);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}
</style>
