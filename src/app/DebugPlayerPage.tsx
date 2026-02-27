import { useEffect, useMemo, useRef, useState } from 'react';
import { createPlayerCore } from '../core/player/playerCore';
import { VIDEO_PATH_BY_KEY, type OldhouseLoopKey } from '../config/oldhousePlayback';

const KEYS: OldhouseLoopKey[] = ['oldhouse_room_loop3', 'oldhouse_room_loop', 'oldhouse_room_loop2'];

export default function DebugPlayerPage() {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const core = useMemo(() => createPlayerCore(), []);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!videoARef.current || !videoBRef.current) return;
    core.init(videoARef.current, videoBRef.current);
    void core.switchTo('oldhouse_room_loop3', VIDEO_PATH_BY_KEY.oldhouse_room_loop3);
    const t = window.setInterval(() => setTick((v) => v + 1), 300);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      window.clearInterval(t);
      core.stop();
    };
  }, [core]);

  const runSwitch = (key: OldhouseLoopKey) => {
    void core.switchTo(key, VIDEO_PATH_BY_KEY[key]);
  };

  const toggleAuto = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    let idx = 0;
    timerRef.current = window.setInterval(() => {
      idx = (idx + 1) % KEYS.length;
      runSwitch(KEYS[idx]);
    }, 8000);
  };

  const stop = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    core.stop();
  };

  const debug = core.getDebugState();

  return (
    <main className="debug-player-page">
      <h1>/debug/player</h1>
      <div className="debug-player-stage">
        <video ref={videoARef} className="scene-video" playsInline autoPlay preload="auto" />
        <video ref={videoBRef} className="scene-video" playsInline autoPlay preload="auto" />
      </div>
      <div className="debug-player-controls">
        <button onClick={() => runSwitch('oldhouse_room_loop3')}>Play loop3</button>
        <button onClick={() => runSwitch('oldhouse_room_loop')}>Switch to loop</button>
        <button onClick={() => runSwitch('oldhouse_room_loop2')}>Switch to loop2</button>
        <button onClick={toggleAuto}>Auto toggle（8 秒）</button>
        <button onClick={stop}>Stop</button>
      </div>
      <pre className="debug-player-panel">{JSON.stringify({ tick, ...debug }, null, 2)}</pre>
    </main>
  );
}
