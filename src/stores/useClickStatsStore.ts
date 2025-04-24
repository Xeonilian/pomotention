import { defineStore } from 'pinia';  

export const clickStatsStore = defineStore('statistics', {  
  state: () => ({  
    clicks: [] as Array<{ id: number; label: string; timestamp: number }>,  
    lastId: 0  
  }),  
  actions: {  
    recordClick(label: string) {  
      this.lastId++;    // 自增ID  
      this.clicks.push({  
        id: this.lastId,           // 自增，简单易查  
        label,  
        timestamp: Date.now()      // 事件发生时间  
      });  
    },
    clearClicks() {

      this.lastId =  0;
      this.clicks.splice(0, this.clicks.length);
      
    },
  },
  persist: true,
});  