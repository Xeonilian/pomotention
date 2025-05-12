<!--
Component: ScheduleEditor.vue 
Description: 编辑界面，接收数据，回传
Props:
Emits:
Parent: HomeView.vue  
-->
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
          <td><n-select  size="small" :value="block.category" :options="categoryOptions" @update:value="val => handleCategoryChange(val, idx)"  />  </td>   
          <td><n-time-picker size="small" v-model:value="block.start" use-12-hours format="h:mm a" :minutes=5 @update:value="val => handleTimeChange(val, idx, 'start')" /></td>  
          <td><n-time-picker size="small" v-model:value="block.end" use-12-hours format="h:mm a" :minutes=5 @update:value="val => { handleTimeChange(val, idx, 'end'); onEndTimeChange(idx); }" /></td>  
        </tr>  
      </tbody>  
  </table>   
  <div class="editor-botton-container">  
      <n-button  
        round  
        secondary
        type="success"  
        :disabled="!canAddBlock"  
        @click="addBlock"  
        title="新增最后一行"  
      >Add</n-button>   
      <n-button  
        round   
        secondary  
        type="error"  
        :disabled="Blocks.length === 0"  
        @click="deleteLastBlock"  
        title="删除最后一行"  
      >Delete</n-button>  
    </div>   
    <span v-if="!canAddBlock" style="margin-left: 8px; color: #999;">  
      24小时添加完毕   
    </span>   
</template>   

<script setup lang="ts">  
import { ref, watch, computed } from 'vue'  
import { NSelect, NTimePicker, NButton } from 'naive-ui';  
import { getEndOfDayTimestamp, getTimestampForTimeString } from '@/core/utils';  
import type { Block } from '@/core/types/Block';
import { CategoryColors } from '@/core/constants';  

// 1. 参数传递和定义 -----------------------------------------  

// 1.1 定义时间块接口类型，描述每个时间段的属性  
const STORAGE_KEY_SCHEDULE = 'myScheduleBlocks'

// 1.2 定义父组件传入的props，接收一个Block数组，使用Vue3的defineProps  
const props = defineProps<{ blocks: Block[] }>() 
// 定义组件向父组件发送事件，更新modelValue  
const emit = defineEmits<{ (e: 'update-blocks', val: Block[]): void }>()

// 1.3 响应式变量Blocks，内部维护当前时间块列表，便于操作和绑定  
const Blocks = ref<Block[]>([]);  

// 1.4 有没有存储的
let hasLoadedFromLocal = false;  

// 1.5 优先从 localStorage 载入数据  
const saved = localStorage.getItem('STORAGE_KEY_SCHEDULE');  
if (saved) {  
  try {  
    const parsed = JSON.parse(saved);  
    if (Array.isArray(parsed)) {  
      Blocks.value = parsed;  
      hasLoadedFromLocal = true;  
    }  
  } catch (e) {  
    console.warn('localStorage 取数据失败', e);  
  }  
} 

// 1.5 监听父组件传入的modelValue变化，及时更新内部Blocks数组  
watch(() => props.blocks, (newVal) => {  
  if (!hasLoadedFromLocal && Array.isArray(newVal) && newVal.length) {  
    Blocks.value.splice(0, Blocks.value.length, ...newVal);  
    console.log('初始化：用父组件数据');  
  }  
}, { immediate: true });  

// 1.6 定义下拉菜单的类别选项及其中文标签，方便渲染选择框  
const categories: ('living' |  'working'| 'sleeping' )[] = ['living', 'working' , 'sleeping'];  
const labelMap = {  
  sleeping: '睡眠', 
  living: '生活',  
  working: '工作'  
};  
// 把类别映射成label/value格式的选项数组，适用于select等组件  
const categoryOptions = categories.map(c => ({ label: labelMap[c], value: c }));  

// 1.7 时间选择器事件处理函数，防御性编程保证输入有效  
const handleTimeChange = (val: number | null, idx: number, field: 'start' | 'end') => {  
  if (val === null || val === undefined) return;  // 如果无效值，直接返回  
  Blocks.value[idx][field] = val;                       // 修改对应块的开始/结束时间  
  syncToParent();                                 // 同步数据到父组件  
};  

// 1.8 处理类型变化
const handleCategoryChange = (val: keyof typeof CategoryColors, idx: number) => {  
  Blocks.value[idx].category = val;  
  syncToParent();  
}  


// 1.9 同步当前Blocks数据到父组件  
const syncToParent = () => {  
  emit('update-blocks', Blocks.value.map(b => ({  
    id: b.id,  
    category: b.category,  
    start: b.start,  
    end: b.end  
  }))); 
  localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(Blocks.value));   
};  

// 2. 表格编辑相关逻辑 --------------------------------------  

// 2-1 当前已使用的最大ID（对应时间块的唯一标识），初始为0，通过监控props初始化  
let maxId = 0;  


// 2-2 监控传入的数据，初始化maxId并同步父组件的时间块到本地响应式Blocks  
watch(() => props.blocks, (blocks) => {  
  if (blocks.length > 0) {  
    maxId = Math.max(...blocks.map(b => parseInt(b.id))); // 找到当前最大ID  
  }  
  // 初始化Blocks数组，拷贝父组件数据  
  Blocks.value.splice(0, Blocks.value.length, ...blocks.map(b => ({  
    ...b,  
    start: b.start,  
    end: b.end  
  })));  
}, { immediate: true });  

// 2-3 删除最后一条时间块数据，并同步  
function deleteLastBlock() {  
  if (Blocks.value.length === 0) return;  
  Blocks.value = Blocks.value.slice(0, -1);  
  syncToParent();  
}  

// 2-4 生成不重复递增ID，确保新增行ID与已有不冲突  
const generateId = () => (++maxId).toString();  

// 2-5 根据当前已有时间块取当天24点作为统一最大值   
const getDayEndTimestamp = () => {  
  if (Blocks.value.length === 0) {  
    // 默认今天的24点  
    return getEndOfDayTimestamp(Date.now());  
  }  
  // 取最后一个block的start时间为基准算当日24点  
  return getEndOfDayTimestamp(Blocks.value[Blocks.value.length - 1].start);  
}  

// TEST 2-6  计算是否可以添加新时间块，判断条件结束时间到达时间戳   
const canAddBlock = computed(() => {  
  if (Blocks.value.length === 0) return true;  
  const lastEnd = Blocks.value[Blocks.value.length - 1].end;  
  const dayEnd = getDayEndTimestamp();  

  return lastEnd < dayEnd;  
});   


// TEST 2-7 添加一条新时间块行，起始时间为上一行的结束  
function addBlock() {  
  const lastBlock = Blocks.value[Blocks.value.length - 1];  
  if (lastBlock && !canAddBlock.value) return;  

  const dayEnd = getDayEndTimestamp();  
  const newStart = lastBlock ? lastBlock.end : getTimestampForTimeString('00:00');  
  const newEnd = Math.min(dayEnd, newStart + 2* 60 * 60 * 1000); // 默认2小时(7200000 ms)  

  Blocks.value = [...Blocks.value, {  
    id: generateId(),  
    category: categories[0],  
    start: newStart,  
    end: newEnd  
  }];  

  // 打印刚添加的那个元素  
  //console.log('新增时间块：', Blocks.value[Blocks.value.length - 1]);  
  // 或打印完整数组  
 // console.log('当前Blocks数组：', Blocks.value[Blocks.value.length - 2]);  
  syncToParent();  
}  

// 2-8 结束时间修改时的辅助函数，做边界检查及联动下一行开始时间  
function onEndTimeChange(idx: number) {  
  const block = Blocks.value[idx];  
  const startTs = block.start;  
  let endTs = block.end;  
  const dayEnd = getDayEndTimestamp();  

  if (endTs < startTs) {  
    endTs = startTs;  
    block.end = endTs;  
  }  

  if (endTs > dayEnd) {  
    endTs = dayEnd;  
    block.end = endTs;  
  }  

  if (idx < Blocks.value.length - 1) {  
    const nextBlock = Blocks.value[idx + 1];  

    if (nextBlock.start !== endTs) {  
      nextBlock.start = endTs;  

      if (nextBlock.end < endTs) {  
        nextBlock.end = endTs;  
      }  
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
  width:60px; 
  height: 20px;
}  
.editor-botton-container{
  width: 100%; 
  margin: auto;
  text-align: center;
  align-items: center;  
  display: flex;
  justify-content: center;
  padding-top: 10px;

}
</style>  

