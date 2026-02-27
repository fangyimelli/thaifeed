export type FanDebugStatus = {
  mode: 'webaudio' | 'html-audio-fallback' | 'none';
  contextState: AudioContextState | 'unsupported';
  playing: boolean;
  currentTime: number;
  nextCrossfadeAt: number | null;
  bufferDuration: number | null;
  lastRestartReason: string | null;
};

type FanVoice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  startAt: number;
};

const ATTACK_SEC = 0.012;
const RELEASE_SEC = 0.016;
const CROSSFADE_SEC = 0.06;
const SCHEDULER_INTERVAL_MS = 250;
const SCHEDULE_LOOKAHEAD_SEC = 0.35;

class AudioEngine {
  private context: AudioContext | null = null;
  private fanBus: GainNode | null = null;
  private fanBuffer: AudioBuffer | null = null;
  private fanBufferPromise: Promise<AudioBuffer> | null = null;
  private fanVoice: FanVoice | null = null;
  private fanNextCrossfadeAt: number | null = null;
  private fanSchedulerTimer: number | null = null;
  private fanTargetVolume = 0.4;
  private fanPlaying = false;
  private fanSrc: string | null = null;
  private fallbackAudio: HTMLAudioElement | null = null;
  private lastRestartReason: string | null = null;

  private get supportsWebAudio() {
    return typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
  }

  private getOrCreateContext() {
    if (this.context) return this.context;
    this.context = new window.AudioContext();
    this.fanBus = this.context.createGain();
    this.fanBus.gain.setValueAtTime(this.fanTargetVolume, this.context.currentTime);
    this.fanBus.connect(this.context.destination);
    return this.context;
  }

  private async ensureFanBuffer(src: string) {
    if (this.fanBuffer && this.fanSrc === src) return this.fanBuffer;
    if (this.fanBufferPromise && this.fanSrc === src) return this.fanBufferPromise;
    this.fanSrc = src;
    const context = this.getOrCreateContext();
    this.fanBufferPromise = fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Fan audio fetch failed: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arr) => context.decodeAudioData(arr.slice(0)))
      .then((buffer) => {
        this.fanBuffer = buffer;
        return buffer;
      });
    return this.fanBufferPromise;
  }

  private createVoice(startAt: number, fadeIn: boolean) {
    if (!this.context || !this.fanBus || !this.fanBuffer) return null;
    const source = this.context.createBufferSource();
    source.buffer = this.fanBuffer;
    const gain = this.context.createGain();
    source.connect(gain);
    gain.connect(this.fanBus);

    const safeStart = Math.max(startAt, this.context.currentTime + 0.01);
    const attackEnd = safeStart + ATTACK_SEC;
    gain.gain.setValueAtTime(fadeIn ? 0.0001 : 1, safeStart);
    gain.gain.linearRampToValueAtTime(1, attackEnd);
    source.start(safeStart);

    return { source, gain, startAt: safeStart };
  }

  private scheduleCrossfade(reason: string) {
    if (!this.context || !this.fanBuffer || !this.fanVoice || !this.fanPlaying) return;
    const now = this.context.currentTime;
    const nextStart = this.fanVoice.startAt + this.fanBuffer.duration - CROSSFADE_SEC;
    if (nextStart > now + SCHEDULE_LOOKAHEAD_SEC) {
      this.fanNextCrossfadeAt = nextStart;
      return;
    }

    const outgoing = this.fanVoice;
    const incoming = this.createVoice(nextStart, true);
    if (!incoming) return;

    outgoing.gain.gain.setValueAtTime(Math.max(outgoing.gain.gain.value, 0.0001), nextStart);
    outgoing.gain.gain.linearRampToValueAtTime(0.0001, nextStart + CROSSFADE_SEC);
    outgoing.source.stop(nextStart + CROSSFADE_SEC + 0.03);

    this.fanVoice = incoming;
    this.fanNextCrossfadeAt = incoming.startAt + this.fanBuffer.duration - CROSSFADE_SEC;
    this.lastRestartReason = reason;
  }

  private startScheduler() {
    if (this.fanSchedulerTimer != null) window.clearInterval(this.fanSchedulerTimer);
    this.fanSchedulerTimer = window.setInterval(() => {
      this.scheduleCrossfade('crossfade');
    }, SCHEDULER_INTERVAL_MS);
  }

  private stopScheduler() {
    if (this.fanSchedulerTimer != null) {
      window.clearInterval(this.fanSchedulerTimer);
      this.fanSchedulerTimer = null;
    }
  }

  async resumeFromGesture() {
    if (!this.supportsWebAudio) return;
    const context = this.getOrCreateContext();
    if (context.state !== 'running') {
      await context.resume();
    }
  }

  async startFanLoop(src: string, volume = 0.4, reason = 'start') {
    this.fanTargetVolume = volume;

    if (this.supportsWebAudio) {
      const context = this.getOrCreateContext();
      if (context.state !== 'running') {
        await context.resume();
      }
      await this.ensureFanBuffer(src);
      if (!this.fanBus || !this.fanBuffer) throw new Error('Fan bus/buffer unavailable');

      this.fanBus.gain.cancelScheduledValues(context.currentTime);
      this.fanBus.gain.setValueAtTime(Math.max(this.fanBus.gain.value, 0.0001), context.currentTime);
      this.fanBus.gain.linearRampToValueAtTime(this.fanTargetVolume, context.currentTime + ATTACK_SEC);

      if (!this.fanVoice) {
        const first = this.createVoice(context.currentTime + 0.02, true);
        if (!first) throw new Error('Failed to create initial fan voice');
        this.fanVoice = first;
      }
      this.fanPlaying = true;
      this.fanNextCrossfadeAt = this.fanVoice.startAt + this.fanBuffer.duration - CROSSFADE_SEC;
      this.lastRestartReason = reason;
      this.startScheduler();
      return;
    }

    if (!this.fallbackAudio) {
      this.fallbackAudio = new Audio(src);
      this.fallbackAudio.loop = true;
      this.fallbackAudio.preload = 'auto';
    }
    this.fallbackAudio.volume = this.fanTargetVolume;
    await this.fallbackAudio.play();
    this.fanPlaying = true;
    this.lastRestartReason = reason;
  }

  async ensureFanAfterVisibility() {
    if (!this.fanPlaying) return;
    if (this.supportsWebAudio) {
      const context = this.getOrCreateContext();
      if (context.state !== 'running') {
        await context.resume();
      }
      if (!this.fanVoice && this.fanSrc) {
        await this.startFanLoop(this.fanSrc, this.fanTargetVolume, 'visibility_resume');
      }
      this.scheduleCrossfade('visibility_resume');
      return;
    }
    if (this.fallbackAudio && this.fallbackAudio.paused) {
      await this.fallbackAudio.play();
      this.lastRestartReason = 'visibility_resume';
    }
  }

  setFanVolume(volume: number) {
    this.fanTargetVolume = volume;
    if (this.fanBus && this.context) {
      const now = this.context.currentTime;
      this.fanBus.gain.cancelScheduledValues(now);
      this.fanBus.gain.setValueAtTime(Math.max(this.fanBus.gain.value, 0.0001), now);
      this.fanBus.gain.linearRampToValueAtTime(volume, now + ATTACK_SEC);
    }
    if (this.fallbackAudio) this.fallbackAudio.volume = volume;
  }

  stopFanLoop(reason = 'stop') {
    if (this.supportsWebAudio && this.context && this.fanBus) {
      const now = this.context.currentTime;
      this.fanBus.gain.cancelScheduledValues(now);
      this.fanBus.gain.setValueAtTime(Math.max(this.fanBus.gain.value, 0.0001), now);
      this.fanBus.gain.linearRampToValueAtTime(0.0001, now + RELEASE_SEC);
      if (this.fanVoice) {
        this.fanVoice.source.stop(now + RELEASE_SEC + 0.03);
      }
      this.fanVoice = null;
      this.fanNextCrossfadeAt = null;
      this.stopScheduler();
    }

    if (this.fallbackAudio) {
      const el = this.fallbackAudio;
      const startVolume = el.volume;
      const startedAt = performance.now();
      const step = () => {
        const elapsed = (performance.now() - startedAt) / 1000;
        if (elapsed >= RELEASE_SEC) {
          el.pause();
          el.volume = this.fanTargetVolume;
          return;
        }
        el.volume = Math.max(0.0001, startVolume * (1 - elapsed / RELEASE_SEC));
        window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    }

    this.fanPlaying = false;
    this.lastRestartReason = reason;
  }

  teardown() {
    this.stopFanLoop('teardown');
    if (this.context) {
      void this.context.close();
      this.context = null;
      this.fanBus = null;
      this.fanBuffer = null;
      this.fanBufferPromise = null;
    }
    if (this.fallbackAudio) {
      this.fallbackAudio.pause();
      this.fallbackAudio = null;
    }
  }

  getFanDebugStatus(): FanDebugStatus {
    return {
      mode: this.supportsWebAudio ? 'webaudio' : this.fallbackAudio ? 'html-audio-fallback' : 'none',
      contextState: this.context?.state ?? (this.supportsWebAudio ? 'suspended' : 'unsupported'),
      playing: this.supportsWebAudio ? this.fanPlaying && Boolean(this.fanVoice) : Boolean(this.fallbackAudio && !this.fallbackAudio.paused),
      currentTime: this.context?.currentTime ?? this.fallbackAudio?.currentTime ?? 0,
      nextCrossfadeAt: this.fanNextCrossfadeAt,
      bufferDuration: this.fanBuffer?.duration ?? null,
      lastRestartReason: this.lastRestartReason
    };
  }
}

export const audioEngine = new AudioEngine();
