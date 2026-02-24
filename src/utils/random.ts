export function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
