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
        <td><n-select  v-model:value="block.category" :options="categoryOptions"  size="small" style="width: 60px;" />  </td> 
        <td>    <n-time-picker v-model:value="block.start" format="HH:mm" /></td>
        <td>    <n-time-picker v-model:value="block.end" format="HH:mm" /></td>
</tr>
</tbody>
</table> 
</template> 

<script setup lang="ts">  
import { reactive, watch } from 'vue'
import type { PropType } from 'vue';  
import { NSelect, NTimePicker, NButton } from 'naive-ui';  

// 下拉菜单定义
const categories: ('living' | 'sleeping' | 'working')[] = ['living', 'sleeping', 'working']; 
const labelMap = {  
  living: '生活',  
  sleeping: '睡眠',  
  working: '工作'  
};  
const categoryOptions = categories.map(c => ({ label: labelMap[c], value: c }));  

// 1.1 时间继承
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

const Blocks = reactive<Block[]>([]);  

watch(() => props.modelValue, (newVal) => {  
  
  Blocks.splice(0, Blocks.length, ...newVal); // 更新Blocks数组  
}, { immediate: true });  
</script>