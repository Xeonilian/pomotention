//ActivitySheet.vue
<template>  
    <div class="activity-sheet">  

      <!-- 所有活动行列表 -->  
     </div>
  </template>  
  
<script setup lang="ts">  
import { ref, reactive, watch, computed } from 'vue';  
import { NSelect, NTimePicker, NButton } from 'naive-ui'; 
import type { PropType } from 'vue';  

interface Activity {  
  id: number;           // 生成时间戳  
  estPomoI: number;     // 预估番茄钟数量  
  class: 'U' | 'S' | '';  // 类别:U-计划外,S-预约任务, ''-无类别  
  title: string;        // 活动内容  
  dueStart?: number;    // 约定开始时间戳  
  dueEnd?: number | null;  // 约定结束时间戳   
  status?: '' | 'delay' | 'doing' | 'cancel' | 'done';  // 活动状态  
  repeatParams?: string; // 重复参数  
  category?: 'red' | 'yellow' | 'blue' | 'green' | 'white';  // 分类  
  fourZone?: '1' | '2' | '3' | '4';  // 四象限  
}  
const activitySheet: Activity = [];

//2 添加行组件
//3 删除行以及内容
//4 监控编辑信息持久化存储


</script>  
  
  <style scoped>  
  .activity-sheet {  
    margin:auto;
    /* 组件整体样式 */  
  }  
  .activity-row {  
    display: flex;  
    align-items: center;  
    padding: 6px 0;  
  }  
  .category-dot {  
    width: 24px;  
    height: 24px;  
    line-height: 24px;  
    border-radius: 50%;  
    background: #ddd;  
    color: #333;  
    text-align: center;  
    margin-right: 8px;  
    cursor: pointer;  
    user-select: none;  
  }  
  .activity-content {  
    flex: 1;  
    display: flex;  
    justify-content: space-between;  
  }  
  .activity-title {  
    font-weight: 500;  
  }  
  .activity-duration {  
    color: #666;  
  }  
  .edit-menu {  
    margin-left: 12px;  
    /* TODO: 编辑面板样式 */  
  }  
  .new-activity-input {  
    margin-top: 12px;  
    width: 100%;  
    min-height: 40px;  
    padding: 6px;  
    resize: vertical;  
  }  
  </style>  