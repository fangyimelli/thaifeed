import { collectActiveUsers } from '../core/systems/mentionV2';
import type { ChatMessage } from '../core/state/types';
import { getSfxSpec, type SfxKey } from '../audio/SfxRegistry';
import { EVENT_REGISTRY, type EventKey } from './EventRegistry';
import { LINE_REGISTRY, type LineVariant } from '../chat/LineRegistry';
import type { OldhouseLoopKey } from '../config/oldhousePlayback';
import { ChatMessageType } from '../chat/ChatTypes';

type TriggerContext = {
  now?: number;
  messages: ChatMessage[];
  lockTarget?: string;
  tagTarget?: string;
  maxWaitMs?: number;
};

type QueueItem = { key: EventKey; enqueuedAt: number; expiresAt: number; context: TriggerContext; reason: string };

type DebugState = {
  lastEventKey: string;
  lastEventReason: string;
  lastLineKey: string;
  lastVariantId: string;
  lastTone: string;
  lastPersona: string;
  lastSfxKey: string;
  lastSfxReason: string;
  sfxCooldowns: Record<string, number>;
  lock: { isLocked: boolean; target: string | null; elapsed: number; chatSpeedMultiplier: number };
  queueLength: number;
  blockedReasons: Record<string, number>;
};

type EngineResult = { chats: ChatMessage[] };

export type EventContentPayload = {
  type: ChatMessageType;
  text: string;
  translation?: string;
};

type EventEngineDeps = {
  playSfx: (key: SfxKey, reason: string, delayMs?: number) => void;
  requestSceneSwitch: (sceneKey: OldhouseLoopKey, reason: string, delayMs?: number) => void;
};

function mapEventToType(key: EventKey): ChatMessageType {
  if (key === 'USER_SENT') return ChatMessageType.SOCIAL_REPLY;
  if (key === 'SCENE_SWITCH_REACT') return ChatMessageType.SCENE_FLICKER_REACT;
  if (key === 'SFX_FAN_REACT') return ChatMessageType.SFX_REACT_FAN;
  if (key === 'SFX_FOOTSTEPS_REACT') return ChatMessageType.SFX_REACT_FOOTSTEPS;
  if (key === 'SFX_GHOST_REACT') return ChatMessageType.SFX_REACT_GHOST;
  return ChatMessageType.IDLE_BORING;
}

export class EventEngine {
  private cooldowns = new Map<string, number>();
  private queue: QueueItem[] = [];
  private recentVariantIds: string[] = [];
  private recentTones: string[] = [];
  private recentPersonas: string[] = [];
  private lockState = { isLocked: false, target: null as string | null, startedAt: 0 };
  private blockedReasons = new Map<string, number>();
  private pendingContent: EventContentPayload[] = [];

  constructor(private deps: EventEngineDeps) {}

  trigger(key: EventKey, context: TriggerContext): EngineResult {
    const now = context.now ?? Date.now();
    const spec = EVENT_REGISTRY[key];
    if (!spec) return { chats: [] };

    const activeUsers = collectActiveUsers(context.messages);
    const blocked = this.checkBlocked(spec, now, activeUsers.length);
    if (blocked) {
      this.recordBlocked(blocked);
      this.enqueue(key, context, now, blocked);
      this.setDebug(key, blocked);
      return { chats: [] };
    }

    const variant = this.pickVariant(spec.lineKey);
    if (!variant) {
      this.setDebug(key, 'missing_line_variant');
      return { chats: [] };
    }

    this.rememberVariant(variant);
    this.cooldowns.set(spec.key, now + spec.cooldownMs);
    if (spec.sharedCooldownKey) this.cooldowns.set(spec.sharedCooldownKey, now + spec.cooldownMs);
    if (spec.sfxPlan) {
      const sfx = getSfxSpec(spec.sfxPlan.key);
      if (sfx?.cooldownMs) this.cooldowns.set(`sfx:${sfx.key}`, now + sfx.cooldownMs);
      this.deps.playSfx(spec.sfxPlan.key, `event:${key}`, spec.sfxPlan.delayMs);
    }
    if (spec.scenePlan) {
      this.deps.requestSceneSwitch(spec.scenePlan.sceneKey, `event:${key}`, spec.scenePlan.delayMs);
    }

    if (key === 'LOCK_START') {
      this.lockState = { isLocked: true, target: context.lockTarget ?? context.tagTarget ?? null, startedAt: now };
    }

    spec.followUps?.forEach((followUp) => {
      window.setTimeout(() => {
        this.trigger(followUp.eventKey, { ...context, now: Date.now() });
      }, followUp.delayMs);
    });

    const text = variant.lines.join(' ');
    const formattedText = context.tagTarget ? text.replace(/@\{tag\}/g, `@${context.tagTarget}`) : text.replace(/@\{tag\}\s*/g, '');
    this.pendingContent.push({
      type: mapEventToType(key),
      text: formattedText,
      translation: spec.actor === 'ghost' ? variant.lines[variant.lines.length - 1] : formattedText
    });
    this.setDebug(key, 'emitted', spec.lineKey, variant);
    this.flushQueue(now);
    return { chats: [] };
  }

  drainPendingContent(): EventContentPayload[] {
    const out = [...this.pendingContent];
    this.pendingContent = [];
    return out;
  }

  unlockLockByReply(target: string): boolean {
    if (!this.lockState.isLocked || !this.lockState.target) return false;
    if (target !== this.lockState.target) return false;
    this.lockState = { isLocked: false, target: null, startedAt: 0 };
    return true;
  }

  getChatSpeedMultiplier(user?: string): number {
    if (!this.lockState.isLocked || !this.lockState.target) return 1;
    if (!user || user === this.lockState.target) return 1;
    return 0.5;
  }

  getDebugState(): DebugState {
    const now = Date.now();
    const base = (window as Window & { __EVENT_DEBUG__?: DebugState }).__EVENT_DEBUG__;
    return base ?? {
      lastEventKey: '-', lastEventReason: '-', lastLineKey: '-', lastVariantId: '-', lastTone: '-', lastPersona: '-',
      lastSfxKey: '-', lastSfxReason: '-', sfxCooldowns: {},
      lock: {
        isLocked: this.lockState.isLocked,
        target: this.lockState.target,
        elapsed: this.lockState.isLocked ? now - this.lockState.startedAt : 0,
        chatSpeedMultiplier: this.getChatSpeedMultiplier()
      },
      queueLength: this.queue.length,
      blockedReasons: Object.fromEntries(this.blockedReasons)
    };
  }

  private checkBlocked(spec: (typeof EVENT_REGISTRY)[string], now: number, activeUsers: number): string | null {
    if ((this.cooldowns.get(spec.key) ?? 0) > now) return 'blocked_by_cooldown';
    if (spec.sharedCooldownKey && (this.cooldowns.get(spec.sharedCooldownKey) ?? 0) > now) return 'blocked_by_shared_cooldown';
    if (spec.sfxPlan && (this.cooldowns.get(`sfx:${spec.sfxPlan.key}`) ?? 0) > now) return 'sfx_cooldown';
    if (spec.requiresLockFree && this.lockState.isLocked) return 'blocked_by_lock';
    if ((spec.requiresActiveUsersMin ?? 0) > activeUsers) return 'blocked_by_active_users';
    return null;
  }

  private enqueue(key: EventKey, context: TriggerContext, now: number, reason: string) {
    const maxWaitMs = context.maxWaitMs ?? 5_000;
    this.queue.push({ key, context, enqueuedAt: now, expiresAt: now + maxWaitMs, reason });
  }

  private flushQueue(now: number) {
    this.queue = this.queue.filter((item) => item.expiresAt > now);
    const pending = [...this.queue];
    this.queue = [];
    pending.forEach((item) => this.trigger(item.key, item.context));
  }

  private pickVariant(lineKey: string): LineVariant | null {
    const variants = LINE_REGISTRY[lineKey] ?? [];
    const candidates = variants.filter((v) => !this.recentVariantIds.slice(-6).includes(v.id) && !this.recentTones.slice(-2).includes(v.tone) && !this.recentPersonas.slice(-6).includes(v.persona));
    const pool = candidates.length > 0 ? candidates : variants;
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private rememberVariant(variant: LineVariant) {
    this.recentVariantIds.push(variant.id);
    this.recentTones.push(variant.tone);
    this.recentPersonas.push(variant.persona);
    if (this.recentVariantIds.length > 24) this.recentVariantIds.shift();
    if (this.recentTones.length > 8) this.recentTones.shift();
    if (this.recentPersonas.length > 16) this.recentPersonas.shift();
  }

  private recordBlocked(reason: string) {
    this.blockedReasons.set(reason, (this.blockedReasons.get(reason) ?? 0) + 1);
  }

  private setDebug(eventKey: string, reason: string, lineKey = '-', variant?: LineVariant) {
    const debug: DebugState = {
      lastEventKey: eventKey,
      lastEventReason: reason,
      lastLineKey: lineKey,
      lastVariantId: variant?.id ?? '-',
      lastTone: variant?.tone ?? '-',
      lastPersona: variant?.persona ?? '-',
      lastSfxKey: EVENT_REGISTRY[eventKey]?.sfxPlan?.key ?? '-',
      lastSfxReason: EVENT_REGISTRY[eventKey]?.sfxPlan ? reason : '-',
      sfxCooldowns: Object.fromEntries([...this.cooldowns.entries()].filter(([k]) => k.startsWith('sfx:'))),
      lock: {
        isLocked: this.lockState.isLocked,
        target: this.lockState.target,
        elapsed: this.lockState.isLocked ? Date.now() - this.lockState.startedAt : 0,
        chatSpeedMultiplier: this.getChatSpeedMultiplier()
      },
      queueLength: this.queue.length,
      blockedReasons: Object.fromEntries(this.blockedReasons)
    };
    (window as Window & { __EVENT_DEBUG__?: DebugState }).__EVENT_DEBUG__ = debug;
  }
}
