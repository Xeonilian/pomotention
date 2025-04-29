import { defineStore } from 'pinia';  

type Category = 'living' | 'sleeping' | 'working';  

export interface ScheduleBlock {  
  id: string;  
  category: Category;  
  start: string; // HH:mm  
  end: string;   // HH:mm  
}  

export interface ScheduleTemplate {  
  blocks: ScheduleBlock[];  
  pomodoroWorkLength: number;  
  pomodoroBreakLength: number;  
}  

export const useScheduleStore = defineStore('schedule', {  
  state: () => ({  
    categories: ['living', 'sleeping', 'working'] as Category[],  
    currentTemplate: <ScheduleTemplate>{  
      blocks: [],  
      pomodoroWorkLength: 25,  
      pomodoroBreakLength: 5,  
    },  
  }),  
  actions: {  
    initSampleData() {  
      this.currentTemplate.blocks = [  
        { id: '1', category: 'sleeping', start: '00:00', end: '06:00' },  
        { id: '2', category: 'living', start: '06:00', end: '10:00' },  
        { id: '3', category: 'working', start: '10:00', end: '12:00' },  
        { id: '4', category: 'sleeping', start: '12:00', end: '13:00' },  
        { id: '5', category: 'working', start: '13:00', end: '15:00' },  
        { id: '6', category: 'sleeping', start: '15:00', end: '15:15' },  
        { id: '7', category: 'working', start: '15:15', end: '17:15' },  
        { id: '8', category: 'living', start: '17:15', end: '19:15' },  
        { id: '9', category: 'working', start: '19:15', end: '21:15' },  
        { id: '10', category: 'living', start: '21:15', end: '22:30' },  
        { id: '11', category: 'living', start: '22:30', end: '24:00' },  
      ];  
    },  
    timeToMinutes(t: string): number {  
      const [h, m] = t.split(':').map(Number);  
      return h * 60 + m;  
    },  
    minutesToTime(mins: number): string {  
      let m = mins % 60;  
      let h = Math.floor(mins / 60);  
      if (h >= 24) h -= 24;  
      const mm = m < 10 ? '0' + m : '' + m;  
      const hh = h < 10 ? '0' + h : '' + h;  
      return `${hh}:${mm}`;  
    },  
    calculatePomodoroCount(): number {  
      const workLen = this.currentTemplate.pomodoroWorkLength;  
      const breakLen = this.currentTemplate.pomodoroBreakLength;  
      const cycle = workLen + breakLen;  
      let total = 0;  
      for (const block of this.currentTemplate.blocks) {  
        if (block.category !== 'working') continue;  
        let start = this.timeToMinutes(block.start);  
        let end = this.timeToMinutes(block.end);  
        if (end < start) end += 24 * 60;  
        const dur = end - start;  
        total += Math.floor(dur / cycle);  
      }  
      return total;  
    },  
    addBlock() {  
      const blocks = this.currentTemplate.blocks;  
      let start = '00:00';  
      if (blocks.length > 0) {  
        start = blocks[blocks.length - 1].end;  
      }  
      const newBlock = {  
        id: String(Date.now()),  
        category: 'living' as Category,  
        start,  
        end: '24:00',  
      };  
      blocks.push(newBlock);  
      // 调整时间确保连续  
      this.adjustBlocks();  
    },  
    updateBlock(id: string, partial: Partial<ScheduleBlock>) {  
      const block = this.currentTemplate.blocks.find(b => b.id === id);  
      if (!block) return;  
      Object.assign(block, partial);  
      this.adjustBlocks();  
    },  
    removeBlock(id: string) {  
      const idx = this.currentTemplate.blocks.findIndex(b => b.id === id);  
      if (idx !== -1) {  
        this.currentTemplate.blocks.splice(idx, 1);  
        this.adjustBlocks();  
      }  
    },  
    adjustBlocks() {  
      const blocks = this.currentTemplate.blocks;  
      for (let i = 0; i < blocks.length - 1; i++) {  
        blocks[i + 1].start = blocks[i].end;  
      }  
      if (blocks.length > 0) {  
        blocks[blocks.length - 1].end = '24:00';  
      }  
    },  
  },  
});  