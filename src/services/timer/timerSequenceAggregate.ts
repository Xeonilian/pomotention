/** 序列聚合模式（HIIT）在 store 外的轻量读口，避免 tracker ↔ store 循环依赖 */
let aggregateWorkSecReader: (() => number) | null = null;

export function registerTimerStoreAggregateWorkSecReader(reader: (() => number) | null): void {
  aggregateWorkSecReader = reader;
}

export function timerStoreAggregateWorkSec(): number {
  return aggregateWorkSecReader?.() ?? 0;
}
