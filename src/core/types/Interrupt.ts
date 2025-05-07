// src/core/types/Interrupt.ts
export interface Interruption {
    id: number; //当前时间
    class: 'E'|'I';
    task: number; //任务的时间戳 //来自task→todo→activity
}