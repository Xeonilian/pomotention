// src/stores/SettingStore.ts  
import { defineStore } from 'pinia'  
import { ref, watch } from 'vue'  
import { PomodoroDurations, TimerStyleDefaults } from '../core/constants.ts'  

const STORAGE_KEY_DURATIONS = 'pomodoro-durations'  
const STORAGE_KEY_STYLE = 'timer-style'  

function loadFromStorage<T>(key: string, defaultValue: T): T {  
  try {  
    const stored = localStorage.getItem(key)  
    return stored ? JSON.parse(stored) : defaultValue  
  } catch {  
    return defaultValue  
  }  
}  

export const useSettingStore = defineStore('setting', () => {  
  // 初始化，取localStorage或默认  
  const durations = ref(loadFromStorage(STORAGE_KEY_DURATIONS, PomodoroDurations))  
  const style = ref(loadFromStorage(STORAGE_KEY_STYLE, TimerStyleDefaults))  

  // 监听变化自动存localStorage  
  watch(durations, (val) => {  
    localStorage.setItem(STORAGE_KEY_DURATIONS, JSON.stringify(val))  
  }, { deep: true })  

  watch(style, (val) => {  
    localStorage.setItem(STORAGE_KEY_STYLE, JSON.stringify(val))  
  }, { deep: true })  

  // 重置函数  
  function resetDurations() {  
    Object.assign(durations, PomodoroDurations)  
    localStorage.removeItem(STORAGE_KEY_DURATIONS)  
  }  

  function resetStyle() {  
    Object.assign(style, TimerStyleDefaults)  
    localStorage.removeItem(STORAGE_KEY_STYLE)  
  }  

  // 返回响应式状态和方法  
  return {  
    durations,  
    style,  
    resetDurations,  
    resetStyle  
  }  
})  