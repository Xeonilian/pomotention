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
      <tr v-for="(block, idx) in Blocks" :key="block.id||idx">  
        <td><n-select  
                v-model:value="block.category"  
                :options="categoryOptions"  
                size="small"  
                style="width: 60px;"  
                dense  
                :show-arrow=false             
              />  </td>  
        <td><n-time-picker     
              v-model:value="block.start" 
              :default-value = "block.start" 
              @update:value="val => handleTimeChange(val, idx, 'start')"  
              value-format="HH:mm" 
              size="small" 
              style="width: 90px;" 
              dense />  </td>  
        <td><n-time-picker     
              v-model:value="block.end" 
              :default-value = "block.end" 
              @update:value="val => { handleTimeChange(val, idx, 'end'); onEndTimeChange(idx); }" 
              value-format="HH:mm" 
              size="small" 
              style="width: 90px;" 
              dense />  </td>  
      </tr> 
    </tbody>  
  </table>  

  <div style="margin-top: 10px; display: flex; gap: 8px;" class="editor-botton-container">  
    <n-button  
      round  

      strong  
      :disabled="!canAddBlock"  
      @click="addBlock"  
      title="新增最后一行"  
    >Add</n-button>  

    <n-button  
      round   
      secondary  
      :disabled="Blocks.length === 0"  
      @click="deleteLastBlock"  
      title="删除最后一行"  
    >Delete</n-button>  
  </div>  
</template>  

<script setup lang="ts">  
import { reactive, watch, computed } from 'vue';  
import { NSelect, NTimePicker, NButton } from 'naive-ui';  
import type { PropType } from 'vue';  


const categories: ('living' | 'sleeping' | 'working')[] = ['living', 'sleeping', 'working']; 
const labelMap = {  
  living: '生活',  
  sleeping: '睡眠',  
  working: '工作'  
};  
const categoryOptions = categories.map(c => ({ label: labelMap[c], value: c }));  


//////////////////////////////////////////////////////////////////////
// 1 传递数据结构定义
// 1.1 父组件传入的数字分钟定义  
interface Block {  
  id: string;  
  category: string;  
  start: number; // 数字分钟  
  end: number;  
}  

// 1.2 定义父组件传入的prop
const props = defineProps({  
  modelValue: {  
    type: Array as PropType<Block[]>,  
    required: true  
  }  
});  

const emit = defineEmits(['update:modelValue']);  


// 响应式编辑数据（关键修改：初始化时转换类型）    
const Blocks = reactive<Block[]>([]);  

//
watch(() => props.modelValue, (newVal) => {  
  
  Blocks.splice(0, Blocks.length, ...newVal); // 更新Blocks数组  
}, { immediate: true });  




// 时间选择器事件处理（关键修改：防御性编程）  
const handleTimeChange = (val: number | null, idx: number, field: 'start' | 'end') => {  
  if (!val) return;  
  Blocks[idx][field] = val;  
  syncToParent();  
};  

// 同步到父组件（关键修改：转换回数字）  
const syncToParent = () => {  
  emit('update:modelValue', Blocks.map(b => ({  
    id: b.id,  
    category: b.category,  
    start: b.start, 
    end: b.end  
  })));  
};  

//////////////////////////////////////////////////////////////////////
// 2 表格编辑
// 2-1 定义判断是否能添加行参数  
const canAddBlock = computed(() => {  
  if (Blocks.length === 0) return true;  
  return Blocks[Blocks.length - 1].end < 1440;  
});  

// 2-2 定义存储当前最大ID（基于父组件初始数据）  
let maxId = 0;  

// 2-3 定义生成不重复的递增ID  
const generateId = () => (++maxId).toString();  

// 2-4 监控初始化时获取父组件中的最大ID  
watch(() => props.modelValue, (blocks) => {  
  if (blocks.length > 0) {  
    maxId = Math.max(...blocks.map(b => parseInt(b.id)));  
  }  
  // 初始化Blocks（保留父组件原始ID）  
  Blocks.splice(0, Blocks.length, ...blocks.map(b => ({  
    ...b,  
    start: b.start,  
    end:b.end  
  })));  
}, { immediate: true });  


// 2-5 函数添加一行，自动起始时间为上一行结束时间，长度默认为60分钟  
function addBlock() {  
  const lastBlock = Blocks[Blocks.length - 1];  
  if (lastBlock && lastBlock.end === 1440) return; // 如果当前的一行的结束时间是24:00不能添加新行
  
  const newStart = lastBlock ? lastBlock.end : 0;  
  const newEnd = Math.min(1440, newStart + 60); // 默认1小时
  
  
  console.log(`类型: ${typeof lastBlock.end}, 内容: ${lastBlock.end}`)
  Blocks.push({  
    id: generateId(), // 自动生成下一个数字ID（如父组件有1,2,3，则生成4）  
    category: categories[0],  
    start: newStart,  
    end: newEnd  
  });  

  syncToParent();  
} 

// 2-6 函数删除最后一行数据 
function deleteLastBlock() {  
  if (Blocks.length === 0) return;  
  Blocks.pop();  
  syncToParent();  
}  

  

// 2-7 辅助函数 当结束时间修改时同步，且联动下一行开始时间  
function onEndTimeChange(idx: number) {  
  const block = Blocks[idx];  
  let startMin = block.start;  
  let endMin = block.end;  

  if (endMin < startMin) {  
    endMin = startMin;  
    block.end = endMin;  
  }  
  if (endMin > 1440) {  
    endMin = 1440;  
    block.end = endMin;  
  }  

  // 联动下一行开始时间  
  if (idx < Blocks.length - 1) {  
    const nextBlock = Blocks[idx + 1];  
    nextBlock.start = endMin;  
    const nextEndMin = nextBlock.end;  
    if (nextEndMin < endMin) {  
      nextBlock.end = endMin;  
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
  padding: 0px 0px;  
  font-size: 13px;  
  vertical-align: middle;  
}  
</style>  