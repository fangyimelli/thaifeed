export type LastModeSwitchStatus = {
  clickAt: number | null;
  requestedMode: 'classic' | 'sandbox_story' | null;
  persistedMode: string;
  action: 'reinit' | 'reload' | 'none';
  result: 'ok' | 'blocked' | 'error' | '-';
  reason: string;
};

type DebugModeSwitcherProps = {
  currentMode: 'classic' | 'sandbox_story';
  switching: boolean;
  lastModeSwitch: LastModeSwitchStatus;
  onSwitch: (mode: 'classic' | 'sandbox_story') => void;
};

export default function DebugModeSwitcher({ currentMode, onSwitch, switching, lastModeSwitch }: DebugModeSwitcherProps) {
  return (
    <div className="debug-event-tester" aria-label="Debug Mode Switcher">
      <h4>Mode Debug</h4>
      <div>currentMode: {currentMode}</div>
      <div className="debug-route-controls">
        <button type="button" disabled={currentMode === 'classic'} onClick={() => onSwitch('classic')}>
          {currentMode === 'classic' ? 'Classic (Current)' : 'Switch to Classic'}
        </button>
        <button type="button" disabled={currentMode === 'sandbox_story'} onClick={() => onSwitch('sandbox_story')}>
          {currentMode === 'sandbox_story' ? 'Sandbox (Current)' : 'Switch to Sandbox (sandbox_story)'}
        </button>
      </div>
      {switching && <div>Switching…</div>}
      <div><strong>Mode Switch Debug</strong></div>
      <div>lastModeSwitch.clickAt: {lastModeSwitch.clickAt ?? '-'}</div>
      <div>lastModeSwitch.requestedMode: {lastModeSwitch.requestedMode ?? '-'}</div>
      <div>lastModeSwitch.persistedMode: {lastModeSwitch.persistedMode || '-'}</div>
      <div>lastModeSwitch.action: {lastModeSwitch.action}</div>
      <div>lastModeSwitch.result: {lastModeSwitch.result}</div>
      <div>lastModeSwitch.reason: {lastModeSwitch.reason || '-'}</div>
    </div>
  );
}
