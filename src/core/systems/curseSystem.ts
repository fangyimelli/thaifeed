export function curseTier(curse: number): 'low' | 'mid' | 'high' {
  if (curse <= 30) return 'low';
  if (curse <= 60) return 'mid';
  return 'high';
}

export function curseVisualClass(curse: number): string {
  if (curse <= 30) return 'curse-low';
  if (curse <= 60) return 'curse-mid';
  if (curse <= 80) return 'curse-high';
  return 'curse-critical';
}
