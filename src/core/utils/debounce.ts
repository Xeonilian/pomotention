// core/utils/debounce.ts
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  wait = 300
  
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;
  let lastThis: any = null;

  const debounced = function (this: any, ...args: any[]) {
    lastArgs = args;
    lastThis = this;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(lastThis, lastArgs!);
      lastArgs = lastThis = null;
    }, wait);
  } as T & { cancel: () => void; flush: () => void; pending: () => boolean };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = lastThis = null;
  };

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      fn.apply(lastThis, lastArgs!);
      lastArgs = lastThis = null;
    }
  };

  debounced.pending = () => {
    return timer !== null;
  };

  return debounced;
}
