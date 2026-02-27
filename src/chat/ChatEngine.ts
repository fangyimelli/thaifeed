import type { ChatMessage } from '../core/state/types';
import { collectActiveUsers } from '../core/systems/mentionV2';
import { CHAT_TYPE_META, ChatMessageType, PERSONA_IDS, type ChatEnvelope, type ChatEvent, type PersonaId } from './ChatTypes';
import { PERSONA_POOLS, PERSONA_USERS, THAI_TRANSLATIONS, TYPE_FALLBACK_POOLS } from './ChatPools';
import { applyTagTemplate, canUseTag, enforceSingleLanguage, hashText, isDeniedTone, isPersonaRepeated, normalizeText, pickTagTarget } from './ChatRules';
import { buildReactionWindow, pickTypeForEvent, type ReactionSpec } from './ChatSelector';

type DebugState = {
  lastEvent: string;
  lastPickedType: string;
  lastPersonaId?: string;
  lastTagTarget?: string;
  recentDedupHashes: string[];
  activeUsers: string[];
  reactionWindow: { remainingSec: number; pending: number } | null;
};

export class ChatEngine {
  private recentHashes: string[] = [];
  private recentPersonaHashes = new Map<PersonaId, string[]>();
  private recentPersonas: Array<PersonaId | undefined> = [];
  private cooldowns = new Map<ChatMessageType, number>();
  private windows: ReactionSpec[] = [];
  private activeUsers: string[] = [];
  private curse = 20;
  private debug: DebugState = {
    lastEvent: '-',
    lastPickedType: '-',
    recentDedupHashes: [],
    activeUsers: [],
    reactionWindow: null
  };

  syncFromMessages(messages: ChatMessage[]): void {
    this.activeUsers = collectActiveUsers(messages);
    this.debug.activeUsers = this.activeUsers.slice(0, 20);
  }

  emit(event: ChatEvent, now = Date.now()): ChatMessage[] {
    this.debug.lastEvent = event.type;
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

  private composeMessage(type: ChatMessageType, now: number): ChatMessage | null {
    const meta = CHAT_TYPE_META[type];
    if ((this.cooldowns.get(type) ?? 0) > now) return null;

    for (let i = 0; i < 24; i += 1) {
      const personaId = meta.personaPolicy.enabled ? this.pickPersona(meta.personaPolicy.rotateWindow) : undefined;
      const username = personaId ? PERSONA_USERS[personaId] : 'system';
      const pool = personaId
        ? (PERSONA_POOLS[personaId][type] ?? TYPE_FALLBACK_POOLS[type])
        : TYPE_FALLBACK_POOLS[type];
      const raw = pool[Math.floor(Math.random() * pool.length)] ?? '';
      const tagTarget = meta.allowTag && canUseTag(this.activeUsers) ? pickTagTarget(this.activeUsers) : undefined;
      const tagged = applyTagTemplate(raw, tagTarget);
      const normalized = normalizeText(enforceSingleLanguage(tagged, meta.language));
      if (!normalized || isDeniedTone(normalized)) continue;

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
      this.remember(envelope, digest, now);
      this.debug.lastPickedType = type;
      this.debug.lastPersonaId = personaId;
      this.debug.lastTagTarget = tagTarget;
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
    return null;
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
    }
  }

  private updateWindowDebug(now: number) {
    const window = this.windows[0];
    this.debug.reactionWindow = window
      ? { remainingSec: Math.max(0, Math.ceil((window.endAt - now) / 1000)), pending: window.pending }
      : null;
  }
}
