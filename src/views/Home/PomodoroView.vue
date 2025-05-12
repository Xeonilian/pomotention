<!-- PomodoroView.vue -->
<template>  
  <div class="pomodoro-view">  
    <PomodoroTimer  />  
  </div>  
</template>  

<script setup lang="ts">  
import PomodoroTimer from '@/components/PomodoroTimer/PomodoroTimer.vue';  
</script>  

<style scoped>  
.pomodoro-view {  
  display: flex;  
  justify-content: center;  
}  
</style>  