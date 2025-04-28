<template>  
  <table class="compact-table">  
    <thead>  
      <tr>  
        <th>分类</th>  
        <th>开始时间</th>  
        <th>结束时间</th>  

      </tr>  
    </thead>  
    <tbody>  
      <tr v-for="(block, idx) in editBlocks" :key="block.id">  
        <td>{{ block.id }}</td>  
        <td>{{ block.start }}</td>  
        <td>{{ block.end }}</td>  
      </tr> 
    </tbody>  
  </table>  

  <div style="margin-top: 10px; display: flex; gap: 8px;" class="editor-botton-container">  
    <n-button  
      circle  
      size="small"  
      strong  
      :disabled="!canAddBlock"  
      @click="addBlock"  
      title="新增最后一行"  
    >Add</n-button>  

    <n-button  
      circle  
      size="small"  
      secondary  
      :disabled="editBlocks.length === 0"  
      @click="deleteLastBlock"  
      title="删除最后一行"  
    >Delete</n-button>  
  </div>  
</template>  

<script setup lang="ts">  
import { reactive, watch, computed } from 'vue';  
import { NSelect, NTimePicker, NButton } from 'naive-ui';  
import type { PropType } from 'vue';  

const categories = ['living', 'resting', 'working'];  
const categoryOptions = categories.map(c => ({ label: c, value: c }));  
import {timeToMinutes, minutesToTime } from '../../core/utils'; 

//////////////////////////////////////////////////////////////////////
interface Block {  
  id: string;  
  category: string;  
  start: number; // 父组件传入的数字分钟  
  end: number;  
}  

// 子组件内部编辑用类型（关键修改：明确字符串时间格式）  
interface EditBlock {  
  id: string;  
  category: string;  
  start: string; // "HH:mm"  
  end: string;  
}  

const props = defineProps({  
  modelValue: {  
    type: Array as PropType<Block[]>,  
    required: true  
  }  
});  
const emit = defineEmits(['update:modelValue']);  



// 响应式编辑数据（关键修改：初始化时转换类型）  
const editBlocks = reactive<EditBlock[]>([]);  
watch(() => props.modelValue, (newVal) => {  
  editBlocks.splice(0, editBlocks.length, ...newVal.map(b => ({  
    id: b.id,  
    category: b.category,  
    start: minutesToTime(b.start), // 数字 → 字符串  
    end: minutesToTime(b.end)  
  })));  
}, { immediate: true });  

// 时间选择器事件处理（关键修改：防御性编程）  
const handleTimeChange = (val: string | null, idx: number, field: 'start' | 'end') => {  
  if (!val) return; // 过滤null  
  editBlocks[idx][field] = val; // 确保赋值字符串  
  if (field === 'end') onEndTimeChange(idx); // 触发联动逻辑  
};  

// 同步到父组件（关键修改：转换回数字）  
const syncToParent = () => {  
  emit('update:modelValue', editBlocks.map(b => ({  
    id: b.id,  
    category: b.category,  
    start: timeToMinutes(b.start), // 字符串 → 数字  
    end: timeToMinutes(b.end)  
  })));  
};  

//////////////////////////////////////////////////////////////////////
// 判断是否能添加行  
const canAddBlock = computed(() => {  
  if (editBlocks.length === 0) return true;  
  return timeToMinutes(editBlocks[editBlocks.length - 1].end) < 1440;  
});  

// 存储当前最大ID（基于父组件初始数据）  
let maxId = 0;  

// 初始化时获取父组件中的最大ID  
watch(() => props.modelValue, (blocks) => {  
  if (blocks.length > 0) {  
    maxId = Math.max(...blocks.map(b => parseInt(b.id)));  
  }  
  // 初始化editBlocks（保留父组件原始ID）  
  editBlocks.splice(0, editBlocks.length, ...blocks.map(b => ({  
    ...b,  
    start: minutesToTime(b.start),  
    end: minutesToTime(b.end)  
  })));  
}, { immediate: true });  



// 生成不重复的递增ID  
const generateId = () => (++maxId).toString();  

// 添加一行，自动起始时间为上一行结束时间，长度默认为60分钟  
function addBlock() {  
  const lastBlock = editBlocks[editBlocks.length - 1];  
  const newStart = lastBlock ? timeToMinutes(lastBlock.end) : 0;  
  const newEnd = Math.min(1440, newStart + 60); // 默认1小时  
  
  editBlocks.push({  
    id: generateId(), // 自动生成下一个数字ID（如父组件有1,2,3，则生成4）  
    category: categories[0],  
    start: minutesToTime(newStart),  
    end: minutesToTime(newEnd)  
  });  

  syncToParent();  
} 

// 删除最后一行  
function deleteLastBlock() {  
  if (editBlocks.length === 0) return;  
  editBlocks.pop();  
  syncToParent();  
}  

// 删除某一行，只允许删除最后一行  
function removeBlock(id: string) {  
  const idx = editBlocks.findIndex(b => b.id === id);  
  if (idx === -1) return;  
  if (idx !== editBlocks.length - 1) {  
    alert('仅允许删除最后一行');  
    return;  
  }  
  editBlocks.splice(idx, 1);  
  syncToParent();  
}  

// 当结束时间修改时同步，且联动下一行开始时间  
function onEndTimeChange(idx: number) {  
  const block = editBlocks[idx];  
  let startMin = timeToMinutes(block.start);  
  let endMin = timeToMinutes(block.end);  

  if (endMin < startMin) {  
    endMin = startMin;  
    block.end = minutesToTime(endMin);  
  }  
  if (endMin > 1440) {  
    endMin = 1440;  
    block.end = minutesToTime(endMin);  
  }  

  // 联动下一行开始时间  
  if (idx < editBlocks.length - 1) {  
    const nextBlock = editBlocks[idx + 1];  
    nextBlock.start = minutesToTime(endMin);  
    const nextEndMin = timeToMinutes(nextBlock.end);  
    if (nextEndMin < endMin) {  
      nextBlock.end = minutesToTime(endMin);  
    }  
  }  

  syncToParent();  
}  

</script>  

<style scoped>  
.compact-table {  
  width: 100%;  
  border-collapse: collapse;  
}  
.compact-table th,  
.compact-table td {  
  text-align: center;  
  border: 1px solid #ddd;  
  padding: 2px 5px;  
  font-size: 13px;  
  vertical-align: middle;  
}  
</style>  