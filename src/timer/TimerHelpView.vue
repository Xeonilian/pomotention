<template>
  <div class="timer-help-root">
    <header class="timer-help-header">
      <n-button text title="返回计时器" @click="goBack">
        <template #icon>
          <n-icon :component="ArrowLeft24Regular" />
        </template>
      </n-button>
      <span class="timer-help-title">番茄时钟帮助</span>
    </header>
    <main class="timer-help-body">
      <div class="timer-help-inner">
        <section>
          <h3 class="timer-help-heading">单次计时</h3>
          <ul>
            <li>
              <strong>Wind up</strong>
              ：开始工作。
            </li>
            <li>
              <strong>Squash</strong>
              ：结束当前工作。
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
        </section>

        <section>
          <h3 class="timer-help-heading">连续计时（🍕）</h3>
          <ul>
            <li>点击 🍅🍕 在单次与连续模式间切换；计时运行中不可切换。</li>
            <li>在序列输入框填写指令，例如：</li>
            <li class="timer-help-indent">
              <code>🍅+05</code>
              ：一轮工作后自动休息 5 分钟。
            </li>
            <li class="timer-help-indent">
              <code>05+05</code>
              ：连续两段 5 分钟休息。
            </li>
            <li class="timer-help-indent">
              <code>🍅=25min</code>
              ：默认工作时长（15–59 分钟）。
            </li>
            <li>连续界面可开关白噪音，并切换音轨。</li>
          </ul>
        </section>

        <section>
          <h3 class="timer-help-heading">迷你置顶</h3>
          <ul>
            <li>点击顶部 📌 进入无边框置顶小窗；退出后窗口回到置顶前的位置。</li>
            <li>在迷你界面点击展开图标退出置顶。</li>
            <li>桌面可在设置中配置置顶停靠偏移（0,0 为不改变位置）。</li>
          </ul>
        </section>

        <section>
          <h3 class="timer-help-heading">设置</h3>
          <ul>
            <li>工作 / 休息默认时长、深色模式、分段提示音、置顶停靠偏移、白噪音开关与音轨。</li>
          </ul>
        </section>

        <section>
          <h3 class="timer-help-heading">提示音</h3>
          <ul>
            <li>开始 / 结束工作、开始 / 结束休息时的提示始终保留。</li>
            <li>「分段提示音」关闭后，不再播放工作阶段切换与休息进度中间的提示。</li>
            <li>开启时：工作内在 Review / Work / Track 等切换时提示；休息中按进度分段提示。</li>
          </ul>
        </section>

        <section>
          <h3 class="timer-help-heading">说明</h3>
          <ul>
            <li>计时运行中不能在单次与连续模式间切换。</li>
            <li>若迷你窗尺寸异常，退出后重新进入置顶通常会恢复。</li>
          </ul>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { NButton, NIcon } from "naive-ui";
import { ArrowLeft24Regular } from "@vicons/fluent";

const router = useRouter();

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
  font-weight: 600;
  font-size: 14px;
}

.timer-help-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  box-sizing: border-box;
}

/* 宽窗时内容居中；窄窗仍占满可用宽度 */
.timer-help-inner {
  width: 100%;
  max-width: min(420px, 100%);
  margin: 0 auto;
  box-sizing: border-box;
  font-size: 13px;
  line-height: 1.55;
  color: var(--color-text-primary);
}

.timer-help-inner section + section {
  margin-top: 14px;
}

.timer-help-heading {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
}

.timer-help-inner ul {
  margin: 0;
  padding-left: 1.1em;
}

.timer-help-inner li {
  margin-bottom: 4px;
}

.timer-help-inner li:last-child {
  margin-bottom: 0;
}

.timer-help-indent {
  list-style: circle;
}

.timer-help-inner code {
  font-size: 12px;
  padding: 0 4px;
  border-radius: 3px;
  background: var(--color-background-light, #f0f0f0);
}
</style>
