export type ViewerCommand = { type: 'LEFT' | 'CENTER' | 'RIGHT' };

const COMMAND_MAP: Record<string, ViewerCommand['type']> = {
  左: 'LEFT',
  中: 'CENTER',
  右: 'RIGHT'
};

export function parseViewerCommand(text: string): ViewerCommand | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;
  const type = COMMAND_MAP[normalized];
  return type ? { type } : null;
}

export function isViewerCommandText(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return Boolean(COMMAND_MAP[normalized]);
}
