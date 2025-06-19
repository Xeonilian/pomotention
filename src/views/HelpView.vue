<template>
  <div class="help-view">
    <div class="help-content">
      <div class="help-icon">📚</div>
      <h1>帮助文档</h1>
      <p class="help-description">
        由于帮助文档尚在构建，尚未内嵌。<br />
        请点击下方按钮在浏览器中查看完整的帮助文档。
      </p>

      <div class="help-actions">
        <button @click="openDocs" class="btn-primary">🔗 打开帮助文档</button>
        <button @click="openRelease" class="btn-release">
          🚀 下载最新版本
        </button>
        <button @click="openGitHub" class="btn-secondary">
          📂 查看项目源码
        </button>
      </div>

      <div class="version-info">
        <n-tag type="info" round>本地版本：v{{ localVersion }}</n-tag>
        <n-tag v-if="remoteOk" type="success" round style="margin-left: 8px">
          云端最新版本：{{ remoteVersion }}
        </n-tag>
        <n-tag v-else type="warning" round style="margin-left: 8px">
          云端获取失败
          <span v-if="remoteError">({{ remoteError }})</span>
        </n-tag>
        <span style="margin-left: 8px">
          <template v-if="remoteOk">🌐 github连接正常</template>
          <template v-else>🚫 github连接异常</template>
        </span>
      </div>

      <div class="help-info">
        <h3>📋 功能一览</h3>
        <ul>
          <li>
            📅 <strong>日程管理</strong> -
            创建工作/娱乐模板，智能计算可用番茄时间
          </li>
          <li>
            🎯 <strong>活动管理</strong> -
            支持任务、待办、休闲等多类型活动创建与筛选
          </li>
          <li>
            🍅 <strong>番茄时钟</strong> -
            完整计时控制，自动记录，自定义专注/休息循环
          </li>
          <li>
            📊 <strong>执行追踪</strong> - 预估 vs
            实际误差分析，打扰事件记录，精力值管理
          </li>
          <li>💭 <strong>反思记录</strong> - 任务关联的深度思考和总结</li>
          <li>📝 <strong>今日待办</strong> - 自动提取当日计划，支持任务流转</li>
          <li>
            📈 <strong>数据可视化</strong> - 时间轴分布、番茄统计、历史数据分析
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { NTag } from "naive-ui";

const localVersion = ref("");
const checkVersion = isTauri();

// 云端版信息
const remoteVersion = ref("...");
const remoteOk = ref(false);
const remoteError = ref("");

// URL 配置
const docsUrl = "https://Xeonilian.github.io/pomotention/";
const githubUrl = "https://github.com/xeonilian/pomotention";
const releaseUrl = "https://github.com/Xeonilian/pomotention/releases/latest";

onMounted(async () => {
  if (checkVersion) {
    localVersion.value = await getVersion();
  }
  await checkRemoteRelease();
});

// 统一的打开网页方法
const openUrl = (url: string) => {
  window.open(url, "_blank");
};

// 各个按钮的点击处理
const openDocs = () => {
  openUrl(docsUrl);
};

const openGitHub = () => {
  openUrl(githubUrl);
};

const openRelease = () => {
  openUrl(releaseUrl);
};

// 检查云端 release 及连通性
async function checkRemoteRelease() {
  try {
    const resp = await fetch(
      "https://api.github.com/repos/Xeonilian/pomotention/releases/latest",
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    remoteVersion.value = data.tag_name ?? data.name ?? "(未知)";
    remoteOk.value = true;
  } catch (e: any) {
    remoteError.value = e.message || String(e);
    remoteVersion.value = "(获取失败)";
    remoteOk.value = false;
  }
}
</script>

<style scoped>
.help-view {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--color-background);
  padding: 20px;
}

.help-content {
  max-width: 600px;
  text-align: center;
  background: var(--color-background-secondary);
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.help-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.help-content h1 {
  color: var(--color-primary);
  margin-bottom: 16px;
  font-size: 28px;
}

.help-description {
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 30px;
  font-size: 16px;
}

.help-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary,
.btn-release {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  min-width: 140px;
}

.btn-primary {
  background: var(--color-background-dark);
  box-shadow: 0 4px 12px var(--color-background-dark);
}

.btn-primary:hover {
  background: var(--color-text-light);
  transform: translateY(-2px);
  color: var(--color-text-secondary);
}

.btn-release {
  background: var(--color-blue-light);
  box-shadow: 0 4px 12px var(--color-blue-light);
}

.btn-release:hover {
  background: var(--color-blue-light);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--color-blue-light);
  color: var(--color-blue);
}

.btn-secondary {
  background: var(--color-red-light);
  box-shadow: 0 4px 12px var(--color-red-light);
}

.btn-secondary:hover {
  background: var(--color-red-light);
  transform: translateY(-2px);
  color: var(--color-red);
}

.version-info {
  margin: 20px 0;
  text-align: left;
  padding: 16px;
  background: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.help-info {
  text-align: left;
  background: var(--color-background);
  padding: 24px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  margin-top: 20px;
}

.help-info h3 {
  color: var(--color-primary);
  margin-bottom: 16px;
  text-align: center;
}

.help-info ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.help-info li {
  padding: 8px 0;
  color: var(--color-text);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .help-content {
    padding: 24px;
    margin: 20px;
  }

  .help-actions {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .btn-primary,
  .btn-secondary,
  .btn-release {
    width: 100%;
    max-width: 250px;
  }
}
</style>
