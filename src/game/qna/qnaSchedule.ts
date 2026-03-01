export function nextQnaAskAt(now: number, attempts: number): number {
  const min = attempts > 0 ? 6_000 : 0;
  const max = attempts > 0 ? 10_000 : 500;
  return now + min + Math.floor(Math.random() * (max - min + 1));
}
