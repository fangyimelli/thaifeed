export type ViewerCommand = { type: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' };

const COMMAND_MAP: Record<string, ViewerCommand['type']> = {
  左: 'LEFT',
  右: 'RIGHT',
  上: 'UP',
  下: 'DOWN',
  '←': 'LEFT',
  '→': 'RIGHT',
  '↑': 'UP',
  '↓': 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
  up: 'UP',
  down: 'DOWN'
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
