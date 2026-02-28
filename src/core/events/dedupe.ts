export function pickWithoutRecent<T extends { id: string }>(
  options: T[],
  recentIds: string[],
  windowSize: number
): { option: T; repeatBlocked: boolean } {
  const fallback = options[0];
  if (!fallback) {
    throw new Error('pickWithoutRecent requires at least one option');
  }

  const recent = recentIds.slice(-windowSize);
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  let repeatBlocked = false;

  for (const candidate of shuffled) {
    if (recent.includes(candidate.id)) {
      repeatBlocked = true;
      continue;
    }
    return { option: candidate, repeatBlocked };
  }

  return { option: shuffled[0] ?? fallback, repeatBlocked: true };
}
