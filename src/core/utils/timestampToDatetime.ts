export function timestampToDatetime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = (date.getFullYear() % 100).toString().padStart(2, "0"); // 取后两位
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // 月份从0开始
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
