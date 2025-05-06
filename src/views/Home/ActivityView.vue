<!-- ActivityView.vue -->  


<template>  
    <!-- 1 按钮 -->  
    <div class="activity-view-button-container">  
      <!-- 添加活动 --> 
      <n-button @click="addActivity" secondary circle strong type="default" class="activity-button">
        <template #icon>
          <n-icon>
            <AddCircle24Regular />
          </n-icon>
        </template>
      </n-button>  
      <!-- 删除活动 -->  
      <n-button @click="deleteActivity" secondary circle type="default" title="删除活动" class="activity-button">        
        <template #icon>
          <n-icon>
            <Delete24Regular />
          </n-icon>
        </template>
      </n-button>
      <!-- 选择活动 -->  
      <n-button @click="pickActivity" secondary circle type="info" title="选择活动" class="activity-button">
        <template #icon>
          <n-icon>
            <ChevronCircleLeft48Regular />
          </n-icon>
        </template>
      </n-button>
      <!-- 筛选活动 -->  
      <n-button @click="filterActivity" strong secondary circle type="info" title="筛选活动" class="activity-button">
        <template #icon>
          <n-icon>
            <DocumentTableSearch24Regular/>
          </n-icon>
        </template>
      </n-button>

    </div>
  <div>  
  <ActivitySheet/>

  </div>  
</template>  

<script setup lang="ts">  
import ActivitySheet from '@/components/ActivitySheet.vue';  
import { ChevronCircleLeft48Regular, Delete24Regular, AddCircle24Regular, DocumentTableSearch24Regular } from '@vicons/fluent'

// 添加活动
function addActivity() {
  console.log('添加活动')
}

// 删除活动
function deleteActivity() {
  console.log('删除活动')
}

// 选择活动
function pickActivity() {
  console.log('选择活动')
}

// 选择活动
function filterActivity() {
  console.log('筛选活动')
}

</script scoped>  

<style scoped>  
.activity-view-button-container {  
  width: 100%; 
  margin: auto;
  text-align: center;
  align-items: center;  
  display: flex;
  justify-content: center;
  padding-top: 10px;
  text-align: center;
  flex-wrap: nowrap;
  gap: 10px;
}    
</style>