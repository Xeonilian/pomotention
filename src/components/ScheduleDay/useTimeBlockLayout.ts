import { CategoryColorKey } from "../../core/constants"

export interface TimeBlock {  
  id: string;             
  category: CategoryColorKey;       
  start: number;          
  end: number;            
  label?: string;         
  type?: 'block' | 'line'   
}  

export function useTimeBlockLayout(  
  containerHeight: number,   
  timeRange: { start: number, end: number }  
) {  
  // 计算每分钟对应的像素数  
  const pxPerMinute = (timeRange.end - timeRange.start) / (1000 * 60) > 0  
    ? containerHeight / ((timeRange.end - timeRange.start) / (1000 * 60))  
    : 0  

  // 计算块的垂直布局  
  function calculateBlockLayout(block: TimeBlock) {  
    const startDate = new Date(block.start)  
    const endDate = new Date(block.end)  
    const earliestDate = new Date(timeRange.start)  

    // 计算起始和结束的分钟数  
    const startMinute = (startDate.getTime() - earliestDate.getTime()) / (1000 * 60)  
    const endMinute = (endDate.getTime() - earliestDate.getTime()) / (1000 * 60)  

    const duration = endMinute - startMinute  
    const topPx = startMinute * pxPerMinute  
    const heightPx = block.start === block.end   
      ? 1  // 如果是线，高度为1px  
      : Math.min(  
          duration * pxPerMinute,   
          containerHeight - topPx  
        )  

    return {  
      top: topPx,  
      height: heightPx  
    }  
  }  

  return {  
    calculateBlockLayout  
  }  
}  