// utils/formatTime.ts
export const formatTime = (timestamp: Date) => timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
