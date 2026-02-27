export type PlayerSlotState = {
  id: 'A' | 'B';
  src: string;
  paused: boolean;
  readyState: number;
  currentTime: number;
  muted: boolean;
  volume: number;
  opacity: string;
  className: string;
};

export type PlayerCoreDebugState = {
  activeKey: string | null;
  isSwitching: boolean;
  lastSwitchRequest: string | null;
  lastPreloadResult: string | null;
  activeSlot: 'A' | 'B' | null;
  slots: [PlayerSlotState | null, PlayerSlotState | null];
};

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const waitFirstFrame = (el: HTMLVideoElement) => new Promise<void>((resolve) => {
  if (typeof el.requestVideoFrameCallback === 'function') {
    el.requestVideoFrameCallback(() => resolve());
    return;
  }
  const startedAt = performance.now();
  const tick = () => {
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA || performance.now() - startedAt > 300) {
      resolve();
      return;
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
});

export function createPlayerCore() {
  let videoA: HTMLVideoElement | null = null;
  let videoB: HTMLVideoElement | null = null;
  let activeSlot: 'A' | 'B' = 'A';
  let activeKey: string | null = null;
  let isSwitching = false;
  let lastSwitchRequest: string | null = null;
  let lastPreloadResult: string | null = null;

  const getActive = () => (activeSlot === 'A' ? videoA : videoB);
  const getInactive = () => (activeSlot === 'A' ? videoB : videoA);

  const slotState = (el: HTMLVideoElement | null, id: 'A' | 'B'): PlayerSlotState | null => {
    if (!el) return null;
    return {
      id,
      src: el.currentSrc || el.src,
      paused: el.paused,
      readyState: el.readyState,
      currentTime: Number(el.currentTime.toFixed(2)),
      muted: el.muted,
      volume: Number(el.volume.toFixed(2)),
      opacity: el.style.opacity || '',
      className: el.className
    };
  };

  const syncLayerStyles = () => {
    const active = getActive();
    const inactive = getInactive();
    if (!active || !inactive) return;
    active.classList.add('is-active');
    inactive.classList.remove('is-active');
    active.style.display = 'block';
    inactive.style.display = 'block';
    active.style.opacity = '1';
    inactive.style.opacity = '0';
  };

  const enforceAudio = (active: HTMLVideoElement, inactive: HTMLVideoElement) => {
    active.defaultMuted = false;
    active.muted = false;
    if (active.volume === 0) active.volume = 1;

    inactive.defaultMuted = true;
    inactive.muted = true;
    inactive.volume = 0;
    inactive.pause();
  };

  const loadSource = async (el: HTMLVideoElement, url: string, timeoutMs = 3200) => {
    el.preload = 'auto';
    el.playsInline = true;
    el.controls = false;
    el.loop = false;
    el.pause();
    el.currentTime = 0;
    el.src = url;
    el.load();

    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      lastPreloadResult = `readyState-immediate:${url}`;
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let done = false;
      let timer: number | null = null;
      const clear = () => {
        if (timer) window.clearTimeout(timer);
        el.removeEventListener('loadeddata', onReady);
        el.removeEventListener('canplay', onReady);
        el.removeEventListener('canplaythrough', onReady);
        el.removeEventListener('error', onError);
      };
      const finish = (result: string) => {
        if (done) return;
        done = true;
        lastPreloadResult = result;
        clear();
        resolve();
      };
      const onReady = () => {
        if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          finish(`event-ready:${url}`);
        }
      };
      const onError = () => {
        if (done) return;
        done = true;
        clear();
        reject(new Error(`loadSource error: ${url}`));
      };
      timer = window.setTimeout(() => {
        if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          finish(`timeout-fallback-readyState:${url}`);
          return;
        }
        waitFirstFrame(el).then(() => {
          if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            finish(`timeout-fallback-frame:${url}`);
          } else {
            reject(new Error(`loadSource timeout: ${url}`));
          }
        }).catch(reject);
      }, timeoutMs);

      el.addEventListener('loadeddata', onReady);
      el.addEventListener('canplay', onReady);
      el.addEventListener('canplaythrough', onReady, { once: true });
      el.addEventListener('error', onError, { once: true });
    });
  };

  const crossfade = async (incoming: HTMLVideoElement, outgoing: HTMLVideoElement, ms: number) => {
    incoming.style.display = 'block';
    outgoing.style.display = 'block';
    incoming.classList.add('is-active');
    outgoing.classList.remove('is-active');
    incoming.style.opacity = '1';
    outgoing.style.opacity = '0';

    await waitFirstFrame(incoming);
    const pauseAt = Math.floor(ms * 0.6);
    await sleep(pauseAt);
    outgoing.pause();
    outgoing.currentTime = 0;
    await sleep(Math.max(0, ms - pauseAt));
  };

  const init = (a: HTMLVideoElement, b: HTMLVideoElement) => {
    videoA = a;
    videoB = b;
    activeSlot = 'A';
    syncLayerStyles();
    enforceAudio(getActive()!, getInactive()!);
  };

  const switchTo = async (key: string, url: string, crossfadeMs = 420) => {
    lastSwitchRequest = key;
    if (isSwitching) return false;
    const active = getActive();
    const inactive = getInactive();
    if (!active || !inactive) throw new Error('playerCore not initialized');

    isSwitching = true;
    try {
      await loadSource(inactive, url);
      await inactive.play();
      enforceAudio(inactive, active);
      await crossfade(inactive, active, crossfadeMs);
      activeSlot = activeSlot === 'A' ? 'B' : 'A';
      activeKey = key;
      syncLayerStyles();
      return true;
    } finally {
      isSwitching = false;
    }
  };

  const stop = () => {
    [videoA, videoB].forEach((v) => {
      if (!v) return;
      v.pause();
      v.currentTime = 0;
      v.muted = true;
      v.volume = 0;
    });
    isSwitching = false;
  };

  const getDebugState = (): PlayerCoreDebugState => ({
    activeKey,
    isSwitching,
    lastSwitchRequest,
    lastPreloadResult,
    activeSlot,
    slots: [slotState(videoA, 'A'), slotState(videoB, 'B')]
  });

  return { init, switchTo, loadSource, crossfade, enforceAudio, stop, getDebugState, getActive, getInactive };
}
