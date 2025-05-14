export function addOneDayToDate(date: number): number {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + 1);
  return newDate.getTime();
}
