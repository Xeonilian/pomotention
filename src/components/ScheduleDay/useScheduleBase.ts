// useScheduleBase.ts  
import { type Ref, ref, onMounted, onUnmounted, computed, watch } from 'vue';  

interface Block {  
  id: string;  
  category: string;  
  start: number;  
  end: number;  
  label?: string;
}  

/**  
 * 返回用于调度条基础计算的状态和容器引用  
 * @param blocks 时间块列表  
 */  
export function useScheduleBase(blocks: Block[], container: Ref<HTMLElement | null>) {  
  const containerHeight = ref(400);  

  const updateHeight = () => {  
    if (container.value) {  
      containerHeight.value = container.value.clientHeight;  
     // console.log('Updated containerHeight:', containerHeight.value);  
    }  
  };  

  onMounted(() => {  
    updateHeight();  
    window.addEventListener('resize', updateHeight);  
  });  

  onUnmounted(() => window.removeEventListener('resize', updateHeight));  

  watch(() => blocks, () => {  
    updateHeight();  
  });  

  const timeRange = computed(() => {  
    if (blocks.length === 0) return { start: 0, end: 0 };  
    const start = Math.min(...blocks.map(b => b.start));  
    const end = Math.max(...blocks.map(b => b.end));  
    return { start, end };  
  });  

  const totalMinutes = computed(() =>  
    (timeRange.value.end - timeRange.value.start) / (1000 * 60)  
  );  

  const pxPerMinute = computed(() => {  
    return totalMinutes.value > 0 ? containerHeight.value / totalMinutes.value : 0;  
  });  

  return {  
    containerHeight,  
    timeRange,  
    pxPerMinute,  
  };  
}  