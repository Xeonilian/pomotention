<template>  
  <div class="schedule-zone">  
    <!-- 1 编辑区 -->  


    <!-- 1-2: 编辑弹窗 -->  
    <n-dialog  
      v-model:show="showEditor"  
      title="编辑时间块"  
      :mask-closable="false"  
      style="min-width: 480px;"  
    >  
      <!-- 1-2-1: 编辑区表格 -->  
      <table class="compact-table">  
        <thead>  
          <tr>  
            <th><!-- 1-2-1 分类列头 -->分类</th>  
            <th><!-- 1-2-2 开始时间列头 -->开始时间</th>  
            <th><!-- 1-2-3 结束时间列头 -->结束时间</th>  
            <th><!-- 1-2-4 操作列头 -->操作</th>  
          </tr>  
        </thead>  
        <tbody>  
          <tr v-for="(block, idx) in editBlocks" :key="block.id||idx">  
            <td><!-- 1-2-5 分类控件 -->  
              <n-select  
                v-model:value="block.category"  
                :options="categoryOptions"  
                size="small"  
                style="width: 100px;"  
                dense  
              />  
            </td>  
            <td><!-- 1-2-6 开始时间控件 -->  
              <n-time-picker     v-model:value="block.start" 
              :value-format="minutesToTime" 
              size="small" 
              style="width: 90px;" 
              dense />  
            </td>  
            <td><!-- 1-2-7 结束时间控件 -->  
               <n-time-picker 
    v-model:value="block.end" 
    :value-format="minutesToTime" 
    size="small" 
    style="width: 90px;" 
    dense  />  
            </td>  
            <td><!-- 1-2-8 单行删除按钮 -->  
              <n-button circle size="small" secondary @click="removeBlock(block.id)" title="删除该行">✖</n-button>  
            </td>  
          </tr>  
        </tbody>  
      </table>  

      <!-- 1-2-9 按钮区域 -->  
      <div style="margin-top: 10px; display: flex; justify-content: flex-start;">  
        <n-button  
          circle  
          size="small"  
          strong  
          @click="addBlock"  
          :disabled="!canAddBlock"  
          title="新增最后一行"  
        >Add</n-button>  
        <n-button  
          circle  
          size="small"  
          secondary  
          @click="deleteLastBlock"  
          :disabled="editBlocks.length === 0"  
          style="margin-left: 8px;"  
          title="删除最后一行"  
        >Delete</n-button>  
        <n-button  
          circle  
          size="small"  
          primary  
          @click="finishEditing"  
          style="margin-left: 8px;"  
          title="完成编辑关闭"  
        >Done</n-button>  
      </div>  
    </n-dialog>  

    <!-- 2 显示区 -->  
    <div class="blocks">  
    <!-- 2-1: ⚙️ 触发编辑弹窗按钮 -->  
    <n-button circle strong @click="showEditor = true" >⚙️</n-button>  
      <div class="time-axis-container">  
        <div  
          v-for="block in blocks"  
          :key="block.id"  
          :style="getVerticalBlockStyle(block)"  
          :title="`${block.category} ${minutesToTime(block.start)} - ${minutesToTime(block.end)}`"  
          class="time-block"  
        >  
          {{ block.category }}  
        </div>  
      </div>  
    </div>  
  </div>  
</template>  

<script setup lang="ts">  
// 1 编辑区脚本 - 控制编辑弹窗显示及块编辑  

import { ref, reactive, computed, watch } from 'vue';  
import { NButton, NDialog, NSelect, NTimePicker } from 'naive-ui';  
import {timeToMinutes, minutesToTime } from '../../core/utils'; 

const showEditor = ref(false); // 控制弹窗显示  

const categories = ['living', 'resting', 'working'];  
const categoryOptions = categories.map(c => ({ label: c, value: c }));  
interface Block {  
  id: string;  
  category: string;  
  start: number;  
  end: number;  
}  

// 初始化 blocks 时，将时间字符串转换为分钟数
const blocks = reactive<Block[]>([
  { id: '1', category: 'resting', start: timeToMinutes('00:00'), end: timeToMinutes('06:00') },
  { id: '2', category: 'living', start: timeToMinutes('06:00'), end: timeToMinutes('10:00') },
  { id: '3', category: 'working', start: timeToMinutes('10:00'), end: timeToMinutes('12:00') },
  { id: '4', category: 'resting', start: timeToMinutes('12:00'), end: timeToMinutes('13:00') },
]);

const editBlocks = reactive<Block[]>([]);  



// 打开弹窗时，复制原blocks数据到editBlocks（深拷贝）  
watch(  
  showEditor,  
  val => {  
    if (val) {  
      const copy = JSON.parse(JSON.stringify(blocks));  
      editBlocks.splice(0, editBlocks.length, ...copy);  
    }  
  },  
  { immediate: false }  
);  



// 是否允许新增最后一行（最后一行结束时间小于24:00）  
const canAddBlock = computed(() => {  
  if (editBlocks.length === 0) return true;  
  const lastEnd = editBlocks[editBlocks.length - 1].end;  
  return lastEnd < 1440;  
});  

// 新增最后一行，起始时间接续上一条结束时间，最长不超过24:00  
function addBlock() {  
  if (!canAddBlock.value) return;  

  const lastBlock = editBlocks[editBlocks.length - 1];  
  const lastEndMinutes = lastBlock?.end || 0;  

  if (lastEndMinutes >= 1440) return;  

  const newStart = lastEndMinutes;  
  const newEndMinutes = Math.min(1440, lastEndMinutes + 60);  
  const newEnd = newEndMinutes;  

  const newId = Date.now().toString();  

  editBlocks.push({  
    id: newId,  
    category: categories[0],  
    start: newStart,  
    end: newEnd,  
  });  
}  

// 删除单条  
function removeBlock(id: string) {  
  const idx = editBlocks.findIndex(block => block.id === id);  
  if (idx !== -1) editBlocks.splice(idx, 1);  
}  

// 删除最后一行  
function deleteLastBlock() {  
  if (editBlocks.length === 0) return;  
  editBlocks.pop();  
}  

// 完成编辑，将数据同步回原blocks，关闭弹窗  
function finishEditing() {  
  blocks.splice(0, blocks.length, ...JSON.parse(JSON.stringify(editBlocks)));  
  showEditor.value = false;  
}  

// 2 显示区辅助函数  
import type { CSSProperties } from 'vue';  

const categoryColors: Record<string, string> = {  
  living: '#4A90E2',  
  resting: '#7ED321',  
  working: '#D0021B',  
};  

function getVerticalBlockStyle(block: { start: number; end: number; category: string }): CSSProperties {  
  const startMinute = block.start;  
  const endMinute = block.end;  
  const duration = endMinute - startMinute;  
  const pxPerMinute = 720 / 1440; // 720px 表示全天24小时  

  const topPx = startMinute * pxPerMinute;  
  const heightPx = duration * pxPerMinute;  

  return {  
    position: 'absolute',  
    top: topPx + 'px',  
    left: '50%',  
    transform: 'translateX(-50%)',  
    width: '10px',  
    height: heightPx + 'px',  
    backgroundColor: categoryColors[block.category] || '#ccc',  
    color: '#fff',  
    fontSize: '10px',  
    textAlign: 'center',  
    lineHeight: heightPx + 'px',  
    userSelect: 'none',  
    borderRadius: '2px',  
    cursor: 'default',  
    overflow: 'hidden',  
    whiteSpace: 'nowrap',  
  } as CSSProperties;  
}  
</script>  

<style scoped>  
.schedule-zone {  
  display: flex;  
  flex-direction: column;  
  width: 150px;  
}  

.compact-table {  
  border-collapse: collapse;  
  width: 100%;  
}  

.compact-table th,  
.compact-table td {  
  padding: 2px 5px;  
  font-size: 13px;  
  text-align: center;  
  border: 1px solid #ddd;  
  vertical-align: middle;  
}  

.blocks {  
  margin-top: 10px;  
}  

.time-axis-container {  
  position: relative;  
  border: 1px solid #ccc;  
  height: 720px;  
  width: 100%;  
  background: #fafafa;  
  box-sizing: border-box;  
}  

.time-block {  
  /* 时间块宽度、居中，内容控制 */  
  width: 10px;  
  position: absolute;  
  left: 50%;  
  transform: translateX(-50%);  
  color: white;  
  font-size: 10px;  
  line-height: normal;  
  white-space: nowrap;  
  text-align: center;  
  overflow: hidden;  
  user-select: none;  
  border-radius: 2px;  
  cursor: default;  
}  
</style>  