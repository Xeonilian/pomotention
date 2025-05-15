// src/core/types/Block.ts
import { CategoryColors } from '../constants';  
export interface Block {  
    id: string;  
    category: keyof typeof CategoryColors;  
    start: number;  
    end: number;  
  }  
