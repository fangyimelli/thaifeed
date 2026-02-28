import type { ChatMessage } from '../core/state/types';
import { collectActiveUsers } from '../core/systems/mentionV2';
import { CHAT_TYPE_META, ChatMessageType, PERSONA_IDS, type ChatEnvelope, type ChatEvent, type PersonaId } from './ChatTypes';
import { PERSONA_POOLS, PERSONA_USERS, SAFE_FALLBACK_POOL, THAI_TRANSLATIONS, TYPE_FALLBACK_POOLS } from './ChatPools';
import { applyTagTemplate, canUseTag, enforceSingleLanguage, hashText, isDeniedTone, isPersonaRepeated, normalizeText, pickTagTarget } from './ChatRules';
import { buildReactionWindow, pickTypeForEvent, type ReactionSpec } from './ChatSelector';
import { getChatLintReason, truncateLintText } from './ChatLint';

type EventContentPayload = {
  type: ChatMessageType;
  text: string;
  translation?: string;
};

type DebugState = {
  lastEvent: string;
  lastEventAt: number;
  lastPickedType: string;
  lastPersonaId?: string;
  lastTagTarget?: string;
  lint: {
    lastRejectedText: string;
    lastRejectedReason: 'timecode_phrase' | 'technical_term' | '-';
    rerollCount: number;
  };
  recentDedupHashes: string[];
  activeUsers: string[];
  activeUsersCount: number;
  reactionWindow: { remainingSec: number; pending: number } | null;
  pacing: {
    mode: 'normal' | 'slowed' | 'locked_slowed';
    baseRate: number;
    currentRate: number;
    jitterEnabled: boolean;
    nextMessageDueInSec: number;
  };
};

export class ChatEngine {
  private recentHashes: string[] = [];
  private recentPersonaHashes = new Map<PersonaId, string[]>();
  private recentPersonas: Array<PersonaId | undefined> = [];
  private cooldowns = new Map<ChatMessageType, number>();
  private windows: ReactionSpec[] = [];
  private activeUsers: string[] = [];
  private curse = 20;
  private pendingContent = new Map<ChatMessageType, EventContentPayload[]>();
  private debug: DebugState = {
    lastEvent: '-',
    lastEventAt: 0,
    lastPickedType: '-',
    lint: {
      lastRejectedText: '-',
      lastRejectedReason: '-',
      rerollCount: 0
    },
    recentDedupHashes: [],
    activeUsers: [],
    activeUsersCount: 0,
    reactionWindow: null,
    pacing: { mode: 'normal', baseRate: 0, currentRate: 0, jitterEnabled: true, nextMessageDueInSec: 0 }
  };

  syncFromMessages(messages: ChatMessage[]): void {
    this.activeUsers = collectActiveUsers(messages);
    this.debug.activeUsers = this.activeUsers.slice(0, 20);
    this.debug.activeUsersCount = this.activeUsers.length;
  }

  emit(event: ChatEvent, now = Date.now()): ChatMessage[] {
    this.debug.lastEvent = event.type;
    this.debug.lastEventAt = now;
    if (event.type === 'CURSE_CHANGE') {
      this.curse = event.value;
      return [];
    }
    if (event.type === 'SCENE_SWITCH' || event.type === 'SFX_START') {
      const window = buildReactionWindow(event, this.curse, now);
      if (window) this.windows.push(window);
      this.updateWindowDebug(now);
      return [];
    }
    const pickedType = pickTypeForEvent(event);
    if (!pickedType) return [];
    const message = this.composeMessage(pickedType, now);
    return message ? [message] : [];
  }

  tick(now = Date.now()): ChatMessage[] {
    const out: ChatMessage[] = [];
    this.windows = this.windows.filter((window) => window.pending > 0 && now <= window.endAt);
    for (const window of this.windows) {
      if (window.pending <= 0 || now < window.startAt || now < window.nextEmitAt) continue;
      const msg = this.composeMessage(window.type, now);
      window.pending -= 1;
      const gap = window.minGapMs + Math.floor(Math.random() * (window.maxGapMs - window.minGapMs + 1));
      window.nextEmitAt = now + gap;
      if (msg) out.push(msg);
    }
    this.updateWindowDebug(now);
    return out;
  }

  getDebugState() {
    return { ...this.debug, recentDedupHashes: [...this.recentHashes].slice(-20) };
  }

  enqueueContent(payload: EventContentPayload): void {
    const list = this.pendingContent.get(payload.type) ?? [];
    list.push(payload);
    this.pendingContent.set(payload.type, list);
  }

  private composeMessage(type: ChatMessageType, now: number): ChatMessage | null {
    const meta = CHAT_TYPE_META[type];
    if ((this.cooldowns.get(type) ?? 0) > now) return null;
    let lintRerollCount = 0;

    for (let i = 0; i < 24; i += 1) {
      const personaId = meta.personaPolicy.enabled ? this.pickPersona(meta.personaPolicy.rotateWindow) : undefined;
      const username = personaId ? PERSONA_USERS[personaId] : 'system';
      const pool = personaId
        ? (PERSONA_POOLS[personaId][type] ?? TYPE_FALLBACK_POOLS[type])
        : TYPE_FALLBACK_POOLS[type];
      const raw = pool[Math.floor(Math.random() * pool.length)] ?? '';
      const tagTarget = meta.allowTag && canUseTag(this.activeUsers) ? pickTagTarget(this.activeUsers) : undefined;
      const injected = this.dequeueContent(type);
      const seed = injected?.text ?? raw;
      const tagged = applyTagTemplate(seed, tagTarget);
      const normalized = normalizeText(enforceSingleLanguage(tagged, meta.language));
      if (!normalized || isDeniedTone(normalized)) continue;
      const lintReason = getChatLintReason(normalized);
      if (lintReason) {
        this.debug.lint = {
          lastRejectedText: truncateLintText(normalized),
          lastRejectedReason: lintReason,
          rerollCount: Math.min(lintRerollCount + 1, 6)
        };
        lintRerollCount += 1;
        if (lintRerollCount <= 6) continue;
        break;
      }

      const digest = hashText(normalized);
      if (this.recentHashes.slice(-meta.maxRepeatWindow).includes(digest)) continue;
      if (personaId && (this.recentPersonaHashes.get(personaId) ?? []).includes(digest)) continue;
      if (isPersonaRepeated(personaId, this.recentPersonas, meta.personaPolicy.rotateWindow)) continue;

      const envelope: ChatEnvelope = {
        type,
        text: normalized,
        language: meta.language,
        personaId,
        username,
        tagTarget,
        translation: meta.language === 'th' ? THAI_TRANSLATIONS[normalized] ?? undefined : normalized
      };
      if (injected?.translation) {
        envelope.translation = injected.translation;
      }
      this.remember(envelope, digest, now);
      this.debug.lastPickedType = type;
      this.debug.lastPersonaId = personaId;
      this.debug.lastTagTarget = tagTarget;
      this.debug.lint.rerollCount = lintRerollCount;
      return {
        id: crypto.randomUUID(),
        username: envelope.username,
        text: envelope.text,
        language: envelope.language,
        translation: envelope.translation,
        chatType: type,
        personaId: envelope.personaId,
        tagTarget: envelope.tagTarget
      };
    }

    const fallbackNormalized = this.pickSafeFallback();
    const digest = hashText(fallbackNormalized);
    const envelope: ChatEnvelope = {
      type,
      text: fallbackNormalized,
      language: 'zh',
      personaId: undefined,
      username: 'system',
      translation: fallbackNormalized
    };
    this.remember(envelope, digest, now);
    this.debug.lastPickedType = type;
    this.debug.lastPersonaId = undefined;
    this.debug.lastTagTarget = undefined;
    this.debug.lint.rerollCount = Math.max(lintRerollCount, 6);
    return {
      id: crypto.randomUUID(),
      username: envelope.username,
      text: envelope.text,
      language: envelope.language,
      translation: envelope.translation,
      chatType: type,
      personaId: envelope.personaId,
      tagTarget: envelope.tagTarget
    };
  }

  private pickSafeFallback(): string {
    for (let i = 0; i < SAFE_FALLBACK_POOL.length; i += 1) {
      const fallback = SAFE_FALLBACK_POOL[Math.floor(Math.random() * SAFE_FALLBACK_POOL.length)] ?? '';
      const normalized = normalizeText(fallback);
      if (normalized && !getChatLintReason(normalized)) return normalized;
    }
    return '先等等 我有點發毛';
  }

  private dequeueContent(type: ChatMessageType): EventContentPayload | undefined {
    const list = this.pendingContent.get(type);
    if (!list || list.length === 0) return undefined;
    const first = list.shift();
    if (list.length === 0) this.pendingContent.delete(type);
    return first;
  }

  private pickPersona(windowSize: number): PersonaId {
    const candidates = PERSONA_IDS.filter((id) => !this.recentPersonas.slice(-windowSize).includes(id));
    const list = candidates.length > 0 ? candidates : PERSONA_IDS;
    return list[Math.floor(Math.random() * list.length)];
  }

  private remember(envelope: ChatEnvelope, digest: string, now: number): void {
    this.cooldowns.set(envelope.type, now + CHAT_TYPE_META[envelope.type].cooldownMs);
    this.recentHashes.push(digest);
    if (this.recentHashes.length > 128) this.recentHashes.shift();
    this.recentPersonas.push(envelope.personaId);
    if (this.recentPersonas.length > 32) this.recentPersonas.shift();
    if (envelope.personaId) {
      const list = this.recentPersonaHashes.get(envelope.personaId) ?? [];
      list.push(digest);
      this.recentPersonaHashes.set(envelope.personaId, list.slice(-20));
    }
    if (!['system', 'you', 'fake_ai'].includes(envelope.username) && !this.activeUsers.includes(envelope.username)) {
      this.activeUsers.push(envelope.username);
      this.debug.activeUsers = this.activeUsers.slice(0, 20);
      this.debug.activeUsersCount = this.activeUsers.length;
    }
  }


  setPacingDebug(pacing: {
    mode: 'normal' | 'slowed' | 'locked_slowed';
    baseRate: number;
    currentRate: number;
    jitterEnabled: boolean;
    nextMessageDueInSec: number;
  }) {
    this.debug.pacing = pacing;
  }

  private updateWindowDebug(now: number) {
    const window = this.windows[0];
    this.debug.reactionWindow = window
      ? { remainingSec: Math.max(0, Math.ceil((window.endAt - now) / 1000)), pending: window.pending }
      : null;
  }
}
