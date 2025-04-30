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
    living: 'rgba(74, 144, 226, 0.5)',  // 蓝色  
    sleeping: 'rgba(0, 0, 0, 0.5)',  // 灰色 
    working: 'rgba(208, 2, 27, 0.5)',  // 红色  
  }as const; 

export type CategoryColorKey = keyof typeof CategoryColors; 