export const PomodoroDurations = {  
    workDuration: 25,  
    breakDuration: 5,   
};  

export const TimerStyleDefaults = {  
    barLength: '175px',   
    redBarColor: 'red',  
    blueBarColor: 'blue',
} 

export const CategoryColors = {  
    living: '#4A90E2',  // 蓝色  
    sleeping: 'black',  // 绿色  
    working: '#D0021B',  // 红色  
  }as const; 

export type CategoryColorKey = keyof typeof CategoryColors; 