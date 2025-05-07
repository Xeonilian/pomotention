// src/core/types/block.ts
import { CategoryColors } from '../../core/constants';  
export interface Block {  
    id: string;  
    category: keyof typeof CategoryColors;  
    start: number;  
    end: number;  
  }  