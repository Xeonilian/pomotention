<template>
  <n-layout class="layout">
    <n-layout-header class="header">
      <n-menu
        :options="menuOptions"
        mode="horizontal"
        :value="current"
        @update:value="handleMenuSelect"
      />
    </n-layout-header>
    <n-layout-content class="content">
      <router-view />
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { NMenu } from "naive-ui";

const router = useRouter();
const route = useRoute();

const menuOptions = [
  { label: "首页", key: "/" },
  { label: "统计", key: "/statistics" },
  { label: "设置", key: "/settings" },
];

const current = ref(route.path);
watch(route, (newVal) => {
  current.value = newVal.path;
});

function handleMenuSelect(key: string) {
  if (key !== route.path) {
    router.push(key);
  }
}
</script>

<style scoped>
.header {
  height: 5%;
  /* display: none; */
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #fff;
  color: #000;
  border-bottom: 1px solid #eee;
  font-weight: bold;
}
.content {
  overflow: auto;
  height: 95%;
}
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
</style>
