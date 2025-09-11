declare module "qrcode" {
  // 最小声明，避免 any 报错。如果需要更严谨可补充具体 API 类型
  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: any
  ): Promise<void>;

  export function toDataURL(text: string, options?: any): Promise<string>;

  export function toString(text: string, options?: any): Promise<string>;

  const _default: {
    toCanvas: typeof toCanvas;
    toDataURL: typeof toDataURL;
    toString: typeof toString;
  };
  export default _default;
}
