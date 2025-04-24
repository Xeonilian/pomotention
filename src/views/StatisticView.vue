<template>  
  <div class="statistic-container">  
    <h2>番茄时间点击记录       <n-button style="margin-left: 16px;" secondary round @click="clearAllClicks">Del</n-button>  
    </h2>  
    <div style="margin: 12px auto;">  

      <!-- Naive UI 次要按钮 -->  
    </div>
    <table border="1" cellspacing="0" cellpadding="8" style="width: 100%; text-align: center;">  
      <thead>  
        <tr>  
          <th>序号</th>  
          <th>操作名称</th>  
          <th>点击时间</th>  
        </tr>  
      </thead>  
      <tbody>  
        <tr v-for="(click) in clicks" :key="click.timestamp">  
          <td>{{ click.id }}</td>  
          <td>{{ click.label }}</td>  
          <td>{{ formatDate(click.timestamp) }}</td>  
        </tr>  
        <tr v-if="clicks.length === 0">  
          <td colspan="3">暂无点击记录</td>  
        </tr>  
      </tbody>  
    </table>  


  </div>  
</template>  

<script setup lang="ts">  
import { computed } from 'vue';  
import { clickStatsStore } from '../stores/useClickStatsStore';  
import { NButton } from 'naive-ui'; 

const store = clickStatsStore();  
const clicks = computed(() => store.clicks);  

function formatDate(timestamp: number) {  
  return new Date(timestamp).toLocaleString();  
}  
function clearAllClicks() {  
  console.log("click")
  store.clearClicks();  
} 
</script>  

<style scoped>  
table {  
  border-collapse: collapse;  
}  
th, td {  
  border: 1px solid #ddd;  
}  
button {  
  padding: 6px 12px;  
  cursor: pointer;  
}  
</style>  