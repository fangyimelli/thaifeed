import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ASSET_MANIFEST } from '../config/assetManifest';
import { gameReducer, initialState } from '../core/state/reducer';
import { isAnswerCorrect } from '../core/systems/answerParser';
import { resolvePlayableConsonant } from '../core/systems/consonantSelector';
import { parsePlayerSpeech } from '../core/systems/playerSpeechParser';
import {
  createDonateChatMessage,
  createPlayerMessage
} from '../core/systems/chatSystem';
import { createVipPassMessage, handleVipPlayerMessage, isVipHintCommand } from '../core/systems/vipSystem';
import { getMemoryNode, markReview } from '../core/adaptive/memoryScheduler';
import type { ChatMessage, DonateMessage } from '../core/state/types';
import donatePools from '../content/pools/donatePools.json';
import usernames from '../content/pools/usernames.json';
import ChatPanel from '../ui/chat/ChatPanel';
import SceneView from '../ui/scene/SceneView';
import LiveHeader from '../ui/hud/LiveHeader';
import LoadingOverlay, { type LoadingState } from '../ui/hud/LoadingOverlay';
import { preloadAssets, verifyRequiredAssets, type MissingRequiredAsset } from '../utils/preload';
import { Renderer2D } from '../renderer/renderer-2d/Renderer2D';
import { pickOne } from '../utils/random';
import { FAN_LOOP_PATH, FOOTSTEPS_PATH, GHOST_FEMALE_PATH, MAIN_LOOP } from '../config/oldhousePlayback';
import { VIDEO_PATH_BY_KEY } from '../config/oldhousePlayback';
import { audioEngine } from '../audio/AudioEngine';
import { SFX_REGISTRY } from '../audio/SfxRegistry';
import { onSceneEvent } from '../core/systems/sceneEvents';
import { requestSceneAction } from '../core/systems/sceneEvents';
import { ChatEngine as ClassicChatEngine } from '../chat/ChatEngine';
import { getChatLintReason, truncateLintText } from '../chat/ChatLint';
import { SAFE_FALLBACK_POOL } from '../chat/ChatPools';
import { collectActiveUsers } from '../core/systems/mentionV2';
import { createGhostLore } from '../core/systems/ghostLore';
import { EVENT_REGISTRY, EVENT_REGISTRY_KEYS, getEventManifest } from '../core/events/eventRegistry';
import { pickDialog } from '../core/events/eventDialogs';
import { pickReactionLines } from '../core/events/eventReactions';
import type { EventLinePhase, EventRunRecord, EventSendResult, EventTopic, StoryEventKey } from '../core/events/eventTypes';
import { QNA_FLOW_BY_EVENT } from '../game/qna/qnaFlows';
import { EVENT_EFFECTS } from '../events/eventEffectsRegistry';
import { runTagStartFlow } from '../chat/tagFlow';
import {
  applyOptionResult,
  askCurrentQuestion,
  createInitialQnaState,
  getOptionById,
  getRetryPrompt,
  getUnknownPrompt,
  handleTimeoutPressure,
  markQnaAborted,
  markQnaQuestionCommitted,
  markQnaResolved,
  isQnaAwaitingReplyGateOpen,
  parsePlayerReplyToOption,
  shouldAbortStalledAsking,
  setQnaQuestionActor,
  startQnaFlow,
  stopQnaFlow,
  updateLastAskedPreview
} from '../game/qna/qnaEngine';
import { createClassicMode } from '../modes/classic/classicMode';
import { createSandboxStoryMode, type SandboxFearDebugState } from '../modes/sandbox_story/sandboxStoryMode';
import {
  isSandboxWaitReplyStep,
  parseSandboxWaitReplyIndex,
  resolveSandboxWaitReplyStepByQuestionNumber,
  type SandboxWaitReplyStep
} from '../modes/sandbox_story/waitReplyStep';
import { extractConsonantAnswerPayload, parseAndJudgeUsingClassic } from '../modes/sandbox_story/classicConsonantAdapter';
import { CONSONANT_BANK_BY_CHAR, isHelpRequest } from '../shared/consonant-engine';
import { getAcceptedAliasCandidates, getSharedConsonantQuestionById } from '../shared/consonant-engine';
import { ChatEngine as SandboxChatEngine } from '../sandbox/chat/chat_engine';
import { SANDBOX_VIP } from '../sandbox/chat/vip_identity';
import { NIGHT1 } from '../ssot/sandbox_story/night1';
import type { NightScript } from '../ssot/sandbox_story/types';
import { playPronounce } from '../ui/audio/PronounceAudio';
import type { GameMode } from '../modes/types';
import { isDebugEnabled as getIsDebugEnabled, setDebugOverlayEnabled } from '../debug/debugGate';

type EventStartBlockedReason =
  | 'locked_active'
  | 'cooldown_blocked'
  | 'in_flight'
  | 'chat_auto_paused'
  | 'event_exclusive_active'
  | 'no_active_user'
  | 'active_users_lt_3'
  | 'registry_missing'
  | 'vip_target'
  | 'invalid_state'
  | 'bootstrap_not_ready';

type EventCommitBlockedReason =
  | 'paused'
  | 'cooldown'
  | 'no_tag'
  | 'audio_locked'
  | 'assets_missing'
  | 'sfx_cooldown_active'
  | 'video_src_empty'
  | 'video_not_ready'
  | 'tag_not_sent'
  | 'question_send_failed'
  | 'sandbox_consonant'
  | 'unknown';

type EventTxn = {
  eventKey: StoryEventKey;
  actorId: string;
  taggedUserId: string;
  questionMessageId: string | null;
  starterTagSent: boolean;
  status: 'PREPARED' | 'COMMITTED' | 'ABORTED';
  abortReason: EventCommitBlockedReason | null;
  committedAt: number | null;
  meta?: {
    forcedByDebug?: boolean;
    ignoreCooldown?: boolean;
    ignorePause?: boolean;
    skipTagRequirement?: boolean;
  };
};

type DebugForceExecuteOptions = {
  ignoreCooldown?: boolean;
  ignorePause?: boolean;
  skipTagRequirement?: boolean;
};

export type SendSource = 'submit' | 'debug_simulate' | 'fallback_click';

const SANDBOX_WORD_RIOT_BURST_COUNT = 6;
const SANDBOX_REVEAL_VISIBLE_MIN_MS = 2500;
const SANDBOX_REVEAL_TO_POST_REVEAL_MAX_STALL_MS = 1800;
const SANDBOX_POST_REVEAL_AUTO_COMPLETE_MS = 900;
const SANDBOX_POSSESSION_AUTOSEND_MIN_MS = 300;
const SANDBOX_POSSESSION_AUTOSEND_MAX_MS = 700;

const resolveSandboxWaitReplyConsumedReason = (waitReplyIndex: number): string => {
  if (waitReplyIndex === 1) return 'player_reply_1_consumed';
  if (waitReplyIndex === 2) return 'player_reply_2_consumed';
  if (waitReplyIndex === 3) return 'player_reply_3_consumed';
  return `player_reply_${waitReplyIndex}_consumed`;
};

const parseSandboxTagStepIndex = (step: string | undefined): number | null => {
  if (!step) return null;
  if (step === 'TAG_PLAYER_1') return 1;
  const match = /^TAG_PLAYER_(\d+)$/.exec(step);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolveSandboxTagStepByQuestionNumber = (questionNumber: number): string => {
  if (questionNumber <= 1) return 'TAG_PLAYER_1';
  return `TAG_PLAYER_${questionNumber}`;
};

type ChatSendSource =
  | 'player_input'
  | 'audience_idle'
  | 'audience_reaction'
  | 'event_dialogue'
  | 'qna_question'
  | 'system_ui'
  | 'debug_tester'
  | 'sandbox_consonant'
  | 'unknown';

type ChatAutoScrollMode = 'FOLLOW' | 'COUNTDOWN' | 'FROZEN';
const FREEZE_AFTER_MESSAGE_COUNT = 10;

type RevealTransitionSnapshot = {
  snapshotId: string;
  sourceQuestionId: string;
  sourceWordKey: string;
  guardReady: boolean;
  completionReady: boolean;
  transitionEligible: boolean;
  transitionBlockedBy: string;
  hasObservableTiming: boolean;
};

type PostRevealRuntimeStatus = {
  guardReady: boolean;
  startEligible: boolean;
  startBlockedBy: string;
  completionEligible: boolean;
  completionBlockedBy: string;
};

const buildRevealTransitionSnapshot = (sandboxState: any): RevealTransitionSnapshot => {
  const sourceWordKey = sandboxState.prompt.current?.wordKey || sandboxState.currentPrompt?.wordKey || '';
  const revealWordKey = sandboxState.reveal.wordKey || '';
  const sourceQuestionId = sourceWordKey || revealWordKey;
  const questionMismatch = Boolean(revealWordKey && sourceWordKey && revealWordKey !== sourceWordKey);
  const hasObservableTiming = sandboxState.reveal.startedAt > 0
    && sandboxState.reveal.finishedAt > 0
    && sandboxState.reveal.finishedAt >= sandboxState.reveal.startedAt;
  const completionReady = sandboxState.reveal.phase === 'done'
    && Boolean(sandboxState.reveal.rendered)
    && hasObservableTiming;
  const guardReady = completionReady;
  const transitionEligible = sandboxState.flow.step === 'REVEAL_WORD' && guardReady && !questionMismatch;
  const transitionBlockedBy = transitionEligible
    ? 'none'
    : (questionMismatch
      ? 'question_mismatch'
    : (sandboxState.reveal.phase !== 'done'
      ? 'reveal_not_done'
      : (!sandboxState.reveal.rendered
        ? 'reveal_not_rendered'
        : (!hasObservableTiming ? 'timing_missing' : 'unknown'))));
  const snapshotId = [
    sandboxState.flow.step,
    sourceQuestionId,
    sandboxState.reveal.phase,
    sandboxState.reveal.rendered ? '1' : '0',
    sandboxState.reveal.startedAt || 0,
    sandboxState.reveal.finishedAt || 0,
    sandboxState.reveal.doneAt || 0,
    sandboxState.reveal.wordKey || ''
  ].join('|');
  return {
    snapshotId,
    sourceQuestionId,
    sourceWordKey,
    guardReady,
    completionReady,
    transitionEligible,
    transitionBlockedBy,
    hasObservableTiming
  };
};

const derivePostRevealRuntimeStatus = (sandboxState: any): PostRevealRuntimeStatus => {
  const isPostRevealStep = sandboxState.flow.step === 'POST_REVEAL_CHAT';
  const enteredAt = sandboxState.sandboxFlow?.postRevealEnteredAt || 0;
  const startedAt = sandboxState.sandboxFlow?.postRevealStartedAt || 0;
  const postRevealState = sandboxState.sandboxFlow?.postRevealChatState ?? 'idle';
  const hasReplyGate = Boolean(sandboxState.replyGate?.armed && sandboxState.replyGate?.gateType !== 'none');
  const guardReady = isPostRevealStep
    && sandboxState.reveal.phase === 'done'
    && (Boolean(sandboxState.reveal.rendered) || sandboxState.reveal.blockedReason === 'missing_word_text');
  const startEligible = guardReady && enteredAt > 0 && postRevealState === 'idle' && startedAt <= 0;
  const startBlockedBy = startEligible
    ? 'none'
    : (!isPostRevealStep
      ? 'not_post_reveal_step'
      : (enteredAt <= 0
        ? 'not_entered'
        : (!guardReady
          ? (sandboxState.reveal.blockedReason || 'reveal_not_ready')
          : (postRevealState !== 'idle' || startedAt > 0 ? 'already_started' : 'unknown'))));
  const elapsedFromStart = startedAt > 0 ? (Date.now() - startedAt) : 0;
  const completionEligible = guardReady
    && startedAt > 0
    && postRevealState === 'started'
    && !hasReplyGate
    && elapsedFromStart >= SANDBOX_POST_REVEAL_AUTO_COMPLETE_MS;
  const completionBlockedBy = completionEligible
    ? 'none'
    : (!guardReady
      ? (sandboxState.reveal.blockedReason || 'reveal_not_ready')
      : (startedAt <= 0 || postRevealState === 'idle'
        ? 'not_started'
        : (postRevealState === 'done'
          ? 'already_completed'
          : (hasReplyGate
            ? 'reply_gate_armed'
            : 'bounded_wait_pending'))));
  return {
    guardReady,
    startEligible,
    startBlockedBy,
    completionEligible,
    completionBlockedBy
  };
};

type ChatFreezeState = {
  isFrozen: boolean;
  reason: 'tagged_question' | 'vip_direct_mention' | 'story_critical_hint_followup' | null;
  startedAt: number | null;
};

type SandboxPinnedEntry = {
  id: string;
  messageId: string;
  createdAt: number;
  expiresAt: number;
  visible: boolean;
  author: string;
  body: string;
  sourceType: 'warmup_gate' | 'auto_pin_freeze' | 'qna_reply' | 'prompt_preview';
  linkedToReplyGate: boolean;
  pinnedSourceId: string | null;
  pinnedSourceType: string | null;
};

type SandboxReplyGateState = {
  replyGateArmed: boolean;
  replyGateType: string | null;
  replyTarget: string | null;
  replySourceMessageId: string | null;
  replySourceType: string | null;
  canReply: boolean;
};

type BootstrapActivatedBy = 'username_submit' | 'debug' | null;

type BootstrapState = {
  isReady: boolean;
  activatedAt: number | null;
  activatedBy: BootstrapActivatedBy;
};

type BlackoutState = {
  isActive: boolean;
  mode: 'full' | 'dim75';
  startedAt: number | null;
  endsAt: number | null;
  flickerSeed: number;
  pulseAtMs: number;
  pulseDurationMs: number;
};

export type SendResult = {
  ok: boolean;
  status: 'sent' | 'blocked' | 'error';
  reason?: string;
  errorMessage?: string;
  messageId?: string;
};

type LegacyRenameBlocker = (nextHandle: string) => false;

declare global {
  interface Window {
    __THAIFEED_RENAME_ACTIVE_USER__?: LegacyRenameBlocker;
    __THAIFEED_CHANGE_NAME__?: LegacyRenameBlocker;
    __THAIFEED_SET_NAME__?: LegacyRenameBlocker;
    __THAIFEED_DEBUG_FORCE_EVENT__?: (eventKey: StoryEventKey, options?: DebugForceExecuteOptions) => void;
  }
}

function formatViewerCount(value: number) {
  if (value < 1000) return `${value}`;
  if (value < 10_000) return `${(value / 1000).toFixed(1)}K`;
  return `${Math.floor(value / 1000)}K`;
}

function formatMissingAsset(asset: MissingRequiredAsset) {
  return `[${asset.type}] ${asset.name} | ${asset.relativePath} | ${asset.url} | ${asset.reason}`;
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function resolveSandboxPinnedBody(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const entry = message as {
    text?: unknown;
    content?: unknown;
    body?: unknown;
    displayText?: unknown;
    payload?: { text?: unknown };
  };
  const candidates = [entry.text, entry.content, entry.body, entry.displayText, entry.payload?.text];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const value = candidate.trim();
    if (value.length > 0) return value;
  }
  return '';
}

function pickNonRepeatingActor(pool: string[], recentActors: string[]): string {
  if (pool.length === 0) return 'ink31';
  const lastActor = recentActors[recentActors.length - 1];
  const recentFive = recentActors.slice(-4);
  const scored = pool.filter((actor) => {
    if (actor === lastActor) return false;
    const countInRecent = recentFive.filter((item) => item === actor).length;
    return countInRecent < 2;
  });
  const source = scored.length > 0 ? scored : pool.filter((actor) => actor !== lastActor);
  const usable = source.length > 0 ? source : pool;
  return usable[Math.floor(Math.random() * usable.length)] ?? pool[0];
}

function pickQuestionActor(activeUsers: string[], fallbackActor: string): string {
  const actorPool = activeUsers.filter((name) => name && name !== 'system');
  if (actorPool.length === 0) return fallbackActor;
  return pickOne(actorPool);
}

const EVENT_EXCLUSIVE_TIMEOUT_MS = 45_000;

type ChatActorState = {
  activeUser: string;
  audienceUsers: string[];
  removedActiveUserFromAudience: boolean;
};

type ActiveUserProfile = {
  id: string;
  handle: string;
  displayName: string;
  roleLabel: 'You';
};

function separateChatActorState(messages: ChatMessage[], activeUserHandle: string): ChatActorState {
  const normalizedActiveUser = normalizeHandle(activeUserHandle);
  const activeUsers = collectActiveUsers(messages);
  const removedActiveUserFromAudience = Boolean(normalizedActiveUser) && activeUsers.includes(normalizedActiveUser);
  const audienceUsers = activeUsers.filter((name) => name && name !== 'system' && name !== normalizedActiveUser);
  return {
    activeUser: normalizedActiveUser,
    audienceUsers,
    removedActiveUserFromAudience
  };
}

function pickAudienceActor(state: ChatActorState, recentActors: string[]): { actor: string; blockedReason: string | null } {
  if (state.audienceUsers.length === 0) return { actor: 'ink31', blockedReason: 'audience_pool_empty' };
  const picked = pickNonRepeatingActor(state.audienceUsers, recentActors);
  if (state.activeUser && picked === state.activeUser) {
    const repickedPool = state.audienceUsers.filter((name) => name !== state.activeUser);
    if (repickedPool.length === 0) return { actor: 'ink31', blockedReason: 'audience_includes_activeUser' };
    return { actor: pickNonRepeatingActor(repickedPool, recentActors), blockedReason: 'audience_includes_activeUser' };
  }
  return { actor: picked, blockedReason: null };
}

function isPassCommand(raw: string) {
  const normalized = raw.trim().toLowerCase();
  return normalized === 'pass' || raw.trim() === '跳過';
}


function resolveModeFromQuery(): 'classic' | 'sandbox_story' | null {
  const mode = new URLSearchParams(window.location.search).get('mode');
  if (mode === 'classic' || mode === 'sandbox_story') return mode;
  return null;
}

function resolveModeFromStorage(): 'classic' | 'sandbox_story' | null {
  const mode = window.localStorage.getItem(DEBUG_MODE_STORAGE_KEY);
  if (mode === 'classic' || mode === 'sandbox_story') return mode;
  return null;
}

function resolveInitialMode(debugEnabled: boolean): 'classic' | 'sandbox_story' {
  const modeFromQuery = resolveModeFromQuery();
  if (modeFromQuery) return modeFromQuery;
  if (debugEnabled) {
    const modeFromStorage = resolveModeFromStorage();
    if (modeFromStorage) return modeFromStorage;
  }
  return 'classic';
}

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '');
}

function canonicalizeSandboxSceneKey(raw: string): string {
  const normalized = (raw || '').trim().toLowerCase();
  if (!normalized) return '';
  const directLoop = normalized.match(/(?:^|[_\-])loop([0-9]+)(?:$|[_\-])/u) ?? normalized.match(/loop([0-9]+)/u);
  if (directLoop?.[1]) return `loop${directLoop[1]}`;
  return normalized;
}

function sanitizeSandboxJoinName(raw: string): string {
  const noControl = raw.replace(/[\u0000-\u001F\u007F]/gu, '');
  const normalized = normalizeHandle(noControl).trim();
  if (!normalized) return '';
  return Array.from(normalized).slice(0, 24).join('');
}

function createSandboxPlayerId(handle: string): string {
  let hash = 0;
  for (let i = 0; i < handle.length; i += 1) {
    hash = (hash * 31 + handle.charCodeAt(i)) >>> 0;
  }
  return `sandbox_player_${hash.toString(16)}_${Date.now().toString(36)}`;
}

function toHandleKey(raw: string): string {
  return normalizeHandle(raw).toLowerCase();
}

function parseMentionHandles(text: string): string[] {
  const mentionRegex = /@([^\s@,，。.!！？?、:：;；()\[\]{}"'「」『』]+)/gu;
  const handles: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(mentionRegex)) {
    const handle = normalizeHandle(match[1] ?? '');
    const key = toHandleKey(handle);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    handles.push(handle);
  }
  return handles;
}

function nextLeaveDelayMs() {
  return randomInt(30_000, 45_000);
}

const DESKTOP_BREAKPOINT = 1024;

function mapSandboxSchedulerPhase(phase: string): 'boot' | 'preheat' | 'intro' | 'awaitingAnswer' | 'revealingWord' | 'awaitingTag' | 'chatRiot' | 'supernaturalEvent' | 'vipTranslate' | 'reasoningPhase' | 'tagPlayerPhase' {
  if (phase === 'boot' || phase === 'BOOTSTRAP') return 'boot';
  if (phase === 'preheat') return 'preheat';
  if (phase === 'intro') return 'intro';
  if (phase === 'awaitingAnswer') return 'awaitingAnswer';
  if (phase === 'revealingWord') return 'revealingWord';
  if (phase === 'chatRiot') return 'chatRiot';
  if (phase === 'supernaturalEvent') return 'supernaturalEvent';
  if (phase === 'vipTranslate') return 'vipTranslate';
  if (phase === 'reasoningPhase') return 'reasoningPhase';
  if (phase === 'tagPlayerPhase') return 'tagPlayerPhase';
  return 'awaitingTag';
}

function nextJoinDelayMs() {
  return 8_000 + Math.floor(Math.random() * 7_001);
}

const SANDBOX_PREHEAT_JOIN_CAP = 4;
const SANDBOX_PREHEAT_CHAT_SEQUENCE: Array<{ user: string; text: string; role?: 'viewer' | 'vip' | 'mod'; vip?: boolean; badge?: 'crown'; kind: 'chat' | 'join' }> = [
  { user: 'viewer_118', text: '今天怎麼這麼多人一起在線？', role: 'viewer', kind: 'chat' },
  { user: 'system', text: 'viewer_721 加入聊天室', kind: 'join' },
  { user: 'viewer_203', text: '我有點懷疑這台是真的假的直播…', role: 'viewer', kind: 'chat' },
  { user: SANDBOX_VIP.handle, text: '上次這間真的很多人說看到鬼影。', role: 'vip', vip: true, badge: 'crown', kind: 'chat' },
  { user: 'system', text: 'viewer_823 加入聊天室', kind: 'join' },
  { user: SANDBOX_VIP.handle, text: '@activeUser 你是第一次看這個台嗎？', role: 'vip', vip: true, badge: 'crown', kind: 'chat' },
  { user: 'viewer_409', text: '剛剛鏡頭邊緣是不是有東西飄過去？', role: 'viewer', kind: 'chat' },
  { user: 'system', text: 'viewer_477 加入聊天室', kind: 'join' },
  { user: 'mod_live', text: '先暖場聊天，等等再看後面有沒有異常。', role: 'mod', kind: 'chat' }
];

function pickSafeFallbackText() {
  for (let i = 0; i < SAFE_FALLBACK_POOL.length; i += 1) {
    const candidate = pickOne(SAFE_FALLBACK_POOL).trim();
    if (candidate && !getChatLintReason(candidate)) return candidate;
  }
  return '先等等 我有點發毛';
}

function lintOutgoingMessage(message: ChatMessage): { message: ChatMessage; rejectedText: string; rejectedReason: string; rerollCount: number } {
  const reason = getChatLintReason(message.text);
  if (!reason) {
    return { message, rejectedText: '-', rejectedReason: '-', rerollCount: 0 };
  }

  let rerollCount = 0;
  while (rerollCount < 6) {
    const fallback = pickSafeFallbackText();
    rerollCount += 1;
    if (!getChatLintReason(fallback)) {
      return {
        message: {
          ...message,
          text: fallback,
          translation: message.language === 'th' ? message.translation : fallback
        },
        rejectedText: truncateLintText(message.text),
        rejectedReason: reason,
        rerollCount
      };
    }
  }

  const safeFallback = '先等等 我有點發毛';
  return {
    message: {
      ...message,
      text: safeFallback,
      translation: message.language === 'th' ? message.translation : safeFallback
    },
    rejectedText: truncateLintText(message.text),
    rejectedReason: reason,
    rerollCount: 6
  };
}

type ChatPacingMode = 'normal' | 'slightlyBusy' | 'tense' | 'tag_slow';
type TopicWeightProfile = {
  randomComment: number;
  videoObservation: number;
  suspicion: number;
  buildUp: number;
  eventTopic: number;
};

const NORMAL_TOPIC_WEIGHT: TopicWeightProfile = {
  randomComment: 60,
  videoObservation: 25,
  suspicion: 10,
  buildUp: 5,
  eventTopic: 0
};

const EVENT_TOPIC_WEIGHT: TopicWeightProfile = {
  eventTopic: 70,
  randomComment: 20,
  suspicion: 10,
  videoObservation: 0,
  buildUp: 0
};

const DEBUG_SEED_USERS = ['ink31', 'mew88', 'koo_77', 'nana23'];
const EVENT_TESTER_KEYS: StoryEventKey[] = ['VOICE_CONFIRM', 'GHOST_PING', 'TV_EVENT', 'NAME_CALL', 'VIEWER_SPIKE', 'LIGHT_GLITCH', 'FEAR_CHALLENGE'];
const EVENT_AUDIO_PLAYING_TIMEOUT_MS = 10_000;
const SANDBOX_SSOT_STORAGE_KEY = 'thaifeed.sandbox_story.ssot';
const DEBUG_MODE_STORAGE_KEY = 'app.currentMode';
const DEBUG_MODE_SWITCH_STATUS_KEY = 'app.debug.lastModeSwitch';

type EventAudioState = 'idle' | 'playing' | 'cooldown';
type EventAudioResult = 'TRIGGERED' | 'SKIPPED' | 'FAILED' | '-';
type EventAudioStatus = {
  state: EventAudioState;
  lastTriggeredAt: number | null;
  cooldownUntil: number;
  cooldownMs: number;
  preKey: string | null;
  postKey: string | null;
  lastResult: EventAudioResult;
  lastReason: string;
  playingSince: number | null;
};

type GhostEventMonitorStatus = 'ready' | 'cooldown' | 'locked';
type GhostEventMonitorRow = {
  eventName: StoryEventKey;
  status: GhostEventMonitorStatus;
  cooldown: number;
  lock: boolean;
  preSound: string;
  postSound: string;
};
type GhostEventManagerDebugState = {
  events: GhostEventMonitorRow[];
  ghostSystem: {
    activeEvents: number;
    eventQueueLength: number;
    lastEvent: string;
    cooldownCount: number;
  };
};

type SandboxDebugActionName =
  | 'run_night_smoke_test'
  | 'pass_flow'
  | 'force_correct_now'
  | 'force_next_question'
  | 'force_ghost_event';

type SandboxDebugActionRecord = {
  lastClickedAt: number;
  handlerInvoked: boolean;
  effectApplied: boolean;
  blockedReason: string;
  targetState: string;
  lastResult: string;
  intent: string;
  sourceQuestionId: string;
  targetQuestionId: string;
  resultStep: string;
  usedCanonicalAnswer: string;
  usedAcceptedCandidates: string[];
  reconciled: boolean;
};

type SandboxFlowTestResult = {
  status: 'idle' | 'running' | 'passed' | 'failed';
  startedAt: number;
  finishedAt: number;
  currentStep: string;
  lastPassedStep: string;
  failedStep: string;
  failureReason: string;
  authoritativeFlowStep: string;
  authoritativeBlockedReason: string;
  fromQuestionId: string;
  toQuestionId: string;
  autoAnswerUsed: string;
  secondQuestionShown: boolean;
};

const EMPTY_FEAR_DEBUG_STATE: SandboxFearDebugState = {
  fearLevel: 0,
  maxFear: 100,
  pressureLevel: 'low',
  ghostProbability: 0,
  triggers: {
    chatSpike: 0,
    storyEmotion: 0,
    darkFrame: 0,
    ghostNearby: 0
  },
  footsteps: {
    probability: 0,
    cooldownMs: 0,
    cooldownRemaining: 0,
    lastAt: 0
  }
};



type DebugModeSwitcherProps = {
  currentMode: 'classic' | 'sandbox_story';
  switching: boolean;
  lastModeSwitch: LastModeSwitchStatus;
  onSwitch: (mode: 'classic' | 'sandbox_story') => void;
};

type LastModeSwitchStatus = {
  clickAt: number | null;
  requestedMode: 'classic' | 'sandbox_story' | null;
  persistedMode: string;
  action: 'reinit' | 'reload' | 'none';
  result: 'ok' | 'blocked' | 'error' | '-';
  reason: string;
};

type SandboxRuntimeGuardState = {
  modeEnteredAt: number;
  bootRecoveries: number;
  lastRecoveryReason: string;
  lastHydratedAt: number;
  classicTickBlockedCount: number;
};

function DebugModeSwitcher({ currentMode, onSwitch, switching, lastModeSwitch }: DebugModeSwitcherProps) {
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

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [input, setInput] = useState('');
  const [sandboxInputControl, setSandboxInputControl] = useState<{ valueToken: number; value: string; sendToken: number }>({ valueToken: 0, value: '', sendToken: 0 });
  const [isSending, setIsSending] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isRendererReady, setIsRendererReady] = useState(false);
  const [appStarted, setAppStarted] = useState(false);
  const activeUserInitialHandleRef = useRef('');
  const [startNameInput, setStartNameInput] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>('BOOT_START');
  const [hasOptionalAssetWarning, setHasOptionalAssetWarning] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [initStatusText, setInitStatusText] = useState('初始化中');
  const [requiredAssetErrors, setRequiredAssetErrors] = useState<MissingRequiredAsset[]>([]);
  const [chatAutoPaused, setChatAutoPaused] = useState(false);
  const [chatAutoScrollMode, setChatAutoScrollMode] = useState<ChatAutoScrollMode>('FOLLOW');
  const [chatFreeze, setChatFreeze] = useState<ChatFreezeState>({ isFrozen: false, reason: null, startedAt: null });
  const [chatFreezeAfterNMessages] = useState(FREEZE_AFTER_MESSAGE_COUNT);
  const [chatFreezeCountdownRemaining, setChatFreezeCountdownRemaining] = useState(0);
  const [chatFreezeCountdownStartedAt, setChatFreezeCountdownStartedAt] = useState<number | null>(null);
  const [chatLastMessageActorIdCounted, setChatLastMessageActorIdCounted] = useState<string | null>(null);
  const [chatLastCountdownDecrementAt, setChatLastCountdownDecrementAt] = useState<number | null>(null);
  const [lastScrollFreezeReason, setLastScrollFreezeReason] = useState<string | null>(null);
  const [lastScrollModeChangeAt, setLastScrollModeChangeAt] = useState<number | null>(null);
  const [lastQuestionMessageId, setLastQuestionMessageId] = useState<string | null>(null);
  const [lastQuestionMessageHasTag, setLastQuestionMessageHasTag] = useState(false);
  const [replyPreviewSuppressedReason, setReplyPreviewSuppressedReason] = useState<string | null>(null);
  const [qnaQuestionMessageIdRendered, setQnaQuestionMessageIdRendered] = useState(false);
  const [replyPinMounted, setReplyPinMounted] = useState(false);
  const [sandboxPinnedMounted, setSandboxPinnedMounted] = useState(false);
  const [sandboxPinnedEntry, setSandboxPinnedEntry] = useState<SandboxPinnedEntry | null>(null);
  const [lastForceToBottomReason, setLastForceToBottomReason] = useState<string | null>(null);
  const [lastForceToBottomAt, setLastForceToBottomAt] = useState<number | null>(null);
  const [lastForceScrollMetrics, setLastForceScrollMetrics] = useState<{ top: number; height: number; client: number } | null>(null);
  const [lastForceContainerFound, setLastForceContainerFound] = useState(false);
  const [lastForceResult, setLastForceResult] = useState<'ok' | 'fail'>('fail');
  const [pendingForceScrollReason, setPendingForceScrollReason] = useState<string | null>(null);
  const [lastBlockedReason, setLastBlockedReason] = useState<string | null>(null);
  const [pauseSetAt, setPauseSetAt] = useState<number | null>(null);
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(() => randomInt(400, 900));
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => window.innerWidth >= DESKTOP_BREAKPOINT);
  const [mobileViewportHeight, setMobileViewportHeight] = useState<number | null>(null);
  const [mobileInnerHeight, setMobileInnerHeight] = useState(() => window.innerHeight);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [chatInputHeight, setChatInputHeight] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLElement>(null);
  const chatAreaRef = useRef<HTMLElement>(null);
  const [layoutMetricsTick, setLayoutMetricsTick] = useState(0);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugModeSwitching, setDebugModeSwitching] = useState(false);
  const [debugIsolatedTagLock, setDebugIsolatedTagLock] = useState(false);
  const [lastModeSwitch, setLastModeSwitch] = useState<LastModeSwitchStatus>(() => {
    const fallback = {
      clickAt: null,
      requestedMode: null,
      persistedMode: `query=${resolveModeFromQuery() ?? '-'} | storage=${window.localStorage.getItem(DEBUG_MODE_STORAGE_KEY) ?? '-'} | store=-`,
      action: 'none' as const,
      result: '-' as const,
      reason: ''
    };
    const raw = window.sessionStorage.getItem(DEBUG_MODE_SWITCH_STATUS_KEY);
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw) as typeof fallback;
      return {
        ...fallback,
        ...parsed
      };
    } catch {
      return fallback;
    }
  });
  const [sandboxRevealTick, setSandboxRevealTick] = useState(0);
  const bumpSandboxRevealTick = useCallback((hintAt?: number) => {
    setSandboxRevealTick((prev) => {
      const candidate = Number.isFinite(hintAt) && Number(hintAt) > 0 ? Number(hintAt) : Date.now();
      return candidate > prev ? candidate : prev + 1;
    });
  }, []);
  const [sandboxSsotVersion, setSandboxSsotVersion] = useState(NIGHT1.meta.version);
  const [blackoutState, setBlackoutState] = useState<BlackoutState>({
    isActive: false,
    mode: 'full',
    startedAt: null,
    endsAt: null,
    flickerSeed: 0,
    pulseAtMs: 4000,
    pulseDurationMs: 180
  });
  const burstCooldownUntil = useRef(0);
  const sendCooldownUntil = useRef(0);
  const speechCooldownUntil = useRef(0);
  const lastInputTimestamp = useRef(Date.now());
  const lastIdleCurseAt = useRef(0);
  const postedInitMessages = useRef(false);
  const postedOptionalAssetWarningMessage = useRef(false);
  const soundUnlocked = useRef(false);
  const audioEnabledSystemMessageSentRef = useRef(false);
  const audioUnlockFailedReasonRef = useRef<string | null>(null);
  const bootstrapRef = useRef<BootstrapState>({
    isReady: false,
    activatedAt: null,
    activatedBy: null
  });
  const nonVipMessagesSinceLastVip = useRef(2);
  const currentVideoKeyRef = useRef<string>(MAIN_LOOP);
  const pacingModeRef = useRef<ChatPacingMode>('normal');
  const pacingModeUntilRef = useRef(0);
  const pacingNextModeFlipAtRef = useRef(Date.now() + randomInt(20_000, 40_000));
  const tagSlowActiveRef = useRef(false);
  const questionRenderedRef = useRef(false);
  const replyPinMountedRef = useRef(false);
  const lastPacingModeRef = useRef<Exclude<ChatPacingMode, 'tag_slow'>>('normal');
  const eventWeightActiveUntilRef = useRef(0);
  const eventWeightRecoverUntilRef = useRef(0);
  const lastChatMessageAtRef = useRef(Date.now());
  const chatEngineRef = useRef(new ClassicChatEngine());
  const sandboxChatEngineRef = useRef<SandboxChatEngine | null>(null);
  const ghostLoreRef = useRef(createGhostLore());
  const lockStateRef = useRef<{ isLocked: boolean; target: string | null; startedAt: number; replyingToMessageId: string | null }>({
    isLocked: false,
    target: null,
    startedAt: 0,
    replyingToMessageId: null
  });
  const cooldownsRef = useRef<Record<string, number>>({ ghost_female: 0, footsteps: 0, low_rumble: 0, tv_event: 0, ghost_ping_actor: 0 });
  const eventAudioStateRef = useRef<Record<StoryEventKey, EventAudioStatus>>(EVENT_TESTER_KEYS.reduce((acc, key) => {
    acc[key] = {
      state: 'idle',
      lastTriggeredAt: null,
      cooldownUntil: 0,
      cooldownMs: EVENT_REGISTRY[key]?.cooldownMs ?? 0,
      preKey: EVENT_EFFECTS[key]?.sfx?.[0] ?? null,
      postKey: EVENT_EFFECTS[key]?.sfx?.[1] ?? null,
      lastResult: '-',
      lastReason: '-',
      playingSince: null
    };
    return acc;
  }, {} as Record<StoryEventKey, EventAudioStatus>));
  const eventAudioPlayingTimeoutsRef = useRef<Partial<Record<StoryEventKey, number>>>({});
  const eventCooldownsRef = useRef<Record<StoryEventKey, number>>({
    VOICE_CONFIRM: 0,
    GHOST_PING: 0,
    TV_EVENT: 0,
    NAME_CALL: 0,
    VIEWER_SPIKE: 0,
    LIGHT_GLITCH: 0,
    FEAR_CHALLENGE: 0
  });
  const eventCooldownMetaRef = useRef<Record<StoryEventKey, { nextAllowedAt: number; lastCommittedAt: number; lastRollbackAt: number }>>({
    VOICE_CONFIRM: { nextAllowedAt: 0, lastCommittedAt: 0, lastRollbackAt: 0 },
    GHOST_PING: { nextAllowedAt: 0, lastCommittedAt: 0, lastRollbackAt: 0 },
    TV_EVENT: { nextAllowedAt: 0, lastCommittedAt: 0, lastRollbackAt: 0 },
    NAME_CALL: { nextAllowedAt: 0, lastCommittedAt: 0, lastRollbackAt: 0 },
    VIEWER_SPIKE: { nextAllowedAt: 0, lastCommittedAt: 0, lastRollbackAt: 0 },
    LIGHT_GLITCH: { nextAllowedAt: 0, lastCommittedAt: 0, lastRollbackAt: 0 },
    FEAR_CHALLENGE: { nextAllowedAt: 0, lastCommittedAt: 0, lastRollbackAt: 0 }
  });
  const pendingReplyEventRef = useRef<{ key: StoryEventKey; target: string; eventId: string; expiresAt: number } | null>(null);
  const reactionBurstTimerRef = useRef<number | null>(null);
  const eventRecentContentIdsRef = useRef<Record<StoryEventKey, string[]>>({
    VOICE_CONFIRM: [],
    GHOST_PING: [],
    TV_EVENT: [],
    NAME_CALL: [],
    VIEWER_SPIKE: [],
    LIGHT_GLITCH: [],
    FEAR_CHALLENGE: []
  });
  const globalRecentContentIdsRef = useRef<string[]>([]);
  const eventTickCountRef = useRef(0);
  const eventLastTickAtRef = useRef(0);
  const eventLastCandidateCountRef = useRef(0);
  const eventLastCandidateKeysRef = useRef<string[]>([]);
  const eventGateRejectSummaryRef = useRef<Record<string, number>>({});
  const eventLastComputedAtRef = useRef(0);
  const eventLastReasonRef = useRef('INIT');
  const eventLastVariantIdRef = useRef('-');
  const eventLastKeyRef = useRef('-');
  const eventLastAtRef = useRef(0);
  const eventNextDueAtRef = useRef(0);
  const debugEnabled = debugOpen || getIsDebugEnabled();

  useEffect(() => {
    if (debugOpen) {
      setDebugOverlayEnabled(true);
      return;
    }
    setDebugOverlayEnabled(false);
  }, [debugOpen]);
  const modeRef = useRef<GameMode>(createClassicMode());
  const sandboxModeRef = useRef(createSandboxStoryMode());
  const modeIdRef = useRef<'classic' | 'sandbox_story'>(resolveInitialMode(debugEnabled));
  const sandboxConsonantPromptNodeIdRef = useRef<string | null>(null);
  const sandboxWaveRunningRef = useRef(false);
  const sandboxSupernaturalTimerRef = useRef<number | null>(null);
  const sandboxVipTranslateTimerRef = useRef<number | null>(null);
  const sandboxRevealDoneTimerRef = useRef<number | null>(null);
  const sandboxAdvanceRetryTimerRef = useRef<number | null>(null);
  const sandboxTagPhaseTimeoutRef = useRef<number | null>(null);
  const sandboxTagPhaseTimeoutFiredRef = useRef(false);
  const sandboxSenderGateDedupeRef = useRef<Record<string, { step: string; text: string; at: number }>>({});
  const sandboxQuestionFingerprintRef = useRef<Record<string, number>>({});
  const sandboxSenderCooldownRef = useRef<Record<string, number>>({});
  const sandboxWaitReplyRuntimeRef = useRef<{ lastGlitchAt: number; lastGlitchSender: string; glitchCount: number; burstStarted: boolean; completed: boolean; }>({ lastGlitchAt: 0, lastGlitchSender: '', glitchCount: 0, burstStarted: false, completed: false });
  const sandboxBlockedOptionsCountRef = useRef(0);
  const sandboxDebugPassRef = useRef<{ clickedAt: number; action: 'none' | 'called_advance_prompt' | 'state_only' }>({ clickedAt: 0, action: 'none' });
  const sandboxDebugActionAuditRef = useRef<Record<SandboxDebugActionName, SandboxDebugActionRecord>>({
    run_night_smoke_test: { lastClickedAt: 0, handlerInvoked: false, effectApplied: false, blockedReason: '-', targetState: 'sandbox.bootstrap + sandbox.flow + sandbox.sandboxFlow.nextQuestion* + sandbox.renderSync', lastResult: '-', intent: 'validate_end_to_end', sourceQuestionId: '-', targetQuestionId: '-', resultStep: '-', usedCanonicalAnswer: '-', usedAcceptedCandidates: [], reconciled: false },
    pass_flow: { lastClickedAt: 0, handlerInvoked: false, effectApplied: false, blockedReason: '-', targetState: 'sandbox.flow.questionIndex', lastResult: '-', intent: 'advance_one_legal_stage', sourceQuestionId: '-', targetQuestionId: '-', resultStep: '-', usedCanonicalAnswer: '-', usedAcceptedCandidates: [], reconciled: false },
    force_correct_now: { lastClickedAt: 0, handlerInvoked: false, effectApplied: false, blockedReason: '-', targetState: 'sandbox.consonantJudgeAudit + sandbox.replyGate + sandbox.reveal', lastResult: '-', intent: 'force_current_prompt_correct', sourceQuestionId: '-', targetQuestionId: '-', resultStep: '-', usedCanonicalAnswer: '-', usedAcceptedCandidates: [], reconciled: false },
    force_next_question: { lastClickedAt: 0, handlerInvoked: false, effectApplied: false, blockedReason: '-', targetState: 'sandbox.flow.questionIndex + sandbox.sandboxFlow.nextQuestion*', lastResult: '-', intent: 'advance_to_next_question_answerable', sourceQuestionId: '-', targetQuestionId: '-', resultStep: '-', usedCanonicalAnswer: '-', usedAcceptedCandidates: [], reconciled: false },
    force_ghost_event: { lastClickedAt: 0, handlerInvoked: false, effectApplied: false, blockedReason: '-', targetState: 'event.queue/startEvent', lastResult: '-', intent: 'force_event', sourceQuestionId: '-', targetQuestionId: '-', resultStep: '-', usedCanonicalAnswer: '-', usedAcceptedCandidates: [], reconciled: false }
  });
  const [sandboxFlowTestResult, setSandboxFlowTestResult] = useState<SandboxFlowTestResult>({
    status: 'idle',
    startedAt: 0,
    finishedAt: 0,
    currentStep: '-',
    lastPassedStep: '-',
    failedStep: '-',
    failureReason: '-',
    authoritativeFlowStep: '-',
    authoritativeBlockedReason: '-',
    fromQuestionId: '-',
    toQuestionId: '-',
    autoAnswerUsed: '-',
    secondQuestionShown: false
  });
  const sandboxFlowTestRunIdRef = useRef(0);
  const sandboxTechBacklogRef = useRef<string[]>([]);
  const sandboxTechBacklogLastAtRef = useRef(0);
  const sandboxTechBacklogTotalWaitMsRef = useRef(0);
  const sandboxPossessionRef = useRef<{ inputToken: number; sendToken: number }>({ inputToken: 0, sendToken: 0 });
  const sandboxQnaDebugRef = useRef<{
    lastResolveAt: number;
    lastResolveReason: string;
    lastClearReplyUiAt: number;
    lastClearReplyUiReason: string;
    lastAnomaly: string;
  }>({
    lastResolveAt: 0,
    lastResolveReason: '-',
    lastClearReplyUiAt: 0,
    lastClearReplyUiReason: '-',
    lastAnomaly: '-'
  });
  const sandboxRuntimeGuardRef = useRef<SandboxRuntimeGuardState>({
    modeEnteredAt: 0,
    bootRecoveries: 0,
    lastRecoveryReason: '-',
    lastHydratedAt: 0,
    classicTickBlockedCount: 0
  });
  const sandboxPreheatOrchestrationRef = useRef<{ startedAt: number; lastEmitAt: number; cursor: number; joinEmitted: number; lastJoinSender: string; completed: boolean; }>({
    startedAt: 0,
    lastEmitAt: 0,
    cursor: 0,
    joinEmitted: 0,
    lastJoinSender: '',
    completed: false
  });

  const sandboxPreheatDedupRef = useRef<{ emittedFingerprints: Set<string> }>({
    emittedFingerprints: new Set()
  });

  const sandboxReplyGateDebugRef = useRef<{
    gateType: string;
    armed: boolean;
    sourceMessageId: string;
    targetPlayerId: string;
    consumePolicy: string;
  }>({
    gateType: 'none',
    armed: false,
    sourceMessageId: '-',
    targetPlayerId: '-',
    consumePolicy: '-'
  });
  const sandboxLastReplyEvalRef = useRef<{
    timestamp: number;
    messageId: string;
    rawInput: string;
    normalizedInput: string;
    extractedAnswer: string;
    gateType: string;
    consumed: boolean;
    reason: string;
    replyTarget: string;
    sourceMessageId: string;
    sourceType: string;
  }>({
    timestamp: 0,
    messageId: '-',
    rawInput: '',
    normalizedInput: '',
    extractedAnswer: '',
    gateType: 'none',
    consumed: false,
    reason: '-',
    replyTarget: '-',
    sourceMessageId: '-',
    sourceType: '-'
  });
  const qnaStateRef = useRef(createInitialQnaState());
  const qnaTxnTraceRef = useRef<{
    txId: string;
    lastCheckpoint: 'idle' | 'qna_started' | 'question_append_ok' | 'question_committed' | 'aborted';
    checkpointAt: number;
    abortReason: string | null;
  }>({
    txId: '',
    lastCheckpoint: 'idle',
    checkpointAt: 0,
    abortReason: null
  });
  const messageSeqRef = useRef(0);
  const eventQueueRef = useRef<{ key: StoryEventKey; source: 'qna' }[]>([]);
  const eventExclusiveStateRef = useRef<{ exclusive: boolean; currentEventId: string | null; currentLockOwner: string | null }>({
    exclusive: false,
    currentEventId: null,
    currentLockOwner: null
  });
  const foreignTagBlockedCountRef = useRef(0);
  const lastBlockedReasonRef = useRef('-');

  const eventLifecycleRef = useRef<EventRunRecord | null>(null);
  const preEffectStateRef = useRef<{ triggered: boolean; at: number; sfxKey?: 'ghost_female' | 'footsteps' | 'fan_loop'; videoKey?: 'oldhouse_room_loop' | 'oldhouse_room_loop2' | 'oldhouse_room_loop3' | 'oldhouse_room_loop4' }>({ triggered: false, at: 0 });
  const reactionRecentIdsRef = useRef<Record<EventTopic, string[]>>({ ghost: [], footsteps: [], light: [] });
  const reactionActorHistoryRef = useRef<string[]>([]);
  const reactionTextHistoryRef = useRef<string[]>([]);
  const blockedActiveUserAutoSpeakCountRef = useRef(0);
  const npcSpawnBlockedByFreezeRef = useRef(0);
  const ghostBlockedByFreezeRef = useRef(0);
  const [fearDebugState, setFearDebugState] = useState<SandboxFearDebugState>(EMPTY_FEAR_DEBUG_STATE);
  const [ghostEventDebugState, setGhostEventDebugState] = useState<GhostEventManagerDebugState>({
    events: EVENT_TESTER_KEYS.map((eventName) => ({
      eventName,
      status: 'ready',
      cooldown: 0,
      lock: false,
      preSound: EVENT_REGISTRY[eventName].preEffect?.sfxKey ?? 'none',
      postSound: EVENT_REGISTRY[eventName].postEffect?.sfxKey ?? 'none'
    })),
    ghostSystem: {
      activeEvents: 0,
      eventQueueLength: 0,
      lastEvent: '-',
      cooldownCount: 0
    }
  });
  const eventRunnerStateRef = useRef<{ inFlight: boolean; currentEventId: string | null; pendingTimers: number[] }>({
    inFlight: false,
    currentEventId: null,
    pendingTimers: []
  });
  const eventTestDebugRef = useRef<{ lastStartAttemptAt: number; lastStartAttemptKey: string; lastStartAttemptBlockedReason: EventStartBlockedReason | '-' }>({
    lastStartAttemptAt: 0,
    lastStartAttemptKey: '-',
    lastStartAttemptBlockedReason: '-'
  });
  const blackoutDelayTimerRef = useRef<number | null>(null);
  const blackoutStopTimerRef = useRef<number | null>(null);

  const clearEventRunnerPendingTimers = useCallback(() => {
    eventRunnerStateRef.current.pendingTimers.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    eventRunnerStateRef.current.pendingTimers = [];
  }, []);

  const registerEventRunnerTimer = useCallback((timerId: number) => {
    eventRunnerStateRef.current.pendingTimers = [...eventRunnerStateRef.current.pendingTimers, timerId];
  }, []);

  const clearEventRunnerState = useCallback(() => {
    clearEventRunnerPendingTimers();
    eventRunnerStateRef.current.inFlight = false;
    eventRunnerStateRef.current.currentEventId = null;
  }, [clearEventRunnerPendingTimers]);

  const stopBlackout = useCallback(() => {
    if (blackoutDelayTimerRef.current != null) {
      window.clearTimeout(blackoutDelayTimerRef.current);
      blackoutDelayTimerRef.current = null;
    }
    if (blackoutStopTimerRef.current != null) {
      window.clearTimeout(blackoutStopTimerRef.current);
      blackoutStopTimerRef.current = null;
    }
    setBlackoutState((prev) => ({ ...prev, isActive: false, startedAt: null, endsAt: null }));
  }, []);

  const scheduleBlackoutFlicker = useCallback((opts: { delayMs: number; durationMs: number; pulseAtMs: number; pulseDurationMs: number }) => {
    if (chatAutoPaused) return;
    stopBlackout();
    blackoutDelayTimerRef.current = window.setTimeout(() => {
      blackoutDelayTimerRef.current = null;
      if (chatAutoPaused) return;
      const startedAt = Date.now();
      const endsAt = startedAt + opts.durationMs;
      setBlackoutState({
        isActive: true,
        mode: Math.random() < 0.5 ? 'full' : 'dim75',
        startedAt,
        endsAt,
        flickerSeed: Math.floor(Math.random() * 0xffffffff),
        pulseAtMs: opts.pulseAtMs,
        pulseDurationMs: opts.pulseDurationMs
      });
      blackoutStopTimerRef.current = window.setTimeout(() => {
        blackoutStopTimerRef.current = null;
        setBlackoutState((prev) => ({ ...prev, isActive: false, startedAt: null, endsAt: null }));
      }, opts.durationMs);
    }, opts.delayMs);
  }, [chatAutoPaused, stopBlackout]);

  const setEventAttemptDebug = useCallback((eventKey: StoryEventKey, blockedReason: EventStartBlockedReason | null) => {
    eventTestDebugRef.current = {
      lastStartAttemptAt: Date.now(),
      lastStartAttemptKey: eventKey,
      lastStartAttemptBlockedReason: blockedReason ?? '-'
    };
  }, []);

  const clearEventAudioPlayingTimeout = useCallback((eventKey: StoryEventKey) => {
    const timerId = eventAudioPlayingTimeoutsRef.current[eventKey];
    if (timerId != null) {
      window.clearTimeout(timerId);
      delete eventAudioPlayingTimeoutsRef.current[eventKey];
    }
  }, []);

  const updateEventAudioState = useCallback((eventKey: StoryEventKey, patch: Partial<EventAudioStatus>, logType: 'EVENT_STATE' | 'EVENT_TRIGGERED' | 'EVENT_SKIPPED' | 'EVENT_PLAY_FAIL' = 'EVENT_STATE') => {
    const prev = eventAudioStateRef.current[eventKey];
    const next: EventAudioStatus = {
      ...prev,
      ...patch,
      cooldownMs: EVENT_REGISTRY[eventKey]?.cooldownMs ?? prev.cooldownMs,
      preKey: EVENT_EFFECTS[eventKey]?.sfx?.[0] ?? prev.preKey,
      postKey: EVENT_EFFECTS[eventKey]?.sfx?.[1] ?? prev.postKey
    };
    eventAudioStateRef.current[eventKey] = next;
    const payload = {
      eventId: eventKey,
      state: next.state,
      cooldownUntil: next.cooldownUntil,
      lastTriggeredAt: next.lastTriggeredAt,
      lastResult: next.lastResult,
      reason: next.lastReason,
      preKey: next.preKey,
      postKey: next.postKey
    };
    if (logType === 'EVENT_TRIGGERED') console.log('[EVENT_TRIGGERED]', payload);
    else if (logType === 'EVENT_SKIPPED') console.log('[EVENT_SKIPPED]', payload);
    else if (logType === 'EVENT_PLAY_FAIL') console.log('[EVENT_PLAY_FAIL]', payload);
    else console.log('[EVENT_STATE]', payload);
  }, []);

  const scheduleEventAudioIdle = useCallback((eventKey: StoryEventKey) => {
    clearEventAudioPlayingTimeout(eventKey);
    const status = eventAudioStateRef.current[eventKey];
    const now = Date.now();
    if (status.cooldownUntil <= now) {
      updateEventAudioState(eventKey, { state: 'idle' });
      return;
    }
    const timerId = window.setTimeout(() => {
      updateEventAudioState(eventKey, { state: 'idle' });
    }, Math.max(0, status.cooldownUntil - now));
    eventAudioPlayingTimeoutsRef.current[eventKey] = timerId;
  }, [clearEventAudioPlayingTimeout, updateEventAudioState]);

  const transitionEventAudioToCooldown = useCallback((eventKey: StoryEventKey, reason: string) => {
    clearEventAudioPlayingTimeout(eventKey);
    const now = Date.now();
    const cooldownMs = EVENT_REGISTRY[eventKey]?.cooldownMs ?? 0;
    const cooldownUntil = now + cooldownMs;
    updateEventAudioState(eventKey, {
      state: 'cooldown',
      lastResult: reason === 'play_failed' ? 'FAILED' : 'TRIGGERED',
      lastReason: reason,
      cooldownUntil,
      lastTriggeredAt: now,
      playingSince: null
    }, reason === 'play_failed' ? 'EVENT_PLAY_FAIL' : 'EVENT_STATE');
    scheduleEventAudioIdle(eventKey);
  }, [clearEventAudioPlayingTimeout, scheduleEventAudioIdle, updateEventAudioState]);

  const markEventAudioPlaying = useCallback((eventKey: StoryEventKey) => {
    clearEventAudioPlayingTimeout(eventKey);
    const now = Date.now();
    updateEventAudioState(eventKey, {
      state: 'playing',
      playingSince: now,
      lastResult: 'TRIGGERED',
      lastReason: 'playing',
      lastTriggeredAt: now
    }, 'EVENT_TRIGGERED');
    const timerId = window.setTimeout(() => {
      transitionEventAudioToCooldown(eventKey, 'playing_timeout_fallback');
    }, EVENT_AUDIO_PLAYING_TIMEOUT_MS);
    eventAudioPlayingTimeoutsRef.current[eventKey] = timerId;
  }, [clearEventAudioPlayingTimeout, transitionEventAudioToCooldown, updateEventAudioState]);

  const canTriggerByEventAudioState = useCallback((eventKey: StoryEventKey, force = false) => {
    const now = Date.now();
    const status = eventAudioStateRef.current[eventKey];
    if (force) return { ok: true as const, reason: null as string | null };
    if (status.state === 'playing') return { ok: false as const, reason: 'playing' };
    if (status.state === 'cooldown' && now < status.cooldownUntil) return { ok: false as const, reason: 'cd' };
    return { ok: true as const, reason: null as string | null };
  }, []);

  useEffect(() => () => {
    clearEventRunnerState();
    EVENT_TESTER_KEYS.forEach((eventKey) => {
      clearEventAudioPlayingTimeout(eventKey);
    });
  }, [clearEventAudioPlayingTimeout, clearEventRunnerState]);


  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const syncLayoutMode = () => {
      setIsDesktopLayout(mediaQuery.matches);
    };

    syncLayoutMode();
    mediaQuery.addEventListener('change', syncLayoutMode);
    window.addEventListener('resize', syncLayoutMode);

    return () => {
      mediaQuery.removeEventListener('change', syncLayoutMode);
      window.removeEventListener('resize', syncLayoutMode);
    };
  }, []);

  useEffect(() => {
    if (isDesktopLayout) {
      setMobileViewportHeight(null);
      setIsKeyboardOpen(false);
      return;
    }

    const vv = window.visualViewport;
    const updateViewport = () => {
      const nextVh = vv?.height ?? window.innerHeight;
      setMobileViewportHeight(nextVh);
      setMobileInnerHeight(window.innerHeight);
      setIsKeyboardOpen(Boolean(vv && window.innerHeight - vv.height > 120));
      document.documentElement.style.setProperty('--vvh', `${nextVh}px`);
      setLayoutMetricsTick((value) => value + 1);
    };

    updateViewport();
    vv?.addEventListener('resize', updateViewport);
    vv?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      vv?.removeEventListener('resize', updateViewport);
      vv?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      document.documentElement.style.removeProperty('--vvh');
    };
  }, [isDesktopLayout]);

  const canSandboxEmitChat = useCallback((kind: 'GLITCH_BURST' | 'DEFAULT') => {
    if (modeRef.current.id !== 'sandbox_story') return true;
    const sandboxState = sandboxModeRef.current.getState();
    if (!sandboxState.joinGate.satisfied) return false;
    const sandboxForcedReplyActive = qnaStateRef.current.active.status === 'AWAITING_REPLY'
      && Boolean(qnaStateRef.current.active.questionMessageId);
    if (sandboxForcedReplyActive) return false;
    if (!sandboxState.freeze.frozen) return true;
    return kind === 'GLITCH_BURST' && sandboxState.glitchBurst.pending;
  }, []);

  const isSandboxFlowSourceTag = useCallback((sourceTag: string) => {
    return sourceTag === 'sandbox_consonant_prompt'
      || sourceTag.startsWith('sandbox_tag_player_')
      || sourceTag === 'sandbox_crowd_react_word'
      || sourceTag === 'sandbox_vip_summary_1'
      || sourceTag === 'sandbox_vip_summary_2'
      || sourceTag === 'sandbox_discuss_pronounce'
      || sourceTag === 'sandbox_tech_backlog_flush'
      || sourceTag === 'sandbox_possession_autosend'
      || sourceTag === 'sandbox_chat_engine'
      || sourceTag === 'sandbox_preheat_join'
      || sourceTag === 'sandbox_preheat_chat'
      || sourceTag === 'sandbox_autoplay_mock_reply'
      || sourceTag === 'sandbox_warmup_tag'
      || sourceTag === 'sandbox_reveal_1_riot'
      || sourceTag === 'sandbox_post_answer_glitch'
      || sourceTag === 'sandbox_wait_reply_1_retry'
      || sourceTag === 'sandbox_wait_reply_1_glitch_pool'
      || sourceTag === 'sandbox_post_answer_glitch_pool';
  }, []);

  const dispatchChatMessage = (
    message: ChatMessage,
    options?: { source?: ChatSendSource; sourceTag?: string }
  ): { ok: true; messageId: string } | { ok: false; blockedReason: string } => {
    const source = options?.source ?? 'unknown';
    const sourceTag = options?.sourceTag ?? source;
    if (modeRef.current.id === 'sandbox_story' && source !== 'player_input') {
      const sandboxFlow = sandboxModeRef.current.getState().sandboxFlow;
      const isWaitReplyStep = isSandboxWaitReplyStep(sandboxFlow.step);
      if (isWaitReplyStep) {
        return { ok: false, blockedReason: 'sandbox_wait_reply_global_freeze' };
      }
      if (!isSandboxFlowSourceTag(sourceTag) && source !== 'system_ui') {
        return { ok: false, blockedReason: 'sandbox_non_flow_output_blocked' };
      }
    }
    const sandboxForcedReplyActive = modeRef.current.id === 'sandbox_story'
      && qnaStateRef.current.active.status === 'AWAITING_REPLY'
      && Boolean(qnaStateRef.current.active.questionMessageId);
    if (sandboxForcedReplyActive && source !== 'player_input') {
      return { ok: false, blockedReason: 'sandbox_forced_reply_gate_active' };
    }
    const sandboxEmitKind: 'GLITCH_BURST' | 'DEFAULT' = sourceTag === 'sandbox_answer_glitch_flood' ? 'GLITCH_BURST' : 'DEFAULT';
    if (!canSandboxEmitChat(sandboxEmitKind) && source !== 'player_input') {
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          lastBlockedSendAttempt: {
            actorHandle: normalizeHandle(message.username || ''),
            source,
            sourceTag,
            textPreview: (message.text || '').slice(0, 40),
            at: Date.now(),
            blockedReason: 'sandbox_emit_gate_blocked'
          }
        }
      };
      return { ok: false, blockedReason: 'sandbox_emit_gate_blocked' };
    }
    const sourceMode: 'sandbox' | 'classic' | 'system' = source === 'system_ui' ? 'system' : (modeRef.current.id === 'sandbox_story' ? 'sandbox' : 'classic');
    const normalizedActiveUser = normalizeHandle(activeUserInitialHandleRef.current || '');
    const actorHandle = normalizeHandle(message.username || '');
    const isActiveUserActor = Boolean(normalizedActiveUser) && actorHandle === normalizedActiveUser;

    if (isActiveUserActor && source !== 'player_input') {
      blockedActiveUserAutoSpeakCountRef.current += 1;
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          lastBlockedSendAttempt: {
            actorId: actorHandle || '-',
            actorHandle: message.username || '-',
            source,
            sourceTag,
            textPreview: truncateLintText(message.text || ''),
            at: Date.now(),
            blockedReason: 'activeUser_auto_speak_blocked'
          },
          blockedCounts: {
            ...(window.__CHAT_DEBUG__?.chat?.blockedCounts ?? {}),
            activeUserAutoSpeak: blockedActiveUserAutoSpeakCountRef.current
          }
        }
      };
      return { ok: false, blockedReason: 'activeUser_auto_speak_blocked' };
    }

    if (modeRef.current.id === 'sandbox_story' && source !== 'player_input') {
      const sandboxFlowState = sandboxModeRef.current.getState().sandboxFlow;
      const step = sandboxFlowState.step;
      const sender = normalizeHandle(message.username || '') || (message.username || '-');
      const normalizedSourceTag = (sourceTag || '').toLowerCase();
      if ((step === 'PREHEAT_CHAT' || step === 'REVEAL_1_START' || step === 'REVEAL_1_RIOT' || step === 'TAG_PLAYER_1') && sender === 'system' && (normalizedSourceTag.includes('tag_player_1') || normalizedSourceTag.includes('question'))) {
        return { ok: false, blockedReason: 'sandbox_system_formal_question_blocked' };
      }
      if (step === 'WAIT_REPLY_1' && normalizedSourceTag.includes('glitch') && sandboxFlowState.questionEmitterId && sender === sandboxFlowState.questionEmitterId) {
        return { ok: false, blockedReason: 'sandbox_question_emitter_glitch_conflict' };
      }
      const normalizedText = (message.translation || message.text || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const dedupeWindowMs = sandboxModeRef.current.getState().sandboxFlow.dedupeWindowMs || 5000;
      const now = Date.now();
      const dedupeGateKey = `${step}:${sandboxFlowState.questionIndex}`;
      const prev = sandboxSenderGateDedupeRef.current[sender];
      if (normalizedText && prev && prev.step === dedupeGateKey && prev.text === normalizedText && now - prev.at < dedupeWindowMs) {
        return { ok: false, blockedReason: 'sandbox_same_sender_duplicate_in_gate' };
      }
      const senderCooldownMs = 1200;
      const lastSenderAt = sandboxSenderCooldownRef.current[sender] || 0;
      if (now - lastSenderAt < senderCooldownMs) {
        return { ok: false, blockedReason: 'sandbox_sender_cooldown' };
      }
      sandboxSenderGateDedupeRef.current[sender] = { step: dedupeGateKey, text: normalizedText, at: now };
      sandboxSenderCooldownRef.current[sender] = now;
    }

    let pendingSandboxAutoPin: null | {
      reason: 'vip_direct_mention' | 'story_critical_hint_followup';
      freezeMs: number;
      hasTagToActiveUser: boolean;
    } = null;
    if (modeRef.current.id === 'sandbox_story' && source !== 'player_input') {
      const hasOptionPayload = Boolean((message as ChatMessage & { options?: unknown[] }).options?.length);
      const hasOptionTemplate = /(?:\(|（)\s*選項\s*[:：]/u.test(message.text || '') || /選項\s*[:：]/u.test(message.translation || '');
      if (hasOptionPayload || hasOptionTemplate) {
        sandboxBlockedOptionsCountRef.current += 1;
        window.__CHAT_DEBUG__ = {
          ...(window.__CHAT_DEBUG__ ?? {}),
          sandbox: {
            ...((window.__CHAT_DEBUG__ as any)?.sandbox ?? {}),
            blockedOptionsCount: sandboxBlockedOptionsCountRef.current
          }
        } as any;
        return { ok: false, blockedReason: 'sandbox_classic_option_template_blocked' };
      }
    }

    if (source === 'unknown') {
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          sendSourceWarning: {
            at: Date.now(),
            actor: actorHandle || '-',
            textPreview: truncateLintText(message.text || '')
          }
        }
      };
    }

    const resolveMentionUserIds = (text: string): string[] => parseMentionHandles(text).map((handle) => usersByHandleRef.current.get(toHandleKey(handle))?.id).filter((id): id is string => Boolean(id));
    const mentions = resolveMentionUserIds(message.text);
    const normalizedMentions = Array.from(new Set(mentions));
    const textHasActiveUserTag = normalizedMentions.includes('activeUser');
    lastMessageMentionsActiveUserRef.current = textHasActiveUserTag;
    lastParsedMentionsRef.current = { messageId: message.id, mentions: normalizedMentions };
    const messageWithMentions: ChatMessage = { ...message, mentions: normalizedMentions };
    if (modeRef.current.id === 'sandbox_story' && source !== 'player_input') {
      const sandboxPlayerHandle = normalizeHandle(activeUserInitialHandleRef.current || sandboxModeRef.current.getState().player?.handle || '');
      const mentionHandles = parseMentionHandles(message.text).map((handle) => normalizeHandle(handle));
      const hasPlayerMention = Boolean(sandboxPlayerHandle) && mentionHandles.some((handle) => toHandleKey(handle) === toHandleKey(sandboxPlayerHandle));
      const isVipSpeaker = Boolean(message.isVip === 'VIP_NORMAL' || message.role === 'vip' || normalizeHandle(message.username) === SANDBOX_VIP.handle);
      const isStoryCriticalHintFollowUp = message.chatType === 'sandbox_story_critical_hint_followup';
      const directToPlayer = isVipSpeaker && hasPlayerMention && message.type !== 'system';
      const hitVipDirectMentionRule = directToPlayer;
      const hitStoryCriticalRule = isStoryCriticalHintFollowUp;
      const isPreheatFlow = sandboxModeRef.current.getState().flow.step === 'PREHEAT_CHAT';
      const shouldPin = hitStoryCriticalRule || (hitVipDirectMentionRule && !isPreheatFlow);
      const failureReason = shouldPin
        ? '-'
        : (!isVipSpeaker
          ? 'speaker_not_vip'
          : (!hasPlayerMention
            ? 'no_player_mention'
            : (isPreheatFlow ? 'preheat_non_reply_highlight_only' : 'not_story_critical')));
      const pinnedReason = hitVipDirectMentionRule
        ? 'vip_direct_mention'
        : (hitStoryCriticalRule ? 'story_critical_hint_followup' : '-');
      const freezeReason = pinnedReason;
      const now = Date.now();
      setSandboxDebugAutoPinFreeze({
        lastDirectMentionDetected: {
          messageId: message.id,
          at: now,
          hasPlayerMention,
          isVipSpeaker,
          directToPlayer
        },
        lastEvaluation: {
          messageId: message.id,
          isVip: isVipSpeaker,
          hasPlayerMention,
          directToPlayer,
          hitVipDirectMentionRule,
          hitStoryCriticalRule,
          shouldPin,
          failureReason,
          pinnedReason,
          freezeReason,
          highlightOnly: !shouldPin && directToPlayer
        },
        lastPinnedCandidateMessageId: shouldPin ? message.id : '-',
        highlightWithoutPinned: directToPlayer && !shouldPin,
        ...(message.hintEventName ? { lastHintFollowUpEvent: message.hintEventName } : {})
      });
      if (shouldPin) {
        const freezeMs = hitStoryCriticalRule ? 7000 : 6000;
        pendingSandboxAutoPin = {
          reason: hitStoryCriticalRule ? 'story_critical_hint_followup' : 'vip_direct_mention',
          freezeMs,
          hasTagToActiveUser: hitStoryCriticalRule ? true : hasPlayerMention
        };
      }
    }
    if (eventExclusiveStateRef.current.exclusive && textHasActiveUserTag && message.username !== eventExclusiveStateRef.current.currentLockOwner) {
      foreignTagBlockedCountRef.current += 1;
      lastBlockedReasonRef.current = 'foreign_tag_during_exclusive';
      updateEventDebug({
        event: {
          ...(window.__CHAT_DEBUG__?.event ?? {}),
          foreignTagBlockedCount: foreignTagBlockedCountRef.current,
          lastBlockedReason: lastBlockedReasonRef.current
        }
      });
            return { ok: false, blockedReason: 'foreign_tag_during_exclusive' };
    }

    const linted = lintOutgoingMessage(messageWithMentions);
    if (linted.rejectedReason !== '-') {
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          lint: {
            lastRejectedText: linted.rejectedText,
            lastRejectedReason: linted.rejectedReason,
            rerollCount: linted.rerollCount
          }
        }
      };
    }
    const now = Date.now();
    if (chatFreeze.isFrozen && source !== 'player_input') {
      npcSpawnBlockedByFreezeRef.current += 1;
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          npcSpawnBlockedByFreeze: npcSpawnBlockedByFreezeRef.current,
          lastBlockedSendAttempt: {
            actorHandle,
            source,
            sourceTag: options?.sourceTag ?? '-',
            textPreview: message.text.slice(0, 40),
            at: now,
            blockedReason: 'hard_freeze_active'
          }
        }
      };
      return { ok: false, blockedReason: 'hard_freeze_active' };
    }
    if (chatAutoScrollMode === 'FROZEN' && source !== 'player_input') {
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          lastBlockedSendAttempt: {
            actorHandle,
            source,
            sourceTag: options?.sourceTag ?? '-',
            textPreview: message.text.slice(0, 40),
            at: now,
            blockedReason: 'chat_frozen_until_player_reply'
          }
        }
      };
      return { ok: false, blockedReason: 'chat_frozen_until_player_reply' };
    }
    const shouldCountDownForFreeze =
      chatAutoScrollMode === 'COUNTDOWN'
      && actorHandle !== normalizeHandle(activeUserInitialHandleRef.current || '')
      && source !== 'system_ui'
      && (linted.message as ChatMessage & { isPinnedLayer?: boolean }).isPinnedLayer !== true;
    if (shouldCountDownForFreeze) {
      const questionMessageId = qnaStateRef.current.active.questionMessageId;
      const questionMessage = questionMessageId ? state.messages.find((entry) => entry.id === questionMessageId) : null;
      const isTaggedQuestionActive = Boolean(
        bootstrapRef.current.isReady
        && qnaStateRef.current.active.status === 'AWAITING_REPLY'
        && questionMessageId
        && questionMessage
        && Boolean(questionMessage.mentions?.includes('activeUser'))
      );
      if (!isTaggedQuestionActive) {
        resetChatAutoScrollFollow();
      } else {
        const nextRemaining = Math.max(0, chatFreezeCountdownRemaining - 1);
        setChatFreezeCountdownRemaining(nextRemaining);
        setChatLastMessageActorIdCounted(actorHandle || '-');
        setChatLastCountdownDecrementAt(now);
        if (nextRemaining <= 0) {
          setScrollMode('FROZEN', 'tagged_question_countdown_done');
        }
      }
    }
    lastChatMessageAtRef.current = now;
    const seq = ++messageSeqRef.current;
    const actionType = source === 'player_input' ? 'PLAYER_MESSAGE' : 'AUDIENCE_MESSAGE';
    dispatch({
      type: actionType,
      payload: {
        ...linted.message,
        createdAtMs: now,
        seq,
        source
      }
    });
    window.__CHAT_DEBUG__ = {
      ...(window.__CHAT_DEBUG__ ?? {}),
      chat: {
        ...(window.__CHAT_DEBUG__?.chat ?? {}),
        lastEmit: {
          at: now,
          source,
          sourceTag,
          sourceMode,
          actor: actorHandle || '-',
          textPreview: truncateLintText(message.text || '')
        }
      }
    };
    if (pendingSandboxAutoPin) {
      triggerSandboxAutoPinFreeze({
        messageId: linted.message.id,
        reason: pendingSandboxAutoPin.reason,
        freezeMs: pendingSandboxAutoPin.freezeMs,
        hasTagToActiveUser: pendingSandboxAutoPin.hasTagToActiveUser,
        sourceMessage: linted.message
      });
    }
    return { ok: true, messageId: linted.message.id };
  };

  const syncChatEngineDebug = useCallback(() => {
    const engineDebug = chatEngineRef.current.getDebugState() as {
      lint?: { lastRejectedText?: string; lastRejectedReason?: string; rerollCount?: number };
      activeUsers?: string[];
      activeUsersCount?: number;
      pacing?: {
        mode?: 'normal' | 'slowed' | 'locked_slowed';
        baseRate?: number;
        currentRate?: number;
        jitterEnabled?: boolean;
        nextMessageDueInSec?: number;
      };
    };
    const actorState = separateChatActorState(state.messages, activeUserInitialHandleRef.current || '');
    const invariantViolated = actorState.removedActiveUserFromAudience;
    window.__CHAT_DEBUG__ = {
      ...(window.__CHAT_DEBUG__ ?? {}),
      chat: {
        ...(window.__CHAT_DEBUG__?.chat ?? {}),
        lint: {
          lastRejectedText: engineDebug.lint?.lastRejectedText ?? '-',
          lastRejectedReason: engineDebug.lint?.lastRejectedReason ?? '-',
          rerollCount: engineDebug.lint?.rerollCount ?? 0
        },
        activeUsers: {
          count: engineDebug.activeUsersCount ?? engineDebug.activeUsers?.length ?? 0,
          namesSample: (engineDebug.activeUsers ?? []).slice(0, 6)
        },
        audience: {
          count: actorState.audienceUsers.length
        },
        audienceInvariant: {
          removedActiveUser: invariantViolated,
          reason: invariantViolated ? 'audience_includes_activeUser_removed' : '-'
        },
        blockedCounts: {
          ...(window.__CHAT_DEBUG__?.chat?.blockedCounts ?? {}),
          activeUserAutoSpeak: blockedActiveUserAutoSpeakCountRef.current
        },
        activeUser: {
          id: activeUserProfileRef.current?.id ?? '-',
          handle: activeUserProfileRef.current?.handle ?? '-',
          displayName: activeUserProfileRef.current?.displayName ?? '-',
          registryHandleExists: Boolean(activeUserProfileRef.current && usersByHandleRef.current.has(toHandleKey(activeUserProfileRef.current.handle))),
          registered: Boolean(activeUserProfileRef.current && usersByHandleRef.current.has(toHandleKey(activeUserProfileRef.current.handle)))
        },
        mention: {
          lastMessageMentionsActiveUser: lastMessageMentionsActiveUserRef.current,
          lastParsedMentions: { ...lastParsedMentionsRef.current },
          lastHighlightReason: lastHighlightReasonRef.current,
          tagHighlightAppliedCount: tagHighlightAppliedCountRef.current
        },
        lastActorPicked: {
          id: window.__CHAT_DEBUG__?.chat?.lastActorPicked?.id ?? '-'
        },
        actorPickBlockedReason: window.__CHAT_DEBUG__?.chat?.actorPickBlockedReason ?? '-',
        pacing: {
          mode: engineDebug.pacing?.mode ?? 'normal',
          baseRate: engineDebug.pacing?.baseRate ?? 0,
          currentRate: engineDebug.pacing?.currentRate ?? 0,
          jitterEnabled: engineDebug.pacing?.jitterEnabled ?? true,
          nextMessageDueInSec: engineDebug.pacing?.nextMessageDueInSec ?? 0
        }
      }
    };
  }, [state.messages]);

  const emitChatEvent = (event: Parameters<ClassicChatEngine['emit']>[0]) => {
    if (chatFreeze.isFrozen) {
      npcSpawnBlockedByFreezeRef.current += 1;
      return;
    }
    const chats = chatEngineRef.current.emit(event, Date.now());
    chats.forEach((message) => dispatchChatMessage(message, { source: 'audience_idle' }));
    syncChatEngineDebug();
  };

  const updateEventDebug = useCallback((patch: Partial<NonNullable<Window['__CHAT_DEBUG__']>>) => {
    const prev = window.__CHAT_DEBUG__ ?? {};
    window.__CHAT_DEBUG__ = {
      ...prev,
      ...patch,
      sandbox: {
        ...(prev as any).sandbox,
        ...(patch as any).sandbox
      },
      ui: {
        ...(prev as any).ui,
        ...(patch as any).ui
      }
    };
  }, []);

  const syncQnaTxnDebug = useCallback(() => {
    const trace = qnaTxnTraceRef.current;
    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        lastEvent: {
          ...(window.__CHAT_DEBUG__?.event?.lastEvent ?? {}),
          qnaTxId: trace.txId || '-',
          qnaCheckpoint: trace.lastCheckpoint,
          qnaCheckpointAt: trace.checkpointAt || null,
          qnaAbortReason: trace.abortReason ?? '-'
        },
        qna: {
          ...(window.__CHAT_DEBUG__?.event?.qna ?? {}),
          active: {
            ...(window.__CHAT_DEBUG__?.event?.qna as { active?: Record<string, unknown> } | undefined)?.active,
            ...qnaStateRef.current.active,
            id: qnaStateRef.current.active.id,
            txId: trace.txId || '-',
            checkpoint: trace.lastCheckpoint,
            checkpointAt: trace.checkpointAt || null,
            abortReason: qnaStateRef.current.active.abortReason ?? trace.abortReason ?? null
          }
        }
      }
    });
  }, [updateEventDebug]);

  const checkpointQnaTxn = useCallback((checkpoint: 'qna_started' | 'question_append_ok' | 'question_committed' | 'aborted', abortReason?: string | null) => {
    const now = Date.now();
    qnaTxnTraceRef.current = {
      txId: qnaStateRef.current.active.id || qnaTxnTraceRef.current.txId,
      lastCheckpoint: checkpoint,
      checkpointAt: now,
      abortReason: abortReason ?? (checkpoint === 'aborted' ? 'unknown' : null)
    };
    syncQnaTxnDebug();
  }, [syncQnaTxnDebug]);

  const ensureSandboxRuntimeStarted = useCallback((reason: string, handleHint?: string) => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const now = Date.now();
    const sandboxState = sandboxModeRef.current.getState();
    const preheatRuntime = sandboxPreheatOrchestrationRef.current;
    const activeHandle = normalizeHandle(handleHint || activeUserInitialHandleRef.current || sandboxState.player?.handle || '000') || '000';
    sandboxModeRef.current.setPlayerIdentity({ handle: activeHandle, id: 'activeUser' });

    const bootstrapMissing = !sandboxState.flow?.step
      || !Number.isFinite(sandboxState.flow?.questionIndex)
      || !sandboxState.flow?.stepStartedAt
      || !sandboxState.introGate?.startedAt
      || !sandboxState.introGate?.minDurationMs
      || !sandboxState.scheduler?.phase;
    const shouldMarkJoined = reason === 'sandbox_join_submitted';
    if (shouldMarkJoined && !sandboxState.joinGate.satisfied) {
      sandboxModeRef.current.setJoinGate({ satisfied: true, submittedAt: now });
    }
    const shouldResetBootstrap = bootstrapMissing || sandboxState.flow.step === 'PREJOIN';
    const bootstrappedState = sandboxModeRef.current.ensureBootstrapState?.(reason, now, 30_000, shouldResetBootstrap)
      ?? sandboxModeRef.current.getState();
    sandboxModeRef.current.setPreheatState({ enabled: true, lastJoinAt: bootstrappedState.preheat.lastJoinAt || now });
    if (shouldMarkJoined || shouldResetBootstrap) {
      preheatRuntime.startedAt = bootstrappedState.introGate.startedAt || now;
      preheatRuntime.lastEmitAt = 0;
      preheatRuntime.cursor = 0;
      preheatRuntime.joinEmitted = 0;
      preheatRuntime.lastJoinSender = '';
      preheatRuntime.completed = false;
      sandboxPreheatDedupRef.current.emittedFingerprints.clear();
    }

    sandboxRuntimeGuardRef.current.bootRecoveries += 1;
    sandboxRuntimeGuardRef.current.lastRecoveryReason = reason;
    sandboxRuntimeGuardRef.current.modeEnteredAt = sandboxRuntimeGuardRef.current.modeEnteredAt || now;
  }, []);

  useEffect(() => {
    const selectedMode = modeIdRef.current;
    const mode = selectedMode === 'sandbox_story' ? sandboxModeRef.current : createClassicMode();
    modeRef.current = mode;
    mode.init();
    if (selectedMode === 'sandbox_story') {
      sandboxRuntimeGuardRef.current.modeEnteredAt = Date.now();
      ensureSandboxRuntimeStarted('mode_switch_bootstrap');
    } else {
      sandboxModeRef.current.setPlayerIdentity({ handle: normalizeHandle(activeUserInitialHandleRef.current || '000') || '000', id: 'activeUser' });
    }
    return () => {
      mode.dispose();
    };
  }, [ensureSandboxRuntimeStarted]);


  const convertSandboxChatMessage = useCallback((message: { user: string; text: string; thai?: string; translation?: string; vip?: boolean; role?: 'viewer' | 'vip' | 'mod'; badge?: 'crown'; chatType?: 'sandbox_story_critical_hint_followup'; hintEventName?: string }): ChatMessage => {
    const [maybeUser, ...rest] = message.text.split(': ');
    const parsedHasPrefix = maybeUser === message.user && rest.length > 0;
    const text = parsedHasPrefix ? rest.join(': ') : message.text;
    return {
      id: crypto.randomUUID(),
      username: message.user,
      text,
      language: message.thai ? 'th' : 'zh',
      translation: message.translation,
      type: 'chat',
      isVip: message.vip ? 'VIP_NORMAL' : undefined,
      role: message.role,
      badge: message.badge,
      chatType: message.chatType,
      hintEventName: message.hintEventName
    };
  }, []);

  useEffect(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    if (sandboxChatEngineRef.current) return;
    sandboxChatEngineRef.current = new SandboxChatEngine({
      onMessage: (message) => {
        dispatchChatMessage(convertSandboxChatMessage(message), { source: 'sandbox_consonant', sourceTag: 'sandbox_chat_engine' });
      },
      onWaveResolved: (count) => {
        sandboxModeRef.current.markWaveDone('related', count);
        sandboxWaveRunningRef.current = false;
        sandboxConsonantPromptNodeIdRef.current = null;
        bumpSandboxRevealTick();
      }
    });
    // experience-first rebuild: sandbox engine scheduler is disabled to avoid bypass chatter
    return () => {
      sandboxChatEngineRef.current?.stop();
      sandboxChatEngineRef.current = null;
    };
  }, [convertSandboxChatMessage]);

  const sortedMessages = useMemo(() => {
    const withIndex = state.messages.map((message, idx) => ({ message, idx }));
    return withIndex
      .sort((a, b) => {
        const at = a.message.createdAtMs ?? 0;
        const bt = b.message.createdAtMs ?? 0;
        if (at !== bt) return at - bt;
        const as = a.message.seq ?? a.idx;
        const bs = b.message.seq ?? b.idx;
        return as - bs;
      })
      .map((item) => item.message);
  }, [state.messages]);

  const markEventTopicBoost = useCallback((activeMs: number) => {
    const now = Date.now();
    eventWeightActiveUntilRef.current = Math.max(eventWeightActiveUntilRef.current, now + activeMs);
    eventWeightRecoverUntilRef.current = Math.max(eventWeightRecoverUntilRef.current, eventWeightActiveUntilRef.current + 5_000);
  }, []);

  const getCurrentTopicWeights = useCallback((now: number): TopicWeightProfile => {
    if (now <= eventWeightActiveUntilRef.current) return { ...EVENT_TOPIC_WEIGHT };
    if (now < eventWeightRecoverUntilRef.current) {
      const span = Math.max(1, eventWeightRecoverUntilRef.current - eventWeightActiveUntilRef.current);
      const progress = Math.min(1, Math.max(0, (now - eventWeightActiveUntilRef.current) / span));
      return {
        randomComment: EVENT_TOPIC_WEIGHT.randomComment + (NORMAL_TOPIC_WEIGHT.randomComment - EVENT_TOPIC_WEIGHT.randomComment) * progress,
        videoObservation: EVENT_TOPIC_WEIGHT.videoObservation + (NORMAL_TOPIC_WEIGHT.videoObservation - EVENT_TOPIC_WEIGHT.videoObservation) * progress,
        suspicion: EVENT_TOPIC_WEIGHT.suspicion + (NORMAL_TOPIC_WEIGHT.suspicion - EVENT_TOPIC_WEIGHT.suspicion) * progress,
        buildUp: EVENT_TOPIC_WEIGHT.buildUp + (NORMAL_TOPIC_WEIGHT.buildUp - EVENT_TOPIC_WEIGHT.buildUp) * progress,
        eventTopic: EVENT_TOPIC_WEIGHT.eventTopic + (NORMAL_TOPIC_WEIGHT.eventTopic - EVENT_TOPIC_WEIGHT.eventTopic) * progress
      };
    }
    return { ...NORMAL_TOPIC_WEIGHT };
  }, []);

  const triggerReactionBurst = useCallback((topic: EventTopic) => {
    if (chatFreeze.isFrozen) {
      npcSpawnBlockedByFreezeRef.current += 1;
      return;
    }
    markEventTopicBoost(12_000);
    if (reactionBurstTimerRef.current) {
      window.clearTimeout(reactionBurstTimerRef.current);
      reactionBurstTimerRef.current = null;
    }
    const durationMs = randomInt(10_000, 12_000);
    const reactionCount = randomInt(2, 5);
    const lines = pickReactionLines(topic, reactionCount, reactionRecentIdsRef.current[topic]);
    reactionRecentIdsRef.current[topic] = [...reactionRecentIdsRef.current[topic], ...lines.map((line) => line.id)].slice(-8);
    const fireAt = Date.now() + randomInt(300, 1200);
    reactionBurstTimerRef.current = window.setTimeout(() => {
      reactionBurstTimerRef.current = null;
      lines.forEach((line, index) => {
        window.setTimeout(() => {
          const chatActors = separateChatActorState(sortedMessages, activeUserInitialHandleRef.current || '');
          const actorPool = chatActors.audienceUsers.length >= 3
            ? chatActors.audienceUsers
            : Array.from(new Set([...chatActors.audienceUsers, ...reactionActorHistoryRef.current, ...DEBUG_SEED_USERS]));
          let pickedLine = line;
          let rerollCount = 0;
          let rejectedReason = '-';
          while (reactionTextHistoryRef.current.slice(-8).includes(pickedLine.text) && rerollCount < 5) {
            const rerolled = pickReactionLines(topic, 1, reactionRecentIdsRef.current[topic])[0];
            if (!rerolled) break;
            pickedLine = rerolled;
            rerollCount += 1;
            rejectedReason = 'duplicate';
          }
          reactionTextHistoryRef.current = [...reactionTextHistoryRef.current, pickedLine.text].slice(-12);
          const pickedActor = pickAudienceActor({ activeUser: chatActors.activeUser, audienceUsers: actorPool, removedActiveUserFromAudience: chatActors.removedActiveUserFromAudience }, reactionActorHistoryRef.current);
          const actor = pickedActor.actor;
          reactionActorHistoryRef.current = [...reactionActorHistoryRef.current, actor].slice(-10);
          dispatchChatMessage({
            id: crypto.randomUUID(),
            username: actor,
            type: 'chat',
            text: pickedLine.text,
            language: 'zh',
            translation: pickedLine.text
          }, { source: 'audience_reaction' });
          window.__CHAT_DEBUG__ = {
            ...(window.__CHAT_DEBUG__ ?? {}),
            chat: {
              ...(window.__CHAT_DEBUG__?.chat ?? {}),
              lastActorPicked: { id: actor },
              actorPickBlockedReason: pickedActor.blockedReason ?? '-',
              lint: {
                ...(window.__CHAT_DEBUG__?.chat?.lint ?? {}),
                rerollCount,
                lastRejectedReason: rejectedReason,
                lastRejectedText: rejectedReason === 'duplicate' ? pickedLine.text : '-'
              }
            }
          };
        }, Math.floor((durationMs / Math.max(1, reactionCount)) * index));
      });
    }, Math.max(0, fireAt - Date.now()));
    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        scheduler: { ...(window.__CHAT_DEBUG__?.event?.scheduler ?? {}), lastFiredAt: fireAt, nextDueAt: fireAt + durationMs },
        lastEventLabel: `reaction:${topic}`,
        lastReactions: {
          count: reactionCount,
          lastReactionActors: reactionActorHistoryRef.current.slice(-10)
        }
      },
      violation: reactionActorHistoryRef.current.some((actor) => actor === 'system') ? 'reaction_actor_system=true' : window.__CHAT_DEBUG__?.violation
    });
  }, [chatFreeze.isFrozen, dispatchChatMessage, markEventTopicBoost, state.messages, updateEventDebug]);

  const buildEventLine = useCallback((eventKey: StoryEventKey, phase: EventLinePhase, target: string): { line: string; lineId: string } => {
    markEventTopicBoost(phase === 'opener' ? 12_000 : 8_000);
    const historyWindow = phase === 'opener' ? 5 : 4;
    const recentIds = eventRecentContentIdsRef.current[eventKey].slice(-historyWindow);
    const picked = pickDialog(eventKey, phase, target, recentIds);
    eventLastVariantIdRef.current = picked.id;
    const loreLevel = state.curse >= 70 ? 3 : state.curse >= 40 ? 2 : 1;
    const lore = ghostLoreRef.current.inject({
      fragment: picked.text,
      level: loreLevel,
      activeUser: target
    });
    eventRecentContentIdsRef.current[eventKey] = [...eventRecentContentIdsRef.current[eventKey], picked.id].slice(-5);
    globalRecentContentIdsRef.current = [...globalRecentContentIdsRef.current, picked.id].slice(-10);
    updateEventDebug({
      lastContentId: picked.id,
      lastNameInjected: lore.lastNameInjected,
      contentRepeatBlocked: picked.repeatBlocked,
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        lastEventLabel: `event:${eventKey}:${phase}`
      }
    });
    return { line: lore.fragment, lineId: picked.id };
  }, [markEventTopicBoost, state.curse, updateEventDebug]);

  const dispatchEventLine = useCallback((line: string, actorHandle: string, source: 'scheduler_tick' | 'user_input' | 'debug_tester' | 'debug_force' = 'scheduler_tick', sendSource?: ChatSendSource): EventSendResult => {
    const now = Date.now();
    const textHasActiveUserTag = parseMentionHandles(line).some((handle) => usersByHandleRef.current.get(toHandleKey(handle))?.id === 'activeUser');
    if (eventExclusiveStateRef.current.exclusive && textHasActiveUserTag && actorHandle !== eventExclusiveStateRef.current.currentLockOwner) {
      foreignTagBlockedCountRef.current += 1;
      lastBlockedReasonRef.current = 'foreign_tag_during_exclusive';
      updateEventDebug({
        event: {
          ...(window.__CHAT_DEBUG__?.event ?? {}),
          foreignTagBlockedCount: foreignTagBlockedCountRef.current,
          lastBlockedReason: lastBlockedReasonRef.current
        }
      });
      return { ok: false, blockedReason: 'foreign_tag_during_exclusive' };
    }
    if (!line.trim()) return { ok: false, blockedReason: 'empty' };
    if (!appStarted) return { ok: false, blockedReason: 'app_not_started' };
    if (source === 'scheduler_tick' && chatAutoPaused) return { ok: false, blockedReason: 'chat_auto_paused' };
    if (sendCooldownUntil.current > now) return { ok: false, blockedReason: 'rate_limited' };
    if (lockStateRef.current.isLocked && lockStateRef.current.target && lockStateRef.current.target !== actorHandle) {
      return { ok: false, blockedReason: 'locked_target_only' };
    }

    const messageId = crypto.randomUUID();
    const resolvedSendSource: ChatSendSource = sendSource ?? ((source === 'debug_tester' || source === 'debug_force') ? 'debug_tester' : 'event_dialogue');
    const sent = dispatchChatMessage({
      id: messageId,
      username: actorHandle,
      type: 'chat',
      text: line,
      language: 'zh',
      translation: line,
      tagTarget: actorHandle
    }, { source: resolvedSendSource, sourceTag: `event:${source}` });
    if (!sent.ok) return { ok: false, blockedReason: sent.blockedReason };
    if (modeRef.current.id === 'sandbox_story') {
      modeRef.current.onIncomingTag(line);
    }
    return { ok: true, lineId: messageId };
  }, [appStarted, chatAutoPaused, chatFreeze.isFrozen, dispatchChatMessage, updateEventDebug]);

  const setScrollMode = useCallback((mode: ChatAutoScrollMode, reason: string) => {
    setChatAutoScrollMode(mode);
    setLastScrollModeChangeAt(Date.now());
    if (mode === 'FROZEN') {
      setLastScrollFreezeReason(reason);
    }
  }, []);


  const clearChatFreeze = useCallback((reason: string) => {
    setChatFreeze({ isFrozen: false, reason: null, startedAt: null });
    setPauseReason(null);
    setPauseSetAt(null);
    setScrollMode('FOLLOW', reason);
    setChatFreezeCountdownRemaining(0);
    setChatFreezeCountdownStartedAt(null);
    setChatLastMessageActorIdCounted(null);
    setChatLastCountdownDecrementAt(null);
  }, [setScrollMode]);

  const resetChatAutoScrollFollow = useCallback(() => {
    clearChatFreeze('player_send_success');
  }, [clearChatFreeze]);

  const resetQnaUiState = useCallback(() => {
    setReplyPreviewSuppressedReason(null);
  }, []);

  const deriveSandboxReplyGateState = useCallback((): SandboxReplyGateState => {
    if (modeRef.current.id !== 'sandbox_story') {
      return {
        replyGateArmed: false,
        replyGateType: null,
        replyTarget: null,
        replySourceMessageId: null,
        replySourceType: null,
        canReply: false
      };
    }
    const sandboxState = sandboxModeRef.current.getState();
    const gate = sandboxState.replyGate;
    const authoritativeCanReply = Boolean(
      gate?.armed
      && gate?.canReply
      && gate?.gateType === 'consonant_answer'
      && isSandboxWaitReplyStep(sandboxState.flow.step)
    );
    return {
      replyGateArmed: Boolean(gate?.armed),
      replyGateType: gate?.gateType && gate.gateType !== 'none' ? gate.gateType : null,
      replyTarget: gate?.targetPlayerId || null,
      replySourceMessageId: gate?.sourceMessageId || null,
      replySourceType: gate?.sourceType || null,
      canReply: authoritativeCanReply
    };
  }, []);

  const writeSandboxLastReplyEval = useCallback((payload: {
    rawInput: string;
    normalizedInput?: string;
    extractedAnswer?: string;
    messageId?: string;
    consumed: boolean;
    reason: string;
    gate?: SandboxReplyGateState;
    authoritativeWaitReplyIndex?: number | null;
    submitRejectedAtStep?: string;
  }) => {
    const gate = payload.gate ?? deriveSandboxReplyGateState();
    const now = Date.now();
    sandboxModeRef.current.setSandboxFlow({ playerLastReply: payload.normalizedInput ?? payload.rawInput.trim() });
    const evalState = {
      timestamp: now,
      messageId: payload.messageId || `player:${now}`,
      rawInput: payload.rawInput,
      normalizedInput: payload.normalizedInput ?? payload.rawInput.trim(),
      extractedAnswer: payload.extractedAnswer ?? payload.normalizedInput ?? payload.rawInput.trim(),
      gateType: gate.replyGateType ?? 'none',
      consumed: payload.consumed,
      reason: payload.reason,
      replyTarget: gate.replyTarget ?? '-',
      sourceMessageId: gate.replySourceMessageId ?? '-',
      sourceType: gate.replySourceType ?? '-',
      authoritativeWaitReplyIndex: payload.authoritativeWaitReplyIndex ?? null,
      submitRejectedAtStep: payload.submitRejectedAtStep ?? ''
    };
    sandboxLastReplyEvalRef.current = evalState;
    sandboxModeRef.current.setLastReplyEval?.({
      messageId: evalState.messageId,
      gateType: evalState.gateType,
      rawInput: evalState.rawInput,
      normalizedInput: evalState.normalizedInput,
      extractedAnswer: evalState.extractedAnswer,
      consumed: evalState.consumed,
      reason: evalState.reason,
      raw: evalState.rawInput,
      normalized: evalState.normalizedInput,
      classifiedAs: evalState.consumed ? 'consumed' : 'rejected',
      at: now,
      authoritativeWaitReplyIndex: evalState.authoritativeWaitReplyIndex,
      submitRejectedAtStep: evalState.submitRejectedAtStep,
      audit: sandboxModeRef.current.getState().consonantJudgeAudit
    });
  }, [deriveSandboxReplyGateState]);

  const clearReplyUi = useCallback((reason: string) => {
    const now = Date.now();
    lockStateRef.current = {
      ...lockStateRef.current,
      isLocked: false,
      target: null,
      startedAt: 0,
      replyingToMessageId: null
    };
    qnaStateRef.current.active.questionMessageId = null;
    setSandboxPinnedEntry((prev) => {
      if (!prev) return prev;
      sandboxAutoPinFreezeRef.current.lastPinnedDroppedReason = `clearReplyUi:${reason}`;
      sandboxAutoPinFreezeRef.current.lastPinnedDroppedAt = now;
      sandboxAutoPinFreezeRef.current.cleanupClearedPinned = true;
      return null;
    });
    setLastQuestionMessageId(null);
    setLastQuestionMessageHasTag(false);
    resetQnaUiState();
    sandboxModeRef.current.setSandboxFlow({ replyGateActive: false, replyTarget: null, canReply: false, gateType: 'none' });
    sandboxModeRef.current.setReplyGate?.({ gateType: 'none', armed: false, canReply: false, gateConsumed: false, sourceMessageId: '', sourceType: '', targetPlayerId: '', consumePolicy: 'single' });
    if (modeRef.current.id === 'sandbox_story') {
      const ss = sandboxModeRef.current.getState();
      if (!ss.flow?.step || !Number.isFinite(ss.flow?.questionIndex) || !ss.scheduler?.phase || !ss.introGate?.startedAt) {
        sandboxModeRef.current.ensureBootstrapState?.('clearReplyUi_reinit', now, 30_000, true);
      }
    }
    sandboxQnaDebugRef.current.lastClearReplyUiAt = now;
    sandboxQnaDebugRef.current.lastClearReplyUiReason = reason;
  }, [resetQnaUiState]);

  const resolveQna = useCallback((reason: string) => {
    const now = Date.now();
    markQnaResolved(qnaStateRef.current, now);
    sandboxQnaDebugRef.current.lastResolveAt = now;
    sandboxQnaDebugRef.current.lastResolveReason = reason;
    clearReplyUi(`resolve:${reason}`);
    if (chatFreeze.isFrozen || chatAutoScrollMode !== 'FOLLOW') {
      clearChatFreeze(`qna_resolved:${reason}`);
    }
  }, [chatAutoScrollMode, chatFreeze.isFrozen, clearChatFreeze, clearReplyUi]);

  const consumePlayerReply = useCallback((payload: { raw: string; messageId?: string; sourceType?: string; playerId?: string; targetPlayerId?: string; sourceMessageId?: string }) => {
    const raw = payload.raw;
    const replyConsumeSource = payload.sourceType === 'debug_simulate'
      ? 'smoke_test'
      : (payload.sourceType === 'manual' ? 'manual' : (payload.sourceType ? 'ui' : 'simulate_send'));
    const persistReplyTelemetry = (patch: Record<string, unknown>) => {
      sandboxModeRef.current.setReplyTelemetry?.({ consumeSource: replyConsumeSource, ...patch });
    };
    const persistJudgeAudit = (auditPatch: Record<string, unknown>) => {
      sandboxModeRef.current.setConsonantJudgeAudit?.({
        rawInput: '',
        normalizedInput: '',
        parseOk: false,
        parseKind: 'not_evaluated',
        matchedAlias: '',
        expectedConsonant: '',
        acceptedCandidates: [],
        compareInput: '',
        compareMode: 'normalized_alias_membership',
        judgeResult: 'not_evaluated',
        resultReason: 'not_evaluated',
        sourcePromptId: '',
        sourceQuestionId: '',
        sourceWordKey: '',
        gateType: 'none',
        consumedAt: 0,
        ...auditPatch
      });
    };
    const persistBlockedJudgeAudit = (reason: string, gateType: string) => {
      const now = Date.now();
      const currentPrompt = sandboxModeRef.current.getState().prompt.current;
      const trimmed = raw.trim();
      persistJudgeAudit({
        rawInput: raw,
        normalizedInput: trimmed,
        parseOk: false,
        parseKind: 'not_evaluated',
        matchedAlias: '',
        expectedConsonant: currentPrompt?.consonant || '',
        acceptedCandidates: [],
        compareInput: trimmed,
        compareMode: 'normalized_alias_membership',
        judgeResult: 'blocked',
        resultReason: reason,
        sourcePromptId: currentPrompt?.promptId || '',
        sourceQuestionId: currentPrompt?.wordKey || '',
        sourceWordKey: currentPrompt?.wordKey || '',
        gateType,
        consumedAt: now
      });
    };
    if (modeRef.current.id === 'sandbox_story') {
      const sandboxState = sandboxModeRef.current.getState();
      const extraction = extractConsonantAnswerPayload(raw);
      const stripped = extraction.stripped;
      const derivedGate = deriveSandboxReplyGateState();
      const waitReplyIndex = parseSandboxWaitReplyIndex(sandboxState.flow.step);
      const waitReplyStep = waitReplyIndex !== null;
      const expectedGateType = waitReplyStep
        ? (waitReplyIndex === 0 ? 'warmup_tag' : 'consonant_answer')
        : null;
      const gate = waitReplyStep
        ? {
            ...derivedGate,
            replyGateType: expectedGateType,
            replyGateArmed: Boolean(derivedGate.replyGateArmed || sandboxState.replyGate?.armed),
            canReply: Boolean(derivedGate.canReply || sandboxState.replyGate?.canReply),
            replySourceMessageId: derivedGate.replySourceMessageId || sandboxState.replyGate?.sourceMessageId || lockStateRef.current.replyingToMessageId || qnaStateRef.current.active.questionMessageId || null
          }
        : derivedGate;
      const evalGate = {
        ...gate,
        replySourceMessageId: payload.sourceMessageId || gate.replySourceMessageId,
        replySourceType: payload.sourceType || gate.replySourceType,
        replyTarget: payload.targetPlayerId || gate.replyTarget
      };
      if (!gate.replyGateType) {
        persistBlockedJudgeAudit('reply_blocked:no_gate', 'none');
        persistReplyTelemetry({ consumeResult: 'blocked', consumeBlockedReason: 'reply_blocked:no_gate' });
        writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'no_gate', gate: evalGate, messageId: payload.messageId, authoritativeWaitReplyIndex: waitReplyIndex });
        return false;
      }
      if (!gate.replyGateArmed) {
        persistBlockedJudgeAudit('reply_blocked:gate_not_armed', gate.replyGateType);
        persistReplyTelemetry({ consumeResult: 'blocked', consumeBlockedReason: 'reply_blocked:gate_not_armed' });
        writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'gate_not_armed', gate: evalGate, messageId: payload.messageId, authoritativeWaitReplyIndex: waitReplyIndex });
        return false;
      }
      if (!gate.canReply) {
        persistBlockedJudgeAudit('reply_blocked:can_reply_false', gate.replyGateType);
        persistReplyTelemetry({ consumeResult: 'blocked', consumeBlockedReason: 'reply_blocked:can_reply_false' });
        writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'can_reply_false', gate: evalGate, messageId: payload.messageId, authoritativeWaitReplyIndex: waitReplyIndex });
        return false;
      }
      const expectedTarget = normalizeHandle(gate.replyTarget || sandboxState.replyGate?.targetPlayerId || '');
      const inboundTarget = normalizeHandle(payload.targetPlayerId || payload.playerId || activeUserInitialHandleRef.current || '');
      const targetIgnoredByGate = gate.replyGateType === 'consonant_answer' || gate.replyGateType === 'consonant_guess';
      if (!targetIgnoredByGate && expectedTarget && inboundTarget && expectedTarget !== inboundTarget) {
        persistBlockedJudgeAudit(`reply_blocked:target_mismatch:${expectedTarget}->${inboundTarget}`, gate.replyGateType);
        persistReplyTelemetry({ consumeResult: 'blocked', consumeBlockedReason: `reply_blocked:target_mismatch:${expectedTarget}->${inboundTarget}` });
        writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'target_mismatch', gate: evalGate, messageId: payload.messageId, authoritativeWaitReplyIndex: waitReplyIndex });
        return false;
      }
      let consonantParsed = stripped;
      const consumeAt = Date.now();
      if (gate.replyGateType === 'consonant_guess' || gate.replyGateType === 'consonant_answer') {
        const currentPrompt = sandboxState.prompt.current;
        const node = sandboxModeRef.current.getCurrentNode();
        if (currentPrompt?.kind === 'consonant') {
          if (isHelpRequest(extraction.stripped)) {
            const hintEntry = CONSONANT_BANK_BY_CHAR.get(currentPrompt.consonant);
            const helpHint = hintEntry ? `想一下${hintEntry.imageMemoryHint}那個。` : '先想一下圖像記憶那個關鍵字。';
            showHintForCurrentPrompt({ judge: 'help', currentPrompt: { consonant: currentPrompt.consonant, wordKey: currentPrompt.wordKey }, hintText: helpHint });
            persistJudgeAudit({
              rawInput: raw,
              normalizedInput: extraction.normalized,
              parseOk: true,
              parseKind: 'help_request',
              matchedAlias: extraction.normalized,
              expectedConsonant: currentPrompt.consonant,
              acceptedCandidates: node?.acceptedCandidates ?? [],
              compareInput: extraction.normalized,
              compareMode: 'help_request',
              judgeResult: 'blocked',
              resultReason: 'help_requested',
              sourcePromptId: currentPrompt.promptId,
              sourceQuestionId: node?.id ?? currentPrompt.wordKey,
              sourceWordKey: currentPrompt.wordKey,
              gateType: gate.replyGateType,
              consumedAt: consumeAt
            });
            writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: extraction.normalized, extractedAnswer: extraction.normalized, consumed: false, reason: 'help_requested', gate: evalGate, messageId: payload.messageId, authoritativeWaitReplyIndex: waitReplyIndex });
            return false;
          }
          const pipeline = parseAndJudgeUsingClassic(raw, {
            nodeChar: currentPrompt.consonant,
            node: node && node.id === currentPrompt.wordKey ? node : undefined,
            activeUser: normalizeHandle(activeUserInitialHandleRef.current || '') || 'you'
          });
          persistJudgeAudit({
            rawInput: pipeline.audit.parse.raw,
            normalizedInput: pipeline.audit.parse.normalized,
            parseOk: pipeline.audit.parse.ok,
            parseKind: pipeline.audit.parse.kind,
            matchedAlias: pipeline.audit.parse.matchedAlias,
            expectedConsonant: pipeline.audit.judge.expectedConsonant,
            acceptedCandidates: pipeline.audit.judge.acceptedCandidates,
            compareInput: pipeline.audit.judge.compareInput,
            compareMode: pipeline.audit.judge.compareMode,
            judgeResult: pipeline.audit.judge.result,
            resultReason: pipeline.audit.judge.resultReason,
            sourcePromptId: currentPrompt.promptId,
            sourceQuestionId: node?.id ?? currentPrompt.wordKey,
            sourceWordKey: currentPrompt.wordKey,
            gateType: gate.replyGateType,
            consumedAt: consumeAt
          });
          persistReplyTelemetry({
            detectedMentions: pipeline.audit.parse.mentions,
            extractedAnswer: pipeline.audit.parse.stripped,
            normalizedAnswer: pipeline.audit.parse.normalized,
            answerPipeline: 'raw>detect_mentions>strip_mentions>normalize>candidate_compare>judge>consume'
          });
          consonantParsed = pipeline.parsed;
          sandboxModeRef.current.commitConsonantJudgeResult({ input: raw, parsed: pipeline.parsed, judge: pipeline.result, classicJudgeResult: pipeline.result });
          if (pipeline.result !== 'correct') {
            persistReplyTelemetry({ consumeResult: 'blocked', consumeBlockedReason: `answer_eval_blocked:${pipeline.result}` });
            writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: pipeline.parsed, extractedAnswer: pipeline.parsed, consumed: false, reason: pipeline.result, gate: evalGate, messageId: payload.messageId, authoritativeWaitReplyIndex: waitReplyIndex });
            bumpSandboxRevealTick();
            return false;
          }
        } else {
          persistJudgeAudit({
            rawInput: raw,
            normalizedInput: stripped,
            parseOk: false,
            parseKind: 'no_prompt',
            matchedAlias: '',
            expectedConsonant: '',
            acceptedCandidates: [],
            compareInput: stripped,
            compareMode: 'normalized_alias_membership',
            judgeResult: 'wrong_format',
            resultReason: 'missing_consonant_prompt',
            sourcePromptId: '',
            sourceQuestionId: node?.id ?? '',
            sourceWordKey: '',
            gateType: gate.replyGateType,
            consumedAt: consumeAt
          });
        }
      } else if (!stripped) {
        persistBlockedJudgeAudit('reply_blocked:stripped_empty', gate.replyGateType);
        persistReplyTelemetry({ consumeResult: 'blocked', consumeBlockedReason: 'reply_blocked:stripped_empty' });
        writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'stripped_empty', gate: evalGate, messageId: payload.messageId, authoritativeWaitReplyIndex: waitReplyIndex });
        return false;
      }

      sandboxModeRef.current.setSandboxFlow({
        gateConsumed: true,
        retryCount: sandboxState.sandboxFlow.retryLimit,
        nextRetryAt: 0,
        waitingForMockReply: false,
        canReply: false,
        replyGateActive: false
      });
      sandboxModeRef.current.setFreeze({ frozen: false, reason: 'NONE', frozenAt: 0 });
      sandboxModeRef.current.setAnswerGate({ waiting: false, pausedChat: false });
      sandboxWaitReplyRuntimeRef.current.completed = true;
      clearReplyUi(`sandbox_${sandboxState.flow.step.toLowerCase()}_consumed`);
      clearChatFreeze(`sandbox_${sandboxState.flow.step.toLowerCase()}_consumed`);
      sandboxReplyGateDebugRef.current = { ...sandboxReplyGateDebugRef.current, armed: false };

      persistReplyTelemetry({
        lastConsumedMessageId: payload.messageId || payload.sourceMessageId || '',
        lastConsumedText: raw,
        lastConsumedAt: consumeAt,
        consumeResult: 'consumed',
        consumeBlockedReason: ''
      });
      if (waitReplyIndex === 0) {
        sandboxModeRef.current.setFlowStep('POST_REPLY_CHAT', 'player_reply_warmup_consumed');
      } else if (waitReplyIndex === 1) {
        sandboxModeRef.current.setFlowStep('ANSWER_EVAL', 'player_reply_1_consumed');
      } else if (waitReplyIndex === 2) {
        sandboxModeRef.current.setFlowStep('ANSWER_EVAL', 'player_reply_2_consumed');
      } else if (waitReplyIndex === 3) {
        sandboxModeRef.current.setFlowStep('ANSWER_EVAL', 'player_reply_3_consumed');
      } else if ((waitReplyIndex ?? -1) >= 1) {
        sandboxModeRef.current.setFlowStep('ANSWER_EVAL', resolveSandboxWaitReplyConsumedReason(waitReplyIndex!));
        // legacy guard reference: setFlowStep('ANSWER_EVAL', `player_reply_${waitReplyIndex}_consumed`)
      } else {
        persistReplyTelemetry({ consumeResult: 'blocked', consumeBlockedReason: 'reply_blocked:submit_rejected' });
        writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'submit_rejected', gate: evalGate, messageId: payload.messageId, authoritativeWaitReplyIndex: waitReplyIndex, submitRejectedAtStep: sandboxState.flow.step || '' });
        return false;
      }
      writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: consonantParsed, extractedAnswer: consonantParsed, consumed: true, reason: 'consume_success', gate: evalGate, messageId: payload.messageId, authoritativeWaitReplyIndex: waitReplyIndex });
      bumpSandboxRevealTick();
      return true;
    }
    if (!isQnaAwaitingReplyGateOpen(qnaStateRef.current)) {
      return false;
    }
    const stripped = raw.replace(/^(?:[\s　]*@[^\s　]+[\s　]*)+/u, '').trim();
    const parsed = parsePlayerReplyToOption(qnaStateRef.current, stripped);
    if (!parsed) {
      persistReplyTelemetry({ consumeResult: 'blocked', consumeBlockedReason: 'reply_blocked:parse_miss' });
      writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'parse_miss' });
      return false;
    }
    qnaStateRef.current.matched = { optionId: parsed.optionId, keyword: parsed.matchedKeyword, at: Date.now() };
    resolveQna(`parsed:${parsed.optionId}`);
    if ((window.__CHAT_DEBUG__?.ui as { replyBarVisible?: boolean } | undefined)?.replyBarVisible) {
      clearReplyUi('anomaly_reply_bar_still_visible_after_resolve');
      sandboxQnaDebugRef.current.lastAnomaly = 'replyBarVisible_after_resolve';
    }
    persistReplyTelemetry({ lastConsumedMessageId: payload.messageId || '', lastConsumedText: raw, lastConsumedAt: Date.now(), consumeResult: 'consumed', consumeBlockedReason: '' });
    writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: true, reason: 'consume_success' });
    return true;
  }, [clearChatFreeze, clearReplyUi, deriveSandboxReplyGateState, resolveQna, writeSandboxLastReplyEval]);

  const setPinnedQuestionMessage = useCallback((payload: {
    source: 'sandboxPromptCoordinator' | 'qnaEngine' | 'eventEngine' | 'autoPinFreeze' | 'unknown';
    messageId: string;
    hasTagToActiveUser: boolean;
    sourceMessage?: ChatMessage | null;
  }) => {
    const sourceMessage = payload.sourceMessage ?? state.messages.find((entry) => entry.id === payload.messageId) ?? null;
    if (!sourceMessage) return false;

    if (modeRef.current.id !== 'sandbox_story') {
      setLastQuestionMessageId(payload.messageId);
      setLastQuestionMessageHasTag(payload.hasTagToActiveUser);
      setReplyPreviewSuppressedReason(null);
      return true;
    }

    if (!(payload.source === 'sandboxPromptCoordinator' || payload.source === 'autoPinFreeze')) {
      const sandboxState = sandboxModeRef.current.getState();
      const blockedReason = sandboxState.replyGate?.armed ? 'replyGateBusy' : 'writerNotAllowed';
      sandboxModeRef.current.commitPinnedWriter({ source: payload.source, writerBlocked: true, blockedReason });
      return false;
    }

    setLastQuestionMessageId(payload.messageId);
    setLastQuestionMessageHasTag(payload.hasTagToActiveUser);
    setReplyPreviewSuppressedReason(null);
    setSandboxPinnedEntry((prev) => {
      if (!prev || prev.messageId !== payload.messageId) return prev;
      return {
        ...prev,
        linkedToReplyGate: true,
        pinnedSourceId: payload.messageId,
        pinnedSourceType: prev.sourceType
      };
    });
    sandboxModeRef.current.commitPromptPinnedRendered(payload.messageId);
    sandboxModeRef.current.commitPinnedWriter({ source: payload.source === 'autoPinFreeze' ? 'eventEngine' : payload.source, writerBlocked: false, blockedReason: '' });
    return true;
  }, [state.messages]);



  const setSandboxDebugAutoPinFreeze = useCallback((patch: Partial<{
    lastMessageId: string;
    lastReason: '-' | 'vip_direct_mention' | 'story_critical_hint_followup';
    freezeUntil: number;
    freezeMs: number;
    lastHintFollowUpEvent: string;
    lastEvaluation: {
      messageId: string;
      isVip: boolean;
      hasPlayerMention: boolean;
      directToPlayer: boolean;
      hitVipDirectMentionRule: boolean;
      hitStoryCriticalRule: boolean;
      shouldPin: boolean;
      failureReason: string;
      pinnedReason: string;
      freezeReason: string;
      highlightOnly: boolean;
    };
    lastDirectMentionDetected: { messageId: string; at: number; hasPlayerMention: boolean; isVipSpeaker: boolean; directToPlayer: boolean };
    lastPinnedCandidateMessageId: string;
    lastPinnedCreatedAt: number;
    lastPinnedDroppedReason: string;
    lastPinnedDroppedAt: number;
    lastPinnedRenderVisible: boolean;
    pinnedStateKey: string;
    pinnedStateSummary: string;
    pinnedSourceReason: string;
    pinnedExpiresAt: number;
    pinnedRemainingMs: number;
    pinnedComponentMounted: boolean;
    highlightWithoutPinned: boolean;
    cleanupClearedPinned: boolean;
    pinnedOverwrittenByMessageId: string;
    lastPinnedOverwriteAt: number;
    lastPinnedAutoClearAt: number;
    lastPinnedAutoClearReason: string;
  }>) => {
    const current = sandboxAutoPinFreezeRef.current;
    sandboxAutoPinFreezeRef.current = {
      ...current,
      ...patch,
      lastEvaluation: {
        ...current.lastEvaluation,
        ...(patch.lastEvaluation ?? {})
      },
      pinnedRemainingMs: typeof patch.pinnedExpiresAt === 'number'
        ? Math.max(0, patch.pinnedExpiresAt - Date.now())
        : (patch.pinnedRemainingMs ?? current.pinnedRemainingMs)
    };
  }, []);

  const triggerSandboxAutoPinFreeze = useCallback((payload: {
    messageId: string;
    reason: 'vip_direct_mention' | 'story_critical_hint_followup';
    freezeMs: number;
    hasTagToActiveUser: boolean;
    sourceMessage?: ChatMessage | null;
  }) => {
    const now = Date.now();
    const freezeMs = Math.max(5000, Math.min(8000, payload.freezeMs));
    const sourceMessage = payload.sourceMessage ?? state.messages.find((entry) => entry.id === payload.messageId) ?? null;
    const actor = sourceMessage?.username || SANDBOX_VIP.handle;
    const normalizedActor = normalizeHandle(actor);
    const text = resolveSandboxPinnedBody(sourceMessage);
    const nextPinned: SandboxPinnedEntry = {
      id: `sandbox-pin:${payload.messageId}`,
      messageId: payload.messageId,
      createdAt: now,
      expiresAt: now + freezeMs + 3000,
      visible: true,
      author: actor,
      body: text,
      sourceType: 'auto_pin_freeze',
      linkedToReplyGate: false,
      pinnedSourceId: payload.messageId,
      pinnedSourceType: 'auto_pin_freeze'
    };
    setSandboxPinnedEntry((prev) => {
      if (prev?.visible && prev.messageId !== payload.messageId) {
        setSandboxDebugAutoPinFreeze({
          pinnedOverwrittenByMessageId: payload.messageId,
          lastPinnedOverwriteAt: now
        });
      }
      return nextPinned;
    });
    lockStateRef.current = normalizedActor
      ? {
          isLocked: true,
          target: normalizedActor,
          startedAt: now,
          replyingToMessageId: payload.messageId
        }
      : {
          isLocked: false,
          target: null,
          startedAt: 0,
          replyingToMessageId: payload.messageId
        };
    const pinnedOk = setPinnedQuestionMessage({
      source: 'autoPinFreeze',
      messageId: payload.messageId,
      hasTagToActiveUser: payload.hasTagToActiveUser,
      sourceMessage
    });
    if (!pinnedOk) {
      setReplyPreviewSuppressedReason('sandbox_auto_pin_writer_guard');
      setSandboxDebugAutoPinFreeze({
        lastPinnedDroppedReason: 'writer_guard_blocked',
        lastPinnedDroppedAt: now,
        highlightWithoutPinned: true
      });
      return false;
    }
    const freezeReason = payload.reason === 'vip_direct_mention' ? 'vip_direct_mention' : 'story_critical_hint_followup';
    setChatFreeze({ isFrozen: true, reason: freezeReason, startedAt: now });
    setPauseSetAt(now);
    setPauseReason(freezeReason);
    setScrollMode('FROZEN', freezeReason);
    setChatAutoPaused(true);
    setChatFreezeCountdownRemaining(0);
    setChatFreezeCountdownStartedAt(now);
    setSandboxDebugAutoPinFreeze({
      lastMessageId: payload.messageId,
      lastReason: payload.reason,
      freezeUntil: now + freezeMs,
      freezeMs,
      lastEvaluation: {
        messageId: payload.messageId,
        isVip: true,
        hasPlayerMention: payload.hasTagToActiveUser,
        directToPlayer: payload.reason === 'vip_direct_mention',
        hitVipDirectMentionRule: payload.reason === 'vip_direct_mention',
        hitStoryCriticalRule: payload.reason === 'story_critical_hint_followup',
        shouldPin: true,
        failureReason: '-',
        pinnedReason: payload.reason,
        freezeReason,
        highlightOnly: false
      },
      lastPinnedCandidateMessageId: payload.messageId,
      lastPinnedCreatedAt: now,
      pinnedSourceReason: payload.reason,
      pinnedStateKey: 'sandboxPinnedEntry',
      pinnedStateSummary: `${nextPinned.id}:${payload.reason}`,
      pinnedExpiresAt: nextPinned.expiresAt,
      pinnedComponentMounted: sandboxPinnedMounted,
      highlightWithoutPinned: false,
      cleanupClearedPinned: false
    });
    window.setTimeout(() => {
      if (modeRef.current.id !== 'sandbox_story') return;
      const current = sandboxAutoPinFreezeRef.current;
      if (current.lastMessageId !== payload.messageId) return;
      if (Date.now() < current.freezeUntil) return;
      if (qnaStateRef.current.active.status === 'AWAITING_REPLY' && Boolean(qnaStateRef.current.active.questionMessageId)) return;
      clearReplyUi(`sandbox_auto_pin_timeout:${payload.reason}`);
      clearChatFreeze(`sandbox_auto_pin_timeout:${payload.reason}`);
      setChatAutoPaused(false);
      setSandboxPinnedEntry((prev) => {
        if (!prev || prev.messageId !== payload.messageId) return prev;
        setSandboxDebugAutoPinFreeze({
          lastPinnedAutoClearAt: Date.now(),
          lastPinnedAutoClearReason: `timeout:${payload.reason}`,
          cleanupClearedPinned: true
        });
        return null;
      });
    }, freezeMs + 120);
    window.setTimeout(() => {
      setSandboxPinnedEntry((prev) => {
        if (!prev || prev.messageId !== payload.messageId) return prev;
        if (Date.now() < prev.expiresAt) return prev;
        setSandboxDebugAutoPinFreeze({
          lastPinnedAutoClearAt: Date.now(),
          lastPinnedAutoClearReason: `expiresAt:${payload.reason}`,
          cleanupClearedPinned: true
        });
        return null;
      });
    }, freezeMs + 3200);
    return true;
  }, [activeUserInitialHandleRef, clearChatFreeze, clearReplyUi, sandboxPinnedMounted, setPinnedQuestionMessage, setSandboxDebugAutoPinFreeze, setScrollMode, state.messages]);

  const rollbackEventCooldown = useCallback((eventKey: StoryEventKey) => {
    eventCooldownsRef.current[eventKey] = 0;
    const current = eventCooldownMetaRef.current[eventKey];
    eventCooldownMetaRef.current[eventKey] = {
      nextAllowedAt: 0,
      lastCommittedAt: current?.lastCommittedAt ?? 0,
      lastRollbackAt: Date.now()
    };
  }, []);

  const commitEventCooldown = useCallback((eventKey: StoryEventKey, cooldownMs: number) => {
    const committedAt = Date.now();
    const nextAllowedAt = committedAt + cooldownMs;
    eventCooldownsRef.current[eventKey] = nextAllowedAt;
    const current = eventCooldownMetaRef.current[eventKey];
    eventCooldownMetaRef.current[eventKey] = {
      nextAllowedAt,
      lastCommittedAt: committedAt,
      lastRollbackAt: current?.lastRollbackAt ?? 0
    };
  }, []);

  const recoverFromStuckEventState = useCallback((reason: string) => {
    clearChatFreeze(reason);
    setChatAutoPaused(false);
    qnaStateRef.current = createInitialQnaState();
    clearEventRunnerState();
    eventQueueRef.current = [];
    eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
    lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
    pendingReplyEventRef.current = null;
    resetQnaUiState();
    sandboxModeRef.current.setSandboxFlow({ replyGateActive: false, replyTarget: null });
    (['ghost_female', 'footsteps', 'low_rumble'] as const).forEach((key) => {
      cooldownsRef.current[key] = 0;
    });
    EVENT_REGISTRY_KEYS.forEach((eventKey) => {
      rollbackEventCooldown(eventKey);
      clearEventAudioPlayingTimeout(eventKey);
      updateEventAudioState(eventKey, {
        state: 'idle',
        cooldownUntil: 0,
        playingSince: null,
        lastResult: 'SKIPPED',
        lastReason: `manual_unlock:${reason}`
      });
    });
    const prevCount = Number((window.__CHAT_DEBUG__ as { debugReset?: { count?: number } } | undefined)?.debugReset?.count ?? 0);
    window.__CHAT_DEBUG__ = {
      ...(window.__CHAT_DEBUG__ ?? {}),
      debugReset: {
        count: prevCount + 1,
        reason,
        resetAt: Date.now()
      }
    };
  }, [clearChatFreeze, clearEventAudioPlayingTimeout, clearEventRunnerState, resetQnaUiState, rollbackEventCooldown, updateEventAudioState]);


  const nextAnimationFrame = useCallback(() => new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  }), []);

  const waitForMessageRendered = useCallback(async (messageId: string) => {
    const deadline = Date.now() + 500;
    while (Date.now() <= deadline) {
      const found = Boolean(document.querySelector(`[data-message-id="${messageId}"]`));
      if (found) {
        questionRenderedRef.current = true;
        setQnaQuestionMessageIdRendered(true);
        return true;
      }
      await nextAnimationFrame();
    }
    questionRenderedRef.current = false;
    setQnaQuestionMessageIdRendered(false);
    return false;
  }, [nextAnimationFrame]);

  const scrollThenPauseForTaggedQuestion = useCallback(async ({ questionMessageId }: { questionMessageId: string }) => {
    const questionMessage = sortedMessages.find((entry) => entry.id === questionMessageId);
    const hasRealTag = Boolean(
      qnaStateRef.current.active.status === 'AWAITING_REPLY'
      && questionMessage
      && Boolean(questionMessage.mentions?.includes('activeUser'))
    );
    const replyUIReady = Boolean(qnaStateRef.current.active.status === 'AWAITING_REPLY' && questionMessageId);
    const freezeAllowed = hasRealTag && replyUIReady;

    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        freezeGuard: { hasRealTag, replyUIReady, freezeAllowed, checkedAt: Date.now() }
      }
    });

    if (!freezeAllowed) {
      if (chatFreeze.isFrozen || chatAutoScrollMode !== 'FOLLOW') clearChatFreeze('tagged_question_guard_rejected');
      setChatAutoPaused(false);
      return;
    }

    await waitForMessageRendered(questionMessageId);
    await nextAnimationFrame();
    await nextAnimationFrame();
    setScrollMode('FOLLOW', 'tagged_question_force_scroll_pre_pause');
    setChatFreeze({ isFrozen: false, reason: null, startedAt: null });
    await nextAnimationFrame();
    setPendingForceScrollReason('tagged_question_before_pause');
    await nextAnimationFrame();
    setPendingForceScrollReason('tagged_question_double_tap');
    const startedAt = Date.now();
    setChatFreeze({ isFrozen: true, reason: 'tagged_question', startedAt });
    setPauseReason('tag_wait_reply');
    setPauseSetAt(startedAt);
    if (debugEnabled) console.debug('[PAUSE] set reason=tag_wait_reply');
    setScrollMode('FROZEN', 'tagged_question');
    setChatAutoPaused(true);
    setChatFreezeCountdownRemaining(0);
    setChatFreezeCountdownStartedAt(startedAt);
    setChatLastMessageActorIdCounted(null);
    setChatLastCountdownDecrementAt(startedAt);
  }, [activeUserInitialHandleRef, chatAutoScrollMode, chatFreeze.isFrozen, clearChatFreeze, nextAnimationFrame, setScrollMode, sortedMessages, updateEventDebug, waitForMessageRendered]);

  useEffect(() => {
    const awaiting = qnaStateRef.current.active.status === 'AWAITING_REPLY';
    if (!awaiting) {
      questionRenderedRef.current = false;
      setQnaQuestionMessageIdRendered(false);
      replyPinMountedRef.current = false;
      setReplyPinMounted(false);
      setPendingForceScrollReason(null);
    }
  }, [state.messages.length]);

  useEffect(() => {
    if (qnaStateRef.current.active.status !== 'AWAITING_REPLY') return;
    const questionMessageId = qnaStateRef.current.active.questionMessageId;
    const questionMessage = questionMessageId ? state.messages.find((entry) => entry.id === questionMessageId) : null;
    const hasQuestionSource = Boolean(questionMessageId && questionMessage);
    const lockConsistent = Boolean(
      !lockStateRef.current.isLocked
      || !lockStateRef.current.target
      || !questionMessage
      || lockStateRef.current.target === questionMessage.username
    );

    if (hasQuestionSource && lockConsistent) return;

    clearReplyUi('qna_awaiting_reply_missing_or_inconsistent_source');
    if (chatFreeze.isFrozen || chatAutoScrollMode !== 'FOLLOW') {
      clearChatFreeze('qna_awaiting_reply_missing_or_inconsistent_source');
    }
    setChatAutoPaused(false);
    markQnaAborted(qnaStateRef.current, hasQuestionSource ? 'source_inconsistent' : 'source_missing', Date.now());
  }, [chatAutoScrollMode, chatFreeze.isFrozen, clearChatFreeze, clearReplyUi, state.messages]);

  useEffect(() => {
    if (!chatFreeze.isFrozen) return;
    if (chatFreezeCountdownRemaining > 0) return;
    clearChatFreeze('freeze_watchdog_countdown_zero');
    setChatAutoPaused(false);
  }, [chatFreeze.isFrozen, chatFreezeCountdownRemaining, clearChatFreeze]);

  const playSfx = useCallback((
    key: 'ghost_female' | 'footsteps' | 'low_rumble' | 'fan_loop',
    options: { reason: string; source: 'event' | 'system' | 'unknown'; delayMs?: number; startVolume?: number; endVolume?: number; rampSec?: number; eventId?: string; eventKey?: StoryEventKey; allowBeforeStarterTag?: boolean }
  ) => {
    if (chatAutoPaused && key !== 'fan_loop') return false;
    if (chatFreeze.isFrozen && key !== 'fan_loop') {
      ghostBlockedByFreezeRef.current += 1;
      return false;
    }
    const now = Date.now();
    const cooldownMin = key === 'ghost_female' ? 180_000 : key === 'footsteps' || key === 'low_rumble' ? 120_000 : 0;
    if (key !== 'fan_loop') {
      const cooldownUntil = cooldownsRef.current[key] ?? 0;
      if (cooldownUntil > now) return false;
      cooldownsRef.current[key] = now + cooldownMin;
    }
    if (!options.allowBeforeStarterTag && (key === 'ghost_female' || key === 'footsteps') && eventLifecycleRef.current?.starterTagSent !== true) {
      return false;
    }
    requestSceneAction({
      type: 'REQUEST_SFX',
      sfxKey: key === 'low_rumble' ? 'footsteps' : key,
      reason: options.reason,
      source: options.source,
      delayMs: options.delayMs,
      startVolume: options.startVolume,
      endVolume: options.endVolume,
      rampSec: options.rampSec
    });
    if (key === 'ghost_female' || key === 'footsteps') {
      const cooldownUntil = cooldownsRef.current[key] ?? 0;
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        audio: {
          ...(window.__CHAT_DEBUG__ as { audio?: Record<string, unknown> } | undefined)?.audio,
          lastApproach: {
            key,
            startedAt: now,
            durationMs: Math.max(1200, Math.floor((options.rampSec ?? 3) * 1000)),
            startGain: options.startVolume ?? 0.12,
            endGain: Math.min(0.9, options.endVolume ?? 0.72),
            startLPF: 360,
            endLPF: 7000
          }
        },
        event: {
          ...(window.__CHAT_DEBUG__?.event ?? {}),
          cooldowns: { ...cooldownsRef.current, [key]: cooldownUntil }
        }
      };
    }
    return true;
  }, [chatAutoPaused, chatFreeze.isFrozen]);

  const startEvent = useCallback((eventKey: StoryEventKey, ctx: { source: 'user_input' | 'scheduler_tick' | 'debug_tester' | 'debug_force'; ignoreCooldowns?: boolean; forceOptions?: DebugForceExecuteOptions }) => {
    const now = Date.now();
    const chatActors = separateChatActorState(sortedMessages, activeUserInitialHandleRef.current || '');
    const activeUsers = chatActors.audienceUsers;
    const sourceReason = ctx.source === 'scheduler_tick' ? 'SCHEDULER_TICK' : ctx.source === 'debug_tester' ? 'DEBUG_TESTER' : ctx.source === 'debug_force' ? 'DEBUG_FORCE' : 'TIMER_TICK';
    const shouldIgnoreCooldown = Boolean(debugEnabled && ctx.source === 'debug_tester' && ctx.ignoreCooldowns);
    const forceOptions: DebugForceExecuteOptions = ctx.source === 'debug_force' ? {
      ignoreCooldown: Boolean(ctx.forceOptions?.ignoreCooldown),
      ignorePause: Boolean(ctx.forceOptions?.ignorePause),
      skipTagRequirement: Boolean(ctx.forceOptions?.skipTagRequirement)
    } : {};
    const forcedByDebug = ctx.source === 'debug_force';
    const eventDef = EVENT_REGISTRY[eventKey];
    const effects = EVENT_EFFECTS[eventKey];
    const vipUsers = new Set(state.messages.filter((message) => Boolean(message.isVip)).map((message) => message.username));
    const eligibleActiveUsers = activeUsers.filter((name) => name && !vipUsers.has(name));
    const activeUserForTag = chatActors.activeUser;
    let questionActor = pickQuestionActor(eligibleActiveUsers, 'mod_live');
    if (questionActor === activeUserForTag) {
      const actorPool = eligibleActiveUsers.filter((name) => name !== activeUserForTag);
      questionActor = pickOne(actorPool.length > 0 ? actorPool : ['mod_live']);
    }

    let blockedReason: EventStartBlockedReason | null = null;
    const lockElapsedMs = lockStateRef.current.isLocked && lockStateRef.current.startedAt > 0 ? now - lockStateRef.current.startedAt : 0;
    const exclusiveTimeoutReached = lockElapsedMs >= EVENT_EXCLUSIVE_TIMEOUT_MS;
    if (eventExclusiveStateRef.current.exclusive && exclusiveTimeoutReached) {
      lastBlockedReasonRef.current = 'event_abandoned_timeout';
      if (qnaStateRef.current.isActive) {
        qnaStateRef.current.history = [...qnaStateRef.current.history, `abandoned:timeout:${now}`].slice(-40);
        stopQnaFlow(qnaStateRef.current, 'timeout_abandon');
      }
      eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
      lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
    sandboxModeRef.current.setSandboxFlow({ replyGateActive: false, replyTarget: null });
      pendingReplyEventRef.current = null;
    }

    if (!eventDef || !effects) blockedReason = 'registry_missing';
    else if (!appStarted) blockedReason = 'invalid_state';
    else if (!bootstrapRef.current.isReady) blockedReason = 'bootstrap_not_ready';
    else if (ctx.source === 'scheduler_tick' && chatAutoPaused) blockedReason = 'chat_auto_paused';
    else if (eventRunnerStateRef.current.inFlight) blockedReason = 'in_flight';
    else if (eventExclusiveStateRef.current.exclusive && !exclusiveTimeoutReached) blockedReason = 'event_exclusive_active';
    else if (activeUsers.length < 3) blockedReason = 'active_users_lt_3';
    else if (!activeUserForTag) blockedReason = eligibleActiveUsers.length === 0 ? 'vip_target' : 'no_active_user';
    else if (lockStateRef.current.isLocked && lockStateRef.current.target && lockStateRef.current.target !== activeUserForTag) blockedReason = 'locked_active';
    else {
      const stateGate = canTriggerByEventAudioState(eventKey, forcedByDebug);
      if (!stateGate.ok) {
        updateEventAudioState(eventKey, { lastResult: 'SKIPPED', lastReason: stateGate.reason ?? 'blocked' }, 'EVENT_SKIPPED');
        blockedReason = stateGate.reason === 'cd' ? 'cooldown_blocked' : 'event_exclusive_active';
      } else if (!forcedByDebug && !shouldIgnoreCooldown && (eventCooldownsRef.current[eventKey] ?? 0) > now) blockedReason = 'cooldown_blocked';
    }

    setEventAttemptDebug(eventKey, blockedReason);
    if (blockedReason) {
      lastBlockedReasonRef.current = blockedReason;
      eventLastReasonRef.current = sourceReason;
      eventLastKeyRef.current = eventKey;
      eventLastAtRef.current = now;
      updateEventDebug({ event: { ...(window.__CHAT_DEBUG__?.event ?? {}), lastStartAttemptBlockedReason: blockedReason } });
      return null;
    }

    const eventId = `${eventKey}_${Date.now()}`;
    eventRunnerStateRef.current.inFlight = true;
    eventRunnerStateRef.current.currentEventId = eventId;
    markEventAudioPlaying(eventKey);
    const opener = pickDialog(eventKey, 'opener', activeUserForTag, eventRecentContentIdsRef.current[eventKey]);
    let txn: EventTxn = {
      eventKey,
      actorId: questionActor,
      taggedUserId: activeUserForTag,
      questionMessageId: null,
      starterTagSent: false,
      status: 'PREPARED',
      abortReason: null,
      committedAt: null
      ,
      meta: forcedByDebug ? {
        forcedByDebug: true,
        ignoreCooldown: forceOptions.ignoreCooldown,
        ignorePause: forceOptions.ignorePause,
        skipTagRequirement: forceOptions.skipTagRequirement
      } : undefined
    };
    const hasStarterTag = opener.text.startsWith(`@${activeUserForTag}`);

    if (!forcedByDebug || !forceOptions.ignorePause) {
      if (chatAutoPaused || chatFreeze.isFrozen) txn = { ...txn, status: 'ABORTED', abortReason: 'paused' };
    }
    if (txn.status !== 'ABORTED' && (!forcedByDebug || !forceOptions.ignoreCooldown) && (eventCooldownsRef.current[eventKey] ?? 0) > now) {
      txn = { ...txn, status: 'ABORTED', abortReason: 'cooldown' };
    }
    if (txn.status !== 'ABORTED' && (!forcedByDebug || !forceOptions.skipTagRequirement) && !hasStarterTag) {
      txn = { ...txn, status: 'ABORTED', abortReason: 'no_tag' };
    }

    if (txn.status !== 'ABORTED') {
      const sendResult = dispatchEventLine(opener.text, questionActor, ctx.source);
      if (!sendResult.ok || !sendResult.lineId) {
        txn = { ...txn, status: 'ABORTED', abortReason: 'question_send_failed' };
      } else {
        txn = { ...txn, questionMessageId: sendResult.lineId, starterTagSent: true, status: 'PREPARED' };
      }
    }

    const commitBlocked = (reason: EventCommitBlockedReason) => {
      txn = { ...txn, status: 'ABORTED', abortReason: reason };
      updateEventDebug({
        event: {
          ...(window.__CHAT_DEBUG__?.event ?? {}),
          lastEventCommitBlockedReason: reason,
          lastCommitBlockedReason: reason,
          lastEvent: {
            ...(window.__CHAT_DEBUG__?.event?.lastEvent ?? {}),
            key: eventKey,
            state: 'aborted',
            starterTagSent: txn.starterTagSent,
            questionMessageId: txn.questionMessageId,
            commitBlockedReason: reason
          }
        }
      });
      if (debugEnabled) console.log('[EVENT] commit blocked reason=' + reason, { eventKey, eventId });
    };

    const handleAbortCleanup = (reason: EventCommitBlockedReason) => {
      eventRunnerStateRef.current.inFlight = false;
      eventRunnerStateRef.current.currentEventId = null;
      transitionEventAudioToCooldown(eventKey, reason === 'audio_locked' ? 'audio_locked' : 'play_failed');
      if (reason === 'question_send_failed' && !txn.starterTagSent) {
        recoverFromStuckEventState('question_send_failed_recover');
        rollbackEventCooldown(eventKey);
      }
    };

    if (txn.status === 'ABORTED') commitBlocked(txn.abortReason ?? 'unknown');
    else if ((!forcedByDebug || !forceOptions.ignorePause) && (chatAutoPaused || chatFreeze.isFrozen)) commitBlocked('paused');
    else if ((!forcedByDebug || !forceOptions.ignoreCooldown) && (eventCooldownsRef.current[eventKey] ?? 0) > now) commitBlocked('cooldown');
    else if ((!forcedByDebug || !forceOptions.skipTagRequirement) && !txn.starterTagSent) commitBlocked('no_tag');
    else if (!soundUnlocked.current) commitBlocked('audio_locked');
    else if (requiredAssetErrors.length > 0) commitBlocked('assets_missing');
    else if (effects.video && !VIDEO_PATH_BY_KEY[`oldhouse_room_${effects.video}` as keyof typeof VIDEO_PATH_BY_KEY]) commitBlocked('video_src_empty');
    else if (effects.video && effects.video === 'loop4' && !VIDEO_PATH_BY_KEY.oldhouse_room_loop4) commitBlocked('video_not_ready');
    else {
      txn = { ...txn, status: 'COMMITTED', committedAt: Date.now() };
      commitEventCooldown(eventKey, eventDef.cooldownMs);
      if (debugEnabled) {
        if (forcedByDebug) console.log('[DEBUG FORCE] eventKey=' + eventKey, { eventId, txn });
        console.log('[EVENT] commit ok key=' + eventKey, { eventId, txn });
      }
    }

    if (txn.status === 'ABORTED') {
      handleAbortCleanup(txn.abortReason ?? 'unknown');
      const record: EventRunRecord = {
        eventId,
        key: eventKey,
        state: 'aborted',
        at: Date.now(),
        starterTagSent: txn.starterTagSent,
        abortedReason: txn.abortReason ?? 'unknown',
        lineIds: [opener.id],
        openerLineId: opener.id
      };
      eventLifecycleRef.current = record;
      return null;
    }

    const sfxPlayed: Array<{ key: string; startedAt: number }> = [];
    const effectsPlan = { sfx: [...(effects.sfx ?? [])], videoKey: effects.video ?? undefined, blackout: Boolean(effects.blackout) };
    const effectsErrors: string[] = [];
    for (const sfxKey of effects.sfx) {
      const startedAt = Date.now();
      const played = playSfx(sfxKey, { reason: `event:effect:${eventId}`, source: 'event', eventId, eventKey, allowBeforeStarterTag: true });
      if (played) {
        sfxPlayed.push({ key: sfxKey, startedAt });
        if (debugEnabled) console.log('[EFFECT] sfx start key=' + sfxKey, { eventKey, eventId });
      } else {
        effectsErrors.push(`sfx_blocked:${sfxKey}`);
      }
    }

    let videoSwitchedTo: { key: string; src: string } | null = null;
    if (effects.video) {
      const src = effects.video === 'loop4' ? VIDEO_PATH_BY_KEY.oldhouse_room_loop4 : effects.video === 'loop2' ? VIDEO_PATH_BY_KEY.oldhouse_room_loop2 : VIDEO_PATH_BY_KEY.oldhouse_room_loop3;
      requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: effects.video, reason: `event:effect:${eventId}`, sourceEventKey: eventKey });
      videoSwitchedTo = { key: effects.video, src };
      if (debugEnabled) console.log('[EFFECT] video switch key=' + effects.video + ' src=' + src, { eventKey, eventId });
    }

    if (effects.blackout) {
      if (debugEnabled) console.log('[EFFECT] blackout scheduled delay=1000ms', { eventKey, eventId });
      scheduleBlackoutFlicker({ delayMs: 1000, durationMs: 12000, pulseAtMs: 4000, pulseDurationMs: 180 });
    }

    eventRecentContentIdsRef.current[eventKey] = [...eventRecentContentIdsRef.current[eventKey], opener.id].slice(-5);
    lockStateRef.current = { isLocked: true, target: questionActor, startedAt: Date.now(), replyingToMessageId: txn.questionMessageId };
    eventExclusiveStateRef.current = { exclusive: true, currentEventId: eventId, currentLockOwner: questionActor };
    const record: EventRunRecord = {
      eventId,
      key: eventKey,
      state: 'active',
      at: Date.now(),
      starterTagSent: txn.starterTagSent,
      openerLineId: opener.id,
      lineIds: [opener.id],
      preEffectTriggered: true,
      preEffectAt: txn.committedAt ?? Date.now(),
      preEffect: { sfxKey: (effects.sfx[0] as 'ghost_female' | 'footsteps' | 'fan_loop' | undefined), videoKey: undefined }
    };
    eventLifecycleRef.current = record;

    eventRunnerStateRef.current.inFlight = false;
    eventRunnerStateRef.current.currentEventId = null;

    const qnaFlowId = eventDef?.qnaFlowId ?? QNA_FLOW_BY_EVENT[eventKey];
    if (qnaFlowId && activeUserForTag) {
      startQnaFlow(qnaStateRef.current, { eventKey, flowId: qnaFlowId, taggedUser: activeUserForTag, questionActor });
      qnaTxnTraceRef.current = {
        txId: qnaStateRef.current.active.id,
        lastCheckpoint: 'qna_started',
        checkpointAt: Date.now(),
        abortReason: null
      };
      syncQnaTxnDebug();
    }

    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        lastEventCommitBlockedReason: '-',
        lastCommitBlockedReason: '-',
        lastEvent: {
          key: eventKey,
          eventId,
          at: Date.now(),
          state: 'active',
          starterTagSent: txn.starterTagSent,
          questionMessageId: txn.questionMessageId,
          commitBlockedReason: '-',
          preEffectTriggered: true,
          preEffectAt: txn.committedAt ?? undefined,
          preEffect: { sfxKey: effects.sfx[0] === 'ghost_female' || effects.sfx[0] === 'footsteps' ? effects.sfx[0] : undefined, videoKey: effects.video === 'loop4' ? 'oldhouse_room_loop4' : effects.video === 'loop2' ? 'oldhouse_room_loop2' : undefined },
          effects: {
            plan: effectsPlan,
            applied: {
              sfxPlayed: sfxPlayed.map((item) => item.key),
              videoSwitched: videoSwitchedTo?.key,
              errors: effectsErrors
            }
          },
          qnaTxId: qnaStateRef.current.active.id || '-',
          forcedByDebug,
          forceOptions: forcedByDebug ? forceOptions : null
        },
        lastEffects: {
          sfxPlayed,
          videoSwitchedTo,
          blackoutStartedAt: effects.blackout ? Date.now() + 1000 : null,
          mode: effects.blackout ? 'flicker' : '-'
        }
      }
    });

    if (txn.questionMessageId && txn.starterTagSent && !(forcedByDebug && forceOptions.ignorePause)) {
      void scrollThenPauseForTaggedQuestion({ questionMessageId: txn.questionMessageId });
    }

    return { eventId: record.eventId, target: questionActor };
  }, [appStarted, canTriggerByEventAudioState, chatAutoPaused, chatFreeze.isFrozen, commitEventCooldown, debugEnabled, dispatchEventLine, markEventAudioPlaying, playSfx, recoverFromStuckEventState, requiredAssetErrors.length, rollbackEventCooldown, scheduleBlackoutFlicker, scrollThenPauseForTaggedQuestion, setEventAttemptDebug, sortedMessages, state.messages, transitionEventAudioToCooldown, updateEventAudioState, updateEventDebug]);

  const postFollowUpLine = useCallback((target: string, eventKey: StoryEventKey, phase: Exclude<EventLinePhase, 'opener'> = 'followUp') => {
    const built = buildEventLine(eventKey, phase, target);
    const sent = dispatchEventLine(built.line, target, 'scheduler_tick');
    if (!sent.ok) return false;
    if (!eventLifecycleRef.current) return true;
    eventLifecycleRef.current.followUpLineId = built.lineId;
    eventLifecycleRef.current.lineIds = [...eventLifecycleRef.current.lineIds, built.lineId];
    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        lastEvent: {
          ...(window.__CHAT_DEBUG__?.event?.lastEvent ?? {}),
          followUpLineId: built.lineId,
          lineIds: eventLifecycleRef.current.lineIds
        }
      }
    });
    return true;
  }, [buildEventLine, dispatchEventLine, updateEventDebug]);

  const sendQnaQuestion = useCallback(async () => {
    if (modeRef.current.id === 'sandbox_story') {
      return false;
    }
    if (!bootstrapRef.current.isReady) {
      setLastBlockedReason('bootstrap_not_ready');
      return false;
    }
    if (qnaStateRef.current.active.status === 'AWAITING_REPLY') {
      markQnaAborted(qnaStateRef.current, 'retry', Date.now());
      checkpointQnaTxn('aborted', 'retry');
      return false;
    }
    const asked = askCurrentQuestion(qnaStateRef.current);
    if (!asked) return false;
    const taggedUser = normalizeHandle(activeUserInitialHandleRef.current || '');
    if (!taggedUser) {
      qnaStateRef.current.history = [...qnaStateRef.current.history, `blocked:no_tagged_user:${Date.now()}`].slice(-40);
      setLastBlockedReason('no_tagged_user');
      return false;
    }
    if (!usersByHandleRef.current.has(toHandleKey(taggedUser))) {
      qnaStateRef.current.history = [...qnaStateRef.current.history, `blocked:active_user_not_registered:${Date.now()}`].slice(-40);
      setLastBlockedReason('active_user_not_registered');
      return false;
    }
    qnaStateRef.current.taggedUser = taggedUser;
    qnaStateRef.current.active.taggedUserHandle = taggedUser;
    qnaStateRef.current.active.taggedUserId = activeUserProfileRef.current?.id ?? taggedUser;

    const eventActiveUsers = separateChatActorState(sortedMessages, activeUserInitialHandleRef.current || '').audienceUsers;
    let questionActor = qnaStateRef.current.lockTarget || eventExclusiveStateRef.current.currentLockOwner;
    if (!questionActor || questionActor === taggedUser) {
      const actorPool = eventActiveUsers.filter((name) => name !== taggedUser);
      questionActor = pickOne(actorPool.length > 0 ? actorPool : ['mod_live']);
      setQnaQuestionActor(qnaStateRef.current, questionActor);
    }

    const optionLabels = asked.options.map((option) => option.label).join(' / ');
    const line = `@${taggedUser} ${asked.text}（選項：${optionLabels}）`;
    const messageId = crypto.randomUUID();
    let appendFailedReason: string | null = null;
    const tagMessage: ChatMessage = {
      id: messageId,
      username: questionActor,
      type: 'chat',
      text: line,
      language: 'zh',
      translation: line,
      tagTarget: questionActor
    };

    const tagFlowResult = await runTagStartFlow({
      tagMessage,
      pinnedText: line,
      shouldFreeze: true,
      appendMessage: (message) => {
        const sent = dispatchChatMessage(message, { source: 'qna_question', sourceTag: 'tag_start_flow' });
        if (!sent.ok) {
          appendFailedReason = sent.blockedReason;
          return sent;
        }
        checkpointQnaTxn('question_append_ok');
        return { ok: true as const, messageId: sent.messageId };
      },
      forceScrollToBottom: async ({ reason }) => {
        setScrollMode('FOLLOW', `tag_start_${reason}`);
        setChatFreeze({ isFrozen: false, reason: null, startedAt: null });
        setPendingForceScrollReason(reason);
        await nextAnimationFrame();
        setPendingForceScrollReason(`${reason}:timeout0`);
      },
      setPinnedReply: ({ visible, text, messageId: resolvedMessageId }) => {
        if (!visible) return;
        const now = Date.now();
        markQnaQuestionCommitted(qnaStateRef.current, { messageId: resolvedMessageId, askedAt: now });
        checkpointQnaTxn('question_committed');
        lockStateRef.current = { isLocked: true, target: questionActor, startedAt: now, replyingToMessageId: resolvedMessageId };
        eventExclusiveStateRef.current.currentLockOwner = questionActor;
        const pinnedOk = setPinnedQuestionMessage({
          source: 'qnaEngine',
          messageId: resolvedMessageId,
          hasTagToActiveUser: true
        });
        if (!pinnedOk) {
          setReplyPreviewSuppressedReason('sandbox_pinned_writer_guard');
        }
        if (debugEnabled) console.debug(`[PIN] set visible text="${text.slice(0, 60)}"`);
      },
      freezeChat: ({ reason }) => {
        const startedAt = Date.now();
        setChatFreeze({ isFrozen: true, reason: 'tagged_question', startedAt });
        setPauseSetAt(startedAt);
        setPauseReason(reason);
        setScrollMode('FROZEN', reason);
        setChatAutoPaused(true);
      }
    });

    if (!tagFlowResult.ok) {
      appendFailedReason = tagFlowResult.blockedReason;
    }

    if (appendFailedReason) {
      markQnaAborted(qnaStateRef.current, appendFailedReason ?? 'qna_question_send_failed', Date.now());
      checkpointQnaTxn('aborted', appendFailedReason ?? 'qna_question_send_failed');
      setLastBlockedReason(appendFailedReason ?? 'qna_question_send_failed');
      return false;
    }

    setLastBlockedReason(null);
    updateLastAskedPreview(qnaStateRef.current, line);
    qnaStateRef.current.history = [...qnaStateRef.current.history, `ask:${qnaStateRef.current.stepId}:${Date.now()}`].slice(-40);
    return true;
  }, [checkpointQnaTxn, debugEnabled, dispatchChatMessage, nextAnimationFrame, setScrollMode, sortedMessages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (!shouldAbortStalledAsking(qnaStateRef.current, now)) return;
      const active = qnaStateRef.current.active;
      const anchorAskedAt = active.askedAt ?? qnaStateRef.current.lastAskedAt;
      const elapsed = anchorAskedAt > 0 ? now - anchorAskedAt : 0;
      markQnaAborted(qnaStateRef.current, 'handoff_timeout', now);
      checkpointQnaTxn('aborted', 'handoff_timeout');
      if (debugEnabled) {
        console.warn('[QNA] handoff timeout aborted', { txId: active.id, elapsed });
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [checkpointQnaTxn, debugEnabled]);

  const tryTriggerStoryEvent = useCallback((raw: string, source: 'user_input' | 'scheduler_tick' = 'user_input') => {
    const now = Date.now();
    const audienceUsers = separateChatActorState(state.messages, activeUserInitialHandleRef.current || '').audienceUsers;
    const target = audienceUsers.length > 0 ? pickOne(audienceUsers) : null;
    const pending = pendingReplyEventRef.current;
    const isLocked = lockStateRef.current.isLocked && Boolean(lockStateRef.current.target);
    const canSandboxGhostMotion = () => {
      if (modeRef.current.id !== 'sandbox_story') return { allowed: true, reason: 'classic_mode' };
      return sandboxModeRef.current.canTriggerGhostMotion({ qnaType: 'consonant', answerResult: 'correct' });
    };

    if (!appStarted) return;

    if (source === 'user_input' && isQnaAwaitingReplyGateOpen(qnaStateRef.current)) {
      if (modeRef.current.id === 'sandbox_story') {
        return;
      }
      const lockTarget = qnaStateRef.current.lockTarget;
      if (lockTarget && lockStateRef.current.target !== lockTarget) {
        lockStateRef.current = { isLocked: true, target: lockTarget, startedAt: Date.now(), replyingToMessageId: lockStateRef.current.replyingToMessageId };
      }
      const stripped = raw.replace(/^\s*@[^\s]+\s*/u, '').trim();
      const parsed = parsePlayerReplyToOption(qnaStateRef.current, stripped);
      if (!parsed) {
        const prompt = getRetryPrompt(qnaStateRef.current);
        const taggedUser = qnaStateRef.current.taggedUser || activeUserInitialHandleRef.current;
        if (taggedUser) {
          dispatchEventLine(`@${taggedUser} ${prompt}`, lockTarget ?? 'mod_live', 'user_input', 'qna_question');
        }
        void sendQnaQuestion();
        return;
      }
      qnaStateRef.current.matched = { optionId: parsed.optionId, keyword: parsed.matchedKeyword, at: Date.now() };
      const option = getOptionById(qnaStateRef.current, parsed.optionId);
      if (!option) return;
      const result = applyOptionResult(qnaStateRef.current, option);
      if (result.type === 'retry' && parsed.optionId === 'UNKNOWN') {
        const prompt = getUnknownPrompt(qnaStateRef.current);
        const taggedUser = qnaStateRef.current.taggedUser || activeUserInitialHandleRef.current;
        if (taggedUser) {
          dispatchEventLine(`@${taggedUser} ${prompt}`, lockTarget ?? 'mod_live', 'user_input', 'qna_question');
        }
        void sendQnaQuestion();
        return;
      }
      if (result.type === 'next') {
        void sendQnaQuestion();
        return;
      }
      if (result.type === 'chain' && qnaStateRef.current.pendingChain) {
        eventQueueRef.current = [...eventQueueRef.current, { key: qnaStateRef.current.pendingChain.eventKey, source: 'qna' }];
        qnaStateRef.current.history = [...qnaStateRef.current.history, `chain_enqueued:${qnaStateRef.current.pendingChain.eventKey}:${Date.now()}`].slice(-40);
        return;
      }
      if (result.type === 'end') {
        stopQnaFlow(qnaStateRef.current, 'flow_end');
        eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
        lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
    sandboxModeRef.current.setSandboxFlow({ replyGateActive: false, replyTarget: null });
        return;
      }
    }

    if (source === 'user_input' && pending && now <= pending.expiresAt) {
      const reasonBase = `event:${pending.eventId}`;
      const repliedYes = /有/.test(raw);
      const repliedNo = /沒有/.test(raw);
      const repliedBrave = /不怕/.test(raw);
      if (pending.key === 'VOICE_CONFIRM' && repliedYes) {
        const gate = canSandboxGhostMotion();
        if (!gate.allowed) return;
        const played = playSfx('ghost_female', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key, delayMs: 2000, startVolume: 0, endVolume: 1, rampSec: 3 });
        if (played) {
          postFollowUpLine(pending.target, 'VOICE_CONFIRM');
          scheduleBlackoutFlicker({ delayMs: 1000, durationMs: 12000, pulseAtMs: 4000, pulseDurationMs: 180 });
          triggerReactionBurst('ghost');
          if (eventLifecycleRef.current) eventLifecycleRef.current.topic = 'ghost';
        }
      }
      if (pending.key === 'GHOST_PING') {
        const gate = canSandboxGhostMotion();
        if (!gate.allowed) return;
        const played = playSfx('ghost_female', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key, delayMs: 3000, startVolume: 1, endVolume: 1, rampSec: 0 });
        if (played) {
          scheduleBlackoutFlicker({ delayMs: 1000, durationMs: 12000, pulseAtMs: 4000, pulseDurationMs: 180 });
          postFollowUpLine(pending.target, 'GHOST_PING');
          triggerReactionBurst('ghost');
          if (eventLifecycleRef.current) eventLifecycleRef.current.topic = 'ghost';
          cooldownsRef.current.ghost_ping_actor = now + randomInt(8 * 60_000, 12 * 60_000);
          lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
          resetQnaUiState();
    sandboxModeRef.current.setSandboxFlow({ replyGateActive: false, replyTarget: null });
        }
      }
      if (pending.key === 'TV_EVENT' && repliedNo) {
        const gate = canSandboxGhostMotion();
        if (!gate.allowed) return;
        requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop4', reason: reasonBase, sourceEventKey: 'TV_EVENT', delayMs: 2000 });
        postFollowUpLine(pending.target, 'TV_EVENT');
        const topic: EventTopic = Math.random() < 0.5 ? 'light' : 'ghost';
        triggerReactionBurst(topic);
        if (eventLifecycleRef.current) eventLifecycleRef.current.topic = topic;
      }
      if (pending.key === 'NAME_CALL') {
        const gate = canSandboxGhostMotion();
        if (!gate.allowed) return;
        const played = playSfx('ghost_female', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key, delayMs: 2000, startVolume: 0.8, endVolume: 1, rampSec: 0.2 });
        if (played) {
          scheduleBlackoutFlicker({ delayMs: 1000, durationMs: 12000, pulseAtMs: 4000, pulseDurationMs: 180 });
          triggerReactionBurst('ghost');
          if (eventLifecycleRef.current) eventLifecycleRef.current.topic = 'ghost';
        }
      }
      if (pending.key === 'VIEWER_SPIKE') {
        const gate = canSandboxGhostMotion();
        if (!gate.allowed) return;
        const played = playSfx('footsteps', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key });
        if (played) {
          scheduleBlackoutFlicker({ delayMs: 1000, durationMs: 12000, pulseAtMs: 4000, pulseDurationMs: 180 });
          triggerReactionBurst('footsteps');
          if (eventLifecycleRef.current) eventLifecycleRef.current.topic = 'footsteps';
        }
      }
      if (pending.key === 'FEAR_CHALLENGE' && repliedBrave) {
        const gate = canSandboxGhostMotion();
        if (!gate.allowed) return;
        const chooseGhost = Math.random() < 0.5;
        const played = chooseGhost
          ? playSfx('ghost_female', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key, delayMs: 2000, startVolume: 0.95, endVolume: 1, rampSec: 0.2 })
          : playSfx('footsteps', { reason: reasonBase, source: 'event', eventId: pending.eventId, eventKey: pending.key, delayMs: 2000 });
        if (played) {
          scheduleBlackoutFlicker({ delayMs: 1000, durationMs: 12000, pulseAtMs: 4000, pulseDurationMs: 180 });
          postFollowUpLine(pending.target, 'FEAR_CHALLENGE');
          postFollowUpLine(pending.target, 'FEAR_CHALLENGE', 'closer');
          triggerReactionBurst(chooseGhost ? 'ghost' : 'footsteps');
          if (eventLifecycleRef.current) eventLifecycleRef.current.topic = chooseGhost ? 'ghost' : 'footsteps';
        }
      }
      if (eventLifecycleRef.current) {
        eventLifecycleRef.current.state = 'done';
        eventLifecycleRef.current.at = Date.now();
      }
      eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
      lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
    sandboxModeRef.current.setSandboxFlow({ replyGateActive: false, replyTarget: null });
      pendingReplyEventRef.current = null;
      return;
    }

    if (pending && now > pending.expiresAt) {
      if (eventLifecycleRef.current) {
        eventLifecycleRef.current.state = 'done';
        eventLifecycleRef.current.at = Date.now();
      }
      eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
      lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
    sandboxModeRef.current.setSandboxFlow({ replyGateActive: false, replyTarget: null });
      pendingReplyEventRef.current = null;
    }

    const gateRejectSummary: Record<string, number> = {};
    if (!target) gateRejectSummary.need_activeUsers = 1;
    if (isLocked) gateRejectSummary.locked = 1;
    eventLastComputedAtRef.current = now;
    eventLastCandidateKeysRef.current = EVENT_REGISTRY_KEYS.slice(0, 10);
    eventLastCandidateCountRef.current = target && !isLocked ? EVENT_REGISTRY_KEYS.length : 0;
    eventGateRejectSummaryRef.current = gateRejectSummary;
    if (!target || isLocked) return;

    const can = (key: StoryEventKey) => (eventCooldownsRef.current[key] ?? 0) <= now;
    for (const key of EVENT_REGISTRY_KEYS) {
      const def = EVENT_REGISTRY[key];
      if (audienceUsers.length < def.minActiveUsers) continue;
      if (!can(key)) continue;
      if (key === 'GHOST_PING' && (cooldownsRef.current.ghost_ping_actor ?? 0) > now) continue;
      if (key === 'TV_EVENT' && (cooldownsRef.current.tv_event ?? 0) > now) continue;
      if (Math.random() >= def.chance) continue;
      const started = startEvent(key, { source });
      if (!started) return;
      if (def.lockOnStart && started.target) lockStateRef.current = { isLocked: true, target: started.target, startedAt: now, replyingToMessageId: null };
      if (key === 'LIGHT_GLITCH') {
        requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop2', reason: `event:${started.eventId}`, sourceEventKey: 'LIGHT_GLITCH' });
        triggerReactionBurst('light');
        if (eventLifecycleRef.current) {
          eventLifecycleRef.current.state = 'done';
          eventLifecycleRef.current.topic = 'light';
        }
      } else {
        pendingReplyEventRef.current = { key, target: started.target || target, eventId: started.eventId, expiresAt: now + 20_000 };
      }
      if (key === 'TV_EVENT') cooldownsRef.current.tv_event = now + 90_000;
      return;
    }
  }, [appStarted, playSfx, postFollowUpLine, startEvent, state.messages, triggerReactionBurst]);

  useEffect(() => {
    chatEngineRef.current.syncFromMessages(sortedMessages);
  }, [state.messages]);

  useEffect(() => {
    let isCancelled = false;

    const runSetup = async () => {
      setIsReady(false);
      setIsRendererReady(false);
      setLoadingState('BOOT_START');

      const loadingStart = performance.now();
      setInitStatusText('正在檢查必要素材');
      const missingRequired = await verifyRequiredAssets();
      if (isCancelled) return;

      if (missingRequired.length > 0) {
        setRequiredAssetErrors(missingRequired);
        setInitStatusText('必要素材缺失（素材未加入專案或 base path 設定錯誤）');
        return;
      }

      setInitStatusText('正在預載素材');
      const result = await preloadAssets(ASSET_MANIFEST, {
        onProgress: (progressState) => {
          setLoadingProgress(progressState.progress);
          setInitStatusText(`正在預載素材 (${progressState.loaded}/${progressState.total})`);
        }
      });

      if (isCancelled) return;

      const renderer = new Renderer2D();
      renderer.mount();
      setIsRendererReady(true);
      setLoadingState('ASSETS_READY');

      const elapsed = performance.now() - loadingStart;
      if (elapsed < 800) await new Promise((resolve) => window.setTimeout(resolve, 800 - elapsed));
      if (isCancelled) return;

      setHasOptionalAssetWarning(result.optionalErrors.length > 0);
      if (result.requiredErrors.length > 0) {
        setRequiredAssetErrors(result.requiredErrors.map((url) => ({
          name: 'preload_failure',
          type: 'video',
          relativePath: 'unknown',
          url,
          reason: 'preload failed after required-asset verification'
        })));
        setInitStatusText('必要素材預載失敗，請檢查 Console');
        return;
      }

      setInitStatusText('初始化完成');
      setIsReady(true);
      setLoadingState('RUNNING');
    };

    void runSetup();
    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    let timer = 0;

    const pickNextRhythm = (): Exclude<ChatPacingMode, 'tag_slow'> => {
      const options: Array<Exclude<ChatPacingMode, 'tag_slow'>> = ['normal', 'slightlyBusy', 'tense'];
      const candidates = options.filter((mode) => mode !== lastPacingModeRef.current);
      return pickOne(candidates.length > 0 ? candidates : options);
    };

    const nextInterval = () => {
      const now = Date.now();
      if (!tagSlowActiveRef.current && now >= pacingNextModeFlipAtRef.current) {
        const nextMode = pickNextRhythm();
        pacingModeRef.current = nextMode;
        lastPacingModeRef.current = nextMode;
        pacingModeUntilRef.current = now + randomInt(10_000, 20_000);
        pacingNextModeFlipAtRef.current = now + randomInt(20_000, 40_000);
      }

      if (!tagSlowActiveRef.current && now >= pacingModeUntilRef.current && pacingModeRef.current !== 'normal') {
        pacingModeRef.current = 'normal';
      }

      if (tagSlowActiveRef.current || lockStateRef.current.isLocked) {
        pacingModeRef.current = 'tag_slow';
      }

      const mode = pacingModeRef.current;
      const quietMode = !lockStateRef.current.isLocked && mode === 'normal' && state.curse <= 30;
      const base = quietMode
        ? randomInt(1200, 2200)
        : mode === 'tense'
          ? randomInt(400, 900)
          : mode === 'slightlyBusy'
            ? randomInt(650, 1200)
            : randomInt(800, 1600);
      const shouldSlowForLock = lockStateRef.current.isLocked;
      const shouldSlowForTag = mode === 'tag_slow';
      const slowMultiplier = shouldSlowForLock || shouldSlowForTag ? 2 : 1;
      const scaled = Math.floor(base * slowMultiplier);
      const transitionAt = mode === 'tag_slow' ? null : Math.min(pacingModeUntilRef.current, pacingNextModeFlipAtRef.current);
      chatEngineRef.current.setPacingDebug({
        mode: lockStateRef.current.isLocked ? 'locked_slowed' : (mode === 'tag_slow' ? 'slowed' : 'normal'),
        baseRate: base,
        currentRate: scaled,
        jitterEnabled: true,
        nextMessageDueInSec: Math.max(0, Math.ceil(scaled / 1000))
      });
      window.__CHAT_DEBUG__ = {
        ...(window.__CHAT_DEBUG__ ?? {}),
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          pacing: {
            mode: quietMode ? 'quiet' : mode,
            nextModeInSec: transitionAt ? Math.max(0, Math.ceil((transitionAt - now) / 1000)) : -1
          }
        }
      };
      return scaled;
    };

    const dispatchTimedChats = (messages: ChatMessage[]) => {
      messages.forEach((message) => {
        dispatchChatMessage(message, { source: 'audience_idle' });
      });
    };

    const dispatchForcedBaseMessage = () => {
      const recentTexts = new Set(state.messages.slice(-40).map((message) => (message.translation ?? message.text).trim()));
      let fallback = pickSafeFallbackText();
      for (let i = 0; i < SAFE_FALLBACK_POOL.length; i += 1) {
        const candidate = pickSafeFallbackText();
        if (!recentTexts.has(candidate)) {
          fallback = candidate;
          break;
        }
      }
      dispatchChatMessage({
        id: crypto.randomUUID(),
        username: pickOne(usernames),
        text: fallback,
        language: 'zh',
        translation: fallback,
        type: 'chat'
      }, { source: 'audience_idle' });
    };

    const tick = () => {
      const now = Date.now();
      eventTickCountRef.current += 1;
      eventLastTickAtRef.current = now;
      if (chatFreeze.isFrozen) {
        const delay = nextInterval();
        eventNextDueAtRef.current = Date.now() + delay;
        timer = window.setTimeout(tick, delay);
        return;
      }
      const topicWeights = getCurrentTopicWeights(now);
      const isSandboxRuntime = modeRef.current.id === 'sandbox_story';
      if (isSandboxRuntime) {
        sandboxRuntimeGuardRef.current.classicTickBlockedCount += 1;
      }
      const timedChats = (chatAutoPaused || isSandboxRuntime) ? [] : chatEngineRef.current.tick(now);
      dispatchTimedChats(timedChats);
      syncChatEngineDebug();
      tryTriggerStoryEvent('', 'scheduler_tick');
      if (qnaStateRef.current.isActive) {
        const lockElapsedMs = lockStateRef.current.isLocked && lockStateRef.current.startedAt > 0 ? now - lockStateRef.current.startedAt : 0;
        if (lockElapsedMs >= EVENT_EXCLUSIVE_TIMEOUT_MS) {
          qnaStateRef.current.history = [...qnaStateRef.current.history, `abandoned:tick_timeout:${now}`].slice(-40);
          stopQnaFlow(qnaStateRef.current, 'timeout_abandon');
          eventExclusiveStateRef.current = { exclusive: false, currentEventId: null, currentLockOwner: null };
          lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      resetQnaUiState();
    sandboxModeRef.current.setSandboxFlow({ replyGateActive: false, replyTarget: null });
          pendingReplyEventRef.current = null;
          lastBlockedReasonRef.current = 'event_abandoned_timeout';
          return;
        }
        const pressure = handleTimeoutPressure(qnaStateRef.current);
        if (pressure === 'low_rumble') {
          playSfx('low_rumble', { reason: 'qna:pressure40', source: 'event' });
        }
        if (pressure === 'ghost_ping') {
          const played = playSfx('ghost_female', { reason: 'qna:pressure60', source: 'event', allowBeforeStarterTag: true });
          if (!played) {
            triggerReactionBurst('ghost');
          }
        }
        if (qnaStateRef.current.active.status !== 'AWAITING_REPLY' && Date.now() >= qnaStateRef.current.nextAskAt) {
          void sendQnaQuestion();
        }
      }
      if (!eventRunnerStateRef.current.inFlight && eventQueueRef.current.length > 0) {
        const next = eventQueueRef.current.shift();
        if (next) {
          const started = startEvent(next.key, { source: 'scheduler_tick' });
          if (!started) {
            qnaStateRef.current.history = [...qnaStateRef.current.history, `chain_failed:${next.key}:${Date.now()}`].slice(-40);
            qnaStateRef.current.pendingChain = null;
            qnaStateRef.current.nextAskAt = Date.now() + 500;
          } else {
            qnaStateRef.current.history = [...qnaStateRef.current.history, `chain_started:${next.key}:${Date.now()}`].slice(-40);
            qnaStateRef.current.pendingChain = null;
          }
        }
      }
      if (modeRef.current.id !== 'sandbox_story') {
        emitChatEvent({ type: 'IDLE_TICK', topicWeights });
        if (!chatAutoPaused && Date.now() - lastChatMessageAtRef.current > 2500) {
          dispatchForcedBaseMessage();
        }
      }
      const delay = nextInterval();
      eventNextDueAtRef.current = Date.now() + delay;
      timer = window.setTimeout(tick, delay);
    };

    const initialDelay = nextInterval();
    eventNextDueAtRef.current = Date.now() + initialDelay;
    timer = window.setTimeout(tick, initialDelay);
    return () => window.clearTimeout(timer);
  }, [chatAutoPaused, chatFreeze.isFrozen, deriveSandboxReplyGateState, getCurrentTopicWeights, isReady, state.curse, state.messages, syncChatEngineDebug, tryTriggerStoryEvent]);

  useEffect(() => {
    const unsubscribe = onSceneEvent((event) => {
      if (chatFreeze.isFrozen) return;
      if (event.type === 'VIDEO_ACTIVE') {
        currentVideoKeyRef.current = event.key;
        emitChatEvent({ type: 'SCENE_SWITCH', toKey: event.key });
      }
      if (event.type === 'SFX_START') {
        const sfxKey = event.sfxKey === 'fan_loop' ? 'fan' : event.sfxKey === 'footsteps' ? 'footsteps' : 'ghost';
        emitChatEvent({ type: 'SFX_START', sfxKey });
      }
      if (event.type === 'SFX_END') {
        EVENT_TESTER_KEYS.forEach((eventKey) => {
          const status = eventAudioStateRef.current[eventKey];
          if (status.state !== 'playing') return;
          if (status.preKey !== event.sfxKey && status.postKey !== event.sfxKey) return;
          transitionEventAudioToCooldown(eventKey, event.reason === 'error' ? 'play_failed' : 'ended');
        });
      }
    });

    return () => unsubscribe();
  }, [chatFreeze.isFrozen]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      modeRef.current.tick(now);
      if (modeRef.current.id === 'sandbox_story') {
        const guardState = sandboxModeRef.current.getState();
        sandboxRuntimeGuardRef.current.modeEnteredAt = sandboxRuntimeGuardRef.current.modeEnteredAt || now;
        if (!guardState.joinGate.satisfied || guardState.flow.step === 'PREJOIN' || !guardState.introGate.startedAt || !guardState.flow.step || !Number.isFinite(guardState.flow.questionIndex) || !guardState.scheduler.phase) {
          sandboxModeRef.current.ensureBootstrapState?.('guard_boot_recovery', now, 30_000, true);
          ensureSandboxRuntimeStarted('guard_boot_recovery');
        }
      }
      const promptBeforeTick = sandboxModeRef.current.getCurrentPrompt();
      const sandboxState = sandboxModeRef.current.getState();
      const derivedReplyGate = deriveSandboxReplyGateState();
      sandboxModeRef.current.setSandboxFlow({
        gateType: derivedReplyGate.replyGateType ?? 'none',
        replyTarget: derivedReplyGate.replyTarget,
        replyGateActive: derivedReplyGate.replyGateArmed,
        canReply: derivedReplyGate.canReply,
        replySourceMessageId: derivedReplyGate.replySourceMessageId,
        replySourceType: derivedReplyGate.replySourceType,
        consumePolicy: 'single'
      });
      sandboxReplyGateDebugRef.current = {
        ...sandboxReplyGateDebugRef.current,
        gateType: (derivedReplyGate.replyGateType as 'none' | 'consonant_wait_reply' | null) ?? 'none',
        armed: derivedReplyGate.replyGateArmed,
        sourceMessageId: derivedReplyGate.replySourceMessageId ?? '-',
        targetPlayerId: derivedReplyGate.replyTarget ?? '-'
      };
      const sandboxEngineAudit = sandboxChatEngineRef.current?.getAuditDebugState();
      const canShowConsonantOverlay = sandboxState.introGate.passed;
      sandboxModeRef.current.commitPromptOverlay({ consonantShown: canShowConsonantOverlay && promptBeforeTick?.kind === 'consonant' ? promptBeforeTick.consonant : '' });
      const sandboxNode = sandboxModeRef.current.getCurrentNode();
      sandboxChatEngineRef.current?.setContext({
        san: state.curse,
        playerHandle: normalizeHandle(sandboxState.player?.handle || activeUserInitialHandleRef.current || '000') || '000',
        phase: sandboxState.scheduler.phase,
        flowStep: sandboxState.sandboxFlow.step,
        stepStartedAt: sandboxState.sandboxFlow.stepStartedAt,
        introStartedAt: sandboxState.introGate.startedAt,
        isEnding: Boolean(sandboxNode && sandboxState.nodeIndex >= sandboxModeRef.current.getSSOT().nodes.length - 1 && sandboxState.scheduler.phase === 'chatRiot'),
        freeze: sandboxState.freeze,
        glitchBurst: sandboxState.glitchBurst
      });
      if (modeRef.current.id === 'sandbox_story') {
        if (sandboxState.flow.step === 'PREHEAT_CHAT' && bootstrapRef.current.isReady) {
          const preheatRuntime = sandboxPreheatOrchestrationRef.current;
          const elapsed = now - (sandboxState.introGate.startedAt || now);
          const joinCapReached = preheatRuntime.joinEmitted >= SANDBOX_PREHEAT_JOIN_CAP;
          const emitIntervalMs = randomInt(2800, 4500);
          if (!preheatRuntime.completed && now - preheatRuntime.lastEmitAt >= emitIntervalMs) {
            const actorState = separateChatActorState(state.messages, activeUserInitialHandleRef.current || 'player');
            const next = SANDBOX_PREHEAT_CHAT_SEQUENCE[preheatRuntime.cursor % SANDBOX_PREHEAT_CHAT_SEQUENCE.length];
            if (next.kind === 'join') {
              if (!joinCapReached && preheatRuntime.lastJoinSender !== next.user) {
                dispatchChatMessage({
                  id: crypto.randomUUID(),
                  username: next.user,
                  type: 'system',
                  subtype: 'join',
                  text: next.text,
                  language: 'zh',
                  translation: next.text
                }, { source: 'sandbox_consonant', sourceTag: 'sandbox_preheat_join' });
                preheatRuntime.joinEmitted += 1;
                preheatRuntime.lastJoinSender = next.user;
                sandboxModeRef.current.setPreheatState({ lastJoinAt: now });
                preheatRuntime.cursor += 1;
              } else {
                preheatRuntime.cursor += 1;
              }
            } else {
              const resolvedText = next.text.replace('@activeUser', `@${actorState.activeUser || 'player'}`);
              const preheatFingerprint = `${next.user}:${resolvedText.trim().toLowerCase()}`;
              if (!sandboxPreheatDedupRef.current.emittedFingerprints.has(preheatFingerprint)) {
                dispatchChatMessage({
                  id: crypto.randomUUID(),
                  username: next.user,
                  type: 'chat',
                  text: resolvedText,
                  language: 'zh',
                  translation: resolvedText,
                  role: next.role,
                  isVip: next.vip ? 'VIP_NORMAL' : undefined,
                  badge: next.badge
                }, { source: 'sandbox_consonant', sourceTag: 'sandbox_preheat_chat' });
                sandboxPreheatDedupRef.current.emittedFingerprints.add(preheatFingerprint);
              }
              preheatRuntime.cursor += 1;
            }
            preheatRuntime.lastEmitAt = now;
          }
          const remainingMs = Math.max(0, 30_000 - elapsed);
          const passed = elapsed >= 30_000;
          sandboxModeRef.current.setIntroGate({ remainingMs, passed });
          if (passed) {
            preheatRuntime.completed = true;
            if (sandboxState.flow.step === 'PREHEAT_CHAT') {
              sandboxModeRef.current.setFlowStep('VIP_TAG_PLAYER', 'preheat_duration_passed', now);
            }
          }
        }
        const footstepRoll = sandboxModeRef.current.registerFootstepsRoll(now);
        if (footstepRoll.shouldTrigger) {
          playSfx('footsteps', { reason: 'sandbox:fear_roll', source: 'event', allowBeforeStarterTag: true });
        }
      }
      const sandboxReplyToActive = modeRef.current.id === 'sandbox_story' && lockStateRef.current.isLocked && Boolean(lockStateRef.current.replyingToMessageId);
      if (sandboxReplyToActive) {
        sandboxModeRef.current.setFreeze({ frozen: true, reason: 'AWAIT_PLAYER_INPUT', frozenAt: sandboxState.freeze.frozenAt || now });
        setChatAutoPaused(true);
      }
      if (modeRef.current.id === 'sandbox_story' && sandboxState.sandboxFlow.autoplayNightEnabled && sandboxState.sandboxFlow.replyGateActive) {
        const waitElapsed = now - sandboxState.flow.stepStartedAt;
        if (waitElapsed >= 1800 && sandboxState.sandboxFlow.waitingForMockReply) {
          const mock = sandboxState.sandboxFlow.gateType === 'warmup_tag'
            ? '哈我也有看到，先繼續看'
            : (sandboxState.sandboxFlow.gateType === 'consonant_guess'
              ? '應該唸 ga'
              : (sandboxState.flow.questionIndex >= 9 ? '我猜是等待和怨念' : '我猜它在指某個女生'));
          sandboxModeRef.current.setSandboxFlow({ waitingForMockReply: false, autoplayNightStatus: 'running' });
          const mockPlayerHandle = activeUserInitialHandleRef.current || 'player';
          const mockMessage = createPlayerMessage(mock, mockPlayerHandle);
          dispatchChatMessage(mockMessage, { source: 'sandbox_consonant', sourceTag: 'sandbox_autoplay_mock_reply' });
          consumePlayerReply({
            raw: mock,
            messageId: mockMessage.id,
            sourceType: 'sandbox_autoplay_mock_reply',
            playerId: mockPlayerHandle,
            targetPlayerId: sandboxState.replyGate?.targetPlayerId || undefined,
            sourceMessageId: sandboxState.replyGate?.sourceMessageId || undefined
          });
        }
      }
      if (modeRef.current.id === 'sandbox_story' && sandboxState.flow.step === 'WAIT_REPLY_1' && sandboxReplyToActive) {
        const gateClosed = sandboxState.sandboxFlow.gateConsumed || !sandboxState.sandboxFlow.replyGateActive || !sandboxState.sandboxFlow.canReply;
        const glitchPool = sandboxState.sandboxFlow.glitchEmitterIds.length > 0 ? sandboxState.sandboxFlow.glitchEmitterIds : ['viewer_118', 'viewer_203', 'viewer_409'];
        const allowAmbientGlitch = sandboxState.sandboxFlow.unresolvedBehavior === 'retry_once_then_idle' && sandboxWaitReplyRuntimeRef.current.glitchCount < 2;
        if (!gateClosed && allowAmbientGlitch && (sandboxWaitReplyRuntimeRef.current.lastGlitchAt <= 0 || now - sandboxWaitReplyRuntimeRef.current.lastGlitchAt >= 4200)) {
          const nextGlitchSender = glitchPool.find((sender: string) => sender !== sandboxWaitReplyRuntimeRef.current.lastGlitchSender) ?? glitchPool[0];
          const glitchLines = ['怎麼訊息送不出去', '奇怪網路怪怪的', '聊天室是不是卡住', '我這邊一直轉圈'];
          const glitchLine = glitchLines[Math.floor(Math.random() * glitchLines.length)] ?? '聊天室是不是卡住';
          dispatchChatMessage({ id: crypto.randomUUID(), username: nextGlitchSender, type: 'chat', text: glitchLine, language: 'zh', translation: glitchLine }, { source: 'sandbox_consonant', sourceTag: 'sandbox_wait_reply_1_glitch_pool' });
          sandboxWaitReplyRuntimeRef.current.lastGlitchAt = now;
          sandboxWaitReplyRuntimeRef.current.lastGlitchSender = nextGlitchSender;
          sandboxWaitReplyRuntimeRef.current.glitchCount += 1;
          sandboxWaitReplyRuntimeRef.current.burstStarted = true;
          sandboxWaitReplyRuntimeRef.current.completed = sandboxWaitReplyRuntimeRef.current.glitchCount >= 2;
        }
        const shouldRetry = !gateClosed
          && sandboxState.sandboxFlow.retryCount < sandboxState.sandboxFlow.retryLimit
          && sandboxState.sandboxFlow.nextRetryAt > 0
          && now >= sandboxState.sandboxFlow.nextRetryAt;
        if (shouldRetry) {
          const taggedUser = normalizeHandle(activeUserInitialHandleRef.current || 'player') || 'player';
          const retryEmitter = sandboxState.sandboxFlow.retryEmitterId || SANDBOX_VIP.handle;
          const retryLine = `@${taggedUser} 你還在嗎？剛剛那個字你會唸嗎？`; 
          const normalizedRetry = retryLine.trim().toLowerCase().replace(/\s+/g, ' ');
          const retryFingerprint = `${sandboxState.sandboxFlow.step}:${sandboxState.sandboxFlow.questionIndex}:${retryEmitter}:${normalizedRetry}`;
          const lastRetryAt = sandboxQuestionFingerprintRef.current[retryFingerprint] || 0;
          const dedupeWindowMs = sandboxState.sandboxFlow.dedupeWindowMs || 5000;
          if (now - lastRetryAt >= dedupeWindowMs) {
            dispatchChatMessage({ id: crypto.randomUUID(), username: retryEmitter, type: 'chat', text: retryLine, language: 'zh', translation: retryLine, isVip: retryEmitter === SANDBOX_VIP.handle ? 'VIP_NORMAL' : undefined, role: retryEmitter === SANDBOX_VIP.handle ? 'vip' : 'viewer', badge: retryEmitter === SANDBOX_VIP.handle ? 'crown' : undefined }, { source: 'sandbox_consonant', sourceTag: 'sandbox_wait_reply_1_retry' });
            sandboxQuestionFingerprintRef.current[retryFingerprint] = now;
            sandboxModeRef.current.setSandboxFlow({
              retryCount: Math.min(sandboxState.sandboxFlow.retryLimit, sandboxState.sandboxFlow.retryCount + 1),
              nextRetryAt: 0,
              lastPromptAt: now,
              questionPromptFingerprint: retryFingerprint,
              normalizedPrompt: normalizedRetry
            });
          }
        }
      } else {
        sandboxWaitReplyRuntimeRef.current = { lastGlitchAt: 0, lastGlitchSender: '', glitchCount: 0, burstStarted: false, completed: false };
      }
      const promptQuestionId = sandboxState.round?.currentQuestionId || sandboxState.prompt.current?.wordKey || '';
      const promptQuestion = promptQuestionId ? getSharedConsonantQuestionById(promptQuestionId) : undefined;
      const promptAcceptedCandidates = Array.isArray(sandboxState.currentPrompt?.acceptedCandidates) && sandboxState.currentPrompt.acceptedCandidates.length > 0
        ? sandboxState.currentPrompt.acceptedCandidates
        : getAcceptedAliasCandidates({
          questionId: promptQuestionId || undefined,
          consonant: sandboxState.currentPrompt?.expectedConsonant || sandboxState.prompt.current?.consonant
        });
      const expectedSceneKey = resolveSandboxSceneKeyByQuestionIndex(sandboxState.flow.questionIndex);
      const videoCurrentKey = (window.__VIDEO_DEBUG__ as { currentKey?: string } | undefined)?.currentKey ?? '';
      const expectedCanonicalSceneKey = canonicalizeSandboxSceneKey(expectedSceneKey);
      const currentCanonicalSceneKey = canonicalizeSandboxSceneKey(videoCurrentKey);
      const stateQuestionId = sandboxState.prompt.current?.kind === 'consonant' ? sandboxState.prompt.current.wordKey : '';
      const promptConsonant = sandboxState.prompt.current?.kind === 'consonant' ? sandboxState.prompt.current.consonant : '';
      const overlayConsonant = sandboxState.prompt.overlay.consonantShown || '';
      const sceneSynced = Boolean(expectedCanonicalSceneKey) && expectedCanonicalSceneKey === currentCanonicalSceneKey;
      const isAnswerablePromptStep = isSandboxWaitReplyStep(sandboxState.flow.step);
      const gateAuthoritativeReady = Boolean(sandboxState.replyGate?.armed && sandboxState.replyGate?.canReply && sandboxState.replyGate?.gateType === 'consonant_answer');
      const authoritativeCanReply = Boolean(gateAuthoritativeReady && isAnswerablePromptStep);
      const hasCurrentPrompt = Boolean(stateQuestionId && promptConsonant);
      const authoritativePromptVisible = authoritativeCanReply && hasCurrentPrompt;
      const renderSyncReason = !stateQuestionId
        ? 'state_question_missing'
        : (!promptConsonant ? 'prompt_missing'
          : (overlayConsonant !== promptConsonant ? 'overlay_not_committed'
            : (sceneSynced ? 'none' : 'scene_not_synced_warning')));
      const authoritativeQ2Advanced = sandboxState.sandboxFlow.nextQuestionEmitted
        && sandboxState.sandboxFlow.nextQuestionToQuestionId
        && (sandboxState.flow.step === 'WAIT_REPLY_2' || sandboxState.flow.step === 'TAG_PLAYER_3_MEANING' || sandboxState.flow.step === 'WAIT_REPLY_3' || sandboxState.flow.step === 'END_NIGHT')
        && sandboxState.prompt.current?.kind === 'consonant'
        && sandboxState.prompt.current.wordKey === sandboxState.sandboxFlow.nextQuestionToQuestionId;
      const promptVisuallyReady = Boolean(stateQuestionId && promptConsonant && overlayConsonant === promptConsonant);
      const forceVisiblePrompt = Boolean(stateQuestionId) && (promptVisuallyReady || isAnswerablePromptStep || authoritativeQ2Advanced || gateAuthoritativeReady);
      const renderedQuestionId = !stateQuestionId
        ? ''
        : stateQuestionId;
      const renderBlockedReasonEffective = renderSyncReason;
      const revealTransitionSnapshot = buildRevealTransitionSnapshot(sandboxState);
      const revealHasObservableTiming = revealTransitionSnapshot.hasObservableTiming;
      const revealCompletionReady = revealTransitionSnapshot.completionReady;
      const revealGuardReady = revealTransitionSnapshot.guardReady;
      const revealVisibilityOnly = revealCompletionReady && !sandboxState.reveal.visible;
      const revealTransitionEligible = revealTransitionSnapshot.transitionEligible;
      const revealTransitionBlockedBy = revealTransitionSnapshot.transitionBlockedBy;
      const postRevealRuntimeStatus = derivePostRevealRuntimeStatus(sandboxState);
      const postRevealGuardReady = postRevealRuntimeStatus.guardReady;
      const postRevealActive = sandboxState.sandboxFlow?.postRevealChatState === 'started';
      const postRevealDoneState = sandboxState.sandboxFlow?.postRevealChatState === 'done';
      const postRevealCompletionBlockedBy = postRevealRuntimeStatus.completionBlockedBy === 'none'
        ? ''
        : postRevealRuntimeStatus.completionBlockedBy;
      const postRevealCompletionReady = postRevealDoneState && !postRevealCompletionBlockedBy;
      const advanceNextGuardReady = sandboxState.flow.step === 'ADVANCE_NEXT'
        && (postRevealCompletionReady
          || ((sandboxState.sandboxFlow?.backlogTechMessages?.length ?? 0) === 0
            && Boolean((sandboxState.audit?.transitions ?? []).some((item: any) => item?.to === 'ADVANCE_NEXT' && item?.reason === 'post_reveal_chat_done'))))
        && !(sandboxState.replyGate?.armed && sandboxState.replyGate?.gateType !== 'none');
      const debugActionEntries = Object.entries(sandboxDebugActionAuditRef.current);
      const latestDebugAction = debugActionEntries
        .sort((a, b) => (b[1].lastClickedAt || 0) - (a[1].lastClickedAt || 0))[0];
      const latestDebugActionName = latestDebugAction?.[0] ?? '-';
      const latestDebugActionAudit = latestDebugAction?.[1] ?? null;
      sandboxModeRef.current.commitRenderSync?.({
        stateQuestionId,
        renderedQuestionId,
        renderBlockedReason: renderBlockedReasonEffective,
        commitSource: forceVisiblePrompt && renderSyncReason !== 'none' ? 'authoritative_prompt_visibility_override' : (authoritativeQ2Advanced ? 'authoritative_flow_override' : 'app_tick_render_sync')
      });
      const judgeAudit = sandboxState.consonantJudgeAudit;
      const revealPromptSuppressed = sandboxState.reveal.phase === 'word' || sandboxState.reveal.phase === 'done';
      const promptGlyphClassName = revealPromptSuppressed
        ? 'sandbox-story-prompt-glyph reveal-cleanup'
        : 'glyph-blink sandbox-story-prompt-glyph';
      const promptVisibleButNotAnswerable = !revealPromptSuppressed && Boolean(hasCurrentPrompt) && !authoritativeCanReply;
      const answerableButPromptHidden = authoritativePromptVisible && revealPromptSuppressed;
      bumpSandboxRevealTick(now);
      (window.__CHAT_DEBUG__ as any).sandbox = {
        ...((window.__CHAT_DEBUG__ as any)?.sandbox ?? {}),
        sandboxFlow: {
          ...(window.__CHAT_DEBUG__ as any)?.sandbox?.flow,
          step: sandboxState.flow.step,
          stepStartedAt: sandboxState.flow.stepStartedAt,
          questionIndex: sandboxState.flow.questionIndex,
          replyGateActive: sandboxState.sandboxFlow.replyGateActive,
          replyTarget: sandboxState.sandboxFlow.replyTarget,
          backlogTechMessagesLength: sandboxState.sandboxFlow.backlogTechMessages.length,
          sanityPressure: sandboxState.sandboxFlow.sanityPressure,
          autoplayNightEnabled: sandboxState.sandboxFlow.autoplayNightEnabled,
          autoplayNightStatus: sandboxState.sandboxFlow.autoplayNightStatus,
          waitingForMockReply: sandboxState.sandboxFlow.waitingForMockReply,
          gateType: sandboxState.sandboxFlow.gateType,
          canReply: sandboxState.sandboxFlow.canReply,
          questionEmitterId: sandboxState.sandboxFlow.questionEmitterId,
          questionEmitter: sandboxState.sandboxFlow.questionEmitterId,
          retryEmitterId: sandboxState.sandboxFlow.retryEmitterId,
          blockedReason: sandboxState.scheduler.blockedReason || '-',
          glitchEmitterIds: sandboxState.sandboxFlow.glitchEmitterIds,
          retryCount: sandboxState.sandboxFlow.retryCount,
          retryLimit: sandboxState.sandboxFlow.retryLimit,
          lastPromptAt: sandboxState.sandboxFlow.lastPromptAt,
          nextRetryAt: sandboxState.sandboxFlow.nextRetryAt,
          gateConsumed: sandboxState.sandboxFlow.gateConsumed,
          questionPromptFingerprint: sandboxState.sandboxFlow.questionPromptFingerprint,
          normalizedPrompt: sandboxState.sandboxFlow.normalizedPrompt,
          activeSpeakerRoles: sandboxState.sandboxFlow.activeSpeakerRoles,
          introElapsedMs: sandboxState.sandboxFlow.introElapsedMs,
          nextBeatAt: sandboxState.sandboxFlow.nextBeatAt,
          postRevealChatState: sandboxState.sandboxFlow.postRevealChatState,
          postRevealStartAttempted: Boolean(sandboxState.sandboxFlow.postRevealStartAttempted),
          postRevealStartedAt: sandboxState.sandboxFlow.postRevealStartedAt || 0,
          postRevealCompletedAt: sandboxState.sandboxFlow.postRevealCompletedAt || 0,
          postRevealCompletionReason: sandboxState.sandboxFlow.postRevealCompletionReason || '',
          nextQuestionReady: sandboxState.sandboxFlow.nextQuestionReady,
          nextQuestionEmitted: sandboxState.sandboxFlow.nextQuestionEmitted,
          nextQuestionFromIndex: sandboxState.sandboxFlow.nextQuestionFromIndex,
          nextQuestionToIndex: sandboxState.sandboxFlow.nextQuestionToIndex,
          nextQuestionFromQuestionId: sandboxState.sandboxFlow.nextQuestionFromQuestionId,
          nextQuestionToQuestionId: sandboxState.sandboxFlow.nextQuestionToQuestionId,
          nextQuestionBlockedReason: sandboxState.sandboxFlow.nextQuestionBlockedReason,
          nextQuestionBlockedReasonSource: sandboxState.sandboxFlow.nextQuestionBlockedReasonSource || '-',
          nextQuestionStage: sandboxState.sandboxFlow.nextQuestionStage || '-',
          nextQuestionDecidedAt: sandboxState.sandboxFlow.nextQuestionDecidedAt,
          nextQuestionEmittedAt: sandboxState.sandboxFlow.nextQuestionEmittedAt,
          nextQuestionConsumer: sandboxState.sandboxFlow.nextQuestionConsumer,
          revealGuardReady,
          revealCompletionReady,
          revealHasObservableTiming,
          revealVisibilityOnly,
          revealTransitionEligible,
          revealTransitionBlockedBy,
          revealEligibilitySnapshotId: sandboxState.sandboxFlow.revealEligibilitySnapshotId || revealTransitionSnapshot.snapshotId,
          revealCommitSourceSnapshotId: sandboxState.sandboxFlow.revealCommitSourceSnapshotId || '',
          revealTransitionCommitAttempted: sandboxState.sandboxFlow.revealTransitionCommitAttempted ?? false,
          revealTransitionCommittedAt: sandboxState.sandboxFlow.revealTransitionCommittedAt ?? 0,
          revealTransitionCommitReason: sandboxState.sandboxFlow.revealTransitionCommitReason || '',
          revealTransitionCommitBlockedBy: sandboxState.sandboxFlow.revealTransitionCommitBlockedBy || '',
          revealBlockedReasonSource: sandboxState.reveal.blockedReason === 'hidden' ? 'ui_cleanup' : 'reveal_guard',
          postRevealGuardReady,
          postRevealStartEligible: postRevealRuntimeStatus.startEligible,
          postRevealStartBlockedBy: postRevealRuntimeStatus.startBlockedBy,
          postRevealActive,
          postRevealCompletionReady,
          postRevealCompletionEligible: postRevealRuntimeStatus.completionEligible,
          postRevealCompletionBlockedBy: postRevealRuntimeStatus.completionBlockedBy,
          advanceNextGuardReady,
          postRevealEnteredAt: sandboxState.sandboxFlow.postRevealEnteredAt || 0,
          advanceNextEnteredAt: sandboxState.sandboxFlow.advanceNextEnteredAt || 0
        },
        debugAction: {
          name: latestDebugActionName,
          intent: latestDebugActionAudit?.intent ?? '-',
          sourceQuestionId: latestDebugActionAudit?.sourceQuestionId ?? '-',
          targetQuestionId: latestDebugActionAudit?.targetQuestionId ?? '-',
          resultStep: latestDebugActionAudit?.resultStep ?? '-',
          usedCanonicalAnswer: latestDebugActionAudit?.usedCanonicalAnswer ?? '-',
          usedAcceptedCandidates: latestDebugActionAudit?.usedAcceptedCandidates ?? [],
          reconciled: Boolean(latestDebugActionAudit?.reconciled)
        },
        unresolvedAmbient: {
          active: sandboxState.flow.step === 'WAIT_REPLY_1' && sandboxState.sandboxFlow.replyGateActive && !sandboxState.sandboxFlow.gateConsumed,
          remaining: Math.max(0, 2 - sandboxWaitReplyRuntimeRef.current.glitchCount),
          completed: sandboxWaitReplyRuntimeRef.current.completed
        },
        ui: {
          consonantBubble: {
            visible: Boolean(sandboxState.flow.step && sandboxState.scheduler.phase && sandboxState.introGate.startedAt > 0)
              && authoritativePromptVisible
              && !revealPromptSuppressed
          },
          promptGlyph: {
            className: promptGlyphClassName,
            colorResolved: revealPromptSuppressed ? 'transparent' : '#8fd6ff',
            opacityResolved: revealPromptSuppressed
              ? '0'
              : (authoritativePromptVisible ? '1' : 'dynamic'),
            source: revealPromptSuppressed
              ? 'reveal_prompt_cleanup'
              : (authoritativePromptVisible ? 'authoritative_reply_gate_sync' : 'cssVar'),
            isBlueExpected: !revealPromptSuppressed
          },
          answerabilityHint: {
            visible: authoritativePromptVisible
          },
          divergence: {
            promptVisibleButNotAnswerable,
            answerableButPromptHidden
          }
        },
        word: {
          reveal: {
            visible: sandboxState.reveal.visible,
            active: sandboxState.reveal.visible,
            phase: sandboxState.reveal.phase,
            rendered: Boolean(sandboxState.reveal.rendered),
            blockedReason: sandboxState.reveal.blockedReason || '-',
            wordKey: sandboxState.reveal.wordKey,
            consonantFromPrompt: sandboxState.reveal.consonantFromPrompt || '-',
            durationMs: sandboxState.reveal.durationMs,
            text: sandboxState.reveal.text || '-',
            base: sandboxState.reveal.baseGrapheme || '-',
            rest: sandboxState.reveal.restText || '-',
            baseGrapheme: sandboxState.reveal.baseGrapheme || '-',
            restText: sandboxState.reveal.restText || '-',
            restLen: sandboxState.reveal.restLen,
            splitter: sandboxState.reveal.splitter,
            position: {
              xPct: sandboxState.reveal.position.xPct,
              yPct: sandboxState.reveal.position.yPct
            },
            safeRect: {
              minX: sandboxState.reveal.safeRect.minX,
              maxX: sandboxState.reveal.safeRect.maxX,
              minY: sandboxState.reveal.safeRect.minY,
              maxY: sandboxState.reveal.safeRect.maxY
            },
            startedAt: sandboxState.reveal.startedAt || 0,
            finishedAt: sandboxState.reveal.finishedAt || 0
          }
        },
        audio: { pronounce: { lastKey: sandboxState.audio.lastKey || '-', state: sandboxState.audio.state } },
        consonant: {
          ...(sandboxState.consonant ?? {}),
          parse: {
            ...(sandboxState.consonant.parse ?? {}),
            result: sandboxState.consonant.judge.lastResult
          },
          currentIndex: sandboxState.nodeIndex,
          currentConsonant: sandboxState.consonant.nodeChar ?? '-',
          currentWordKey: sandboxState.reveal.wordKey || sandboxNode?.id || '-',
          judge: sandboxState.consonant.judge
        },
        sharedConsonantEngine: {
          parserJudgeSSOT: 'src/shared/consonant-engine',
          classicUsesShared: true,
          sandboxUsesShared: true,
          waitReply1GateArmed: sandboxState.flow.step === 'WAIT_REPLY_1'
            ? (sandboxState.prompt.current?.kind === 'consonant'
              ? (sandboxState.replyGate.gateType === 'consonant_answer' && sandboxState.replyGate.armed)
              : true)
            : true,
          waitReply1SourceMessageBound: sandboxState.flow.step === 'WAIT_REPLY_1'
            ? Boolean(sandboxState.replyGate.sourceMessageId)
            : true,
          answerGateMirrorConsistent: sandboxState.answerGate.waiting === Boolean(sandboxState.replyGate.armed && sandboxState.replyGate.gateType !== 'none'),
          judgeCandidatesPresentWhenCorrect: sandboxState.consonantJudgeAudit?.judgeResult !== 'correct'
            || (sandboxState.consonantJudgeAudit?.acceptedCandidates?.length ?? 0) > 0,
          parseJudgeShapeConsistentWhenParseOk: !sandboxState.consonantJudgeAudit?.parseOk
            || Boolean(
              sandboxState.consonantJudgeAudit?.parseKind
              && sandboxState.consonantJudgeAudit?.normalizedInput
              && sandboxState.consonantJudgeAudit?.compareInput
              && sandboxState.consonantJudgeAudit?.expectedConsonant
            )
        },
        answer: {
          submitInFlight: sandboxState.answer.submitInFlight,
          lastSubmitAt: sandboxState.answer.lastSubmitAt || 0,
          gateWaiting: sandboxState.answerGate.waiting,
          gateAskedAt: sandboxState.answerGate.askedAt,
          gatePausedChat: sandboxState.answerGate.pausedChat,
          warmupGateActive: sandboxState.warmup.gateActive,
          warmupReplyReceived: sandboxState.warmup.replyReceived,
          warmupReplyAt: sandboxState.warmup.replyAt,
          judgeArmed: sandboxState.warmup.judgeArmed
        },
        replyGate: sandboxState.replyGate,
        reply: {
          lastInjectedMessageId: sandboxState.reply?.lastInjectedMessageId || '-',
          lastInjectedText: sandboxState.reply?.lastInjectedText || '-',
          lastInjectedAt: sandboxState.reply?.lastInjectedAt || 0,
          lastConsumedMessageId: sandboxState.reply?.lastConsumedMessageId || '-',
          lastConsumedText: sandboxState.reply?.lastConsumedText || '-',
          lastConsumedAt: sandboxState.reply?.lastConsumedAt || 0,
          consumeSource: sandboxState.reply?.consumeSource || '-',
          consumeResult: sandboxState.reply?.consumeResult || '-',
          consumeBlockedReason: sandboxState.reply?.consumeBlockedReason || '-'
        },
        lastReplyEval: sandboxState.lastReplyEval,
        freeze: sandboxState.freeze,
        glitchBurst: sandboxState.glitchBurst,
        player: sandboxState.player,
        last: sandboxState.last,
        schedulerPhase: mapSandboxSchedulerPhase(sandboxState.scheduler.phase),
        scheduler: {
          phase: sandboxState.scheduler.phase,
          authority: 'non_authoritative_debug_only',
          flowStep: sandboxState.sandboxFlow.step,
          stepStartedAt: sandboxState.sandboxFlow.stepStartedAt,
          blockedReason: sandboxState.scheduler.blockedReason || '-'
        },
        ssot: sandboxState.ssot,
        nightId: sandboxState.nightId,
        flow: {
          step: sandboxState.flow.step,
          questionIndex: sandboxState.flow.questionIndex,
          stepStartedAt: sandboxState.flow.stepStartedAt,
          transitions: sandboxState.flow.transitions
        },
        round: {
          nightId: sandboxState.round?.nightId ?? sandboxState.nightId,
          questionOrder: sandboxState.round?.questionOrder ?? [],
          currentQuestionCursor: sandboxState.round?.currentQuestionCursor ?? 0,
          currentQuestionId: sandboxState.round?.currentQuestionId ?? '-',
          remainingQuestionCount: sandboxState.round?.remainingQuestionCount ?? 0
        },
        introGate: sandboxState.introGate,
        audit: {
          introGate: {
            startedAt: sandboxState.introGate.startedAt,
            minDurationMs: sandboxState.introGate.minDurationMs,
            passed: sandboxState.introGate.passed
          },
          flow: {
            step: sandboxState.flow.step,
            stepEnteredAt: sandboxState.flow.stepStartedAt,
            questionIndex: sandboxState.flow.questionIndex,
            tagAskedThisStep: Boolean(sandboxState.flow.tagAskedThisStep),
            askedAt: sandboxState.flow.tagAskedAt ?? sandboxState.flow.askedAt ?? 0
          },
          freeze: {
            frozen: sandboxState.freeze.frozen,
            reason: sandboxState.freeze.reason,
            frozenAt: sandboxState.freeze.frozenAt ?? 0
          },
          glitchBurst: {
            pending: sandboxState.glitchBurst.pending,
            remaining: sandboxState.glitchBurst.remaining
          },
          emit: {
            lastEmitKey: sandboxEngineAudit?.lastEmitKey ?? '-',
            lastSpeaker: sandboxEngineAudit?.lastSpeaker ?? '-',
            recentEmitKeys: sandboxEngineAudit?.recentEmitKeys ?? [],
            duplicateSpamCount: sandboxEngineAudit?.duplicateSpamCount ?? 0,
            speakerSpamCount: sandboxEngineAudit?.speakerSpamCount ?? 0,
            freezeLeakCount: sandboxEngineAudit?.freezeLeakCount ?? 0
          },
          transitions: Array.isArray(sandboxState.audit.transitions) && sandboxState.audit.transitions.length > 0
            ? sandboxState.audit.transitions
            : (Array.isArray(sandboxState.transitions) ? sandboxState.transitions.map((item: any) => ({
              from: item.event ?? '-',
              to: item.detail ?? '-',
              at: item.at ?? 0,
              reason: item.event ?? '-'
            })) : []),
          thaiViewer: {
            lastUsedField: sandboxEngineAudit?.thaiViewer.lastUsedField ?? 'text',
            count: sandboxEngineAudit?.thaiViewer.count ?? 0
          },
          autoPinFreeze: {
            lastMessageId: sandboxAutoPinFreezeRef.current.lastMessageId,
            lastReason: sandboxAutoPinFreezeRef.current.lastReason,
            freezeMs: sandboxAutoPinFreezeRef.current.freezeMs,
            freezeUntil: sandboxAutoPinFreezeRef.current.freezeUntil,
            freezeRemainingMs: Math.max(0, sandboxAutoPinFreezeRef.current.freezeUntil - now),
            lastHintFollowUpEvent: sandboxAutoPinFreezeRef.current.lastHintFollowUpEvent,
            evaluation: sandboxAutoPinFreezeRef.current.lastEvaluation
          }
        },
        runtime: {
          mode: modeRef.current.id,
          running: modeRef.current.id === 'sandbox_story',
          hydratedAt: now,
          guard: { ...sandboxRuntimeGuardRef.current }
        },
        joinGate: sandboxState.joinGate,
        pendingQuestions: {
          length: sandboxState.pendingQuestions.queue.length,
          revisiting: sandboxState.pendingQuestions.revisiting
        },
        lastCategory: sandboxState.lastCategory ?? '-',
        pendingDisambiguation: {
          active: sandboxState.pendingDisambiguation.active,
          attempts: sandboxState.pendingDisambiguation.attempts,
          promptId: sandboxState.pendingDisambiguation.promptId || '-'
        },
        q10Special: {
          armed: sandboxState.q10Special.armed,
          revealed: sandboxState.q10Special.revealed,
          currentQuestion: sandboxState.nodeIndex + 1,
          allowInject: sandboxState.nodeIndex === 9 && sandboxState.scheduler.phase === 'vipTranslate'
        },
        blockedOptionsCount: sandboxBlockedOptionsCountRef.current,
        judge: {
          lastInput: sandboxState.consonant.judge.lastInput || '-',
          lastResult: sandboxState.consonant.judge.lastResult,
          expectedConsonant: judgeAudit.expectedConsonant,
          acceptedCandidates: judgeAudit.acceptedCandidates,
          compareInput: judgeAudit.compareInput,
          compareMode: judgeAudit.compareMode,
          resultReason: judgeAudit.resultReason,
          judgeResult: judgeAudit.judgeResult,
          consumedAt: judgeAudit.consumedAt,
          sourcePromptId: judgeAudit.sourcePromptId,
          sourceQuestionId: judgeAudit.sourceQuestionId,
          sourceWordKey: judgeAudit.sourceWordKey,
          gateType: judgeAudit.gateType
        },
        parse: {
          raw: judgeAudit.rawInput,
          normalized: judgeAudit.normalizedInput,
          kind: judgeAudit.parseKind,
          ok: judgeAudit.parseOk,
          blockReason: judgeAudit.resultReason,
          allowedKinds: ['thai_char', 'roman_alias', 'bopomofo_alias', 'question_alias'],
          matchedAlias: judgeAudit.matchedAlias
        },
        ghost: { gate: { lastReason: sandboxState.ghostGate?.lastReason ?? '-' } },
        advance: {
          inFlight: sandboxState.advance.inFlight,
          lastAt: sandboxState.advance.lastAt || 0,
          lastReason: sandboxState.advance.lastReason || '-',
          blockedReason: sandboxState.advance.blockedReason || '-'
        },
        currentPrompt: {
          ...(sandboxState.currentPrompt ?? {}),
          answerSource: sandboxState.round?.authoritativeQuestionSource || 'sandbox_night_question_pool',
          classicQuestionId: promptQuestion?.questionId ?? '-',
          sharedFromClassic: false,
          displayAcceptedAnswers: promptQuestion?.acceptedAnswers ?? [],
          displayAliases: promptQuestion?.aliases ?? [],
          runtimeAcceptedCandidates: promptAcceptedCandidates,
          expectedConsonant: sandboxState.currentPrompt?.expectedConsonant ?? sandboxState.prompt.current?.consonant ?? '-',
          revealWord: sandboxState.currentPrompt?.revealWord ?? sandboxState.reveal?.text ?? '-',
          authoritativeQuestionSource: sandboxState.round?.authoritativeQuestionSource ?? 'sandbox_night_question_pool'
        },
        answerAudit: {
          source: promptQuestion ? 'shared_consonant_question_bank' : 'runtime_prompt_only',
          classicQuestionId: promptQuestion?.questionId ?? '-',
          acceptedCandidates: promptAcceptedCandidates
        },
        prompt: {
          current: {
            kind: sandboxState.prompt.current?.kind ?? '-',
            id: sandboxState.prompt.current?.promptId ?? '-',
            promptId: sandboxState.prompt.current?.promptId ?? '-',
            consonant: sandboxState.prompt.current?.kind === 'consonant' ? sandboxState.prompt.current.consonant : '-',
            wordKey: sandboxState.prompt.current?.kind === 'consonant' ? sandboxState.prompt.current.wordKey : '-',
            pinnedText: sandboxState.prompt.current?.pinnedText ?? '-'
          },
          overlay: {
            consonantShown: sandboxState.prompt.overlay.consonantShown || '-'
          },
          pinned: {
            promptIdRendered: sandboxState.prompt.pinned.promptIdRendered || '-',
            lastWriter: {
              source: sandboxState.prompt.pinned.lastWriter.source,
              blockedReason: sandboxState.prompt.pinned.lastWriter.blockedReason || '-',
              writerBlocked: sandboxState.prompt.pinned.lastWriter.writerBlocked
            }
          },
          mismatch: sandboxState?.prompt?.mismatch ?? false
        },
        renderSync: {
          ...(sandboxState.renderSync ?? {}),
          stateQuestionId,
          renderedQuestionId,
          renderBlockedReason: renderBlockedReasonEffective,
          renderSyncReason,
          expectedSceneKey,
          videoCurrentKey,
          expectedRawKey: expectedSceneKey,
          currentRawKey: videoCurrentKey,
          expectedCanonicalKey: expectedCanonicalSceneKey,
          currentCanonicalKey: currentCanonicalSceneKey
        },
        hint: {
          active: sandboxState.hint.active,
          lastText: sandboxState.hint.lastText || '-',
          count: sandboxState.hint.count,
          lastShownAt: sandboxState.hint.lastShownAt,
          lastTextPreview: (sandboxState.hint.lastText || '').slice(0, 40) || '-',
          requested: Boolean(sandboxState.hint.requested),
          source: sandboxState.hint.source || '-',
          emitter: sandboxState.hint.emitter || '-',
          generatedText: sandboxState.hint.generatedText || '-'
        },
        footsteps: {
          probability: sandboxState.fearSystem.footsteps.probability,
          cooldownRemaining: sandboxState.fearSystem.footsteps.cooldownRemaining,
          lastAt: sandboxState.fearSystem.footsteps.lastAt
        },
        lastWave: { count: sandboxState.wave.count, kind: sandboxState.wave.kind },
        blockedReason: sandboxState.blockedReason || sandboxState?.blocked?.reason || '-',
        techBacklog: sandboxState.techBacklog,
        theory: sandboxState.theory,
        transitions: Array.isArray(sandboxState?.transitions) ? sandboxState.transitions.slice(-20) : [],
        reveal: {
          visible: sandboxState.reveal.visible,
          phase: sandboxState.reveal.phase,
          doneAt: sandboxState.reveal.doneAt,
          startedAt: sandboxState.reveal.startedAt || 0,
          finishedAt: sandboxState.reveal.finishedAt || 0,
          rendered: Boolean(sandboxState.reveal.rendered),
          blockedReason: sandboxState.reveal.blockedReason || '-',
          active: sandboxState.reveal.visible && sandboxState.reveal.phase !== 'idle' && sandboxState.reveal.phase !== 'done',
          wordKey: sandboxState.reveal.wordKey || '-',
          text: sandboxState.reveal.text || '-',
          durationMs: sandboxState.reveal.durationMs
        },
        debug: {
          pass: {
            clickedAt: sandboxDebugPassRef.current.clickedAt,
            action: sandboxDebugPassRef.current.action
          },
          override: {
            active: sandboxState.debugOverride.active,
            source: sandboxState.debugOverride.source || '-',
            consumedAt: sandboxState.debugOverride.consumedAt || 0
          },
          actionAudit: { ...sandboxDebugActionAuditRef.current },
          flowTest: { ...sandboxFlowTestResult },
          parity: {
            sandboxJudgeResult: sandboxState.parity.sandboxJudgeResult,
            classicJudgeResult: sandboxState.parity.classicJudgeResult,
            sandboxClassicParity: sandboxState.parity.sandboxClassicParity
          }
        },
        promptNext: {
          id: (sandboxModeRef.current.getSSOT().nodes[sandboxState.nodeIndex + 1]?.id) ?? '-'
        },
      };
      sandboxRuntimeGuardRef.current.lastHydratedAt = now;
      updateEventDebug({
        mode: {
          id: modeRef.current.id
        },
        sandbox: {
          nodeIndex: sandboxState.nodeIndex,
          scheduler: {
            phase: mapSandboxSchedulerPhase(sandboxState.scheduler.phase)
          },
          reveal: {
            visible: sandboxState.reveal.visible,
            phase: sandboxState.reveal.phase
          },
          ghostMotion: {
            lastId: sandboxState.ghostMotion.lastId ?? '-',
            state: sandboxState.ghostMotion.state
          },
          ssot: {
            version: sandboxState.ssot?.version || sandboxSsotVersion
          },
          currentNode: {
            word: sandboxNode?.word ?? '-',
            char: sandboxNode?.char ?? '-'
          },
          consonant: {
            nodeChar: sandboxState.consonant.nodeChar ?? '-',
            promptText: sandboxState.consonant.promptText ?? '-',
            promptCurrent: sandboxState.consonant.promptCurrent ?? '-',
            parse: {
              ok: sandboxState.consonant.parse.ok,
              matchedChar: sandboxState.consonant.parse.matchedChar ?? '-',
              kind: sandboxState.consonant.parse.kind ?? '-',
              matchedAlias: sandboxState.consonant.parse.matchedAlias ?? '-',
              inputNorm: sandboxState.consonant.parse.inputNorm ?? '-',
              inputRaw: sandboxState.consonant.parse.inputRaw ?? '-',
              allowedSetsHit: sandboxState.consonant.parse.allowedSetsHit,
              matched: sandboxState.consonant.parse.matched ?? '-',
              blockedReason: sandboxState.consonant.parse.blockedReason ?? '-'
            },
            judge: {
              lastInput: sandboxState.consonant.judge.lastInput || '-',
              lastResult: sandboxState.consonant.judge.lastResult,
              timeoutEnabled: sandboxState.consonant.judge.timeoutEnabled
            }
          },
          judge: {
            result: sandboxState.parity.sandboxJudgeResult,
            classicResult: sandboxState.parity.classicJudgeResult,
            sandboxClassicParity: sandboxState.parity.sandboxClassicParity,
            blockedReason: sandboxState.advance.blockedReason || '-'
          }
        },
        lock: {
          isLocked: lockStateRef.current.isLocked,
          target: lockStateRef.current.target,
          elapsed: lockStateRef.current.isLocked ? now - lockStateRef.current.startedAt : 0,
          chatSpeedMultiplier: lockStateRef.current.isLocked ? 0.5 : 1
        },
        sfxCooldowns: { ...cooldownsRef.current },
        event: {
          ...(window.__CHAT_DEBUG__?.event ?? {}),
          stateMachine: Object.fromEntries(EVENT_TESTER_KEYS.map((eventKey) => {
            const status = eventAudioStateRef.current[eventKey];
            return [eventKey, {
              ...status,
              cooldownRemainingMs: Math.max(0, status.cooldownUntil - now)
            }];
          })),
          scheduler: {
            ...(window.__CHAT_DEBUG__?.event?.scheduler ?? {}),
            now,
            cooldowns: { ...cooldownsRef.current }
          },
          queue: {
            ...(window.__CHAT_DEBUG__?.event?.queue ?? {}),
            length: eventQueueRef.current.length
          },
          qna: {
            ...qnaStateRef.current
          },
          exclusive: eventExclusiveStateRef.current.exclusive,
          currentEventId: eventExclusiveStateRef.current.currentEventId,
          currentLockOwner: eventExclusiveStateRef.current.currentLockOwner,
          lockTarget: lockStateRef.current.target,
          lockElapsedSec: lockStateRef.current.isLocked ? Math.max(0, Math.floor((now - lockStateRef.current.startedAt) / 1000)) : 0,
          foreignTagBlockedCount: foreignTagBlockedCountRef.current,
          lastBlockedReason: lastBlockedReasonRef.current
        }
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sandboxSsotVersion, updateEventDebug]);

  useEffect(() => {
    if (!isReady || !appStarted) return;
    if (modeRef.current.id === 'sandbox_story') return;

    let timer = 0;
    const burstTimers: number[] = [];

    const tick = () => {
      const baseChance = 0.35;
      const boostedChance = state.curse > 50 ? Math.min(0.95, baseChance * 1.5) : baseChance;

      if (Math.random() < boostedChance) {
        const now = Date.now();
        const canBurst = now >= burstCooldownUntil.current;
        const shouldBurst = canBurst && (state.curse > 60 || Math.random() < 0.12);

        if (shouldBurst) {
          burstCooldownUntil.current = now + 25_000;
          const burstMessages = randomInt(3, 6);
          const burstTotal = randomInt(5, 20);

          setViewerCount((value) => Math.min(99_999, value + burstTotal));

          for (let i = 0; i < burstMessages; i += 1) {
            const delayMs = i * randomInt(100, 200);
            const burstTimer = window.setTimeout(() => {
              const username = pickOne(usernames);
              dispatchChatMessage({
                id: crypto.randomUUID(),
                type: 'system',
                subtype: 'join',
                username: 'system',
                text: `${username} 加入聊天室`,
                language: 'zh'
              }, { source: 'system_ui' });
            }, delayMs);
            burstTimers.push(burstTimer);
          }
        } else {
          const username = pickOne(usernames);
          const normalJoinBoost = randomInt(1, 3);

          setViewerCount((value) => Math.min(99_999, value + normalJoinBoost));
          dispatchChatMessage({
            id: crypto.randomUUID(),
            type: 'system',
            subtype: 'join',
            username: 'system',
            text: `${username} 加入聊天室`,
            language: 'zh'
          }, { source: 'system_ui' });
        }
      }

      timer = window.setTimeout(tick, nextJoinDelayMs());
    };

    timer = window.setTimeout(tick, nextJoinDelayMs());
    return () => {
      window.clearTimeout(timer);
      burstTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [appStarted, state.curse, isReady]);

  useEffect(() => {
    if (!isReady || !appStarted) return;

    let timer = 0;

    const tick = () => {
      if (Math.random() < 0.08) {
        const leaveCount = randomInt(1, 5);
        setViewerCount((value) => Math.max(0, value - leaveCount));
      }

      timer = window.setTimeout(tick, nextLeaveDelayMs());
    };

    timer = window.setTimeout(tick, nextLeaveDelayMs());
    return () => window.clearTimeout(timer);
  }, [appStarted, loadingState]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!isReady || !appStarted) return;
      const now = Date.now();
      if (now - lastInputTimestamp.current <= 15_000) return;
      if (now - lastIdleCurseAt.current < 10_000) return;
      lastIdleCurseAt.current = now;
      dispatch({ type: 'INCREASE_CURSE_IDLE', payload: { amount: 2 } });
    }, 5_000);

    return () => window.clearInterval(timer);
  }, [appStarted, loadingState]);


  useEffect(() => {
    if (loadingState === 'ERROR') return;
    if (isReady && isRendererReady && loadingState === 'ASSETS_CHECKING') {
      setLoadingState('ASSETS_READY');
    }
  }, [isReady, isRendererReady, loadingState]);

  useEffect(() => {
    if (loadingState !== 'RUNNING' || postedInitMessages.current) return;
    postedInitMessages.current = true;
    dispatchChatMessage({
      id: crypto.randomUUID(),
      type: 'system',
      username: 'system',
      text: '畫面已準備完成',
      language: 'zh'
    }, { source: 'system_ui' });
    dispatchChatMessage({
      id: crypto.randomUUID(),
      type: 'system',
      username: 'system',
      text: '初始化完成',
      language: 'zh'
    }, { source: 'system_ui' });
  }, [loadingState]);

  useEffect(() => {
    if (!isReady || !appStarted || !hasOptionalAssetWarning || postedOptionalAssetWarningMessage.current) return;
    postedOptionalAssetWarningMessage.current = true;
    dispatchChatMessage({
      id: crypto.randomUUID(),
      type: 'system',
      username: 'system',
      text: '部分非必要素材載入失敗，遊戲可正常進行。',
      language: 'zh'
    }, { source: 'system_ui' });
  }, [appStarted, hasOptionalAssetWarning, isReady]);


  const hasFatalInitError = requiredAssetErrors.length > 0;
  const isLoading = !hasFatalInitError && (!isReady || !isRendererReady);
  const shouldShowMainContent = true;
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [mentionTarget, setMentionTarget] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [debugComposingOverride, setDebugComposingOverride] = useState<boolean | null>(null);
  const [simulatePlayerReply, setSimulatePlayerReply] = useState(true);
  const [ignoreCooldownsDebug, setIgnoreCooldownsDebug] = useState(false);
  const [ignorePauseDebug, setIgnorePauseDebug] = useState(false);
  const [skipTagRequirementDebug, setSkipTagRequirementDebug] = useState(false);
  const [eventTesterStatus, setEventTesterStatus] = useState<{ key: StoryEventKey | null; blockedReason: EventStartBlockedReason | null }>({
    key: null,
    blockedReason: null
  });
  const forcedDebugRef = useRef<{ lastForcedEventKey: StoryEventKey | null; lastForcedAt: number | null; lastForcedOptions: DebugForceExecuteOptions | null; forcedEventCount: number }>({
    lastForcedEventKey: null,
    lastForcedAt: null,
    lastForcedOptions: null,
    forcedEventCount: 0
  });
  const [sendFeedback, setSendFeedback] = useState<{ reason: string; at: number } | null>(null);
  const activeUserProfileRef = useRef<ActiveUserProfile | null>(null);
  const usersByIdRef = useRef<Map<string, ActiveUserProfile>>(new Map());
  const usersByHandleRef = useRef<Map<string, ActiveUserProfile>>(new Map());
  const lastMessageMentionsActiveUserRef = useRef(false);
  const lastParsedMentionsRef = useRef<{ messageId: string; mentions: string[] }>({ messageId: '-', mentions: [] });
  const sandboxAutoPinFreezeRef = useRef<{
    lastMessageId: string;
    lastReason: '-' | 'vip_direct_mention' | 'story_critical_hint_followup';
    freezeUntil: number;
    freezeMs: number;
    lastHintFollowUpEvent: string;
    lastEvaluation: {
      messageId: string;
      isVip: boolean;
      hasPlayerMention: boolean;
      directToPlayer: boolean;
      hitVipDirectMentionRule: boolean;
      hitStoryCriticalRule: boolean;
      shouldPin: boolean;
      failureReason: string;
      pinnedReason: string;
      freezeReason: string;
      highlightOnly: boolean;
    };
    lastDirectMentionDetected: {
      messageId: string;
      at: number;
      hasPlayerMention: boolean;
      isVipSpeaker: boolean;
      directToPlayer: boolean;
    };
    lastPinnedCandidateMessageId: string;
    lastPinnedCreatedAt: number;
    lastPinnedDroppedReason: string;
    lastPinnedDroppedAt: number;
    lastPinnedOverrideByMessageId: string;
    lastPinnedOverwriteAt: number;
    lastPinnedAutoClearAt: number;
    lastPinnedAutoClearReason: string;
    lastPinnedRenderVisible: boolean;
    pinnedStateKey: string;
    pinnedStateSummary: string;
    pinnedSourceReason: string;
    pinnedExpiresAt: number;
    pinnedRemainingMs: number;
    pinnedComponentMounted: boolean;
    highlightWithoutPinned: boolean;
    cleanupClearedPinned: boolean;
    pinnedOverwrittenByMessageId: string;
  }>({
    lastMessageId: '-',
    lastReason: '-',
    freezeUntil: 0,
    freezeMs: 0,
    lastHintFollowUpEvent: '-',
    lastEvaluation: {
      messageId: '-',
      isVip: false,
      hasPlayerMention: false,
      directToPlayer: false,
      hitVipDirectMentionRule: false,
      hitStoryCriticalRule: false,
      shouldPin: false,
      failureReason: 'not_evaluated',
      pinnedReason: '-',
      freezeReason: '-',
      highlightOnly: false
    },
    lastDirectMentionDetected: { messageId: '-', at: 0, hasPlayerMention: false, isVipSpeaker: false, directToPlayer: false },
    lastPinnedCandidateMessageId: '-',
    lastPinnedCreatedAt: 0,
    lastPinnedDroppedReason: '-',
    lastPinnedDroppedAt: 0,
    lastPinnedOverrideByMessageId: '-',
    lastPinnedOverwriteAt: 0,
    lastPinnedAutoClearAt: 0,
    lastPinnedAutoClearReason: '-',
    lastPinnedRenderVisible: false,
    pinnedStateKey: 'sandboxPinnedEntry',
    pinnedStateSummary: 'null',
    pinnedSourceReason: '-',
    pinnedExpiresAt: 0,
    pinnedRemainingMs: 0,
    pinnedComponentMounted: false,
    highlightWithoutPinned: false,
    cleanupClearedPinned: false,
    pinnedOverwrittenByMessageId: '-'
  });
  const lastHighlightReasonRef = useRef<'mentions_activeUser' | 'none'>('none');
  const tagHighlightAppliedCountRef = useRef(0);
  const [sendDebug, setSendDebug] = useState({
    lastClickAt: 0,
    lastSubmitAt: 0,
    lastAttemptAt: 0,
    lastResult: '-' as 'sent' | 'blocked' | 'error' | '-',
    blockedReason: '',
    errorMessage: ''
  });
  const containerHeight = shellRef.current?.getBoundingClientRect().height ?? null;
  const headerHeight = headerRef.current?.getBoundingClientRect().height ?? null;
  const videoHeight = videoRef.current?.getBoundingClientRect().height ?? null;
  const chatHeight = chatAreaRef.current?.getBoundingClientRect().height ?? null;

  const loadingErrorTitle = useMemo(() => {
    if (!hasFatalInitError) return undefined;
    return '初始化失敗：素材未加入專案或 base path 設定錯誤';
  }, [hasFatalInitError]);

  const updateChatDebug = useCallback((patch: Partial<NonNullable<Window['__CHAT_DEBUG__']>>) => {
    const base = window.__CHAT_DEBUG__ ?? ({} as NonNullable<Window['__CHAT_DEBUG__']>);
    window.__CHAT_DEBUG__ = {
      ...base,
      ...patch,
      ui: {
        ...(base.ui ?? {}),
        ...(patch.ui ?? {})
      }
    };
  }, []);

  const blockRenameAttempt = useCallback((_nextHandle: string): false => {
    updateChatDebug({ ui: { send: { blockedReason: 'rename_disabled' } } });
    return false;
  }, [updateChatDebug]);

  useEffect(() => {
    const keys = EVENT_REGISTRY_KEYS.slice();
    console.log('[EVENT_REGISTRY]', {
      count: keys.length,
      eventIds: keys,
      hasGhostFemale: keys.some((key) => {
        const def = EVENT_REGISTRY[key];
        return def.preEffect?.sfxKey === 'ghost_female' || def.postEffect?.sfxKey === 'ghost_female';
      }),
      hasFootsteps: keys.some((key) => {
        const def = EVENT_REGISTRY[key];
        return def.preEffect?.sfxKey === 'footsteps' || def.postEffect?.sfxKey === 'footsteps';
      })
    });
  }, []);

  useEffect(() => {
    window.__THAIFEED_RENAME_ACTIVE_USER__ = blockRenameAttempt;
    window.__THAIFEED_CHANGE_NAME__ = blockRenameAttempt;
    window.__THAIFEED_SET_NAME__ = blockRenameAttempt;
    return () => {
      delete window.__THAIFEED_RENAME_ACTIVE_USER__;
      delete window.__THAIFEED_CHANGE_NAME__;
      delete window.__THAIFEED_SET_NAME__;
    };
  }, [blockRenameAttempt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const chatActors = separateChatActorState(sortedMessages, activeUserInitialHandleRef.current || '');
      const activeUsers = chatActors.audienceUsers;
      const nextDueAt = Math.max(now, eventNextDueAtRef.current || now);
      const schedulerBlockedReason = !appStarted ? 'app_not_started' : (lockStateRef.current.isLocked ? 'lock_active' : '-');
      const schedulerBlocked = schedulerBlockedReason !== '-';
      const questionMessageId = qnaStateRef.current.active.questionMessageId;
      const questionMessage = questionMessageId ? sortedMessages.find((message) => message.id === questionMessageId) : null;
      const questionHasTagToActiveUser = Boolean(questionMessage?.mentions?.includes('activeUser'));
      const isTaggedQuestionActive = Boolean(
        bootstrapRef.current.isReady
        && qnaStateRef.current.active.status === 'AWAITING_REPLY'
        && questionMessageId
        && questionMessage
        && questionHasTagToActiveUser
      );
      const qnaTrace = qnaTxnTraceRef.current;
      const snapshot = {
        registry: {
          count: EVENT_REGISTRY_KEYS.length,
          keys: EVENT_REGISTRY_KEYS.slice(0, 20),
          enabledCount: EVENT_REGISTRY_KEYS.length,
          disabledCount: 0,
          manifest: getEventManifest()
        },
        scheduler: {
          now,
          nextDueAt,
          lastFiredAt: eventLastAtRef.current,
          tickCount: eventTickCountRef.current,
          lastTickAt: eventLastTickAtRef.current,
          blocked: schedulerBlocked,
          blockedReason: schedulerBlockedReason,
          cooldowns: { ...cooldownsRef.current, ...eventCooldownsRef.current }
        },
        candidates: {
          lastComputedAt: eventLastComputedAtRef.current,
          lastCandidateCount: eventLastCandidateCountRef.current,
          lastCandidateKeys: eventLastCandidateKeysRef.current.slice(0, 10),
          lastGateRejectSummary: { ...eventGateRejectSummaryRef.current }
        },
        lastEvent: {
          key: eventLifecycleRef.current?.key ?? eventLastKeyRef.current,
          eventId: eventLifecycleRef.current?.eventId,
          at: eventLifecycleRef.current?.at ?? eventLastAtRef.current,
          reason: eventLastReasonRef.current,
          lineVariantId: eventLastVariantIdRef.current,
          state: eventLifecycleRef.current?.state ?? 'done',
          starterTagSent: eventLifecycleRef.current?.starterTagSent ?? false,
          preEffectTriggered: eventLifecycleRef.current?.preEffectTriggered ?? preEffectStateRef.current.triggered,
          preEffectAt: eventLifecycleRef.current?.preEffectAt ?? preEffectStateRef.current.at,
          preEffect: eventLifecycleRef.current?.preEffect ?? { sfxKey: preEffectStateRef.current.sfxKey, videoKey: preEffectStateRef.current.videoKey },
          abortedReason: eventLifecycleRef.current?.abortedReason,
          waitingForReply: Boolean(pendingReplyEventRef.current),
          openerLineId: eventLifecycleRef.current?.openerLineId,
          followUpLineId: eventLifecycleRef.current?.followUpLineId,
          lineIds: eventLifecycleRef.current?.lineIds ?? [],
          topic: eventLifecycleRef.current?.topic,
          qnaTxId: qnaStateRef.current.active.id || qnaTrace.txId || '-',
          qnaCheckpoint: qnaTrace.lastCheckpoint,
          qnaCheckpointAt: qnaTrace.checkpointAt || null,
          qnaAbortReason: qnaStateRef.current.active.abortReason ?? qnaTrace.abortReason
        },
        blocking: {
          isLocked: lockStateRef.current.isLocked,
          lockTarget: lockStateRef.current.target,
          lockElapsedSec: lockStateRef.current.isLocked ? Math.max(0, Math.floor((now - lockStateRef.current.startedAt) / 1000)) : 0,
          schedulerBlocked,
          schedulerBlockedReason,
          lockReason: qnaStateRef.current.isActive
            ? `${qnaStateRef.current.eventKey ?? '-'} / ${qnaStateRef.current.flowId || '-'} / ${qnaStateRef.current.stepId || '-'}`
            : (eventLifecycleRef.current?.key ?? '-'),
          replyingToMessageId: lockStateRef.current.replyingToMessageId,
          lockTargetMissing: lockStateRef.current.isLocked && !lockStateRef.current.target
        },
        cooldowns: { ...cooldownsRef.current, ...eventCooldownsRef.current },
        cooldownMeta: Object.fromEntries(EVENT_REGISTRY_KEYS.map((key) => [key, eventCooldownMetaRef.current[key]])),
        inFlight: eventRunnerStateRef.current.inFlight,
        lastStartAttemptBlockedReason: eventTestDebugRef.current.lastStartAttemptBlockedReason,
        test: {
          ...eventTestDebugRef.current
        },
        qna: {
          ...qnaStateRef.current,
          active: {
            ...qnaStateRef.current.active,
            txId: qnaStateRef.current.active.id || qnaTrace.txId || '-',
            checkpoint: qnaTrace.lastCheckpoint,
            checkpointAt: qnaTrace.checkpointAt || null
          },
          questionMessageId: qnaStateRef.current.active.questionMessageId,
          questionHasTagToActiveUser,
          isTaggedQuestionActive,
          lockTargetInvalid: Boolean(qnaStateRef.current.lockTarget && qnaStateRef.current.taggedUser && qnaStateRef.current.lockTarget === qnaStateRef.current.taggedUser),
          taggedUserHandle: qnaStateRef.current.taggedUser,
          lastQuestionMessageId,
          lastQuestionMessageHasTag,
          lastBlockedReason
        }
      };

      updateChatDebug({
        audio: {
          ...((window.__CHAT_DEBUG__ as { audio?: Record<string, unknown> } | undefined)?.audio ?? {}),
          lastApproach: ((window.__CHAT_DEBUG__ as { audio?: { lastApproach?: Record<string, unknown> } } | undefined)?.audio?.lastApproach ?? null)
        },
        fx: {
          ...((window.__CHAT_DEBUG__ as { fx?: Record<string, unknown> } | undefined)?.fx ?? {}),
          blackout: {
            isActive: blackoutState.isActive,
            mode: blackoutState.mode,
            endsInMs: blackoutState.endsAt ? Math.max(0, blackoutState.endsAt - now) : 0
          }
        },
        event: snapshot,
        sandbox: {
          ...((window.__CHAT_DEBUG__ as { sandbox?: Record<string, unknown> } | undefined)?.sandbox ?? {}),
          audit: {
            ...(((window.__CHAT_DEBUG__ as { sandbox?: { audit?: Record<string, unknown> } } | undefined)?.sandbox?.audit ?? {})),
            autoPinFreeze: {
              ...sandboxAutoPinFreezeRef.current,
              pinnedRemainingMs: sandboxPinnedEntry ? Math.max(0, sandboxPinnedEntry.expiresAt - now) : 0,
              lastPinnedRenderVisible: Boolean(sandboxPinnedEntry?.visible),
              pinnedStateKey: 'sandboxPinnedEntry',
              pinnedStateSummary: sandboxPinnedEntry
                ? `${sandboxPinnedEntry.id}:${sandboxAutoPinFreezeRef.current.pinnedSourceReason}:${sandboxPinnedEntry.messageId}`
                : 'null',
              pinnedSourceReason: sandboxAutoPinFreezeRef.current.pinnedSourceReason ?? '-',
              pinnedSourceType: sandboxPinnedEntry?.pinnedSourceType ?? '-',
              pinnedSourceId: sandboxPinnedEntry?.pinnedSourceId ?? '-',
              linkedToReplyGate: Boolean(sandboxPinnedEntry?.linkedToReplyGate),
              pinnedExpiresAt: sandboxPinnedEntry?.expiresAt ?? 0,
              pinnedComponentMounted: sandboxPinnedMounted,
              highlightWithoutPinned: lastHighlightReasonRef.current === 'mentions_activeUser' && !sandboxPinnedEntry,
              freezeRemainingMs: Math.max(0, sandboxAutoPinFreezeRef.current.freezeUntil - now)
            }
          },
          qna: {
            ...(((window.__CHAT_DEBUG__ as { sandbox?: { qna?: Record<string, unknown> } } | undefined)?.sandbox?.qna ?? {})),
            lastResolveAt: sandboxQnaDebugRef.current.lastResolveAt,
            lastResolveReason: sandboxQnaDebugRef.current.lastResolveReason,
            lastClearReplyUiAt: sandboxQnaDebugRef.current.lastClearReplyUiAt,
            lastClearReplyUiReason: sandboxQnaDebugRef.current.lastClearReplyUiReason,
            lastAnomaly: sandboxQnaDebugRef.current.lastAnomaly
          }
        },
        ui: {
          ...(window.__CHAT_DEBUG__?.ui ?? {}),
          replyPreviewSuppressed: replyPreviewSuppressedReason ?? '-',
          replyPinMounted,
          replyBarVisible: qnaStateRef.current.active.status === 'AWAITING_REPLY' && Boolean(qnaStateRef.current.active.questionMessageId),
          replyToMessageId: lockStateRef.current.replyingToMessageId,
          freezeGuard: (window.__CHAT_DEBUG__?.event as { freezeGuard?: { hasRealTag?: boolean; replyUIReady?: boolean; freezeAllowed?: boolean } } | undefined)?.freezeGuard ?? { hasRealTag: false, replyUIReady: false, freezeAllowed: false },
          replyBarMessageFound: Boolean(qnaStateRef.current.active.questionMessageId && sortedMessages.some((message) => message.id === qnaStateRef.current.active.questionMessageId)),
          replyPinContainerLocation: 'input_overlay',
          replyPinInsideChatList: false,
          replyPreviewLocation: 'input_overlay_above_input',
          legacyReplyQuoteEnabled: false,
          qnaQuestionMessageIdRendered,
          pinned: {
            visible: Boolean(sandboxPinnedEntry?.visible),
            textPreview: (sandboxPinnedEntry?.body ?? '-').slice(0, 60)
          },
          sandboxPinned: {
            mounted: sandboxPinnedMounted,
            visible: Boolean(sandboxPinnedEntry?.visible),
            reason: sandboxAutoPinFreezeRef.current.pinnedSourceReason ?? '-',
            sourceType: sandboxPinnedEntry?.sourceType ?? '-',
            sourceMessageId: sandboxPinnedEntry?.messageId ?? '-',
            expiresAt: sandboxPinnedEntry?.expiresAt ?? 0,
            remainingMs: sandboxPinnedEntry ? Math.max(0, sandboxPinnedEntry.expiresAt - now) : 0
          },
          qnaSyncAssert: (() => {
            const awaiting = qnaStateRef.current.active.status === 'AWAITING_REPLY';
            const found = Boolean(qnaStateRef.current.active.questionMessageId && sortedMessages.some((message) => message.id === qnaStateRef.current.active.questionMessageId));
            const tagOk = Boolean(sortedMessages.find((message) => message.id === qnaStateRef.current.active.questionMessageId)?.mentions?.includes('activeUser'));
            return awaiting
              ? (found && tagOk && Boolean(qnaStateRef.current.active.questionMessageId))
              : !(qnaStateRef.current.active.status === 'AWAITING_REPLY');
          })()
        },
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          autoPaused: chatAutoPaused,
          autoPausedReason: chatAutoPaused ? (window.__CHAT_DEBUG__?.ui?.send?.blockedReason ?? 'manual_or_unknown') : '-',
          autoScrollMode: chatAutoScrollMode,
          freeze: { ...chatFreeze },
          pause: {
            isPaused: chatFreeze.isFrozen,
            setAt: pauseSetAt ?? 0,
            reason: pauseReason ?? '-'
          },
          scroll: {
            containerFound: lastForceContainerFound,
            lastForceReason: lastForceToBottomReason ?? '-',
            lastForceAt: lastForceToBottomAt ?? 0,
            lastForceResult: lastForceResult,
            metrics: {
              top: lastForceScrollMetrics?.top ?? 0,
              height: lastForceScrollMetrics?.height ?? 0,
              clientHeight: lastForceScrollMetrics?.client ?? 0
            }
          },
          npcSpawnBlockedByFreeze: npcSpawnBlockedByFreezeRef.current,
          ghostBlockedByFreeze: ghostBlockedByFreezeRef.current,
          freezeCountdownRemaining: chatFreezeCountdownRemaining,
          freezeAfterNMessages: chatFreezeAfterNMessages,
          lastScrollFreezeReason: lastScrollFreezeReason ?? '-',
          lastScrollModeChangeAt: lastScrollModeChangeAt ?? 0,
          freezeCountdownStartedAt: chatFreezeCountdownStartedAt ?? 0,
          lastMessageActorIdCounted: chatLastMessageActorIdCounted ?? '-',
          lastCountdownDecrementAt: chatLastCountdownDecrementAt ?? 0,
          activeUsers: {
            count: activeUsers.length,
            nameSample: activeUsers.slice(0, 6),
            namesSample: activeUsers.slice(0, 6),
            currentHandle: activeUserInitialHandleRef.current || '-',
            initialHandle: activeUserInitialHandleRef.current || '-',
            renameDisabled: true
          },
          audience: {
            count: chatActors.audienceUsers.length
          },
          messages: {
            lastSeq: sortedMessages[sortedMessages.length - 1]?.seq ?? 0,
            last10: sortedMessages.slice(-10).map((message) => ({
              id: message.id,
              createdAtMs: message.createdAtMs ?? 0,
              seq: message.seq ?? 0,
              source: message.source ?? '-'
            }))
          },
          activeUser: {
            id: activeUserProfileRef.current?.id ?? '-',
            handle: activeUserProfileRef.current?.handle ?? '-',
            displayName: activeUserProfileRef.current?.displayName ?? '-',
            registryHandleExists: Boolean(activeUserProfileRef.current && usersByHandleRef.current.has(toHandleKey(activeUserProfileRef.current.handle))),
            registered: Boolean(activeUserProfileRef.current && usersByHandleRef.current.has(toHandleKey(activeUserProfileRef.current.handle)))
          },
          system: {
            bootstrap: { ...bootstrapRef.current },
            audioEnabledSystemMessageSent: audioEnabledSystemMessageSentRef.current,
            audioUnlockFailedReason: audioUnlockFailedReasonRef.current ?? '-',
            lastBlockedReason: lastBlockedReasonRef.current,
            debugReset: (window.__CHAT_DEBUG__ as { debugReset?: { count?: number; reason?: string; resetAt?: number } } | undefined)?.debugReset ?? { count: 0, reason: '-', resetAt: 0 }
          },
          canTagActiveUser: Boolean(bootstrapRef.current.isReady && activeUserProfileRef.current && usersByHandleRef.current.has(toHandleKey(activeUserProfileRef.current.handle))),
          mention: {
            lastMessageMentionsActiveUser: lastMessageMentionsActiveUserRef.current,
            lastParsedMentions: { ...lastParsedMentionsRef.current },
            lastHighlightReason: lastHighlightReasonRef.current,
            tagHighlightAppliedCount: tagHighlightAppliedCountRef.current
          },
          lastActorPicked: {
            id: window.__CHAT_DEBUG__?.chat?.lastActorPicked?.id ?? '-'
          },
          actorPickBlockedReason: window.__CHAT_DEBUG__?.chat?.actorPickBlockedReason ?? '-'
        }
      } as Partial<NonNullable<Window['__CHAT_DEBUG__']>>);
      syncChatEngineDebug();
    }, 600);
    return () => window.clearInterval(timer);
  }, [appStarted, blackoutState.endsAt, blackoutState.isActive, blackoutState.mode, chatAutoPaused, chatAutoScrollMode, chatFreeze, chatFreezeAfterNMessages, chatFreezeCountdownRemaining, chatFreezeCountdownStartedAt, chatLastCountdownDecrementAt, chatLastMessageActorIdCounted, lastBlockedReason, lastQuestionMessageHasTag, lastQuestionMessageId, replyPreviewSuppressedReason, sandboxPinnedEntry, sandboxPinnedMounted, sortedMessages, syncChatEngineDebug, updateChatDebug]);

  useEffect(() => {
    if (chatAutoPaused) {
      stopBlackout();
    }
  }, [chatAutoPaused, stopBlackout]);

  const logSendDebug = useCallback((event: string, payload: Record<string, unknown>) => {
    if (!debugEnabled) return;
    console.log('[CHAT_DEBUG_SEND]', event, payload);
  }, [debugEnabled]);

  useEffect(() => {
    if (!sendFeedback) return;
    const timer = window.setTimeout(() => {
      setSendFeedback((prev) => (prev?.at === sendFeedback.at ? null : prev));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [sendFeedback]);

  useEffect(() => {
    updateChatDebug({
      ui: {
        send: {
          ...sendDebug,
          stateSnapshot: {
            inputLen: input.trim().length,
            isSending,
            isComposing,
            cooldownMsLeft: Math.max(0, sendCooldownUntil.current - Date.now()),
            tagLockActive: Boolean(replyTarget || mentionTarget),
            replyTarget,
            mentionTarget,
            canSendComputed: isReady && !isSending && input.trim().length > 0 && !isComposing
          }
        }
      }
    });
  }, [debugComposingOverride, input, isComposing, isReady, isSending, mentionTarget, replyTarget, sendDebug, updateChatDebug]);

  const clearSandboxAdvanceRetry = useCallback(() => {
    if (sandboxAdvanceRetryTimerRef.current != null) {
      window.clearTimeout(sandboxAdvanceRetryTimerRef.current);
      sandboxAdvanceRetryTimerRef.current = null;
    }
  }, []);

  const clearSandboxRevealDoneTimer = useCallback(() => {
    if (sandboxRevealDoneTimerRef.current != null) {
      window.clearTimeout(sandboxRevealDoneTimerRef.current);
      sandboxRevealDoneTimerRef.current = null;
    }
  }, []);

  const clearSandboxTagPhaseTimeout = useCallback(() => {
    if (sandboxTagPhaseTimeoutRef.current != null) {
      window.clearTimeout(sandboxTagPhaseTimeoutRef.current);
      sandboxTagPhaseTimeoutRef.current = null;
    }
    sandboxTagPhaseTimeoutFiredRef.current = false;
  }, []);

  const isSandboxPromptRevealMismatch = useCallback((st: any) => {
    const promptWordKey = st?.prompt?.current?.wordKey ?? '';
    const revealWordKey = st?.reveal?.wordKey ?? '';
    if (!promptWordKey || !revealWordKey) return false;
    return promptWordKey !== revealWordKey;
  }, []);

  const applySandboxCorrect = useCallback((payload?: { input?: string; matchedChar?: string; source?: string }) => {
    if (modeRef.current.id !== 'sandbox_story') return;
    sandboxModeRef.current.applyCorrect({ input: payload?.input, matchedChar: payload?.matchedChar });
    clearChatFreeze('sandbox_consonant_correct');
    setChatAutoPaused(false);
    sendCooldownUntil.current = Date.now() + 350;
    tagSlowActiveRef.current = false;
    setInput('');
    bumpSandboxRevealTick();
  }, [clearChatFreeze]);

  const showHintForCurrentPrompt = useCallback((params: { judge: 'unknown' | 'wrong' | 'help'; currentPrompt: { consonant: string; wordKey: string }; hintText?: string }) => {
    const hintLine = params.hintText?.trim() || '';
    if (!hintLine) return;
    const hintViewers = ['viewer_203', 'viewer_118', 'viewer_409', 'viewer_526'];
    const emitter = hintViewers[Math.floor(Math.random() * hintViewers.length)] || 'viewer_203';
    sandboxModeRef.current.commitHintText(hintLine, 'imageMemoryLibrary', { requested: true, emitter, generatedText: hintLine });
    dispatchChatMessage({
      id: crypto.randomUUID(),
      username: emitter,
      text: hintLine,
      language: 'zh',
      translation: hintLine
    }, { source: 'sandbox_consonant', sourceTag: params.judge === 'help' ? 'sandbox_consonant_hint_help' : (params.judge === 'unknown' ? 'sandbox_consonant_hint_unknown' : 'sandbox_consonant_hint_wrong') });
  }, [dispatchChatMessage]);

  useEffect(() => () => {
    clearSandboxAdvanceRetry();
    clearSandboxRevealDoneTimer();
    clearSandboxTagPhaseTimeout();
    if (sandboxSupernaturalTimerRef.current != null) {
      window.clearTimeout(sandboxSupernaturalTimerRef.current);
      sandboxSupernaturalTimerRef.current = null;
    }
    if (sandboxVipTranslateTimerRef.current != null) {
      window.clearTimeout(sandboxVipTranslateTimerRef.current);
      sandboxVipTranslateTimerRef.current = null;
    }
  }, [clearSandboxAdvanceRetry, clearSandboxRevealDoneTimer, clearSandboxTagPhaseTimeout]);

  const submitChat = useCallback(async (rawText: string, source: SendSource): Promise<SendResult> => {
    const now = Date.now();
    const markBlocked = (reason: string): SendResult => {
      const next = {
        ...sendDebug,
        lastAttemptAt: now,
        lastResult: 'blocked' as const,
        blockedReason: reason,
        errorMessage: ''
      };
      setSendDebug(next);
      setSendFeedback({ reason, at: now });
      updateChatDebug({
        ui: {
          send: {
            ...next,
            blockedAt: now
          }
        }
      });
      logSendDebug('blocked', { reason, source, inputLen: rawText.trim().length });
      return { ok: false, status: 'blocked', reason };
    };

    if (!isReady) return markBlocked('not_ready');
    if (isSending) return markBlocked('is_sending');
    const cooldownMsLeft = Math.max(0, sendCooldownUntil.current - now);
    if (cooldownMsLeft > 0) return markBlocked('cooldown_active');

    const raw = rawText.trim();
    if (!raw) return markBlocked('empty_input');
    if (isComposing) return markBlocked('is_composing');
    const normalizeHandleToken = (value: string | null | undefined) => {
      const normalized = normalizeHandle(value || '');
      return normalized ? normalized.toLowerCase() : '';
    };
    const isSelfHandle = (value: string | null | undefined) => {
      const normalized = normalizeHandleToken(value);
      if (!normalized) return false;
      const activeHandle = normalizeHandleToken(activeUserInitialHandleRef.current || activeUserProfileRef.current?.handle || '');
      return Boolean(activeHandle) && normalized === activeHandle;
    };
    const stripLeadingMentions = (text: string) => text.replace(/^\s*(?:@[\w_]+\s*)+/, '').trim();
    const lockTarget = lockStateRef.current.isLocked ? (lockStateRef.current.target ?? null) : null;
    const shouldRewriteForLock = Boolean(lockTarget && !isSelfHandle(lockTarget));
    if (lockTarget && isSelfHandle(lockTarget)) {
      lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
      setReplyPreviewSuppressedReason('self_lock_target_guard');
      sandboxQnaDebugRef.current.lastAnomaly = 'self_lock_target_guard';
    }
    const outgoingText = shouldRewriteForLock
      ? `@${lockTarget} ${stripLeadingMentions(raw)}`.trim()
      : raw;
    if (lockStateRef.current.isLocked && lockStateRef.current.target) {
      const explicitReplyTarget = raw.match(/^\s*@([\w_]+)/u)?.[1] ?? null;
      if (explicitReplyTarget && explicitReplyTarget !== lockStateRef.current.target) {
        lastBlockedReasonRef.current = 'player_reply_target_rewritten';
      }
    }

    let nextReplyTarget = replyTarget;
    let nextMentionTarget = mentionTarget;
    const selfTokens = new Set(['you']);
    const explicitMention = raw.match(/@([\w_]+)/)?.[1] ?? null;
    if (explicitMention) nextMentionTarget = explicitMention;
    const selfTagged = [nextReplyTarget, nextMentionTarget].some((target) => target && selfTokens.has(target.toLowerCase()));
    if (selfTagged) {
      nextReplyTarget = null;
      nextMentionTarget = null;
      setReplyTarget(null);
      setMentionTarget(null);
      logSendDebug('self_tag_ignored', { source, raw });
      updateChatDebug({ ui: { send: { blockedReason: 'self_tag_ignored' } } });
    }

    setReplyTarget(nextReplyTarget);
    setMentionTarget(nextMentionTarget);

    let sandboxSubmitGateAcquired = false;
    if (modeRef.current.id === 'sandbox_story') {
      const sandboxState = sandboxModeRef.current.getState();
      if (sandboxState.answer.submitInFlight) {
        sandboxModeRef.current.commitAdvanceBlockedReason('double_submit');
        dispatchChatMessage({
          id: crypto.randomUUID(),
          username: 'mod_live',
          type: 'chat',
          text: '收到，等一下，正在處理上一題。',
          language: 'zh',
          translation: '收到，等一下，正在處理上一題。'
        }, { source: 'sandbox_consonant', sourceTag: 'sandbox_input_lock' });
        return markBlocked('sandbox_double_submit');
      }
      sandboxSubmitGateAcquired = true;
      sandboxModeRef.current.setSubmitInFlight(true, now);
    }

    setIsSending(true);
    const submitDelayMs = randomInt(1000, 5000);
    const attemptDebug = {
      ...sendDebug,
      lastAttemptAt: now,
      blockedReason: '',
      errorMessage: ''
    };
    const markSent = (mode: string, messageId?: string): SendResult => {
      if (!appStarted) {
        return markBlocked('app_not_started');
      }
      if (chatAutoPaused) {
        setChatAutoPaused(false);
      }
      resetChatAutoScrollFollow();
      const next = { ...attemptDebug, lastResult: 'sent' as const };
      setSendDebug(next);
      logSendDebug('sent', { source, mode, autoResumed: chatAutoPaused, autoScrollMode: chatAutoScrollMode });
      return { ok: true, status: 'sent', messageId };
    };
    setSendDebug(attemptDebug);
    logSendDebug('attempt', { source, inputLen: raw.length, submitDelayMs });

    try {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, submitDelayMs);
      });

      lastInputTimestamp.current = Date.now();
      lastIdleCurseAt.current = 0;

      const playableConsonant = resolvePlayableConsonant(state.currentConsonant.letter);

      if (!activeUserInitialHandleRef.current) {
        return markBlocked('no_active_user');
      }
      const playerMessage = createPlayerMessage(outgoingText, activeUserInitialHandleRef.current);
      dispatchChatMessage(playerMessage, {
        source: 'player_input',
        sourceTag: source
      });
      if (modeRef.current.id === 'sandbox_story') {
        sandboxModeRef.current.setReplyTelemetry?.({
          lastInjectedMessageId: playerMessage.id,
          lastInjectedText: outgoingText,
          lastInjectedAt: Date.now(),
          consumeSource: source === 'debug_simulate' ? 'smoke_test' : 'ui',
          consumeResult: 'injected',
          consumeBlockedReason: ''
        });
      }
      sandboxChatEngineRef.current?.markPlayerReply(Date.now());
      const sandboxQnaConsumed = modeRef.current.id === 'sandbox_story' ? consumePlayerReply({
        raw: outgoingText,
        messageId: playerMessage.id,
        sourceType: source,
        playerId: activeUserInitialHandleRef.current || undefined,
        targetPlayerId: lockStateRef.current.target || undefined,
        sourceMessageId: lockStateRef.current.replyingToMessageId || qnaStateRef.current.active.questionMessageId || undefined
      }) : false;
      if (modeRef.current.id === 'sandbox_story') {
        if (sandboxTagPhaseTimeoutFiredRef.current) {
          const recoveryLines = ['喔喔喔', '終於', '剛剛卡住'];
          recoveryLines.forEach((line) => {
            dispatchChatMessage({
              id: crypto.randomUUID(),
              username: 'mod_live',
              type: 'chat',
              text: line,
              language: 'zh',
              translation: line
            }, { source: 'sandbox_consonant', sourceTag: 'sandbox_tag_timeout_recovery' });
          });
          clearSandboxTagPhaseTimeout();
        }
        modeRef.current.onPlayerReply(outgoingText);
      }
      if (modeRef.current.id === 'sandbox_story' && !sandboxQnaConsumed) {
        const sandboxState = sandboxModeRef.current.getState();
        if (isSandboxWaitReplyStep(sandboxState.flow.step)) {
          setInput('');
          sendCooldownUntil.current = Date.now() + 350;
          tagSlowActiveRef.current = false;
          return markSent('sandbox_wait_reply_rejected', playerMessage.id);
        }
        writeSandboxLastReplyEval({ rawInput: outgoingText, normalizedInput: outgoingText.trim(), consumed: false, reason: 'consume_fallback_to_free_chat', messageId: playerMessage.id });
        setInput('');
        sendCooldownUntil.current = Date.now() + 350;
        tagSlowActiveRef.current = false;
        return markSent('sandbox_free_chat_sent', playerMessage.id);
      }
      if (modeRef.current.id === 'sandbox_story' && sandboxQnaConsumed) {
        writeSandboxLastReplyEval({ rawInput: outgoingText, normalizedInput: outgoingText.trim(), consumed: true, reason: 'submit_accepted', messageId: playerMessage.id });
        setInput('');
        sendCooldownUntil.current = Date.now() + 350;
        tagSlowActiveRef.current = false;
        return markSent('sandbox_qna_consumed', playerMessage.id);
      }

      if (!sandboxQnaConsumed && qnaStateRef.current.active.status === 'AWAITING_REPLY') {
        markQnaResolved(qnaStateRef.current, Date.now());
        lockStateRef.current = { isLocked: false, target: null, startedAt: 0, replyingToMessageId: null };
        clearChatFreeze('player_send_success');
      }
      const handlePass = () => {
        markReview(playableConsonant.letter, 'pass', state.curse);
        const entry = getMemoryNode(playableConsonant.letter);
        dispatch({
          type: 'ANSWER_PASS',
          payload: {
            message: createVipPassMessage(playableConsonant, entry.lapseCount)
          }
        });
        nonVipMessagesSinceLastVip.current = 0;
        setInput('');
      };

      if (isPassCommand(raw)) {
        handlePass();
        sendCooldownUntil.current = Date.now() + 350;
        tagSlowActiveRef.current = false;
        return markSent('pass', playerMessage.id);
      }

      const isHintInput = isVipHintCommand(raw);
      const vipReply = handleVipPlayerMessage({
        rawInput: raw,
        currentConsonant: playableConsonant.letter,
        currentAnchor: state.currentAnchor,
        state: { nonVipMessagesSinceLastVip: nonVipMessagesSinceLastVip.current },
        recentHistory: state.messages.map((message) => message.translation ?? message.text)
      });

      if (vipReply) {
        dispatchChatMessage(vipReply, { source: 'event_dialogue', sourceTag: 'vip_system' });
        nonVipMessagesSinceLastVip.current = 0;
      } else {
        nonVipMessagesSinceLastVip.current += 1;
      }

      if (isHintInput) {
        setInput('');
        sendCooldownUntil.current = Date.now() + 350;
        tagSlowActiveRef.current = false;
        return markSent('hint', playerMessage.id);
      }

      if (isAnswerCorrect(raw, playableConsonant)) {
        const donateSample = pickOne(donatePools.messages);
        const donate: DonateMessage = {
          id: crypto.randomUUID(),
          username: pickOne(usernames),
          amount: pickOne(donatePools.amounts),
          message_th: donateSample.th,
          message_zh: donateSample.zh
        };

        const successMessage = {
          id: crypto.randomUUID(), username: 'mod_live', text: '這波有穩住', language: 'zh' as const, translation: '這波有穩住'
        };
        dispatch({
          type: 'ANSWER_CORRECT',
          payload: {
            message: successMessage,
            donateMessage: createDonateChatMessage(donate)
          }
        });
        setInput('');
        sendCooldownUntil.current = Date.now() + 350;
        tagSlowActiveRef.current = false;
        return markSent('answer_correct', playerMessage.id);
      }

      const speechHit = parsePlayerSpeech(raw);
      const now = Date.now();
      const canTriggerSpeech = Boolean(speechHit) && now >= speechCooldownUntil.current;
      if (canTriggerSpeech) {
        speechCooldownUntil.current = now + 10_000;
      }

      const tagTarget = outgoingText.match(/@([\w_]+)/)?.[1] ?? null;
      if (lockStateRef.current.isLocked && lockStateRef.current.target && tagTarget !== lockStateRef.current.target) {
        return markBlocked('lock_target_mismatch');
      }
      if (!(modeRef.current.id === 'sandbox_story' && sandboxQnaConsumed)) {
        tryTriggerStoryEvent(outgoingText, 'user_input');
      }
      const chats = chatEngineRef.current.emit({ type: 'USER_SENT', text: outgoingText, user: 'you' }, Date.now());
      const wrongMessage = chats[0] ?? { id: crypto.randomUUID(), username: 'chat_mod', text: '這下壓力又上來了', language: 'zh', translation: '這下壓力又上來了' };
      dispatch({
        type: 'ANSWER_WRONG',
        payload: { message: wrongMessage }
      });
      setInput('');
      sendCooldownUntil.current = Date.now() + 350;
      tagSlowActiveRef.current = false;
      return markSent('answer_wrong', playerMessage.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
      const next = {
        ...attemptDebug,
        lastResult: 'error' as const,
        errorMessage
      };
      setSendDebug(next);
      logSendDebug('error', { source, errorMessage });
      return { ok: false, status: 'error', errorMessage };
    } finally {
      if (sandboxSubmitGateAcquired && modeRef.current.id === 'sandbox_story') {
        sandboxModeRef.current.setSubmitInFlight(false, Date.now());
      }
      setIsSending(false);
    }
  }, [appStarted, applySandboxCorrect, chatAutoPaused, chatAutoScrollMode, consumePlayerReply, debugComposingOverride, isComposing, isReady, isSandboxWaitReplyStep, isSending, logSendDebug, mentionTarget, replyTarget, resetChatAutoScrollFollow, sendDebug, showHintForCurrentPrompt, state, tryTriggerStoryEvent, updateChatDebug, writeSandboxLastReplyEval]);

  const handleSandboxAutoSend = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    void submitChat(input, 'fallback_click');
  }, [input, submitChat]);

  const submit = useCallback((source: SendSource) => {
    if (source === 'debug_simulate') {
      const sent = dispatchChatMessage({
        id: crypto.randomUUID(),
        username: 'debug_bot',
        type: 'system',
        text: '[isolated debug] Simulate Send invoked',
        language: 'zh',
        translation: '[isolated debug] Simulate Send invoked'
      }, { source: 'debug_tester', sourceTag: 'debug_simulate_isolated' });
      const debugResult: SendResult = sent.ok
        ? { ok: true, status: 'sent', reason: 'debug_simulate_isolated' }
        : { ok: false, status: 'blocked', reason: sent.blockedReason };
      return Promise.resolve(debugResult);
    }
    if (source === 'submit') {
      setSendDebug((prev) => ({ ...prev, lastSubmitAt: Date.now() }));
      logSendDebug('submit', { source });
    }
    return submitChat(input, source);
  }, [dispatchChatMessage, input, logSendDebug, submitChat]);

  const registerActiveUser = useCallback((rawHandle: string) => {
    const normalizedHandle = normalizeHandle(rawHandle);
    if (!normalizedHandle) return false;
    const nextProfile: ActiveUserProfile = {
      id: 'activeUser',
      handle: normalizedHandle,
      displayName: normalizedHandle,
      roleLabel: 'You'
    };
    activeUserInitialHandleRef.current = normalizedHandle;
    activeUserProfileRef.current = nextProfile;
    usersByIdRef.current.set(nextProfile.id, nextProfile);
    usersByHandleRef.current.set(toHandleKey(nextProfile.handle), nextProfile);
    sandboxModeRef.current.setPlayerIdentity({ handle: nextProfile.handle, id: nextProfile.id });
    return true;
  }, []);

  const onSandboxJoin = useCallback(async (rawName: string) => {
    const sanitizedName = sanitizeSandboxJoinName(rawName);
    if (!sanitizedName) return false;
    const playerId = createSandboxPlayerId(sanitizedName);
    const registered = registerActiveUser(sanitizedName);
    if (!registered) return false;
    const submittedAt = Date.now();
    sandboxModeRef.current.setPlayerIdentity({ handle: sanitizedName, id: playerId });
    ensureSandboxRuntimeStarted('sandbox_join_submitted', sanitizedName);
    sandboxModeRef.current.setJoinGate({ satisfied: true, submittedAt });
    sandboxModeRef.current.setPreheatState({ enabled: true, lastJoinAt: submittedAt });
    sandboxPreheatOrchestrationRef.current = {
      startedAt: submittedAt,
      lastEmitAt: 0,
      cursor: 0,
      joinEmitted: 0,
      lastJoinSender: '',
      completed: false
    };
    sandboxPreheatDedupRef.current.emittedFingerprints.clear();
    sandboxModeRef.current.setAnswerGate({ waiting: false, pausedChat: false });
    sandboxModeRef.current.setFreeze({ frozen: false, reason: 'NONE', frozenAt: 0 });
    clearReplyUi('sandbox_join_preheat_reset');
    clearChatFreeze('sandbox_join_preheat_reset');
    setScrollMode('FOLLOW', 'sandbox_join_preheat_reset');
    setChatAutoPaused(false);
    setPendingForceScrollReason('sandbox_join_preheat_reset');
    await nextAnimationFrame();
    return true;
  }, [clearChatFreeze, clearReplyUi, ensureSandboxRuntimeStarted, nextAnimationFrame, registerActiveUser, setScrollMode]);

  const emitAudioEnabledSystemMessageOnce = useCallback(() => {
    if (audioEnabledSystemMessageSentRef.current) return;
    audioEnabledSystemMessageSentRef.current = true;
    dispatchChatMessage({
      id: crypto.randomUUID(),
      type: 'system',
      username: 'system',
      text: '聲音已啟用',
      language: 'zh'
    }, { source: 'system_ui' });
  }, [dispatchChatMessage]);

  const ensureAudioUnlockedFromUserGesture = useCallback(async () => {
    try {
      await audioEngine.resumeFromGesture();
      await audioEngine.startFanLoop(FAN_LOOP_PATH, 0.4, 'username_submit_bootstrap');
      [FOOTSTEPS_PATH, GHOST_FEMALE_PATH].forEach((src) => {
        const preloadAudio = new Audio(src);
        preloadAudio.preload = 'auto';
        preloadAudio.load();
      });
      soundUnlocked.current = true;
      audioUnlockFailedReasonRef.current = null;
      updateChatDebug({
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          system: {
            ...(window.__CHAT_DEBUG__?.chat?.system ?? {}),
            lastAudioUnlockAt: Date.now(),
            lastAudioUnlockResult: 'success',
            audioContextState: window.__AUDIO_DEBUG__?.fanState?.contextState ?? 'unknown'
          }
        }
      });
      return true;
    } catch (error) {
      soundUnlocked.current = false;
      audioUnlockFailedReasonRef.current = error instanceof Error ? error.message : String(error);
      updateChatDebug({
        chat: {
          ...(window.__CHAT_DEBUG__?.chat ?? {}),
          system: {
            ...(window.__CHAT_DEBUG__?.chat?.system ?? {}),
            lastAudioUnlockAt: Date.now(),
            lastAudioUnlockResult: `failed:${audioUnlockFailedReasonRef.current}`,
            audioContextState: window.__AUDIO_DEBUG__?.fanState?.contextState ?? 'unknown'
          }
        }
      });
      return false;
    }
  }, [updateChatDebug]);

  const bootstrapAfterUsernameSubmit = useCallback(async (rawHandle: string, activatedBy: Exclude<BootstrapActivatedBy, null> = 'username_submit') => {
    if (modeIdRef.current === 'sandbox_story') {
      const joined = await onSandboxJoin(rawHandle);
      if (!joined) return false;
    } else {
      const registered = registerActiveUser(rawHandle);
      if (!registered) return false;
    }
    await ensureAudioUnlockedFromUserGesture();
    bootstrapRef.current = {
      isReady: true,
      activatedAt: Date.now(),
      activatedBy
    };
    emitAudioEnabledSystemMessageOnce();
    updateChatDebug({
      chat: {
        ...(window.__CHAT_DEBUG__?.chat ?? {}),
        system: {
          buildStamp: 'bootstrap_after_username_submit_v1',
          at: Date.now(),
          bootstrap: { ...bootstrapRef.current },
          audioUnlockFailedReason: audioUnlockFailedReasonRef.current ?? '-'
        }
      }
    } as Partial<NonNullable<Window['__CHAT_DEBUG__']>>);
    return true;
  }, [emitAudioEnabledSystemMessageOnce, ensureAudioUnlockedFromUserGesture, onSandboxJoin, registerActiveUser, updateChatDebug]);

  const emitNpcTagToActiveUser = useCallback(() => {
    const activeHandle = normalizeHandle(activeUserInitialHandleRef.current || '');
    if (!activeHandle) {
      setLastBlockedReason('no_active_user');
      return;
    }
    if (!usersByHandleRef.current.has(toHandleKey(activeHandle))) {
      setLastBlockedReason('active_user_not_registered');
      return;
    }
    const line = `@${activeHandle} [isolated debug] NPC tag injection`;
    const sent = dispatchChatMessage({
      id: crypto.randomUUID(),
      username: 'mod_live',
      type: 'chat',
      text: line,
      language: 'zh',
      translation: line
    }, { source: 'debug_tester', sourceTag: 'emit_npc_tag_isolated' });
    if (!sent.ok || !sent.messageId) {
      setLastBlockedReason(sent.ok ? 'debug_emit_failed' : (sent.blockedReason ?? 'debug_emit_failed'));
      return;
    }
    window.__CHAT_DEBUG__ = {
      ...(window.__CHAT_DEBUG__ ?? {}),
      sandbox: {
        ...((window.__CHAT_DEBUG__ as any)?.sandbox ?? {}),
        debug: {
          ...((window.__CHAT_DEBUG__ as any)?.sandbox?.debug ?? {}),
          isolatedActions: {
            ...((window.__CHAT_DEBUG__ as any)?.sandbox?.debug?.isolatedActions ?? {}),
            lastEmitNpcTagAt: Date.now(),
            lastEmitNpcTagMessageId: sent.messageId,
            mode: 'isolated_message_only'
          }
        }
      }
    } as any;
    setLastBlockedReason(null);
  }, [dispatchChatMessage]);


  useEffect(() => {
    tagSlowActiveRef.current = Boolean(replyTarget || mentionTarget);
  }, [mentionTarget, replyTarget]);

  const handleSendButtonClick = useCallback(() => {
    setSendDebug((prev) => ({ ...prev, lastClickAt: Date.now() }));
    logSendDebug('click', { source: 'button' });
  }, [logSendDebug]);

  const ensureDebugActiveUsers = useCallback(() => {
    const active = separateChatActorState(state.messages, activeUserInitialHandleRef.current || '').audienceUsers;
    if (active.length > 0) return active;
    DEBUG_SEED_USERS.forEach((username) => {
      dispatchChatMessage({
        id: crypto.randomUUID(),
        type: 'chat',
        username,
        text: '在',
        language: 'zh',
        translation: '在'
      }, { source: 'debug_tester' });
    });
    return DEBUG_SEED_USERS;
  }, [dispatchChatMessage, state.messages]);

  const simulateReplyText = useCallback((key: StoryEventKey) => {
    if (key === 'VOICE_CONFIRM') return '有';
    if (key === 'TV_EVENT') return '沒有';
    if (key === 'FEAR_CHALLENGE') return '我不怕';
    return '我在';
  }, []);

  const debugForceExecuteEvent = useCallback((eventKey: StoryEventKey, options?: DebugForceExecuteOptions) => {
    const now = Date.now();
    const resolvedOptions: DebugForceExecuteOptions = {
      ignoreCooldown: Boolean(options?.ignoreCooldown),
      ignorePause: Boolean(options?.ignorePause),
      skipTagRequirement: Boolean(options?.skipTagRequirement)
    };
    forcedDebugRef.current = {
      lastForcedEventKey: eventKey,
      lastForcedAt: now,
      lastForcedOptions: resolvedOptions,
      forcedEventCount: forcedDebugRef.current.forcedEventCount + 1
    };
    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        debug: { ...forcedDebugRef.current }
      }
    });
    const started = startEvent(eventKey, { source: 'debug_force', forceOptions: resolvedOptions });
    if (!started) {
      const blockedReason = (window.__CHAT_DEBUG__?.event?.lastEventCommitBlockedReason as EventStartBlockedReason | null) ?? eventTestDebugRef.current.lastStartAttemptBlockedReason;
      setEventTesterStatus({ key: eventKey, blockedReason: blockedReason === '-' ? 'invalid_state' : blockedReason });
      return;
    }
    setEventTesterStatus({ key: eventKey, blockedReason: null });
  }, [startEvent, updateEventDebug]);

  const triggerEventFromTester = useCallback((eventKey: StoryEventKey) => {
    const activeUsers = ensureDebugActiveUsers();
    if (activeUsers.length === 0) {
      setEventAttemptDebug(eventKey, 'no_active_user');
      setEventTesterStatus({ key: eventKey, blockedReason: 'no_active_user' });
      return;
    }

    const now = Date.now();
    const cooldown = eventCooldownsRef.current[eventKey] ?? 0;
    if (!ignoreCooldownsDebug && cooldown > now) {
      setEventAttemptDebug(eventKey, 'cooldown_blocked');
      setEventTesterStatus({ key: eventKey, blockedReason: 'cooldown_blocked' });
      return;
    }

    const started = startEvent(eventKey, { source: 'debug_tester', ignoreCooldowns: ignoreCooldownsDebug });
    if (!started) {
      const blockedReason = eventTestDebugRef.current.lastStartAttemptBlockedReason;
      setEventTesterStatus({ key: eventKey, blockedReason: blockedReason === '-' ? 'invalid_state' : blockedReason });
      return;
    }

    setEventTesterStatus({ key: eventKey, blockedReason: null });

    if (eventKey === 'LIGHT_GLITCH') {
      requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop2', reason: `event:${started.eventId}`, sourceEventKey: 'LIGHT_GLITCH' });
      triggerReactionBurst('light');
      if (eventLifecycleRef.current) {
        eventLifecycleRef.current.state = 'done';
        eventLifecycleRef.current.topic = 'light';
      }
      return;
    }

    pendingReplyEventRef.current = { key: eventKey, target: started.target || activeUsers[0], eventId: started.eventId, expiresAt: now + 20_000 };
    if (!simulatePlayerReply) return;

    const delay = randomInt(800, 1500);
    const timerId = window.setTimeout(() => {
      if (!pendingReplyEventRef.current || pendingReplyEventRef.current.eventId !== started.eventId) return;
      const target = pendingReplyEventRef.current.target;
      setReplyTarget(target);
      setInput(`@${target} ${simulateReplyText(eventKey)}`);
      void submitChat(`@${target} ${simulateReplyText(eventKey)}`, 'debug_simulate');
    }, delay);
    registerEventRunnerTimer(timerId);
  }, [ensureDebugActiveUsers, ignoreCooldownsDebug, registerEventRunnerTimer, setEventAttemptDebug, simulatePlayerReply, simulateReplyText, startEvent, submitChat, triggerReactionBurst]);

  useEffect(() => {
    window.__THAIFEED_DEBUG_FORCE_EVENT__ = (eventKey: StoryEventKey, options?: DebugForceExecuteOptions) => {
      debugForceExecuteEvent(eventKey, options);
    };
    return () => {
      delete window.__THAIFEED_DEBUG_FORCE_EVENT__;
    };
  }, [debugForceExecuteEvent]);

  const runSfxEventTest = useCallback((eventKey: StoryEventKey, audioKey: 'ghost_female' | 'footsteps', forceExecute = false) => {
    const def = EVENT_REGISTRY[eventKey];
    if (!def) {
      updateEventAudioState(eventKey, { lastResult: 'SKIPPED', lastReason: 'missing_event' }, 'EVENT_SKIPPED');
      return;
    }
    const hasAsset = audioKey in SFX_REGISTRY;
    if (!hasAsset) {
      updateEventAudioState(eventKey, { lastResult: 'SKIPPED', lastReason: 'missing_asset' }, 'EVENT_SKIPPED');
      return;
    }
    const gate = canTriggerByEventAudioState(eventKey, forceExecute);
    if (!gate.ok) {
      updateEventAudioState(eventKey, { lastResult: 'SKIPPED', lastReason: gate.reason ?? 'blocked' }, 'EVENT_SKIPPED');
      return;
    }
    markEventAudioPlaying(eventKey);
    const now = Date.now();
    const played = playSfx(audioKey, {
      reason: `event:test:${eventKey}`,
      source: 'event',
      eventId: `debug_test_${eventKey}_${now}`,
      eventKey,
      allowBeforeStarterTag: true
    });
    if (!played) {
      transitionEventAudioToCooldown(eventKey, 'play_failed');
      updateEventAudioState(eventKey, { lastResult: 'FAILED', lastReason: 'play_failed' }, 'EVENT_PLAY_FAIL');
      return;
    }
  }, [canTriggerByEventAudioState, markEventAudioPlaying, playSfx, transitionEventAudioToCooldown, updateEventAudioState]);

  const resetEventTestState = useCallback(() => {
    clearEventRunnerState();
    EVENT_TESTER_KEYS.forEach((eventKey) => {
      clearEventAudioPlayingTimeout(eventKey);
      updateEventAudioState(eventKey, {
        state: 'idle',
        cooldownUntil: 0,
        playingSince: null,
        lastResult: '-',
        lastReason: 'reset_test_state'
      });
    });
    eventTestDebugRef.current.lastStartAttemptBlockedReason = '-';
    setEventTesterStatus({ key: null, blockedReason: null });
    updateEventDebug({
      event: {
        ...(window.__CHAT_DEBUG__?.event ?? {}),
        test: {
          ...(window.__CHAT_DEBUG__?.event?.test ?? {}),
          ...eventTestDebugRef.current
        }
      }
    });
  }, [clearEventAudioPlayingTimeout, clearEventRunnerState, updateEventAudioState, updateEventDebug]);

  const forceUnlockDebug = useCallback(() => {
    recoverFromStuckEventState('debug_manual_recover');
  }, [recoverFromStuckEventState]);

  const getSandboxOverlayConsonant = useCallback(() => {
    if (modeIdRef.current !== 'sandbox_story') return state.currentConsonant.letter;
    const prompt = sandboxModeRef.current.getCurrentPrompt();
    const consonantShown = prompt?.kind === 'consonant' ? prompt.consonant : '';
    sandboxModeRef.current.commitPromptOverlay({ consonantShown });
    return consonantShown;
  }, [state.currentConsonant.letter]);


  const getSandboxAuthoritativePromptVisible = useCallback(() => {
    if (modeIdRef.current !== 'sandbox_story') return true;
    const st = sandboxModeRef.current.getState();
    const currentPrompt = st.prompt.current;
    const hasCurrentPrompt = Boolean(currentPrompt?.kind === 'consonant' && currentPrompt.wordKey && currentPrompt.consonant);
    const authoritativeCanReply = Boolean(
      st.replyGate?.armed
      && st.replyGate?.canReply
      && st.replyGate?.gateType === 'consonant_answer'
      && isSandboxWaitReplyStep(st.flow.step)
    );
    return authoritativeCanReply && hasCurrentPrompt;
  }, []);

  const resolveSandboxSceneKeyByQuestionIndex = useCallback((questionIndex: number): 'loop2' | 'loop3' | 'loop4' => {
    if (questionIndex <= 0) return 'loop3';
    if (questionIndex === 1) return 'loop2';
    return 'loop4';
  }, []);

  const unlockSingleEventDebug = useCallback((eventKey: StoryEventKey) => {
    rollbackEventCooldown(eventKey);
    clearEventAudioPlayingTimeout(eventKey);
    updateEventAudioState(eventKey, {
      state: 'idle',
      cooldownUntil: 0,
      playingSince: null,
      lastResult: 'SKIPPED',
      lastReason: 'manual_unlock_single'
    }, 'EVENT_STATE');
  }, [clearEventAudioPlayingTimeout, rollbackEventCooldown, updateEventAudioState]);

  const forceShowLoop4Debug = useCallback(() => {
    requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop4', reason: 'debug_force_show_loop4_3s', sourceEventKey: 'TV_EVENT' });
    window.setTimeout(() => {
      requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: 'loop3', reason: 'debug_force_show_loop4_return', sourceEventKey: 'DEBUG' });
    }, 3000);
  }, []);



  const hasSandboxQuestionPrerequisites = useCallback((sandboxState: ReturnType<ReturnType<typeof createSandboxStoryMode>['getState']>) => {
    const currentPrompt = sandboxState.prompt.current;
    return Boolean(
      currentPrompt?.kind === 'consonant'
      && currentPrompt.promptId
      && currentPrompt.wordKey
      && currentPrompt.consonant
      && sandboxState.consonant.nodeChar
    );
  }, []);

  const recordSandboxDebugAction = useCallback((action: SandboxDebugActionName, payload: Partial<SandboxDebugActionRecord>) => {
    const prev = sandboxDebugActionAuditRef.current[action];
    sandboxDebugActionAuditRef.current[action] = {
      ...prev,
      ...payload,
      blockedReason: payload.blockedReason ?? prev.blockedReason ?? '-',
      lastResult: payload.lastResult ?? prev.lastResult ?? '-',
      sourceQuestionId: payload.sourceQuestionId ?? prev.sourceQuestionId ?? '-',
      targetQuestionId: payload.targetQuestionId ?? prev.targetQuestionId ?? '-',
      usedCanonicalAnswer: payload.usedCanonicalAnswer ?? prev.usedCanonicalAnswer ?? '-',
      usedAcceptedCandidates: payload.usedAcceptedCandidates ?? prev.usedAcceptedCandidates ?? [],
      resultStep: payload.resultStep ?? prev.resultStep ?? '-',
      intent: payload.intent ?? prev.intent ?? '-',
      reconciled: payload.reconciled ?? prev.reconciled ?? false
    };
  }, []);

  const reconcileSandboxDebugState = useCallback((params: {
    action: SandboxDebugActionName;
    reason: string;
    sourceQuestionId: string;
    targetQuestionId: string;
    targetStep: string;
    beforeIndex: number;
    expectedSceneKey?: string;
  }) => {
    const now = Date.now();
    const st = sandboxModeRef.current.getState();
    const prompt = sandboxModeRef.current.getCurrentPrompt();
    const promptQuestionId = prompt?.kind === 'consonant' ? prompt.wordKey : '';
    const questionId = params.targetQuestionId || promptQuestionId;
    const renderedQuestionId = questionId || st.renderSync?.renderedQuestionId || st.renderSync?.stateQuestionId || '';
    sandboxModeRef.current.setSandboxFlow({
      questionIndex: st.flow.questionIndex,
      step: params.targetStep,
      stepStartedAt: now,
      replyGateActive: Boolean(st.replyGate?.armed && st.replyGate?.gateType !== 'none'),
      replyTarget: st.replyGate?.targetPlayerId || null,
      gateType: st.replyGate?.gateType || 'none',
      canReply: Boolean(st.replyGate?.canReply),
      nextQuestionFromIndex: params.beforeIndex,
      nextQuestionToIndex: st.flow.questionIndex,
      nextQuestionFromQuestionId: params.sourceQuestionId || '',
      nextQuestionToQuestionId: questionId,
      questionPromptFingerprint: questionId ? `${params.action}:${st.flow.questionIndex}:${questionId}` : st.sandboxFlow.questionPromptFingerprint,
      nextQuestionBlockedReason: st.sandboxFlow.nextQuestionBlockedReason || '-',
      nextQuestionBlockedReasonSource: st.sandboxFlow.nextQuestionBlockedReasonSource || params.reason,
      nextQuestionConsumer: `${params.action}_debug`,
      nextQuestionStage: params.targetStep
    });
    sandboxModeRef.current.commitRenderSync?.({
      stateQuestionId: questionId,
      renderedQuestionId: renderedQuestionId || questionId,
      renderBlockedReason: st.renderSync?.renderBlockedReason || 'committed',
      commitSource: `${params.action}_reconcile`,
      committedAt: now
    });
    sandboxModeRef.current.setReplyTelemetry?.({ parseBlockedReason: '', consumeBlockedReason: '', consumedAt: st.reply?.consumedAt ?? 0, consumeEventId: st.reply?.consumeEventId ?? '' });
    sandboxModeRef.current.setBlockedReason?.('');
    sandboxModeRef.current.setCurrentPromptMismatch?.(false);
    return sandboxModeRef.current.getState();
  }, []);

  const handleSandboxDebugPassFlow = useCallback(() => {
    const now = Date.now();
    recordSandboxDebugAction('pass_flow', { lastClickedAt: now, handlerInvoked: true, intent: 'advance_one_legal_stage' });
    if (modeRef.current.id !== 'sandbox_story') { recordSandboxDebugAction('pass_flow', { effectApplied: false, blockedReason: 'not_in_sandbox_story', lastResult: 'blocked', reconciled: false }); return; }
    const beforeState = sandboxModeRef.current.getState();
    const beforeIndex = beforeState.flow.questionIndex;
    const beforeQuestionId = beforeState.prompt.current?.wordKey || '';
    clearSandboxRevealDoneTimer();
    const advanced = sandboxModeRef.current.advancePrompt('debug_pass_flow_authoritative');
    sandboxConsonantPromptNodeIdRef.current = null;
    clearReplyUi('sandbox_debug_pass');
    clearChatFreeze('sandbox_debug_pass');
    setChatAutoPaused(false);
    setInput('');
    const afterNode = sandboxModeRef.current.getCurrentNode();
    if (!advanced || !afterNode) {
      recordSandboxDebugAction('pass_flow', { effectApplied: false, blockedReason: 'end_of_question_pool', lastResult: 'blocked', sourceQuestionId: beforeQuestionId || '-', targetQuestionId: '-', resultStep: beforeState.flow.step, reconciled: false });
      return;
    }
    sandboxModeRef.current.setCurrentPrompt({
      kind: 'consonant',
      promptId: crypto.randomUUID(),
      consonant: afterNode.char,
      wordKey: afterNode.id,
      pinnedText: `請讀出剛剛閃過的字：${afterNode.char}`,
      correctKeywords: afterNode.correctKeywords ?? [afterNode.char],
      unknownKeywords: afterNode.unknownKeywords ?? ['不知道']
    });
    sandboxModeRef.current.setReplyGate?.({ gateType: 'consonant_answer', armed: true, canReply: true, gateConsumed: false, sourceType: 'debug_pass_flow', consumePolicy: 'single' });
    const nextStep = resolveSandboxTagStepByQuestionNumber(beforeIndex + 2);
    sandboxModeRef.current.setFlowStep(nextStep, 'debug_pass_flow_emit');
    sandboxModeRef.current.setSandboxFlow({
      postRevealChatState: 'idle',
      postRevealStartAttempted: false,
      postRevealStartedAt: 0,
      postRevealCompletedAt: 0,
      postRevealCompletionReason: '',
      postRevealCompletionBlockedBy: '',
      nextQuestionReady: true,
      nextQuestionEmitted: true,
      nextQuestionFromIndex: beforeIndex,
      nextQuestionToIndex: beforeIndex + 1,
      nextQuestionFromQuestionId: beforeQuestionId,
      nextQuestionToQuestionId: afterNode.id,
      nextQuestionBlockedReason: 'emitted',
      nextQuestionBlockedReasonSource: 'advance_next',
      nextQuestionStage: 'emitted',
      nextQuestionDecidedAt: now,
      nextQuestionEmittedAt: now,
      nextQuestionConsumer: 'debug_pass_flow'
    });
    requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: resolveSandboxSceneKeyByQuestionIndex(beforeIndex + 1), reason: `debug_pass_q${beforeIndex + 2}`, sourceEventKey: 'SCENE_REQUEST' });
    const reconciledState = reconcileSandboxDebugState({ action: 'pass_flow', reason: 'pass_flow_reconcile', sourceQuestionId: beforeQuestionId, targetQuestionId: afterNode.id, targetStep: nextStep, beforeIndex, expectedSceneKey: resolveSandboxSceneKeyByQuestionIndex(beforeIndex + 1) });
    recordSandboxDebugAction('pass_flow', { effectApplied: true, blockedReason: '-', lastResult: `advanced_to:${reconciledState.flow.questionIndex}:${afterNode.id}`, sourceQuestionId: beforeQuestionId || '-', targetQuestionId: afterNode.id, resultStep: reconciledState.flow.step, reconciled: true });
    bumpSandboxRevealTick();
  }, [clearReplyUi, clearSandboxRevealDoneTimer, clearChatFreeze, reconcileSandboxDebugState, recordSandboxDebugAction, requestSceneAction, resolveSandboxSceneKeyByQuestionIndex]);


  const handleSandboxDebugForceCorrectNow = useCallback(() => {
    const now = Date.now();
    recordSandboxDebugAction('force_correct_now', { lastClickedAt: now, handlerInvoked: true, intent: 'force_current_prompt_correct' });
    if (modeRef.current.id !== 'sandbox_story') { recordSandboxDebugAction('force_correct_now', { effectApplied: false, blockedReason: 'not_in_sandbox_story', lastResult: 'blocked', reconciled: false }); return; }
    const stateBefore = sandboxModeRef.current.getState();
    const currentPrompt = sandboxModeRef.current.getCurrentPrompt();
    if (!currentPrompt || currentPrompt.kind !== 'consonant') {
      recordSandboxDebugAction('force_correct_now', { effectApplied: false, blockedReason: 'missing_or_non_consonant_prompt', lastResult: 'blocked', sourceQuestionId: '-', targetQuestionId: '-', reconciled: false });
      return;
    }
    const gate = stateBefore.replyGate;
    if (!(gate?.armed && gate?.canReply && gate?.gateType === 'consonant_answer')) {
      recordSandboxDebugAction('force_correct_now', { effectApplied: false, blockedReason: 'reply_gate_not_answerable', lastResult: 'blocked', sourceQuestionId: currentPrompt.wordKey, targetQuestionId: currentPrompt.wordKey, reconciled: false });
      return;
    }
    const authoritative = getSharedConsonantQuestionById(currentPrompt.wordKey);
    const canonicalAnswer = authoritative?.consonant || currentPrompt.consonant;
    const acceptedCandidates = getAcceptedAliasCandidates({ questionId: currentPrompt.wordKey, consonant: canonicalAnswer });
    sandboxModeRef.current.activateDebugOverride('button');
    sandboxModeRef.current.setConsonantJudgeAudit?.({
      rawInput: '[debug-force-correct]',
      normalizedInput: canonicalAnswer,
      parseOk: true,
      parseKind: 'debug_override',
      matchedAlias: canonicalAnswer,
      expectedConsonant: canonicalAnswer,
      acceptedCandidates,
      compareInput: canonicalAnswer,
      compareMode: 'debug_override_authoritative_current_prompt',
      judgeResult: 'correct',
      resultReason: 'debug_override_forced_correct',
      sourcePromptId: currentPrompt.promptId,
      sourceQuestionId: currentPrompt.wordKey,
      sourceWordKey: currentPrompt.wordKey,
      gateType: 'consonant_answer',
      consumedAt: now
    });
    applySandboxCorrect({ input: '[debug-force-correct]', matchedChar: canonicalAnswer, source: 'debug_button' });
    sandboxModeRef.current.setFlowStep('ANSWER_EVAL', 'debug_force_correct_consume');
    sandboxModeRef.current.setFlowStep('REVEAL_WORD', 'debug_force_correct_transition');
    sandboxModeRef.current.setSandboxFlow({
      nextQuestionStage: 'REVEAL_WORD',
      nextQuestionBlockedReasonSource: 'reveal',
      nextQuestionBlockedReason: 'reveal_guard_blocked:awaiting_reveal',
      nextQuestionConsumer: 'force_correct_now_debug'
    });
    const reconciledState = reconcileSandboxDebugState({ action: 'force_correct_now', reason: 'force_correct_reconcile', sourceQuestionId: currentPrompt.wordKey, targetQuestionId: currentPrompt.wordKey, targetStep: 'REVEAL_WORD', beforeIndex: stateBefore.flow.questionIndex, expectedSceneKey: resolveSandboxSceneKeyByQuestionIndex(stateBefore.flow.questionIndex) });
    recordSandboxDebugAction('force_correct_now', { effectApplied: true, blockedReason: '-', lastResult: `correct:${canonicalAnswer}`, sourceQuestionId: currentPrompt.wordKey, targetQuestionId: currentPrompt.wordKey, usedCanonicalAnswer: canonicalAnswer, usedAcceptedCandidates: acceptedCandidates, resultStep: reconciledState.flow.step, reconciled: true });
  }, [applySandboxCorrect, reconcileSandboxDebugState, recordSandboxDebugAction, resolveSandboxSceneKeyByQuestionIndex]);


  const handleSandboxDebugForceNextQuestion = useCallback(() => {
    const clickedAt = Date.now();
    recordSandboxDebugAction('force_next_question', { lastClickedAt: clickedAt, handlerInvoked: true, intent: 'advance_to_next_question_answerable' });
    if (modeRef.current.id !== 'sandbox_story') {
      recordSandboxDebugAction('force_next_question', { effectApplied: false, blockedReason: 'not_in_sandbox_story', lastResult: 'blocked', reconciled: false });
      return;
    }
    const stateBefore = sandboxModeRef.current.getState();
    const beforeIndex = stateBefore.flow.questionIndex;
    const fromQuestionId = stateBefore.prompt.current?.wordKey || '';
    if (beforeIndex >= NIGHT1.nodes.length - 1) {
      const reason = stateBefore.sandboxFlow.autoplayNightStatus === 'completed' ? 'story_completed' : 'no_next_question';
      recordSandboxDebugAction('force_next_question', { effectApplied: false, blockedReason: reason, lastResult: 'blocked', sourceQuestionId: fromQuestionId || '-', targetQuestionId: '-', reconciled: false });
      return;
    }
    clearReplyUi('sandbox_force_next_question');
    clearChatFreeze('sandbox_force_next_question');
    const advanced = sandboxModeRef.current.forceAdvanceNode();
    if (!advanced) {
      recordSandboxDebugAction('force_next_question', { effectApplied: false, blockedReason: 'force_advance_failed', lastResult: 'blocked', sourceQuestionId: fromQuestionId || '-', targetQuestionId: '-', reconciled: false });
      return;
    }
    const stateAfterAdvance = sandboxModeRef.current.getState();
    const afterNode = sandboxModeRef.current.getCurrentNode();
    if (!afterNode) {
      recordSandboxDebugAction('force_next_question', { effectApplied: false, blockedReason: 'missing_next_node', lastResult: 'blocked', sourceQuestionId: fromQuestionId || '-', targetQuestionId: '-', reconciled: false });
      return;
    }
    const nextStep = resolveSandboxTagStepByQuestionNumber(stateAfterAdvance.flow.questionIndex + 1);
    sandboxModeRef.current.setCurrentPrompt({
      kind: 'consonant',
      promptId: crypto.randomUUID(),
      consonant: afterNode.char,
      wordKey: afterNode.id,
      pinnedText: `請讀出剛剛閃過的字：${afterNode.char}`,
      correctKeywords: afterNode.correctKeywords ?? [afterNode.char],
      unknownKeywords: afterNode.unknownKeywords ?? ['不知道']
    });
    sandboxModeRef.current.setReplyGate?.({ gateType: 'consonant_answer', armed: true, canReply: true, gateConsumed: false, sourceType: 'debug_force_next_question', consumePolicy: 'single' });
    sandboxModeRef.current.commitRenderSync?.({
      stateQuestionId: afterNode.id,
      renderedQuestionId: afterNode.id,
      renderBlockedReason: 'force_next_prompt_activated',
      commitSource: 'force_next_question_debug'
    });
    sandboxModeRef.current.setSandboxFlow({
      postRevealChatState: 'idle',
      postRevealStartAttempted: false,
      postRevealStartedAt: 0,
      postRevealCompletedAt: 0,
      postRevealCompletionReason: '',
      postRevealCompletionBlockedBy: '',
      nextQuestionReady: true,
      nextQuestionEmitted: true,
      nextQuestionFromIndex: beforeIndex,
      nextQuestionToIndex: stateAfterAdvance.flow.questionIndex,
      nextQuestionFromQuestionId: fromQuestionId,
      nextQuestionToQuestionId: afterNode.id,
      nextQuestionBlockedReason: 'emitted',
      nextQuestionBlockedReasonSource: 'advance_next',
      nextQuestionStage: 'emitted',
      nextQuestionDecidedAt: clickedAt,
      nextQuestionEmittedAt: Date.now(),
      nextQuestionConsumer: 'force_next_question_debug',
      replyGateActive: true,
      canReply: true,
      gateType: 'consonant_answer',
      replyTarget: stateAfterAdvance.replyGate?.targetPlayerId ?? null,
      questionPromptFingerprint: `force_next_question:${stateAfterAdvance.flow.questionIndex}:${afterNode.id}`
    });
    sandboxModeRef.current.setReveal?.({ visible: false, phase: 'idle', text: '', wordKey: '', consonantFromPrompt: '', durationMs: 0, doneAt: 0, startedAt: 0, finishedAt: 0, cleanupAt: 0, rendered: false, blockedReason: '' });
    sandboxModeRef.current.setReplyTelemetry?.({ parseBlockedReason: '', consumeBlockedReason: '', consumeCommitted: false, consumeEventId: '', consumedAt: 0 });
    sandboxModeRef.current.setLastReplyEval?.({ consumed: false, reason: '', gateType: 'consonant_answer', rawInput: '', normalizedInput: '', extractedAnswer: '', raw: '', normalized: '', classifiedAs: 'none', at: 0 });
    sandboxModeRef.current.setFlowStep(nextStep, 'force_next_question_emitted');
    requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: resolveSandboxSceneKeyByQuestionIndex(stateAfterAdvance.flow.questionIndex), reason: `force_next_q${stateAfterAdvance.flow.questionIndex + 1}`, sourceEventKey: 'SCENE_REQUEST' });
    const reconciledState = reconcileSandboxDebugState({ action: 'force_next_question', reason: 'force_next_question_reconcile', sourceQuestionId: fromQuestionId, targetQuestionId: afterNode.id, targetStep: nextStep, beforeIndex, expectedSceneKey: resolveSandboxSceneKeyByQuestionIndex(stateAfterAdvance.flow.questionIndex) });
    bumpSandboxRevealTick();
    recordSandboxDebugAction('force_next_question', { effectApplied: true, blockedReason: '-', lastResult: `advanced_to:${reconciledState.flow.questionIndex}:${afterNode.id}`, sourceQuestionId: fromQuestionId || '-', targetQuestionId: afterNode.id, resultStep: reconciledState.flow.step, reconciled: true });
  }, [clearChatFreeze, clearReplyUi, reconcileSandboxDebugState, recordSandboxDebugAction, resolveSandboxSceneKeyByQuestionIndex]);

  const runNightSmokeTest = useCallback(async () => {
    const startedAt = Date.now();
    sandboxFlowTestRunIdRef.current += 1;
    const runId = sandboxFlowTestRunIdRef.current;
    const setRunning = (patch: Partial<SandboxFlowTestResult>) => {
      if (sandboxFlowTestRunIdRef.current !== runId) return;
      setSandboxFlowTestResult((prev) => ({ ...prev, ...patch }));
    };
    const readFullNightAuthoritativeState = () => {
      const st = sandboxModeRef.current.getState();
      const secondQuestionId = st.sandboxFlow?.nextQuestionToQuestionId || '';
      const emitted = Boolean(st.sandboxFlow?.nextQuestionEmitted && secondQuestionId);
      const renderedAligned = emitted
        && Boolean(st.renderSync?.renderedQuestionId)
        && st.renderSync?.renderedQuestionId === secondQuestionId;
      const promptAligned = Boolean(st.prompt.current?.kind === 'consonant')
        && Boolean(secondQuestionId)
        && st.prompt.current?.wordKey === secondQuestionId;
      const secondGateAligned = Boolean(
        st.replyGate?.gateType === 'consonant_answer'
        && st.replyGate?.armed
        && st.prompt.current?.kind === 'consonant'
        && st.prompt.current?.wordKey === secondQuestionId
      );
      const flowWaitReplyIndex = parseSandboxWaitReplyIndex(st.flow.step);
      const flowAdvanced = st.flow.step === 'WAIT_REPLY_2' || (flowWaitReplyIndex ?? -1) >= 2 || st.flow.step === 'TAG_PLAYER_3_MEANING' || st.flow.step === 'END_NIGHT';
      const indexAligned = Number.isFinite(st.sandboxFlow?.nextQuestionToIndex)
        && Number.isFinite(st.flow?.questionIndex)
        && st.flow.questionIndex >= st.sandboxFlow.nextQuestionToIndex
        && st.sandboxFlow.nextQuestionToIndex > 0;
      const secondPromptAligned = emitted && promptAligned;
      const secondQuestionAuthoritative = Boolean(
        emitted
        && secondQuestionId
        && (flowAdvanced || promptAligned || secondGateAligned || indexAligned)
      );
      const judgeAudit = st.consonantJudgeAudit;
      const replyTelemetry = st.reply ?? {};
      const postRevealRuntime = derivePostRevealRuntimeStatus(st);
      const blockedReason = st.flow.step === 'POST_REVEAL_CHAT'
        ? `post_reveal_blocked:${postRevealRuntime.startBlockedBy !== 'none' ? postRevealRuntime.startBlockedBy : postRevealRuntime.completionBlockedBy}`
        : (st.sandboxFlow?.nextQuestionBlockedReason || 'second_question_not_emitted');
      return {
        emitted,
        renderedAligned,
        secondPromptAligned,
        secondQuestionAuthoritative,
        toQuestionId: secondQuestionId || '-',
        blockedReason,
        blockedReasonSource: st.sandboxFlow?.nextQuestionBlockedReasonSource || '-',
        flowStep: st.flow.step,
        canReply: Boolean(st.replyGate?.canReply),
        gateType: st.replyGate?.gateType || 'none',
        gateArmed: Boolean(st.replyGate?.armed),
        gateConsumed: Boolean(st.replyGate?.gateConsumed || st.sandboxFlow?.gateConsumed),
        parseRaw: judgeAudit?.rawInput ?? '',
        parseKind: judgeAudit?.parseKind ?? 'not_evaluated',
        parseOk: Boolean(judgeAudit?.parseOk),
        judgeResult: judgeAudit?.judgeResult ?? '',
        judgeAuditWritten: Boolean(judgeAudit?.consumedAt && judgeAudit.consumedAt > 0),
        consumedAt: Number(judgeAudit?.consumedAt ?? 0),
        lastInjectedMessageId: replyTelemetry?.lastInjectedMessageId || '',
        lastInjectedAt: Number(replyTelemetry?.lastInjectedAt ?? 0),
        lastConsumedMessageId: replyTelemetry?.lastConsumedMessageId || '',
        lastConsumedAt: Number(replyTelemetry?.lastConsumedAt ?? 0),
        consumeResult: replyTelemetry?.consumeResult || '',
        consumeBlockedReason: replyTelemetry?.consumeBlockedReason || ''
      };
    };
    const classifyAutoAnswerFailure = (authoritative: ReturnType<typeof readFullNightAuthoritativeState>) => {
      if (authoritative.parseKind !== 'not_evaluated' && authoritative.parseRaw.length > 0 && !authoritative.parseOk) {
        return `parse_failed:${authoritative.parseKind}`;
      }
      if (authoritative.parseOk && (!authoritative.judgeAuditWritten || authoritative.consumedAt <= 0 || !authoritative.judgeResult || authoritative.judgeResult === 'not_evaluated')) {
        return 'judge_failed';
      }
      if (authoritative.parseKind === 'not_evaluated' && authoritative.parseRaw.length === 0 && (parseSandboxWaitReplyIndex(authoritative.flowStep) ?? -1) >= 1 && authoritative.gateArmed && authoritative.gateType === 'consonant_answer' && authoritative.canReply) {
        if (authoritative.consumeBlockedReason) return authoritative.consumeBlockedReason;
        return 'message_injected_but_not_consumed';
      }
      if ((parseSandboxWaitReplyIndex(authoritative.flowStep) ?? -1) >= 1 && !authoritative.canReply) {
        return 'message_rejected_by_gate';
      }
      return 'answer_not_consumed';
    };
    const fail = (smokeStep: string, failureReason: string) => {
      const authoritative = readFullNightAuthoritativeState();
      if (smokeStep === 'second_question' && authoritative.emitted) {
        pass('second_question', authoritative.toQuestionId);
        return;
      }
      const authoritativeFlowStep = authoritative.flowStep || '-';
      const authoritativeBlockedReason = `${authoritative.blockedReason || '-'} | source=${authoritative.blockedReasonSource || '-'}`;
      const alignedFailedStep = authoritativeFlowStep === 'POST_REVEAL_CHAT'
        ? 'POST_REVEAL_CHAT'
        : (authoritativeFlowStep || smokeStep);
      setRunning({
        status: 'failed',
        finishedAt: Date.now(),
        currentStep: smokeStep,
        failedStep: alignedFailedStep,
        failureReason,
        authoritativeFlowStep,
        authoritativeBlockedReason,
        secondQuestionShown: authoritative.secondQuestionAuthoritative,
        toQuestionId: authoritative.toQuestionId
      });
      recordSandboxDebugAction('run_night_smoke_test', { effectApplied: false, blockedReason: failureReason, lastResult: `failed:${smokeStep}` });
    };
    const pass = (lastPassedStep: string, toQuestionId: string) => {
      const authoritative = readFullNightAuthoritativeState();
      setRunning({
        status: 'passed',
        finishedAt: Date.now(),
        currentStep: 'done',
        lastPassedStep,
        failedStep: '-',
        failureReason: '-',
        authoritativeFlowStep: authoritative.flowStep || '-',
        authoritativeBlockedReason: `${authoritative.blockedReason || '-'} | source=${authoritative.blockedReasonSource || '-'}`,
        toQuestionId,
        secondQuestionShown: authoritative.secondQuestionAuthoritative
      });
      recordSandboxDebugAction('run_night_smoke_test', { effectApplied: true, blockedReason: '-', lastResult: `passed:${toQuestionId}` });
    };
    const waitFor = async (predicate: () => boolean, timeoutMs = 12_000, intervalMs = 120) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() <= deadline) {
        if (sandboxFlowTestRunIdRef.current !== runId) return false;
        if (predicate()) return true;
        await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
      }
      return false;
    };

    recordSandboxDebugAction('run_night_smoke_test', { lastClickedAt: startedAt, handlerInvoked: true, blockedReason: '-', lastResult: 'running' });
    if (modeRef.current.id !== 'sandbox_story') {
      fail('enter_sandbox_story', 'not_in_sandbox_story');
      return;
    }

    const resetAt = Date.now();
    clearReplyUi('run_night_smoke_test_reset');
    clearChatFreeze('run_night_smoke_test_reset');
    sandboxModeRef.current.ensureBootstrapState?.('run_night_smoke_test_reset', resetAt, 30_000, true);
    sandboxModeRef.current.setIntroGate({ passed: true, remainingMs: 0, startedAt: resetAt, minDurationMs: 30_000 });
    sandboxModeRef.current.setFlowStep('VIP_TAG_PLAYER', 'run_night_smoke_test_start_clean', resetAt);
    sandboxModeRef.current.setSandboxFlow({ postRevealChatState: 'idle', postRevealStartAttempted: false, postRevealStartedAt: 0, postRevealCompletedAt: 0, postRevealCompletionReason: '', postRevealCompletionBlockedBy: '', nextQuestionReady: false, nextQuestionEmitted: false, nextQuestionBlockedReason: 'reply_blocked:bootstrapping', nextQuestionBlockedReasonSource: 'reply', nextQuestionStage: 'REPLY', nextQuestionDecidedAt: 0, nextQuestionEmittedAt: 0, nextQuestionConsumer: '' });
    sandboxPreheatOrchestrationRef.current.startedAt = resetAt;
    sandboxPreheatOrchestrationRef.current.lastEmitAt = 0;
    sandboxPreheatOrchestrationRef.current.cursor = 0;
    sandboxPreheatOrchestrationRef.current.joinEmitted = 0;
    sandboxPreheatOrchestrationRef.current.lastJoinSender = '';
    sandboxPreheatOrchestrationRef.current.completed = false;
    sandboxPreheatDedupRef.current.emittedFingerprints.clear();
    const fromQuestionId = sandboxModeRef.current.getCurrentNode()?.id ?? '-';
    setSandboxFlowTestResult({
      status: 'running',
      startedAt,
      finishedAt: 0,
      currentStep: 'enter_sandbox_story',
      lastPassedStep: '-',
      failedStep: '-',
      failureReason: '-',
      authoritativeFlowStep: '-',
      authoritativeBlockedReason: '-',
      fromQuestionId,
      toQuestionId: '-',
      autoAnswerUsed: '-',
      secondQuestionShown: false
    });

    setRunning({ currentStep: 'vip_tag_player' });
    const vipReady = await waitFor(() => {
      const st = sandboxModeRef.current.getState();
      return isSandboxWaitReplyStep(st.flow.step) || st.flow.step === 'POST_REPLY_CHAT' || st.flow.step === 'TAG_PLAYER_1';
    });
    if (!vipReady) {
      fail('vip_tag_player', 'vip_tag_not_emitted');
      return;
    }
    setRunning({ lastPassedStep: 'vip_tag_player' });

    setRunning({ currentStep: 'warmup_reply' });
    const warmupReply = await submitChat('暖場測試回覆', 'debug_simulate');
    if (!warmupReply.ok) {
      fail('warmup_reply', `send_failed:${warmupReply.reason ?? 'unknown'}`);
      return;
    }
    const firstQuestionReady = await waitFor(() => {
      const st = sandboxModeRef.current.getState();
      return (parseSandboxWaitReplyIndex(st.flow.step) ?? -1) >= 1 && st.prompt.current?.kind === 'consonant' && Boolean(st.replyGate?.armed);
    });
    if (!firstQuestionReady) {
      fail('first_question', 'wait_reply_1_or_prompt_not_ready');
      return;
    }
    const firstPrompt = sandboxModeRef.current.getCurrentPrompt();
    if (!firstPrompt || firstPrompt.kind !== 'consonant') {
      fail('first_question', 'first_prompt_missing');
      return;
    }
    setRunning({ lastPassedStep: 'first_question', fromQuestionId: firstPrompt.wordKey, currentStep: 'auto_answer_q1' });

    const answer = firstPrompt.consonant;
    let answerMessageId = '';
    let answerAttempt = 0;
    while (!answerMessageId && answerAttempt < 2) {
      answerAttempt += 1;
      const answerResult = await submitChat(answer, 'debug_simulate');
      if (!answerResult.ok) {
        fail('auto_answer_q1', `send_failed:${answerResult.reason ?? 'unknown'}`);
        return;
      }
      answerMessageId = answerResult.messageId || '';
    }
    if (!answerMessageId) {
      fail('auto_answer_q1', 'message_injected_but_not_consumed');
      return;
    }
    setRunning({ autoAnswerUsed: answer });

    const answerConsumed = await waitFor(() => {
      const authoritative = readFullNightAuthoritativeState();
      const st = sandboxModeRef.current.getState();
      const replyTelemetryConsumed = authoritative.lastConsumedMessageId === answerMessageId && authoritative.lastConsumedAt > 0;
      return (authoritative.flowStep !== 'WAIT_REPLY_1' || (parseSandboxWaitReplyIndex(authoritative.flowStep) ?? -1) < 1 || authoritative.gateConsumed || authoritative.consumedAt > 0 || replyTelemetryConsumed)
        && (st.lastReplyEval?.messageId === answerMessageId || st.consonantJudgeAudit?.consumedAt > 0 || replyTelemetryConsumed);
    }, 6_000);
    if (!answerConsumed) {
      const authoritative = readFullNightAuthoritativeState();
      if (authoritative.lastInjectedMessageId === answerMessageId && (parseSandboxWaitReplyIndex(authoritative.flowStep) ?? -1) >= 1 && authoritative.gateArmed && authoritative.canReply) {
        const retryResult = await submitChat(answer, 'debug_simulate');
        if (retryResult.ok) {
          answerMessageId = retryResult.messageId || answerMessageId;
        }
      }
      const retriedConsumed = await waitFor(() => {
        const authoritative = readFullNightAuthoritativeState();
        return authoritative.lastConsumedMessageId === answerMessageId || (parseSandboxWaitReplyIndex(authoritative.flowStep) ?? -1) < 1;
      }, 2_000, 100);
      if (!retriedConsumed) {
        fail('auto_answer_q1', classifyAutoAnswerFailure(readFullNightAuthoritativeState()));
        return;
      }
    }

    const judgeTriggered = await waitFor(() => {
      const authoritative = readFullNightAuthoritativeState();
      return authoritative.parseKind !== 'not_evaluated' && authoritative.parseRaw.length > 0;
    }, 6_000);
    if (!judgeTriggered) {
      fail('auto_answer_q1', classifyAutoAnswerFailure(readFullNightAuthoritativeState()));
      return;
    }

    const judgeSnapshot = readFullNightAuthoritativeState();
    if (judgeSnapshot.parseRaw !== answer) {
      fail('auto_answer_q1', `parse_failed:raw_mismatch:${judgeSnapshot.parseRaw || '-'}`);
      return;
    }
    const consumedEval = sandboxModeRef.current.getState().lastReplyEval;
    const replyTelemetry = sandboxModeRef.current.getState().reply;
    if ((consumedEval?.messageId !== answerMessageId || !consumedEval.consumed)
      && !(replyTelemetry?.lastConsumedMessageId === answerMessageId && replyTelemetry?.consumeResult === 'consumed')) {
      fail('auto_answer_q1', 'message_injected_but_not_consumed');
      return;
    }
    if (!judgeSnapshot.parseOk) {
      fail('auto_answer_q1', `parse_failed:${judgeSnapshot.parseKind}`);
      return;
    }
    if (!judgeSnapshot.judgeAuditWritten || judgeSnapshot.consumedAt <= 0 || !judgeSnapshot.judgeResult || judgeSnapshot.judgeResult === 'not_evaluated') {
      fail('auto_answer_q1', 'judge_failed');
      return;
    }
    if (judgeSnapshot.flowStep === 'WAIT_REPLY_1' || (parseSandboxWaitReplyIndex(judgeSnapshot.flowStep) ?? -1) >= 1) {
      fail('auto_answer_q1', 'message_injected_but_not_consumed');
      return;
    }

    const revealDone = await waitFor(() => {
      const st = sandboxModeRef.current.getState();
      return st.flow.step === 'ADVANCE_NEXT' || st.sandboxFlow.postRevealChatState === 'done';
    }, 15_000);
    if (!revealDone) {
      const authoritative = readFullNightAuthoritativeState();
      if (authoritative.flowStep === 'WAIT_REPLY_1') {
        fail('auto_answer_q1', classifyAutoAnswerFailure(authoritative));
        return;
      }
      if ((parseSandboxWaitReplyIndex(authoritative.flowStep) ?? -1) >= 1) {
        fail('auto_answer_q1', classifyAutoAnswerFailure(authoritative));
        return;
      }
      if (authoritative.secondQuestionAuthoritative) {
        pass('second_question', authoritative.toQuestionId);
        return;
      }
      fail('reveal_post_reveal', 'post_reveal_not_done');
      return;
    }
    setRunning({ lastPassedStep: 'reveal_post_reveal', currentStep: 'second_question' });

    const secondQuestionShown = await waitFor(() => {
      const authoritative = readFullNightAuthoritativeState();
      return authoritative.secondQuestionAuthoritative;
    }, 15_000);
    if (!secondQuestionShown) {
      await waitFor(() => readFullNightAuthoritativeState().emitted, 1_500, 100);
      const authoritative = readFullNightAuthoritativeState();
      if (authoritative.secondQuestionAuthoritative) {
        pass('second_question', authoritative.toQuestionId);
        return;
      }
      const blocked = authoritative.blockedReason;
      fail('second_question', blocked);
      return;
    }
    const toQuestionId = readFullNightAuthoritativeState().toQuestionId;
    pass('second_question', toQuestionId);
  }, [clearChatFreeze, clearReplyUi, recordSandboxDebugAction, submitChat]);

  const exportSandboxSSOT = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const ssot = sandboxModeRef.current.getSSOT();
    localStorage.setItem(SANDBOX_SSOT_STORAGE_KEY, JSON.stringify(ssot));
    setSandboxSsotVersion(ssot.meta.version);
  }, []);

  const importSandboxSSOT = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const raw = localStorage.getItem(SANDBOX_SSOT_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as NightScript;
      const ok = sandboxModeRef.current.importSSOT(parsed);
      if (ok) {
        setSandboxSsotVersion(parsed.meta.version ?? NIGHT1.meta.version);
      }
    } catch {
      // no throw in debug import path
    }
  }, []);



  const sandboxFreezeAndWaitForReply = useCallback((askedAt: number, reason: string, waitStep: SandboxWaitReplyStep, sourceMessageId?: string) => {
    sandboxModeRef.current.setFlowStep(waitStep, `${waitStep.toLowerCase()}_entered`, askedAt);
    sandboxModeRef.current.markTagAskedThisStep(askedAt);
    sandboxModeRef.current.setFreeze({ frozen: true, reason: 'AWAIT_PLAYER_INPUT', frozenAt: askedAt });
    sandboxModeRef.current.setAnswerGate({ waiting: true, askedAt, pausedChat: true });
    const gateType = waitStep === 'WAIT_WARMUP_REPLY' ? 'warmup_tag' : 'consonant_answer';
    const targetPlayerId = normalizeHandle(activeUserInitialHandleRef.current || sandboxModeRef.current.getState().player?.handle || 'player') || 'player';
    const boundSourceMessageId = sourceMessageId
      || lockStateRef.current.replyingToMessageId
      || qnaStateRef.current.active.questionMessageId
      || lastQuestionMessageId
      || '';
    sandboxModeRef.current.setSandboxFlow({ replyGateActive: true, replyTarget: targetPlayerId, canReply: true, gateType, gateConsumed: false, replySourceMessageId: boundSourceMessageId, replySourceType: 'flow_step_gate', consumePolicy: 'single' });
    sandboxModeRef.current.setReplyGate?.({ gateType, armed: true, canReply: true, gateConsumed: false, targetPlayerId, sourceMessageId: boundSourceMessageId, sourceType: 'flow_step_gate', consumePolicy: 'single', createdAt: askedAt });
    setChatFreeze({ isFrozen: true, reason: 'tagged_question', startedAt: askedAt });
    setPauseSetAt(askedAt);
    setPauseReason(reason);
    setScrollMode('FROZEN', reason);
    setChatAutoPaused(true);
  }, [lastQuestionMessageId]);


  useEffect(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const sandboxState = sandboxModeRef.current.getState();
    const sandboxForcedReplyGateActive = qnaStateRef.current.active.status === 'AWAITING_REPLY'
      && Boolean(qnaStateRef.current.active.questionMessageId);
    const reveal = sandboxState.reveal;
    if (reveal.visible && reveal.phase === 'enter') {
      sandboxModeRef.current.setPronounceState('idle', { key: reveal.audioKey, reason: 'reserved_no_side_effect' });
    }
    if (reveal.visible && reveal.phase === 'word' && reveal.startedAt > 0) {
      clearSandboxRevealDoneTimer();
      const elapsed = Date.now() - reveal.startedAt;
      const remainMs = Math.max(0, SANDBOX_REVEAL_VISIBLE_MIN_MS - elapsed);
      sandboxRevealDoneTimerRef.current = window.setTimeout(() => {
        sandboxModeRef.current.forceRevealDone();
        sandboxModeRef.current.markRevealDone();
        bumpSandboxRevealTick();
      }, remainMs);
    }
    if (reveal.phase === 'done') {
      if (reveal.visible || !reveal.cleanupAt) {
        sandboxModeRef.current.markRevealDone();
        bumpSandboxRevealTick();
      }
      const revealDrivenStep = sandboxState.flow.step === 'REVEAL_WORD'
        || sandboxState.flow.step === 'POST_REVEAL_CHAT'
        || sandboxState.flow.step === 'ADVANCE_NEXT';
      if (!revealDrivenStep) {
        return;
      }
    }
    if (sandboxForcedReplyGateActive) {
      return () => {
        clearSandboxRevealDoneTimer();
      };
    }

    if (sandboxState.flow.step === 'WAIT_WARMUP_REPLY') {
      const gate = sandboxState.replyGate;
      const targetPlayerId = normalizeHandle(activeUserInitialHandleRef.current || sandboxState.player?.handle || 'player') || 'player';
      const sourceMessageId = gate?.sourceMessageId || lockStateRef.current.replyingToMessageId || qnaStateRef.current.active.questionMessageId || lastQuestionMessageId || '';
      const needsWarmupGateRepair = gate?.gateType !== 'warmup_tag' || !gate?.armed || !gate?.canReply || !gate?.targetPlayerId || !sourceMessageId;
      if (needsWarmupGateRepair) {
        const askedAt = sandboxState.flow.stepStartedAt || Date.now();
        sandboxModeRef.current.setReplyGate?.({ gateType: 'warmup_tag', armed: true, canReply: true, gateConsumed: false, targetPlayerId, sourceMessageId, sourceType: gate?.sourceType || 'chat', consumePolicy: 'once', createdAt: askedAt });
        sandboxModeRef.current.setSandboxFlow({ gateType: 'warmup_tag', replyGateActive: true, canReply: true, replyTarget: targetPlayerId, gateConsumed: false, replySourceMessageId: sourceMessageId, replySourceType: 'chat', consumePolicy: 'once' });
      }
      return () => { clearSandboxRevealDoneTimer(); };
    }

    if (sandboxState.flow.step === 'VIP_TAG_PLAYER') {
      const taggedUser = normalizeHandle(activeUserInitialHandleRef.current || 'player') || 'player';
      const speaker = SANDBOX_VIP.handle;
      const line = `@${taggedUser} 第一次來嗎？先打個招呼～`;
      const askedAt = Date.now();
      const sent = dispatchChatMessage({ id: crypto.randomUUID(), username: speaker, type: 'chat', text: line, language: 'zh', translation: line, role: 'vip', isVip: 'VIP_NORMAL', badge: 'crown' }, { source: 'sandbox_consonant', sourceTag: 'sandbox_warmup_tag' });
      if (sent.ok) {
        lockStateRef.current = { isLocked: true, target: speaker, startedAt: askedAt, replyingToMessageId: sent.messageId };
        sandboxFreezeAndWaitForReply(askedAt, 'sandbox_warmup_tag', 'WAIT_WARMUP_REPLY');
      }
      bumpSandboxRevealTick();
    }
    if (sandboxState.flow.step === 'POST_REPLY_CHAT' && !sandboxWaveRunningRef.current) {
      sandboxWaveRunningRef.current = true;
      const warmupFollow = [
        { user: 'viewer_118', text: '歡迎歡迎～' },
        { user: 'viewer_203', text: '新朋友一起看～' }
      ];
      warmupFollow.forEach((item) => {
        const preheatFingerprint = `${item.user}:${item.text.trim().toLowerCase()}`;
        if (sandboxPreheatDedupRef.current.emittedFingerprints.has(preheatFingerprint)) return;
        dispatchChatMessage({ id: crypto.randomUUID(), username: item.user, type: 'chat', text: item.text, language: 'zh', translation: item.text }, { source: 'sandbox_consonant', sourceTag: 'sandbox_preheat_chat' });
        sandboxPreheatDedupRef.current.emittedFingerprints.add(preheatFingerprint);
      });
      sandboxWaveRunningRef.current = false;
      sandboxModeRef.current.setFlowStep('REVEAL_1_START', 'warmup_post_reply_done', Date.now());
      bumpSandboxRevealTick();
    }

    if (sandboxState.flow.step === 'REVEAL_1_START') {
      const node = sandboxModeRef.current.getCurrentNode();
      if (!node) return () => { clearSandboxRevealDoneTimer(); };
      const existing = sandboxModeRef.current.getCurrentPrompt();
      if (!existing || existing.kind !== 'consonant' || existing.wordKey !== node.id) {
        const promptId = crypto.randomUUID();
        sandboxModeRef.current.setCurrentPrompt({
          kind: 'consonant',
          promptId,
          consonant: node.char,
          wordKey: node.id,
          pinnedText: `請讀出剛剛閃過的字：${node.char}`,
          correctKeywords: node.correctKeywords ?? [node.char],
          unknownKeywords: node.unknownKeywords ?? ['不知道']
        });
      }
      const hydratedState = sandboxModeRef.current.getState();
      if (hasSandboxQuestionPrerequisites(hydratedState)) {
        sandboxModeRef.current.setFlowStep('REVEAL_1_RIOT', 'reveal_prompt_ready', Date.now());
      }
      bumpSandboxRevealTick();
    }
    if (sandboxState.flow.step === 'REVEAL_1_RIOT' && !sandboxWaveRunningRef.current) {
      if (!hasSandboxQuestionPrerequisites(sandboxState)) {
        sandboxModeRef.current.commitAdvanceBlockedReason('reveal_not_ready_for_riot');
        return () => { clearSandboxRevealDoneTimer(); };
      }
      sandboxWaveRunningRef.current = true;
      const riot: Array<{ user: string; text: string; translation?: string; vip?: boolean; role?: 'viewer' | 'vip' | 'mod'; badge?: 'crown' }> = [
        { user: 'viewer_118', text: '欸剛剛是不是有字閃過？', translation: '欸剛剛是不是有字閃過？' },
        { user: 'viewer_203', text: '看起來像泰文耶', translation: '看起來像泰文耶' },
        { user: 'viewer_409', text: '那個像子音嗎還是整個單字？', translation: '那個像子音嗎還是整個單字？' },
        { user: SANDBOX_VIP.handle, text: '我有看到一瞬間，聊天室有人會唸嗎', translation: '我有看到一瞬間，聊天室有人會唸嗎', vip: true, role: 'vip' as const, badge: 'crown' as const }
      ];
      riot.forEach((message) => {
        dispatchChatMessage(convertSandboxChatMessage(message), { source: 'sandbox_consonant', sourceTag: 'sandbox_reveal_1_riot' });
      });
      window.setTimeout(() => {
        sandboxWaveRunningRef.current = false;
        sandboxModeRef.current.setFlowStep('TAG_PLAYER_1', 'reveal_riot_done', Date.now());
        bumpSandboxRevealTick();
      }, 900);
      bumpSandboxRevealTick();
    }
    if (sandboxState.flow.step === 'TAG_PLAYER_1') {
      if (!hasSandboxQuestionPrerequisites(sandboxState)) {
        sandboxModeRef.current.commitAdvanceBlockedReason('prompt_missing_for_tag');
        return () => { clearSandboxRevealDoneTimer(); };
      }
      sandboxModeRef.current.setFlowStep('WAIT_REPLY_1', 'tag_gate_armed', Date.now());
      bumpSandboxRevealTick();
    }
    if (sandboxState.flow.step === 'WAIT_REPLY_1') {
      const currentPrompt = sandboxState.prompt.current;
      const gate = sandboxState.replyGate;
      const activePromptArmed = currentPrompt?.kind === 'consonant' && Boolean(gate?.armed && gate?.canReply && gate?.gateType !== 'none');
      if (activePromptArmed) {
        sandboxModeRef.current.commitPromptOverlay({ consonantShown: currentPrompt.consonant });
        sandboxModeRef.current.commitRenderSync?.({
          stateQuestionId: currentPrompt.wordKey,
          renderedQuestionId: currentPrompt.wordKey,
          renderBlockedReason: 'none',
          commitSource: 'wait_reply_1_gate_armed'
        });
      }
      const fallbackSourceMessageId = gate?.sourceMessageId || lockStateRef.current.replyingToMessageId || qnaStateRef.current.active.questionMessageId || lastQuestionMessageId || '';
      if (!gate?.gateType || gate.gateType === 'none') {
        sandboxModeRef.current.setReplyGate?.({ gateType: 'consonant_answer', armed: true, canReply: true, gateConsumed: false, sourceMessageId: fallbackSourceMessageId });
        sandboxModeRef.current.setSandboxFlow({ gateType: 'consonant_answer', replyGateActive: true, canReply: true, gateConsumed: false, replySourceMessageId: fallbackSourceMessageId });
      }
      if (!fallbackSourceMessageId) {
        sandboxModeRef.current.commitAdvanceBlockedReason('wait_reply_1_missing_source_message_id');
      }
      if (currentPrompt?.kind === 'consonant') {
        const targetPlayerId = normalizeHandle(activeUserInitialHandleRef.current || sandboxState.player?.handle || 'player') || 'player';
        const sourceMessageId = gate?.sourceMessageId || lockStateRef.current.replyingToMessageId || qnaStateRef.current.active.questionMessageId || lastQuestionMessageId || '';
        const sourceType = gate?.sourceType || 'chat';
        const consumePolicy = gate?.consumePolicy || 'single';
        const needsConsonantGateRepair = gate?.gateType !== 'consonant_answer' || !gate?.armed || !gate?.canReply || !gate?.targetPlayerId || !sourceMessageId || !gate?.sourceType || !gate?.consumePolicy;
        if (needsConsonantGateRepair) {
          const askedAt = sandboxState.flow.stepStartedAt || Date.now();
          sandboxModeRef.current.setReplyGate?.({ gateType: 'consonant_answer', armed: true, canReply: true, gateConsumed: false, targetPlayerId, sourceMessageId, sourceType, consumePolicy, createdAt: askedAt });
          sandboxModeRef.current.setSandboxFlow({ gateType: 'consonant_answer', replyGateActive: true, canReply: true, replyTarget: targetPlayerId, gateConsumed: false, replySourceMessageId: sourceMessageId, replySourceType: sourceType, consumePolicy });
        }
      }
      if (sandboxState.reveal.visible && sandboxState.consonant?.judge?.lastResult === 'idle') {
        sandboxModeRef.current.setReveal?.({ visible: false, phase: 'idle', text: '', wordKey: '' });
      }
      if (sandboxState.flow.tagAskedThisStep) return () => { clearSandboxRevealDoneTimer(); };
      if (!hasSandboxQuestionPrerequisites(sandboxState)) {
        sandboxModeRef.current.setSandboxFlow({ canReply: false, replyGateActive: false });
        sandboxModeRef.current.commitAdvanceBlockedReason('gate_blocked_missing_prompt_or_reveal');
        return () => { clearSandboxRevealDoneTimer(); };
      }
      const taggedUser = normalizeHandle(activeUserInitialHandleRef.current || 'player') || 'player';
      const speaker = 'mod_live';
      const line = `@${taggedUser} 你知道剛剛閃過那個字怎麼唸嗎？`;
      const normalizedLine = line.trim().toLowerCase().replace(/\s+/g, ' ');
      const askedAt = Date.now();
      const questionFingerprint = `WAIT_REPLY_1:${sandboxState.sandboxFlow.questionIndex}:${speaker}:${normalizedLine}`;
      const dedupeWindowMs = sandboxState.sandboxFlow.dedupeWindowMs || 5000;
      const previousAskedAt = sandboxQuestionFingerprintRef.current[questionFingerprint] || 0;
      if (previousAskedAt > 0 && askedAt - previousAskedAt < dedupeWindowMs) {
        sandboxModeRef.current.markTagAskedThisStep(previousAskedAt);
        bumpSandboxRevealTick(askedAt);
        return () => { clearSandboxRevealDoneTimer(); };
      }
      sandboxQuestionFingerprintRef.current[questionFingerprint] = askedAt;
      sandboxModeRef.current.markTagAskedThisStep(askedAt);
      sandboxModeRef.current.setSandboxFlow({
        questionEmitterId: speaker,
        retryEmitterId: SANDBOX_VIP.handle,
        glitchEmitterIds: ['viewer_118', 'viewer_203', 'viewer_409'],
        retryCount: 0,
        retryLimit: 1,
        lastPromptAt: askedAt,
        nextRetryAt: askedAt + 7000,
        questionPromptFingerprint: questionFingerprint,
        normalizedPrompt: normalizedLine,
        gateConsumed: false,
        dedupeWindowMs,
        unresolvedBehavior: 'retry_once_then_idle',
        activeSpeakerRoles: ['questionEmitter', 'retryEmitter', 'glitchEmitterPool', 'ambientViewerPool']
      });
      void runTagStartFlow({
        tagMessage: { id: crypto.randomUUID(), username: speaker, type: 'chat', text: line, language: 'zh', translation: line, tagTarget: speaker },
        pinnedText: line,
        shouldFreeze: true,
        appendMessage: (message) => {
          const sent = dispatchChatMessage(message, { source: 'sandbox_consonant', sourceTag: 'sandbox_tag_player_1_question' });
          if (!sent.ok) return sent;
          return { ok: true as const, messageId: sent.messageId };
        },
        forceScrollToBottom: async ({ reason }) => {
          setScrollMode('FOLLOW', `sandbox_warmup_${reason}`);
          setChatFreeze({ isFrozen: false, reason: null, startedAt: null });
          setPendingForceScrollReason(`sandbox_warmup_${reason}`);
          await nextAnimationFrame();
        },
        setPinnedReply: ({ messageId }) => {
          markQnaQuestionCommitted(qnaStateRef.current, { messageId, askedAt });
          lockStateRef.current = { isLocked: true, target: speaker, startedAt: askedAt, replyingToMessageId: messageId };
          const targetPlayerId = normalizeHandle(activeUserInitialHandleRef.current || sandboxModeRef.current.getState().player?.handle || 'player') || 'player';
          sandboxModeRef.current.setReplyGate?.({
            gateType: 'consonant_answer',
            armed: true,
            canReply: true,
            gateConsumed: false,
            targetPlayerId,
            sourceMessageId: messageId,
            sourceType: 'chat',
            consumePolicy: 'classic_parse_and_judge',
            createdAt: askedAt
          });
          sandboxModeRef.current.setSandboxFlow({
            gateType: 'consonant_answer',
            replyGateActive: true,
            canReply: true,
            replyTarget: targetPlayerId,
            gateConsumed: false,
            replySourceMessageId: messageId,
            replySourceType: 'chat',
            consumePolicy: 'classic_parse_and_judge'
          });
          const pinnedOk = setPinnedQuestionMessage({ source: 'sandboxPromptCoordinator', messageId, hasTagToActiveUser: true });
          if (!pinnedOk) setReplyPreviewSuppressedReason('sandbox_pinned_writer_guard');
        },
        freezeChat: ({ reason }) => {
          const questionMessageId = lockStateRef.current.replyingToMessageId || qnaStateRef.current.active.questionMessageId || lastQuestionMessageId || '';
          sandboxFreezeAndWaitForReply(askedAt, reason, 'WAIT_REPLY_1', questionMessageId);
        }
      });
      bumpSandboxRevealTick();
    }
    if (sandboxState.flow.step === 'ANSWER_EVAL') {
      const glitchBurst = [
        { username: 'viewer_118', line: '我這邊送出一直失敗' },
        { username: 'viewer_203', line: '聊天室是不是延遲了' },
        { username: 'viewer_409', line: '網路怪怪的，剛剛卡一下' }
      ];
      glitchBurst.forEach(({ username, line }) => {
        dispatchChatMessage({ id: crypto.randomUUID(), username, type: 'chat', text: line, language: 'zh', translation: line }, { source: 'sandbox_consonant', sourceTag: 'sandbox_post_answer_glitch_pool' });
      });
      sandboxModeRef.current.setJudgeResult?.('correct');
      sandboxModeRef.current.setSandboxFlow({ answerEvalCompletedQuestionId: sandboxState.prompt.current?.wordKey || sandboxState.currentPrompt?.wordKey || '' });
      sandboxModeRef.current.setFlowStep('REVEAL_WORD', 'answer_eval_done');
      bumpSandboxRevealTick();
    }
    if (sandboxState.flow.step === 'REVEAL_WORD') {
      const revealTransitionSnapshot = buildRevealTransitionSnapshot(sandboxState);
      sandboxModeRef.current.setSandboxFlow({
        nextQuestionStage: 'REVEAL_WORD',
        nextQuestionBlockedReasonSource: 'reveal',
        revealGuardReady: revealTransitionSnapshot.guardReady,
        revealCompletionReady: revealTransitionSnapshot.completionReady,
        revealTransitionEligible: revealTransitionSnapshot.transitionEligible,
        revealTransitionBlockedBy: revealTransitionSnapshot.transitionBlockedBy,
        revealEligibilitySnapshotId: revealTransitionSnapshot.snapshotId,
        revealSnapshotQuestionId: revealTransitionSnapshot.sourceQuestionId,
        revealSnapshotWordKey: revealTransitionSnapshot.sourceWordKey
      });
      const revealHasObservableTiming = revealTransitionSnapshot.hasObservableTiming;
      const revealTransitionEligible = revealTransitionSnapshot.transitionEligible;
      const promptWordKey = sandboxState.prompt.current?.wordKey ?? '';
      const ensureRevealActivatedForNormalFlow = () => {
        const revealStartedAt = sandboxState.reveal.startedAt > 0 ? sandboxState.reveal.startedAt : Date.now();
        const node = sandboxModeRef.current.forceRevealCurrent?.();
        const revealText = node?.wordText ?? sandboxState.reveal.text ?? '';
        const resolvedWordKey = node?.id ?? sandboxState.reveal.wordKey ?? promptWordKey;
        const graphemes = revealText ? Array.from(revealText) : [];
        const baseGrapheme = graphemes[0] ?? '';
        const restText = graphemes.slice(1).join('');
        sandboxModeRef.current.setReveal?.({
          visible: Boolean(revealText),
          phase: revealText ? 'word' : 'hidden',
          mode: revealText ? 'correct' : 'idle',
          text: revealText,
          wordKey: resolvedWordKey,
          consonantFromPrompt: sandboxState.prompt.current?.consonant ?? sandboxState.reveal.consonantFromPrompt ?? '',
          durationMs: SANDBOX_REVEAL_VISIBLE_MIN_MS,
          startedAt: revealStartedAt,
          finishedAt: sandboxState.reveal.phase === 'done' ? (sandboxState.reveal.finishedAt || Date.now()) : 0,
          doneAt: sandboxState.reveal.phase === 'done' ? (sandboxState.reveal.doneAt || Date.now()) : 0,
          cleanupAt: 0,
          rendered: Boolean(revealText),
          blockedReason: revealText ? '' : 'missing_word_text',
          baseGrapheme,
          restText,
          restLen: restText.length,
          splitter: baseGrapheme && restText ? 'first_grapheme' : ''
        });
        if (node?.audioKey) {
          void playPronounce(node.audioKey).then((result) => {
            sandboxModeRef.current.setPronounceState(result === 'played' ? 'playing' : 'error', { key: node.audioKey, reason: result });
            bumpSandboxRevealTick();
          });
        }
        if (!revealText) {
          sandboxModeRef.current.setSandboxFlow({ nextQuestionBlockedReason: 'reveal_guard_blocked:reveal_text_missing', nextQuestionBlockedReasonSource: 'reveal' });
        }
        bumpSandboxRevealTick();
      };
      const commitRevealTransition = (reason: string, commitAt: number, sourceSnapshotId: string) => {
        sandboxModeRef.current.setSandboxFlow({
          nextQuestionBlockedReason: 'post_reveal_blocked:pending_post_reveal_chat',
          nextQuestionBlockedReasonSource: 'post_reveal',
          nextQuestionStage: 'POST_REVEAL_CHAT',
          revealGuardReady: true,
          revealCompletionReady: true,
          revealTransitionEligible: true,
          revealTransitionBlockedBy: 'none',
          revealTransitionCommitAttempted: true,
          revealTransitionCommittedAt: commitAt,
          revealTransitionCommitReason: reason,
          revealTransitionCommitBlockedBy: 'none',
          revealEligibilitySnapshotId: sourceSnapshotId,
          revealCommitSourceSnapshotId: sourceSnapshotId,
          revealSnapshotQuestionId: revealTransitionSnapshot.sourceQuestionId,
          revealSnapshotWordKey: revealTransitionSnapshot.sourceWordKey,
          revealCommittedQuestionId: revealTransitionSnapshot.sourceQuestionId
        });
        sandboxModeRef.current.setFlowStep('POST_REVEAL_CHAT', reason, commitAt);
        bumpSandboxRevealTick();
      };

      if (revealTransitionEligible) {
        const commitAt = Date.now();
        commitRevealTransition('reveal_word_done', commitAt, revealTransitionSnapshot.snapshotId);
        bumpSandboxRevealTick(commitAt);
      } else if (sandboxState.reveal.phase === 'done' && !revealHasObservableTiming) {
        const now = Date.now();
        const repairedStartedAt = sandboxState.reveal.startedAt > 0
          ? sandboxState.reveal.startedAt
          : (sandboxState.reveal.doneAt > 0 ? sandboxState.reveal.doneAt : now);
        const repairedFinishedAt = sandboxState.reveal.finishedAt > 0
          ? sandboxState.reveal.finishedAt
          : Math.max(now, repairedStartedAt, sandboxState.reveal.doneAt || 0);
        sandboxModeRef.current.setReveal?.({ startedAt: repairedStartedAt, finishedAt: repairedFinishedAt, doneAt: sandboxState.reveal.doneAt || repairedFinishedAt });
        const repairedState = {
          ...sandboxState,
          reveal: {
            ...sandboxState.reveal,
            startedAt: repairedStartedAt,
            finishedAt: repairedFinishedAt,
            doneAt: sandboxState.reveal.doneAt || repairedFinishedAt
          }
        };
        const repairedSnapshot = buildRevealTransitionSnapshot(repairedState);
        if (repairedSnapshot.transitionEligible) {
          commitRevealTransition('reveal_word_done_timing_repaired', now, repairedSnapshot.snapshotId);
          bumpSandboxRevealTick(now);
        } else {
          sandboxModeRef.current.setSandboxFlow({
            nextQuestionBlockedReason: 'reveal_guard_blocked:timing_missing',
            revealGuardReady: repairedSnapshot.guardReady,
            revealCompletionReady: repairedSnapshot.completionReady,
            revealTransitionEligible: repairedSnapshot.transitionEligible,
            revealTransitionBlockedBy: repairedSnapshot.transitionBlockedBy,
            revealTransitionCommitAttempted: true,
            revealTransitionCommittedAt: 0,
            revealTransitionCommitReason: '',
            revealTransitionCommitBlockedBy: repairedSnapshot.transitionBlockedBy,
            revealEligibilitySnapshotId: repairedSnapshot.snapshotId,
            revealCommitSourceSnapshotId: repairedSnapshot.snapshotId,
            revealSnapshotQuestionId: repairedSnapshot.sourceQuestionId,
            revealSnapshotWordKey: repairedSnapshot.sourceWordKey
          });
        }
      } else if (sandboxState.reveal.phase === 'done' && Boolean(sandboxState.reveal.rendered)) {
        const revealDoneAt = sandboxState.reveal.doneAt || sandboxState.reveal.finishedAt || sandboxState.reveal.cleanupAt || sandboxState.flow.stepStartedAt || Date.now();
        const revealStalledMs = Date.now() - revealDoneAt;
        if (revealStalledMs >= SANDBOX_REVEAL_TO_POST_REVEAL_MAX_STALL_MS) {
          const commitAt = Date.now();
          commitRevealTransition('reveal_word_done_bounded_recovery', commitAt, revealTransitionSnapshot.snapshotId);
          bumpSandboxRevealTick(commitAt);
        } else {
          sandboxModeRef.current.setSandboxFlow({
            nextQuestionBlockedReason: 'reveal_guard_blocked:timing_missing',
            revealGuardReady: revealTransitionSnapshot.guardReady,
            revealCompletionReady: revealTransitionSnapshot.completionReady,
            revealTransitionEligible: revealTransitionSnapshot.transitionEligible,
            revealTransitionBlockedBy: 'timing_missing',
            revealTransitionCommitAttempted: true,
            revealTransitionCommittedAt: 0,
            revealTransitionCommitReason: '',
            revealTransitionCommitBlockedBy: 'timing_missing',
            revealEligibilitySnapshotId: revealTransitionSnapshot.snapshotId,
            revealCommitSourceSnapshotId: revealTransitionSnapshot.snapshotId,
            revealSnapshotQuestionId: revealTransitionSnapshot.sourceQuestionId,
            revealSnapshotWordKey: revealTransitionSnapshot.sourceWordKey
          });
        }
      } else if (sandboxState.reveal.phase === 'idle' || sandboxState.reveal.phase === 'hidden' || !sandboxState.reveal.rendered || (!sandboxState.reveal.wordKey && Boolean(sandboxState.reveal.text))) {
        const revealBlockedReason = sandboxState.reveal.blockedReason === 'hidden'
          ? 'cleanup_hidden'
          : (sandboxState.reveal.blockedReason || 'reveal_not_ready');
        sandboxModeRef.current.setSandboxFlow({
          nextQuestionBlockedReason: `reveal_guard_blocked:${revealBlockedReason}`,
          nextQuestionBlockedReasonSource: 'reveal',
          revealGuardReady: revealTransitionSnapshot.guardReady,
          revealCompletionReady: revealTransitionSnapshot.completionReady,
          revealTransitionEligible: revealTransitionSnapshot.transitionEligible,
          revealTransitionBlockedBy: revealBlockedReason,
          revealTransitionCommitAttempted: true,
          revealTransitionCommittedAt: 0,
          revealTransitionCommitReason: '',
          revealTransitionCommitBlockedBy: revealBlockedReason,
          revealEligibilitySnapshotId: revealTransitionSnapshot.snapshotId,
          revealCommitSourceSnapshotId: revealTransitionSnapshot.snapshotId
        });
        ensureRevealActivatedForNormalFlow();
      } else {
        const revealTransitionBlockedBy = revealTransitionSnapshot.transitionBlockedBy;
        sandboxModeRef.current.setSandboxFlow({
          revealGuardReady: revealTransitionSnapshot.guardReady,
          revealCompletionReady: revealTransitionSnapshot.completionReady,
          revealTransitionEligible: revealTransitionSnapshot.transitionEligible,
          revealTransitionBlockedBy,
          revealTransitionCommitAttempted: true,
          revealTransitionCommittedAt: 0,
          revealTransitionCommitReason: '',
          revealTransitionCommitBlockedBy: revealTransitionBlockedBy,
          revealEligibilitySnapshotId: revealTransitionSnapshot.snapshotId,
          revealCommitSourceSnapshotId: revealTransitionSnapshot.snapshotId
        });
      }
    }
    const getAuthoritativeQuestionId = (state: any) => state.prompt.current?.wordKey || state.currentPrompt?.wordKey || '';
    const hasPostRevealCompletionEvidence = (state: any) => {
      const questionId = getAuthoritativeQuestionId(state);
      const postRevealChatState = state.sandboxFlow?.postRevealChatState ?? 'idle';
      const completionBlockedBy = state.sandboxFlow?.postRevealCompletionBlockedBy || '';
      const doneQuestionId = state.sandboxFlow?.postRevealCompletedQuestionId || '';
      if (postRevealChatState === 'done' && !completionBlockedBy && doneQuestionId && doneQuestionId === questionId) return true;
      const backlogCleared = (state.sandboxFlow?.backlogTechMessages?.length ?? 0) === 0;
      const advancedByPostReveal = Boolean((state.audit?.transitions ?? []).some((item: any) => item?.to === 'ADVANCE_NEXT' && item?.reason === 'post_reveal_chat_done' && item?.questionId === questionId));
      return Boolean(questionId) && backlogCleared && advancedByPostReveal;
    };

    if (sandboxState.flow.step === 'POST_REVEAL_CHAT') {
      const enteredAt = sandboxState.sandboxFlow.postRevealEnteredAt || sandboxState.flow.stepStartedAt || Date.now();
      const runtimeStatus = derivePostRevealRuntimeStatus({
        ...sandboxState,
        sandboxFlow: {
          ...sandboxState.sandboxFlow,
          postRevealEnteredAt: enteredAt
        }
      });
      sandboxModeRef.current.setSandboxFlow({
        nextQuestionStage: 'POST_REVEAL_CHAT',
        nextQuestionBlockedReasonSource: 'post_reveal',
        postRevealEnteredAt: enteredAt,
        postRevealGuardReady: runtimeStatus.guardReady,
        postRevealStartEligible: runtimeStatus.startEligible,
        postRevealStartBlockedBy: runtimeStatus.startBlockedBy,
        postRevealCompletionEligible: runtimeStatus.completionEligible,
        postRevealCompletionBlockedBy: runtimeStatus.completionBlockedBy === 'none' ? '' : runtimeStatus.completionBlockedBy
      });
      if (runtimeStatus.startEligible) {
        const sourceQuestionId = getAuthoritativeQuestionId(sandboxState);
        const now = Date.now();
        sandboxModeRef.current.setSandboxFlow({
          postRevealChatState: 'started',
          postRevealStartAttempted: true,
          postRevealStartedAt: now,
          postRevealCompletionBlockedBy: 'bounded_wait_pending',
          nextQuestionReady: false,
          nextQuestionEmitted: false,
          nextQuestionBlockedReason: 'post_reveal_blocked:chat_in_progress',
          nextQuestionDecidedAt: now,
          nextQuestionEmittedAt: 0,
          nextQuestionConsumer: 'advance_next_effect',
          postRevealStartedQuestionId: sourceQuestionId
        });
        bumpSandboxRevealTick();
      } else if ((sandboxState.sandboxFlow?.postRevealChatState ?? 'idle') === 'started') {
        const completionStatus = derivePostRevealRuntimeStatus(sandboxModeRef.current.getState());
        if (completionStatus.completionEligible) {
          const doneAt = Date.now();
          const sourceQuestionId = getAuthoritativeQuestionId(sandboxModeRef.current.getState());
          sandboxModeRef.current.setSandboxFlow({
            postRevealChatState: 'done',
            postRevealStartAttempted: true,
            postRevealCompletedAt: doneAt,
            postRevealCompletionReason: 'auto_complete_bounded',
            postRevealCompletionBlockedBy: '',
            postRevealCompletedQuestionId: sourceQuestionId,
            nextQuestionReady: true,
            nextQuestionEmitted: false,
            nextQuestionBlockedReason: 'advance_next_blocked:pending_emit',
            nextQuestionBlockedReasonSource: 'advance_next',
            nextQuestionStage: 'ADVANCE_NEXT',
            nextQuestionDecidedAt: doneAt,
            nextQuestionEmittedAt: 0,
            nextQuestionConsumer: 'advance_next_effect'
          });
          sandboxModeRef.current.setFlowStep('ADVANCE_NEXT', 'post_reveal_chat_done');
        } else {
          const hasReplyGate = completionStatus.completionBlockedBy === 'reply_gate_armed';
          sandboxModeRef.current.setSandboxFlow({
            postRevealStartAttempted: true,
            postRevealCompletionBlockedBy: hasReplyGate ? 'reply_gate_armed' : 'bounded_wait_pending',
            nextQuestionBlockedReason: hasReplyGate ? 'post_reveal_blocked:reply_gate_armed' : 'post_reveal_blocked:bounded_wait_pending'
          });
        }
        bumpSandboxRevealTick();
      }
    }


    if (sandboxState.flow.step === 'POSSESSION_AUTOFILL') {
      const node = sandboxModeRef.current.getCurrentNode();
      if (node?.wordText) {
        sandboxPossessionRef.current.inputToken += 1;
        setSandboxInputControl({
          valueToken: sandboxPossessionRef.current.inputToken,
          value: node.wordText,
          sendToken: sandboxPossessionRef.current.sendToken
        });
      }
      sandboxModeRef.current.setFlowStep('POSSESSION_AUTOSEND', 'possession_input_set');
      bumpSandboxRevealTick();
    }
    if (sandboxState.flow.step === 'POSSESSION_AUTOSEND') {
      const waitMs = randomInt(SANDBOX_POSSESSION_AUTOSEND_MIN_MS, SANDBOX_POSSESSION_AUTOSEND_MAX_MS);
      window.setTimeout(() => {
        sandboxPossessionRef.current.sendToken += 1;
        setSandboxInputControl((prev) => ({ ...prev, sendToken: sandboxPossessionRef.current.sendToken }));
        sandboxModeRef.current.setFlowStep('CROWD_REACT_WORD', 'possession_autosend_done');
        bumpSandboxRevealTick();
      }, waitMs);
    }
    if (sandboxState.flow.step === 'CROWD_REACT_WORD' && !sandboxWaveRunningRef.current) {
      sandboxWaveRunningRef.current = true;
      const riot = sandboxChatEngineRef.current?.emitCrowdReactWord(SANDBOX_WORD_RIOT_BURST_COUNT) ?? [];
      riot.forEach((message) => {
        dispatchChatMessage(convertSandboxChatMessage(message), { source: 'sandbox_consonant', sourceTag: 'sandbox_crowd_react_word' });
      });
      window.setTimeout(() => {
        sandboxWaveRunningRef.current = false;
        sandboxModeRef.current.setFlowStep('VIP_SUMMARY_1', 'crowd_react_done', Date.now());
        bumpSandboxRevealTick();
      }, 900);
      bumpSandboxRevealTick();
    }
    if (sandboxState.flow.step === 'VIP_SUMMARY_1') {
      const line = 'VIP 總結：先把剛剛那個單字記住，下一步確認發音。';
      dispatchChatMessage({ id: crypto.randomUUID(), username: SANDBOX_VIP.handle, type: 'chat', text: line, language: 'zh', translation: line, isVip: 'VIP_NORMAL', role: 'vip', badge: 'crown' }, { source: 'sandbox_consonant', sourceTag: 'sandbox_vip_summary_1' });
      sandboxModeRef.current.setFlowStep('DISCUSS_PRONOUNCE', 'vip_summary_1_done', Date.now());
      bumpSandboxRevealTick();
    }

    if (sandboxState.flow.step === 'DISCUSS_PRONOUNCE' && !sandboxWaveRunningRef.current) {
      sandboxWaveRunningRef.current = true;
      const discuss = sandboxChatEngineRef.current?.emitReasoningWave(randomInt(3, 5)) ?? [];
      discuss.forEach((message) => {
        dispatchChatMessage(convertSandboxChatMessage(message), { source: 'sandbox_consonant', sourceTag: 'sandbox_discuss_pronounce' });
      });
      window.setTimeout(() => {
        sandboxWaveRunningRef.current = false;
        sandboxModeRef.current.setFlowStep('TAG_PLAYER_3', 'discuss_pronounce_done', Date.now());
        bumpSandboxRevealTick();
      }, 900);
      bumpSandboxRevealTick();
    }

    if (sandboxState.flow.step === 'VIP_SUMMARY_2') {
      const line = 'VIP 總結：發音方向差不多了，最後確認這個詞在指誰。';
      dispatchChatMessage({ id: crypto.randomUUID(), username: SANDBOX_VIP.handle, type: 'chat', text: line, language: 'zh', translation: line, isVip: 'VIP_NORMAL', role: 'vip', badge: 'crown' }, { source: 'sandbox_consonant', sourceTag: 'sandbox_vip_summary_2' });
      sandboxModeRef.current.setFlowStep('TAG_PLAYER_3', 'vip_summary_2_done', Date.now());
      bumpSandboxRevealTick();
    }

    const dynamicTagQuestionNumber = parseSandboxTagStepIndex(sandboxState.flow.step);
    if (dynamicTagQuestionNumber !== null && dynamicTagQuestionNumber >= 2) {
      if (sandboxState.flow.tagAskedThisStep) return () => { clearSandboxRevealDoneTimer(); };
      const taggedUser = normalizeHandle(activeUserInitialHandleRef.current || 'player') || 'player';
      const speaker = 'mod_live';
      const line = `@${taggedUser} 第 ${dynamicTagQuestionNumber} 題，請直接回答你看到的子音。`;
      const sourceTag = `sandbox_tag_player_${dynamicTagQuestionNumber}`;
      void runTagStartFlow({
        tagMessage: {
          id: crypto.randomUUID(),
          username: speaker,
          type: 'chat',
          text: line,
          language: 'zh',
          translation: line,
          tagTarget: speaker
        },
        pinnedText: line,
        shouldFreeze: true,
        appendMessage: (message) => {
          const sent = dispatchChatMessage(message, { source: 'sandbox_consonant', sourceTag });
          if (!sent.ok) return sent;
          return { ok: true as const, messageId: sent.messageId };
        },
        forceScrollToBottom: async ({ reason }) => {
          setScrollMode('FOLLOW', `sandbox_tag${dynamicTagQuestionNumber}_${reason}`);
          setChatFreeze({ isFrozen: false, reason: null, startedAt: null });
          setPendingForceScrollReason(`sandbox_tag${dynamicTagQuestionNumber}_${reason}`);
          await nextAnimationFrame();
        },
        setPinnedReply: ({ messageId }) => {
          const askedAt = Date.now();
          markQnaQuestionCommitted(qnaStateRef.current, { messageId, askedAt });
          lockStateRef.current = { isLocked: true, target: speaker, startedAt: askedAt, replyingToMessageId: messageId };
          const pinnedOk = setPinnedQuestionMessage({ source: 'sandboxPromptCoordinator', messageId, hasTagToActiveUser: true });
          if (!pinnedOk) setReplyPreviewSuppressedReason('sandbox_pinned_writer_guard');
        },
        freezeChat: ({ reason }) => {
          const askedAt = Date.now();
          sandboxTechBacklogRef.current = [];
          sandboxTechBacklogTotalWaitMsRef.current = 0;
          sandboxTechBacklogLastAtRef.current = askedAt;
          sandboxModeRef.current.markTagAskedThisStep(askedAt);
          const waitStep = resolveSandboxWaitReplyStepByQuestionNumber(dynamicTagQuestionNumber);
          sandboxFreezeAndWaitForReply(askedAt, reason, waitStep);
        }
      });
      bumpSandboxRevealTick();
    }
    if (sandboxState.flow.step === 'FLUSH_TECH_BACKLOG') {
      const waitedMs = Math.max(sandboxTechBacklogTotalWaitMsRef.current, Date.now() - (sandboxState.flow.stepStartedAt || Date.now()));
      const roundedMinutes = Math.max(1, Math.round((waitedMs / 60000) / 5) * 5 || 1);
      const backlogBase = sandboxModeRef.current.getState().sandboxFlow.backlogTechMessages.filter((line: string) => !line.startsWith('奇怪卡了大約 '));
      const backlog = [...backlogBase.slice(-7), `奇怪卡了大約 ${roundedMinutes} 分鐘`].slice(-8);
      backlog.forEach((line) => {
        dispatchChatMessage({ id: crypto.randomUUID(), username: 'mod_live', type: 'chat', text: line, language: 'zh', translation: line }, { source: 'sandbox_consonant', sourceTag: 'sandbox_tech_backlog_flush' });
      });
      sandboxModeRef.current.setSandboxFlow({ backlogTechMessages: [], pendingBacklogMessages: [] });
      sandboxTechBacklogLastAtRef.current = 0;
      sandboxTechBacklogTotalWaitMsRef.current = 0;
      sandboxModeRef.current.setFlowStep('POSSESSION_AUTOFILL', 'tech_backlog_flushed');
      bumpSandboxRevealTick();
    }
    if (sandboxState.flow.step === 'ADVANCE_NEXT') {
      sandboxModeRef.current.setSandboxFlow({
        nextQuestionStage: 'ADVANCE_NEXT',
        nextQuestionBlockedReasonSource: 'advance_next',
        advanceNextEnteredAt: sandboxState.sandboxFlow.advanceNextEnteredAt || sandboxState.flow.stepStartedAt || Date.now()
      });
      const refreshedState = sandboxModeRef.current.getState();
      const refreshedPostRevealDone = hasPostRevealCompletionEvidence(refreshedState);
      const beforeAdvance = refreshedState.flow.questionIndex;
      const fromNode = sandboxModeRef.current.getCurrentNode();
      const fromQuestionId = fromNode?.id ?? '';
      const decidedAt = Date.now();
      const answerEvalDoneForQuestion = refreshedState.sandboxFlow?.answerEvalCompletedQuestionId === fromQuestionId;
      const revealDoneForQuestion = refreshedState.sandboxFlow?.revealCommittedQuestionId === fromQuestionId;
      const postRevealDoneForQuestion = refreshedState.sandboxFlow?.postRevealCompletedQuestionId === fromQuestionId;
      if (!(answerEvalDoneForQuestion && revealDoneForQuestion && postRevealDoneForQuestion)) {
        sandboxModeRef.current.setSandboxFlow({
          nextQuestionReady: false,
          nextQuestionEmitted: false,
          nextQuestionFromIndex: beforeAdvance,
          nextQuestionToIndex: -1,
          nextQuestionFromQuestionId: fromQuestionId,
          nextQuestionToQuestionId: '',
          nextQuestionBlockedReason: 'advance_next_blocked:missing_per_question_chain',
          nextQuestionDecidedAt: decidedAt,
          nextQuestionEmittedAt: 0,
          nextQuestionConsumer: 'advance_next_effect'
        });
        return () => {
          clearSandboxRevealDoneTimer();
        };
      }
      if (!refreshedPostRevealDone) {
        sandboxModeRef.current.setSandboxFlow({
          nextQuestionReady: false,
          nextQuestionEmitted: false,
          nextQuestionFromIndex: beforeAdvance,
          nextQuestionToIndex: -1,
          nextQuestionFromQuestionId: fromQuestionId,
          nextQuestionToQuestionId: '',
          nextQuestionBlockedReason: 'advance_next_blocked:post_reveal_chat_not_done',
          nextQuestionDecidedAt: decidedAt,
          nextQuestionEmittedAt: 0,
          nextQuestionConsumer: 'advance_next_effect'
        });
        return () => {
          clearSandboxRevealDoneTimer();
        };
      }
      if (Boolean(refreshedState.replyGate?.armed && refreshedState.replyGate?.gateType !== 'none')) {
        sandboxModeRef.current.setSandboxFlow({
          nextQuestionReady: false,
          nextQuestionEmitted: false,
          nextQuestionFromIndex: beforeAdvance,
          nextQuestionToIndex: -1,
          nextQuestionFromQuestionId: fromQuestionId,
          nextQuestionToQuestionId: '',
          nextQuestionBlockedReason: 'advance_next_blocked:reply_gate_still_armed',
          nextQuestionDecidedAt: decidedAt,
          nextQuestionEmittedAt: 0,
          nextQuestionConsumer: 'advance_next_effect'
        });
        return () => {
          clearSandboxRevealDoneTimer();
        };
      }
      sandboxWaveRunningRef.current = false;
      const emitted = sandboxModeRef.current.advancePromptAtomically?.({
        reason: 'advance_next_atomic_emit',
        nextTagStep: resolveSandboxTagStepByQuestionNumber(beforeAdvance + 2),
        sceneKeyResolver: resolveSandboxSceneKeyByQuestionIndex
      });
      if (!emitted?.ok) {
        sandboxModeRef.current.setSandboxFlow({
          nextQuestionReady: false,
          nextQuestionEmitted: false,
          nextQuestionFromIndex: beforeAdvance,
          nextQuestionToIndex: -1,
          nextQuestionFromQuestionId: fromQuestionId,
          nextQuestionToQuestionId: '',
          nextQuestionBlockedReason: 'advance_next_blocked:end_of_question_pool',
          nextQuestionDecidedAt: decidedAt,
          nextQuestionEmittedAt: 0,
          nextQuestionConsumer: 'advance_next_effect'
        });
        return () => {
          clearSandboxRevealDoneTimer();
        };
      }
      const afterState = sandboxModeRef.current.getState();
      const afterNode = sandboxModeRef.current.getCurrentNode();
      const nextQuestionNumber = afterState.flow.questionIndex + 1;
      if (emitted.sceneKey) {
        requestSceneAction({ type: 'REQUEST_VIDEO_SWITCH', key: emitted.sceneKey, reason: `advance_next_emit_q${nextQuestionNumber}`, sourceEventKey: 'SCENE_REQUEST' });
      }
      sandboxModeRef.current.setSandboxFlow({
        postRevealChatState: 'idle',
        postRevealStartAttempted: false,
        postRevealStartedAt: 0,
        postRevealCompletedAt: 0,
        postRevealCompletionReason: '',
        postRevealCompletionBlockedBy: '',
        postRevealStartedQuestionId: '',
        postRevealCompletedQuestionId: '',
        answerEvalCompletedQuestionId: '',
        revealCommittedQuestionId: '',
        revealEligibilitySnapshotId: '',
        revealCommitSourceSnapshotId: '',
        revealSnapshotQuestionId: '',
        revealSnapshotWordKey: '',
        nextQuestionReady: true,
        nextQuestionEmitted: true,
        nextQuestionFromIndex: beforeAdvance,
        nextQuestionToIndex: afterState.flow.questionIndex,
        nextQuestionFromQuestionId: fromQuestionId,
        nextQuestionToQuestionId: afterNode?.id ?? '',
        nextQuestionBlockedReason: 'emitted',
        nextQuestionBlockedReasonSource: 'advance_next',
        nextQuestionStage: 'emitted',
        nextQuestionDecidedAt: decidedAt,
        nextQuestionEmittedAt: Date.now(),
        nextQuestionConsumer: 'advance_next_effect'
      });
      if (beforeAdvance >= 10) {
        sandboxModeRef.current.setSandboxFlow({ autoplayNightStatus: 'completed' });
      }
      sandboxModeRef.current.setAnswerGate({ waiting: false, pausedChat: false });
      sandboxModeRef.current.setLastTimestamps({ lastAskAt: 0 });
      sandboxConsonantPromptNodeIdRef.current = null;
      bumpSandboxRevealTick();
    }
    return () => {
      clearSandboxRevealDoneTimer();
    };
  }, [clearSandboxRevealDoneTimer, convertSandboxChatMessage, hasSandboxQuestionPrerequisites, resolveSandboxSceneKeyByQuestionIndex, sandboxRevealTick]);


  const handleTagHighlightEvaluated = useCallback((payload: { messageId: string; reason: 'mentions_activeUser' | 'none'; applied: boolean }) => {
    lastHighlightReasonRef.current = payload.reason;
    if (payload.applied) {
      tagHighlightAppliedCountRef.current += 1;
    }
    updateChatDebug({
      chat: {
        ...(window.__CHAT_DEBUG__?.chat ?? {}),
        mention: {
          ...(window.__CHAT_DEBUG__?.chat?.mention ?? {}),
          lastParsedMentions: { ...lastParsedMentionsRef.current },
          lastHighlightReason: lastHighlightReasonRef.current,
          tagHighlightAppliedCount: tagHighlightAppliedCountRef.current
        }
      }
    });
  }, [updateChatDebug]);

  const mode = modeIdRef.current;

  const readModePersistenceDebug = useCallback((storeMode?: 'classic' | 'sandbox_story') => {
    const queryMode = resolveModeFromQuery() ?? '-';
    const storageMode = window.localStorage.getItem(DEBUG_MODE_STORAGE_KEY) ?? '-';
    return `query=${queryMode} | storage=${storageMode} | store=${storeMode ?? modeIdRef.current}`;
  }, []);

  const pushModeSwitchDebug = useCallback((next: LastModeSwitchStatus) => {
    setLastModeSwitch(next);
    window.sessionStorage.setItem(DEBUG_MODE_SWITCH_STATUS_KEY, JSON.stringify(next));
  }, []);

  const switchDebugMode = useCallback((nextMode: 'classic' | 'sandbox_story') => {
    const clickAt = Date.now();
    pushModeSwitchDebug({
      clickAt,
      requestedMode: nextMode,
      persistedMode: readModePersistenceDebug(),
      action: 'none',
      result: '-',
      reason: ''
    });
    if (!debugEnabled) {
      pushModeSwitchDebug({
        clickAt,
        requestedMode: nextMode,
        persistedMode: readModePersistenceDebug(),
        action: 'none',
        result: 'blocked',
        reason: 'debug_disabled'
      });
      return;
    }
    if (nextMode !== 'classic' && nextMode !== 'sandbox_story') {
      pushModeSwitchDebug({
        clickAt,
        requestedMode: nextMode,
        persistedMode: readModePersistenceDebug(),
        action: 'none',
        result: 'blocked',
        reason: 'invalid_mode'
      });
      return;
    }
    if (nextMode === modeIdRef.current) {
      pushModeSwitchDebug({
        clickAt,
        requestedMode: nextMode,
        persistedMode: readModePersistenceDebug(),
        action: 'none',
        result: 'blocked',
        reason: 'already_current_mode'
      });
      return;
    }
    try {
      window.localStorage.setItem(DEBUG_MODE_STORAGE_KEY, nextMode);
      const chatDebug = (window.__CHAT_DEBUG__ ??= {} as any) as any;
      chatDebug.debug = {
        ...(chatDebug.debug ?? {}),
        modeOverride: nextMode,
        modeOverrideSource: 'debug_mode_switcher'
      };
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('mode', nextMode);
      const persisted = readModePersistenceDebug(nextMode);
      setDebugModeSwitching(true);
      pushModeSwitchDebug({
        clickAt,
        requestedMode: nextMode,
        persistedMode: persisted,
        action: 'reload',
        result: 'ok',
        reason: ''
      });
      window.location.assign(nextUrl.toString());
    } catch (error) {
      pushModeSwitchDebug({
        clickAt,
        requestedMode: nextMode,
        persistedMode: readModePersistenceDebug(),
        action: 'none',
        result: 'error',
        reason: error instanceof Error ? error.message : 'mode_switch_exception'
      });
      setDebugModeSwitching(false);
    }
  }, [debugEnabled, pushModeSwitchDebug, readModePersistenceDebug]);

  const getGhostEventManagerDebugState = useCallback((): GhostEventManagerDebugState => {
    const now = Date.now();
    const isLocked = Boolean(lockStateRef.current.isLocked);
    const inFlight = Boolean(eventRunnerStateRef.current.inFlight);
    const events = EVENT_TESTER_KEYS.map((eventName) => {
      const def = EVENT_REGISTRY[eventName];
      const cooldownUntil = eventCooldownsRef.current[eventName] ?? 0;
      const cooldown = Math.max(0, cooldownUntil - now);
      const status: GhostEventMonitorStatus = isLocked ? 'locked' : cooldown > 0 ? 'cooldown' : 'ready';
      return {
        eventName,
        status,
        cooldown,
        lock: isLocked,
        preSound: def.preEffect?.sfxKey ?? 'none',
        postSound: def.postEffect?.sfxKey ?? 'none'
      };
    });
    return {
      events,
      ghostSystem: {
        activeEvents: inFlight ? 1 : 0,
        eventQueueLength: eventQueueRef.current.length,
        lastEvent: eventLastKeyRef.current,
        cooldownCount: events.filter((entry) => entry.status === 'cooldown').length
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== 'sandbox_story') {
      setFearDebugState(EMPTY_FEAR_DEBUG_STATE);
      return;
    }
    const refresh = () => {
      setGhostEventDebugState(getGhostEventManagerDebugState());
      setFearDebugState(sandboxModeRef.current.getFearDebugState());
    };
    refresh();
    const timer = window.setInterval(refresh, 500);
    return () => {
      window.clearInterval(timer);
    };
  }, [getGhostEventManagerDebugState, mode]);

  const triggerForceGhostEvent = useCallback(() => {
    recordSandboxDebugAction('force_ghost_event', { lastClickedAt: Date.now(), handlerInvoked: true });
    if (modeRef.current.id !== 'sandbox_story') { recordSandboxDebugAction('force_ghost_event', { effectApplied: false, blockedReason: 'not_in_sandbox_story', lastResult: 'blocked' }); return; }
    const state = getGhostEventManagerDebugState();
    const readyEvents = state.events.filter((entry) => entry.status === 'ready').map((entry) => entry.eventName);
    if (readyEvents.length <= 0) { recordSandboxDebugAction('force_ghost_event', { effectApplied: false, blockedReason: 'no_ready_ghost_event', lastResult: 'blocked' }); return; }
    const picked = pickOne(readyEvents);
    triggerEventFromTester(picked);
    recordSandboxDebugAction('force_ghost_event', { effectApplied: true, blockedReason: '-', lastResult: `triggered:${picked}` });
    setGhostEventDebugState(getGhostEventManagerDebugState());
  }, [getGhostEventManagerDebugState, recordSandboxDebugAction, triggerEventFromTester]);

  const handleDebugAddFear = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    sandboxModeRef.current.debugAddFear(10);
    setFearDebugState(sandboxModeRef.current.getFearDebugState());
  }, []);

  const handleDebugResetFear = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    sandboxModeRef.current.debugResetFear();
    setFearDebugState(sandboxModeRef.current.getFearDebugState());
  }, []);

  const handleSandboxRevealRenderStateChange = useCallback((payload: { rendered: boolean; blockedReason: string }) => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const st = sandboxModeRef.current.getState();
    const now = Date.now();
    const preserveRenderedAfterDone = st.reveal.phase === 'done' && st.reveal.rendered && !payload.rendered;
    const nextRendered = preserveRenderedAfterDone ? true : payload.rendered;
    const nextBlockedReason = preserveRenderedAfterDone ? '' : (payload.blockedReason || '');
    const nextStartedAt = nextRendered ? (st.reveal.startedAt || now) : st.reveal.startedAt;
    const nextFinishedAt = st.reveal.phase === 'done'
      ? (st.reveal.finishedAt || now)
      : (nextRendered ? 0 : st.reveal.finishedAt || 0);
    sandboxModeRef.current.setReveal?.({
      rendered: nextRendered,
      blockedReason: nextBlockedReason,
      startedAt: nextStartedAt,
      finishedAt: nextFinishedAt
    });
    if (st.flow.step === 'POST_REVEAL_CHAT' && !nextRendered && st.reveal.phase !== 'done') {
      sandboxModeRef.current.setSandboxFlow({ nextQuestionBlockedReason: `post_reveal_blocked:${nextBlockedReason || 'reveal_not_rendered'}`, nextQuestionBlockedReasonSource: 'post_reveal', nextQuestionStage: 'POST_REVEAL_CHAT' });
    }
    bumpSandboxRevealTick(now);
  }, []);

  const sandboxReplyGateState = deriveSandboxReplyGateState();

  return (
    <div ref={shellRef} className={`app-shell app-root-layout ${isDesktopLayout ? 'desktop-layout' : 'mobile-layout'}`}>
      <LoadingOverlay
        visible={isLoading}
        progress={loadingProgress}
        statusText={initStatusText}
        errorTitle={loadingErrorTitle}
        errors={requiredAssetErrors.map(formatMissingAsset)}
      />
      {shouldShowMainContent && (
      <main className="app-root app-layout">
        <header ref={headerRef} className="app-header top-dock">
          <div className="top-dock-row">
            <LiveHeader viewerCountLabel={formatViewerCount(viewerCount)} />
          </div>
        </header>
        <section ref={videoRef} tabIndex={-1} className={`video-area video-container ${isDesktopLayout ? 'videoViewportDesktop' : 'videoViewportMobile'} ${mode === 'sandbox_story' ? 'sandbox-story-mode' : ''}`}>
          <button type="button" className="video-debug-toggle" onClick={() => setDebugOpen((prev) => !prev)} aria-expanded={debugOpen}>
            Debug
          </button>
          {!hasFatalInitError ? (
            <SceneView
              targetConsonant={getSandboxOverlayConsonant()}
              promptVisible={getSandboxAuthoritativePromptVisible()}
              curse={state.curse}
              anchor={state.currentAnchor}
              isDesktopLayout={isDesktopLayout}
              appStarted={appStarted}
              blackoutState={blackoutState}
              mode={modeIdRef.current === 'sandbox_story' ? 'sandbox_story' : 'classic'}
              wordReveal={modeIdRef.current === 'sandbox_story' ? (() => {
                const st = sandboxModeRef.current.getState();
                return {
                  visible: st.reveal.visible,
                  phase: st.reveal.phase,
                  wordKey: st.reveal.wordKey,
                  consonantFromPrompt: st.reveal.consonantFromPrompt,
                  mismatch: isSandboxPromptRevealMismatch(st),
                  durationMs: st.reveal.durationMs,
                  wordText: st.reveal.text,
                  onRenderStateChange: handleSandboxRevealRenderStateChange
                };
              })() : undefined}
            />
          ) : (
            <div className="asset-warning scene-placeholder">
              初始化失敗：必要素材缺失（素材未加入專案或 base path 設定錯誤），請開啟 Console 檢查 missing 清單。
            </div>
          )}
          {!appStarted && (
            <div className="startup-overlay" role="dialog" aria-modal="true" aria-label="Enter your name">
              <div className="startup-card">
                <h2>Enter your name</h2>
                <input
                  value={startNameInput}
                  onChange={(event) => setStartNameInput(event.target.value)}
                  placeholder="username"
                  maxLength={24}
                />
                <button
                  type="button"
                  onClick={() => {
                    const normalizedName = normalizeHandle(startNameInput);
                    if (!normalizedName) return;
                    void bootstrapAfterUsernameSubmit(normalizedName).then((ok) => {
                      if (!ok) return;
                      setStartNameInput(normalizedName);
                      setAppStarted(true);
                      setChatAutoPaused(false);
                      window.setTimeout(() => {
                        videoRef.current?.focus();
                      }, 0);
                    });
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
          {debugOpen && (
            <aside className="video-debug-panel" aria-label="Debug Panel">
              <button type="button" className="video-debug-close" onClick={() => setDebugOpen(false)} aria-label="Close debug panel">×</button>
              <DebugModeSwitcher currentMode={mode} switching={debugModeSwitching} lastModeSwitch={lastModeSwitch} onSwitch={switchDebugMode} />
              {mode === 'classic' && (
                <>
              <div className="debug-event-tester" aria-label="Event Tester">
                <h4>Classic Debug Tools</h4>
                <div><strong>Event Tester</strong></div>
                <div><strong>Events</strong></div>
                <div className="debug-route-controls">
                  {EVENT_TESTER_KEYS.map((eventKey) => {
                    const eventState = window.__CHAT_DEBUG__?.event?.stateMachine?.[eventKey];
                    return (
                      <div key={eventKey} className="debug-event-button-row">
                        <button type="button" onClick={() => triggerEventFromTester(eventKey)}>
                          Trigger {eventKey}
                        </button>
                        <button type="button" onClick={() => debugForceExecuteEvent(eventKey, { ignoreCooldown: ignoreCooldownsDebug, ignorePause: ignorePauseDebug, skipTagRequirement: skipTagRequirementDebug })}>
                          Force Execute {eventKey}
                        </button>
                        <button type="button" onClick={() => unlockSingleEventDebug(eventKey)}>
                          Unlock {eventKey}
                        </button>
                        <small>
                          state={eventState?.state ?? '-'} cd={eventState?.cooldownRemainingMs ?? 0} lastAt={eventState?.lastTriggeredAt ?? '-'} pre/post={eventState?.preKey ?? '-'}/{eventState?.postKey ?? '-'} result={eventState?.lastResult ?? '-'}:{eventState?.lastReason ?? '-'}
                        </small>
                        {eventTesterStatus.key === eventKey && eventTesterStatus.blockedReason && (
                          <small>Blocked: {eventTesterStatus.blockedReason}</small>
                        )}
                      </div>
                    );
                  })}
                </div>
                <label>
                  <input type="checkbox" checked={ignoreCooldownsDebug} onChange={(event) => setIgnoreCooldownsDebug(event.target.checked)} />
                  Ignore Cooldowns (debug only)
                </label>
                <label>
                  <input type="checkbox" checked={ignorePauseDebug} onChange={(event) => setIgnorePauseDebug(event.target.checked)} />
                  Ignore Pause (debug force)
                </label>
                <label>
                  <input type="checkbox" checked={skipTagRequirementDebug} onChange={(event) => setSkipTagRequirementDebug(event.target.checked)} />
                  Skip Tag Requirement (debug force)
                </label>
                <label>
                  <input type="checkbox" checked={simulatePlayerReply} onChange={(event) => setSimulatePlayerReply(event.target.checked)} />
                  Simulate Player Reply
                </label>
                <div className="debug-route-controls">
                  <button type="button" onClick={() => runSfxEventTest('GHOST_PING', 'ghost_female')}>Trigger Ghost SFX</button>
                  <button type="button" onClick={() => runSfxEventTest('GHOST_PING', 'ghost_female', true)}>Force Execute Ghost SFX</button>
                  <button type="button" onClick={() => runSfxEventTest('VIEWER_SPIKE', 'footsteps')}>Trigger Footsteps SFX</button>
                  <button type="button" onClick={() => runSfxEventTest('VIEWER_SPIKE', 'footsteps', true)}>Force Execute Footsteps SFX</button>
                  {!bootstrapRef.current.isReady && (
                    <button type="button" onClick={() => {
                      const name = normalizeHandle(startNameInput) || normalizeHandle(activeUserInitialHandleRef.current || '') || 'you';
                      void bootstrapAfterUsernameSubmit(name, 'debug');
                    }}>
                      Simulate Username Submit (debug)
                    </button>
                  )}
                  <button type="button" onClick={emitNpcTagToActiveUser}>Emit NPC Tag @You</button>
                  <button type="button" onClick={() => { void ensureAudioUnlockedFromUserGesture(); }}>Enable Audio</button>
                  <button type="button" onClick={resetEventTestState}>Reset Test State</button>
                  <button type="button" onClick={forceUnlockDebug}>Reset Stuck State</button>
                  <button type="button" onClick={forceShowLoop4Debug}>Force Show loop4 (3s)</button>
                  <button type="button" onClick={exportSandboxSSOT}>ExportSSOT</button>
                  <button type="button" onClick={importSandboxSSOT}>ImportSSOT</button>
                </div>
              </div>
              <div className="debug-route-meta">
                <div>event.registry.count: {window.__CHAT_DEBUG__?.event?.registry?.count ?? 0}</div>
                <div className="debug-event-manifest">
                  {(window.__CHAT_DEBUG__?.event?.registry?.manifest ?? []).map((entry) => (
                    <div key={entry.key}>[{entry.key}] pre({entry.preEffect?.sfxKey ?? '-'} / {entry.preEffect?.videoKey ?? '-'}) post({entry.postEffect?.sfxKey ?? '-'} / {entry.postEffect?.videoKey ?? '-'}) cd={entry.cooldownMs} lock={String(entry.usesLock)}</div>
                  ))}
                </div>
                <div>chat.activeUsers.count: {window.__CHAT_DEBUG__?.chat?.activeUsers?.count ?? 0}</div>
                <div>chat.audience.count: {window.__CHAT_DEBUG__?.chat?.audience?.count ?? 0}</div>
                <div>chat.activeUser.id: {window.__CHAT_DEBUG__?.chat?.activeUser?.id ?? '-'}</div>
                <div>chat.activeUser.handle: {window.__CHAT_DEBUG__?.chat?.activeUser?.handle ?? '-'}</div>
                <div>chat.activeUser.registered: {String(window.__CHAT_DEBUG__?.chat?.activeUser?.registered ?? false)}</div>
                <div>system.bootstrap.isReady: {String((window.__CHAT_DEBUG__?.chat as any)?.system?.bootstrap?.isReady ?? false)}</div>
                <div>system.bootstrap.activatedAt/by: {(window.__CHAT_DEBUG__?.chat as any)?.system?.bootstrap?.activatedAt ?? '-'} / {(window.__CHAT_DEBUG__?.chat as any)?.system?.bootstrap?.activatedBy ?? '-'}</div>
                <div>chat.canTagActiveUser: {String((window.__CHAT_DEBUG__?.chat as any)?.canTagActiveUser ?? false)}</div>
                <div>audio.enabledSystemMessageSent: {String((window.__CHAT_DEBUG__?.chat as any)?.system?.audioEnabledSystemMessageSent ?? false)}</div>
                <div>audio.unlockFailedReason: {(window.__CHAT_DEBUG__?.chat as any)?.system?.audioUnlockFailedReason ?? '-'}</div>
                <div>audio.contextState: {(window.__CHAT_DEBUG__?.chat as any)?.system?.audioContextState ?? (window.__AUDIO_DEBUG__?.fanState?.contextState ?? '-')}</div>
                <div>audio.lastUnlockResult: {(window.__CHAT_DEBUG__?.chat as any)?.system?.lastAudioUnlockResult ?? '-'}</div>
                <div>audio.lastUnlockAt: {(window.__CHAT_DEBUG__?.chat as any)?.system?.lastAudioUnlockAt ?? '-'}</div>
                <div>lastBlockedReason: {(window.__CHAT_DEBUG__?.chat as any)?.system?.lastBlockedReason ?? '-'}</div>
                <div>mention.test.lastMessageMentionsActiveUser: {String(window.__CHAT_DEBUG__?.chat?.mention?.lastMessageMentionsActiveUser ?? false)}</div>
                <div>mention.lastParsedMentions(messageId→ids): {(window.__CHAT_DEBUG__?.chat?.mention as any)?.lastParsedMentions?.messageId ?? '-'} → {((window.__CHAT_DEBUG__?.chat?.mention as any)?.lastParsedMentions?.mentions ?? []).join(',') || '-'}</div>
                <div>mention.lastHighlightReason/tagHighlightAppliedCount: {(window.__CHAT_DEBUG__?.chat?.mention as any)?.lastHighlightReason ?? 'none'} / {(window.__CHAT_DEBUG__?.chat?.mention as any)?.tagHighlightAppliedCount ?? 0}</div>
                <div>chat.activeUser.displayName: {window.__CHAT_DEBUG__?.chat?.activeUser?.displayName ?? '-'}</div>
                <div>chat.activeUser.registryHandleExists: {String((window.__CHAT_DEBUG__?.chat?.activeUser as any)?.registryHandleExists ?? false)}</div>
                <div>lastActorPicked.id: {window.__CHAT_DEBUG__?.chat?.lastActorPicked?.id ?? '-'}</div>
                <div>actorPickBlockedReason: {window.__CHAT_DEBUG__?.chat?.actorPickBlockedReason ?? '-'}</div>
                <div>event.lastBlockedReason: {window.__CHAT_DEBUG__?.event?.lastBlockedReason ?? '-'}</div>
                <div>event.debug.lastForcedEventKey: {window.__CHAT_DEBUG__?.event?.debug?.lastForcedEventKey ?? '-'}</div>
                <div>event.debug.lastForcedAt: {window.__CHAT_DEBUG__?.event?.debug?.lastForcedAt ?? '-'}</div>
                <div>event.debug.lastForcedOptions: {JSON.stringify(window.__CHAT_DEBUG__?.event?.debug?.lastForcedOptions ?? null)}</div>
                <div>event.debug.forcedEventCount: {window.__CHAT_DEBUG__?.event?.debug?.forcedEventCount ?? 0}</div>
                <div>event.lastCommitBlockedReason: {window.__CHAT_DEBUG__?.event?.lastCommitBlockedReason ?? '-'}</div>
                <div>chat.blockedCounts.activeUserAutoSpeak: {window.__CHAT_DEBUG__?.chat?.blockedCounts?.activeUserAutoSpeak ?? 0}</div>
                <div>chat.lastBlockedSendAttempt.actor/source: {(window.__CHAT_DEBUG__?.chat?.lastBlockedSendAttempt?.actorHandle ?? '-')} / {(window.__CHAT_DEBUG__?.chat?.lastBlockedSendAttempt?.source ?? '-')}</div>
                <div>chat.lastBlockedSendAttempt.reason: {window.__CHAT_DEBUG__?.chat?.lastBlockedSendAttempt?.blockedReason ?? '-'}</div>
                <div>chat.lastEmit.source/sourceTag/sourceMode: {(window.__CHAT_DEBUG__?.chat as any)?.lastEmit?.source ?? '-'} / {(window.__CHAT_DEBUG__?.chat as any)?.lastEmit?.sourceTag ?? '-'} / {(window.__CHAT_DEBUG__?.chat as any)?.lastEmit?.sourceMode ?? '-'}</div>
                <div>chat.autoScrollMode: {window.__CHAT_DEBUG__?.chat?.autoScrollMode ?? '-'}</div>
                <div>chat.freeze.isFrozen/reason/startedAt: {String((window.__CHAT_DEBUG__?.chat as any)?.freeze?.isFrozen ?? false)} / {((window.__CHAT_DEBUG__?.chat as any)?.freeze?.reason ?? '-')} / {((window.__CHAT_DEBUG__?.chat as any)?.freeze?.startedAt ?? 0)}</div>
                <div>chat.npcSpawnBlockedByFreeze: {(window.__CHAT_DEBUG__?.chat as any)?.npcSpawnBlockedByFreeze ?? 0}</div>
                <div>chat.ghostBlockedByFreeze: {(window.__CHAT_DEBUG__?.chat as any)?.ghostBlockedByFreeze ?? 0}</div>
                <div>chat.freezeCountdownRemaining: {window.__CHAT_DEBUG__?.chat?.freezeCountdownRemaining ?? 0}</div>
                <div>chat.freezeAfterNMessages: {window.__CHAT_DEBUG__?.chat?.freezeAfterNMessages ?? 0}</div>
                <div>chat.freezeCountdownStartedAt: {window.__CHAT_DEBUG__?.chat?.freezeCountdownStartedAt ?? 0}</div>
                <div>chat.lastScrollFreezeReason: {window.__CHAT_DEBUG__?.chat?.lastScrollFreezeReason ?? '-'}</div>
                <div>chat.lastScrollModeChangeAt: {window.__CHAT_DEBUG__?.chat?.lastScrollModeChangeAt ?? 0}</div>
                <div>chat.lastMessageActorIdCounted: {window.__CHAT_DEBUG__?.chat?.lastMessageActorIdCounted ?? '-'}</div>
                <div>chat.lastCountdownDecrementAt: {window.__CHAT_DEBUG__?.chat?.lastCountdownDecrementAt ?? 0}</div>
                <div>lastEvent.key: {window.__CHAT_DEBUG__?.event?.lastEvent?.key ?? '-'}</div>
                <div>lastEvent.starterTagSent: {String(window.__CHAT_DEBUG__?.event?.lastEvent?.starterTagSent ?? false)}</div>
                <div>lastEvent.preEffectTriggered/preEffectAt: {String(window.__CHAT_DEBUG__?.event?.lastEvent?.preEffectTriggered ?? false)} / {window.__CHAT_DEBUG__?.event?.lastEvent?.preEffectAt ?? '-'}</div>
                <div>lastEvent.preEffect.sfxKey/videoKey: {window.__CHAT_DEBUG__?.event?.lastEvent?.preEffect?.sfxKey ?? '-'} / {window.__CHAT_DEBUG__?.event?.lastEvent?.preEffect?.videoKey ?? '-'}</div>
                <div>video.lastPlayRequest.requestedKey: {window.__VIDEO_DEBUG__?.lastPlayRequest?.requestedKey ?? '-'}</div>
                <div>video.currentKey: {window.__VIDEO_DEBUG__?.currentKey ?? '-'}</div>
                <div>video.lastSwitch.toKey: {window.__VIDEO_DEBUG__?.lastSwitch?.toKey ?? '-'}</div>
                <div>video.lastDenied.denyReason: {window.__VIDEO_DEBUG__?.lastDenied?.denyReason ?? '-'}</div>
                <div>lastEvent.abortedReason: {window.__CHAT_DEBUG__?.event?.lastEvent?.abortedReason ?? '-'}</div>
                <div>lock.isLocked: {String(window.__CHAT_DEBUG__?.event?.blocking?.isLocked ?? false)}</div>
                <div>lock.lockTarget: {window.__CHAT_DEBUG__?.event?.blocking?.lockTarget ?? '-'}</div>
                <div>activeUserInitialHandle: {window.__CHAT_DEBUG__?.chat?.activeUsers?.initialHandle ?? '-'}</div>
                <div>renameDisabled: {String((window.__CHAT_DEBUG__?.chat?.activeUsers as { renameDisabled?: boolean } | undefined)?.renameDisabled ?? true)}</div>
                <div>event.inFlight: {String(window.__CHAT_DEBUG__?.event?.inFlight ?? false)}</div>
                <div>event.queue.length: {window.__CHAT_DEBUG__?.event?.queue?.length ?? 0}</div>
                <div>qna.isActive: {String(window.__CHAT_DEBUG__?.event?.qna?.isActive ?? false)}</div>
                <div>qna.flowId/eventKey/stepId: {window.__CHAT_DEBUG__?.event?.qna?.flowId ?? '-'} / {window.__CHAT_DEBUG__?.event?.qna?.eventKey ?? '-'} / {window.__CHAT_DEBUG__?.event?.qna?.stepId ?? '-'}</div>
                <div>qna.awaitingReply/attempts: {String(window.__CHAT_DEBUG__?.event?.qna?.awaitingReply ?? false)} / {window.__CHAT_DEBUG__?.event?.qna?.attempts ?? 0}</div>
                <div>qna.lastAskedAt/lockTarget: {window.__CHAT_DEBUG__?.event?.qna?.lastAskedAt ?? 0} / {window.__CHAT_DEBUG__?.event?.qna?.lockTarget ?? '-'}</div>
                <div>qna.taggedUserHandle: {window.__CHAT_DEBUG__?.event?.qna?.taggedUser ?? '-'}</div>
                <div>qna.lastQuestionMessageId: {window.__CHAT_DEBUG__?.event?.qna?.lastQuestionMessageId ?? '-'}</div>
                <div>qna.lastQuestionMessageHasTag: {String(window.__CHAT_DEBUG__?.event?.qna?.lastQuestionMessageHasTag ?? false)}</div>
                <div>qna.status: {(window.__CHAT_DEBUG__?.event?.qna as any)?.active?.status ?? '-'}</div>
                <div>qna.questionMessageId: {(window.__CHAT_DEBUG__?.event?.qna as any)?.active?.questionMessageId ?? '-'}</div>
                <div>qna.questionHasTagToActiveUser: {String((window.__CHAT_DEBUG__?.event?.qna as any)?.questionHasTagToActiveUser ?? false)}</div>
                <div>qna.isTaggedQuestionActive: {String((window.__CHAT_DEBUG__?.event?.qna as any)?.isTaggedQuestionActive ?? false)}</div>
                <div>qna.askerActorId: {(window.__CHAT_DEBUG__?.event?.qna as any)?.active?.askerActorId ?? '-'}</div>
                <div>qna.taggedUserHandle: {(window.__CHAT_DEBUG__?.event?.qna as any)?.active?.taggedUserHandle ?? '-'}</div>
                <div>ui.replyBarVisible: {String((window.__CHAT_DEBUG__?.ui as any)?.replyBarVisible ?? false)}</div>
                <div>ui.replyToMessageId: {(window.__CHAT_DEBUG__?.ui as any)?.replyToMessageId ?? '-'}</div>
                <div>ui.replyBarMessageFound: {String((window.__CHAT_DEBUG__?.ui as any)?.replyBarMessageFound ?? false)}</div>
                <div>qna.lastBlockedReason: {window.__CHAT_DEBUG__?.event?.qna?.lastBlockedReason ?? '-'}</div>
                <div>ui.replyPreviewSuppressed: {window.__CHAT_DEBUG__?.ui?.replyPreviewSuppressed ?? '-'}</div>
                <div>ui.replyPinMounted/pinned.visible: {String((window.__CHAT_DEBUG__?.ui as { replyPinMounted?: boolean; pinned?: { visible?: boolean } } | undefined)?.replyPinMounted ?? false)} / {String((window.__CHAT_DEBUG__?.ui as { pinned?: { visible?: boolean } } | undefined)?.pinned?.visible ?? false)}</div>
                <div>ui.qnaQuestionMessageIdRendered/pinned.textPreview: {String((window.__CHAT_DEBUG__?.ui as { qnaQuestionMessageIdRendered?: boolean; pinned?: { textPreview?: string } } | undefined)?.qnaQuestionMessageIdRendered ?? false)} / {((window.__CHAT_DEBUG__?.ui as { pinned?: { textPreview?: string } } | undefined)?.pinned?.textPreview ?? '-')}</div>
                <div>sandbox.qna.lastResolveAt/reason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.qna?.lastResolveAt ?? 0} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.qna?.lastResolveReason ?? '-'}</div>
                <div>sandbox.qna.lastClearReplyUiAt/reason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.qna?.lastClearReplyUiAt ?? 0} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.qna?.lastClearReplyUiReason ?? '-'}</div>
                <div>chat.pause.isPaused/setAt/reason: {String((window.__CHAT_DEBUG__?.chat as { pause?: { isPaused?: boolean; setAt?: number; reason?: string } } | undefined)?.pause?.isPaused ?? false)} / {((window.__CHAT_DEBUG__?.chat as { pause?: { setAt?: number } } | undefined)?.pause?.setAt ?? 0)} / {((window.__CHAT_DEBUG__?.chat as { pause?: { reason?: string } } | undefined)?.pause?.reason ?? '-')}</div>
                <div>chat.scroll.containerFound/lastForceReason/result: {String((window.__CHAT_DEBUG__?.chat as { scroll?: { containerFound?: boolean; lastForceReason?: string; lastForceResult?: string } } | undefined)?.scroll?.containerFound ?? false)} / {((window.__CHAT_DEBUG__?.chat as { scroll?: { lastForceReason?: string } } | undefined)?.scroll?.lastForceReason ?? '-')} / {((window.__CHAT_DEBUG__?.chat as { scroll?: { lastForceResult?: string } } | undefined)?.scroll?.lastForceResult ?? '-')}</div>
                <div>chat.scroll.metrics(top/height/client): {((window.__CHAT_DEBUG__?.chat as { scroll?: { metrics?: { top?: number; height?: number; clientHeight?: number } } } | undefined)?.scroll?.metrics?.top ?? 0)} / {((window.__CHAT_DEBUG__?.chat as { scroll?: { metrics?: { height?: number } } } | undefined)?.scroll?.metrics?.height ?? 0)} / {((window.__CHAT_DEBUG__?.chat as { scroll?: { metrics?: { clientHeight?: number } } } | undefined)?.scroll?.metrics?.clientHeight ?? 0)}</div>
                <div>ui.replyPinContainerLocation: {(window.__CHAT_DEBUG__?.ui as { replyPinContainerLocation?: string } | undefined)?.replyPinContainerLocation ?? '-'}</div>
                <div>ui.replyPinInsideChatList: {String((window.__CHAT_DEBUG__?.ui as { replyPinInsideChatList?: boolean } | undefined)?.replyPinInsideChatList ?? false)}</div>
                <div>ui.replyPreviewLocation/legacyReplyQuoteEnabled: {(window.__CHAT_DEBUG__?.ui as { replyPreviewLocation?: string; legacyReplyQuoteEnabled?: boolean } | undefined)?.replyPreviewLocation ?? '-'} / {String((window.__CHAT_DEBUG__?.ui as { legacyReplyQuoteEnabled?: boolean } | undefined)?.legacyReplyQuoteEnabled ?? false)}</div>
                <div>qna.lockTargetHandle: {window.__CHAT_DEBUG__?.event?.qna?.lockTarget ?? '-'}</div>
                <div>qna.lastQuestionActor.handle: {window.__CHAT_DEBUG__?.event?.qna?.lastQuestionActor ?? '-'}</div>
                <div>qna.lastAskedTextPreview: {window.__CHAT_DEBUG__?.event?.qna?.lastAskedTextPreview ?? '-'}</div>
                <div>qna.lockTargetInvalidError: {String(window.__CHAT_DEBUG__?.event?.qna?.lockTargetInvalid ?? false)}</div>
                <div>qna.matched.optionId/keyword/at: {window.__CHAT_DEBUG__?.event?.qna?.matched?.optionId ?? '-'} / {window.__CHAT_DEBUG__?.event?.qna?.matched?.keyword ?? '-'} / {window.__CHAT_DEBUG__?.event?.qna?.matched?.at ?? '-'}</div>
                <div>qna.pendingChain.eventKey: {window.__CHAT_DEBUG__?.event?.qna?.pendingChain?.eventKey ?? '-'}</div>
                <div>event.test.lastStartAttemptAt: {window.__CHAT_DEBUG__?.event?.test?.lastStartAttemptAt ?? 0}</div>
                <div>event.test.lastStartAttemptKey: {window.__CHAT_DEBUG__?.event?.test?.lastStartAttemptKey ?? '-'}</div>
                <div>event.test.lastStartAttemptBlockedReason: {window.__CHAT_DEBUG__?.event?.test?.lastStartAttemptBlockedReason ?? '-'}</div>
                <div>event.lastEventStartAttemptBlockedReason: {window.__CHAT_DEBUG__?.event?.lastStartAttemptBlockedReason ?? '-'}</div>
                <div>event.lastQnaStartAttemptBlockedReason: {window.__CHAT_DEBUG__?.event?.qna?.lastBlockedReason ?? '-'}</div>
                <div>event.lastStartAttemptBlockedReason: {window.__CHAT_DEBUG__?.event?.lastStartAttemptBlockedReason ?? '-'}</div>
                <div>event.exclusive: {String(window.__CHAT_DEBUG__?.event?.exclusive ?? false)}</div>
                <div>event.currentEventId: {window.__CHAT_DEBUG__?.event?.currentEventId ?? '-'}</div>
                <div>lock.lockOwner: {window.__CHAT_DEBUG__?.event?.currentLockOwner ?? '-'}</div>
                <div>lock.lockElapsedSec: {window.__CHAT_DEBUG__?.event?.lockElapsedSec ?? 0}</div>
                <div>event.foreignTagBlockedCount: {window.__CHAT_DEBUG__?.event?.foreignTagBlockedCount ?? 0}</div>
                <div>event.lastBlockedReason: {window.__CHAT_DEBUG__?.event?.lastBlockedReason ?? '-'}</div>
                <div>sfx.ghostCooldown: {window.__CHAT_DEBUG__?.event?.cooldowns?.ghost_female ?? 0}</div>
                <div>sfx.footstepsCooldown: {window.__CHAT_DEBUG__?.event?.cooldowns?.footsteps ?? 0}</div>
                <div>event.cooldownMeta: {Object.entries((window.__CHAT_DEBUG__?.event as { cooldownMeta?: Record<string, { nextAllowedAt?: number; lastCommittedAt?: number; lastRollbackAt?: number }> } | undefined)?.cooldownMeta ?? {}).map(([k, v]) => `${k}(next:${v?.nextAllowedAt ?? 0}/commit:${v?.lastCommittedAt ?? 0}/rollback:${v?.lastRollbackAt ?? 0})`).join(' | ') || '-'}</div>
                <div>event.freezeGuard(hasTag/replyReady/allowed): {String((window.__CHAT_DEBUG__?.event as { freezeGuard?: { hasRealTag?: boolean; replyUIReady?: boolean; freezeAllowed?: boolean } } | undefined)?.freezeGuard?.hasRealTag ?? false)} / {String((window.__CHAT_DEBUG__?.event as { freezeGuard?: { hasRealTag?: boolean; replyUIReady?: boolean; freezeAllowed?: boolean } } | undefined)?.freezeGuard?.replyUIReady ?? false)} / {String((window.__CHAT_DEBUG__?.event as { freezeGuard?: { hasRealTag?: boolean; replyUIReady?: boolean; freezeAllowed?: boolean } } | undefined)?.freezeGuard?.freezeAllowed ?? false)}</div>
                <div>debug.reset(count/reason/at): {((window.__CHAT_DEBUG__?.chat as any)?.system?.debugReset?.count ?? 0)} / {((window.__CHAT_DEBUG__?.chat as any)?.system?.debugReset?.reason ?? '-')} / {((window.__CHAT_DEBUG__?.chat as any)?.system?.debugReset?.resetAt ?? 0)}</div>
                <div>audio.lastApproach.key: {(window.__CHAT_DEBUG__ as any)?.audio?.lastApproach?.key ?? '-'}</div>
                <div>audio.lastApproach.startedAt: {(window.__CHAT_DEBUG__ as any)?.audio?.lastApproach?.startedAt ?? 0}</div>
                <div>audio.lastApproach.durationMs: {(window.__CHAT_DEBUG__ as any)?.audio?.lastApproach?.durationMs ?? 0}</div>
                <div>audio.lastApproach.startGain/endGain: {(window.__CHAT_DEBUG__ as any)?.audio?.lastApproach?.startGain ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.audio?.lastApproach?.endGain ?? '-'}</div>
                <div>audio.lastApproach.startLPF/endLPF: {(window.__CHAT_DEBUG__ as any)?.audio?.lastApproach?.startLPF ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.audio?.lastApproach?.endLPF ?? '-'}</div>
                <div>fx.blackout.isActive: {String((window.__CHAT_DEBUG__ as any)?.fx?.blackout?.isActive ?? false)}</div>
                <div>fx.blackout.mode: {(window.__CHAT_DEBUG__ as any)?.fx?.blackout?.mode ?? '-'}</div>
                <div>fx.blackout.endsInMs: {(window.__CHAT_DEBUG__ as any)?.fx?.blackout?.endsInMs ?? 0}</div>
              </div>
                </>
              )}
              {mode === 'sandbox_story' && (
                <div className="debug-event-tester" aria-label="Sandbox Story Debug Tools">
                  <h4>Sandbox Story Debug Tools</h4>
                  <div><strong>Flow Test</strong></div>
                  <div className="debug-route-controls">
                    <button type="button" onClick={() => { void runNightSmokeTest(); }}>Run Night Smoke Test</button>
                    <button type="button" onClick={handleSandboxDebugPassFlow}>Pass Flow</button>
                  </div>
                  <div style={{ marginTop: 8 }}><strong>Force Debug</strong></div>
                  <div className="debug-route-controls">
                    <button type="button" onClick={handleSandboxDebugForceCorrectNow}>Force Correct Now</button>
                    <button type="button" onClick={handleSandboxDebugForceNextQuestion}>Force Next Question</button>
                    <button type="button" onClick={triggerForceGhostEvent}>Force Ghost Event</button>
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>Debug Action Audit</strong></div>
                    {Object.entries(sandboxDebugActionAuditRef.current).map(([actionName, audit]) => (
                      <div key={actionName} style={{ marginBottom: 6 }}>
                        <div><strong>{actionName}</strong></div>
                        <div>lastClickedAt: {audit.lastClickedAt || 0}</div>
                        <div>handlerInvoked: {String(audit.handlerInvoked)}</div>
                        <div>effectApplied: {String(audit.effectApplied)}</div>
                        <div>blockedReason: {audit.blockedReason || '-'}</div>
                        <div>targetState: {audit.targetState || '-'}</div>
                        <div>intent: {audit.intent || '-'}</div>
                        <div>sourceQuestionId: {audit.sourceQuestionId || '-'}</div>
                        <div>targetQuestionId: {audit.targetQuestionId || '-'}</div>
                        <div>resultStep: {audit.resultStep || '-'}</div>
                        <div>usedCanonicalAnswer: {audit.usedCanonicalAnswer || '-'}</div>
                        <div>usedAcceptedCandidates: {(audit.usedAcceptedCandidates || []).join(', ') || '-'}</div>
                        <div>reconciled: {String(audit.reconciled ?? false)}</div>
                        <div>lastResult: {audit.lastResult || '-'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>Night Smoke Test</strong></div>
                    <div>status: {sandboxFlowTestResult.status}</div>
                    <div>startedAt: {sandboxFlowTestResult.startedAt || 0}</div>
                    <div>finishedAt: {sandboxFlowTestResult.finishedAt || 0}</div>
                    <div>currentStep: {sandboxFlowTestResult.currentStep}</div>
                    <div>lastPassedStep: {sandboxFlowTestResult.lastPassedStep}</div>
                    <div>failedStep: {sandboxFlowTestResult.failedStep}</div>
                    <div>failureReason: {sandboxFlowTestResult.failureReason}</div>
                    <div>authoritativeFlowStep: {sandboxFlowTestResult.authoritativeFlowStep}</div>
                    <div>authoritativeBlockedReason: {sandboxFlowTestResult.authoritativeBlockedReason}</div>
                    <div>fromQuestionId: {sandboxFlowTestResult.fromQuestionId}</div>
                    <div>toQuestionId: {sandboxFlowTestResult.toQuestionId}</div>
                    <div>autoAnswerUsed: {sandboxFlowTestResult.autoAnswerUsed}</div>
                    <div>secondQuestionShown: {String(sandboxFlowTestResult.secondQuestionShown)}</div>
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>Ghost Event Monitor</strong></div>
                    {ghostEventDebugState.events.map((entry) => (
                      <div key={entry.eventName}>
                        <div>
                          <strong>{entry.eventName}</strong>{' '}
                          <span style={{ color: entry.status === 'ready' ? '#67e8a5' : entry.status === 'cooldown' ? '#f6ad55' : '#ff7b7b' }}>
                            {entry.status}
                          </span>
                        </div>
                        <div>status: {entry.status}</div>
                        <div>pre: {entry.preSound}</div>
                        <div>post: {entry.postSound}</div>
                        <div>cooldown: {entry.cooldown}</div>
                        <div>lock: {String(entry.lock)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>Ghost System</strong></div>
                    <div>activeEvents: {ghostEventDebugState.ghostSystem.activeEvents}</div>
                    <div>queue: {ghostEventDebugState.ghostSystem.eventQueueLength}</div>
                    <div>lastEvent: {ghostEventDebugState.ghostSystem.lastEvent}</div>
                    <div>cooldownCount: {ghostEventDebugState.ghostSystem.cooldownCount}</div>
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>Fear System</strong></div>
                    <div>fearLevel: {fearDebugState.fearLevel}</div>
                    <div>
                      pressureLevel:{' '}
                      <span style={{
                        color: fearDebugState.pressureLevel === 'panic'
                          ? '#ff4d4f'
                          : fearDebugState.pressureLevel === 'high'
                            ? '#fb923c'
                            : fearDebugState.pressureLevel === 'medium'
                              ? '#facc15'
                              : '#9ca3af'
                      }}>
                        {fearDebugState.pressureLevel}
                      </span>
                    </div>
                    <div>ghostProbability: {fearDebugState.ghostProbability.toFixed(2)}</div>
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>Fear Meter</strong></div>
                    <div>
                      {`${'█'.repeat(Math.round((fearDebugState.fearLevel / Math.max(1, fearDebugState.maxFear)) * 10))}${'░'.repeat(Math.max(0, 10 - Math.round((fearDebugState.fearLevel / Math.max(1, fearDebugState.maxFear)) * 10)))}`}
                    </div>
                    <div>{fearDebugState.fearLevel} / {fearDebugState.maxFear}</div>
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>Triggers</strong></div>
                    <div>chatSpike +{fearDebugState.triggers.chatSpike}</div>
                    <div>storyEmotion +{fearDebugState.triggers.storyEmotion}</div>
                    <div>darkFrame +{fearDebugState.triggers.darkFrame}</div>
                    <div>ghostNearby +{fearDebugState.triggers.ghostNearby}</div>
                  </div>
                  <div className="debug-route-controls" style={{ marginTop: 8 }}>
                    <button type="button" onClick={handleDebugAddFear}>Add Fear +10</button>
                    <button type="button" onClick={handleDebugResetFear}>Reset Fear</button>
                  </div>
                  <div className="debug-route-meta">
                    <div><strong>AUTHORITATIVE FLOW</strong></div>
                    <div>flow.step: {(window.__CHAT_DEBUG__ as any)?.sandbox?.flow?.step ?? '-'}</div>
                    <div>flow.questionIndex: {(window.__CHAT_DEBUG__ as any)?.sandbox?.flow?.questionIndex ?? '-'}</div>
                    <div>flow.stepStartedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.flow?.stepStartedAt ?? '-'}</div>
                    <div>currentPrompt.id / questionId / wordKey: {(window.__CHAT_DEBUG__ as any)?.sandbox?.prompt?.current?.id ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.currentPrompt?.classicQuestionId ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.prompt?.current?.wordKey ?? '-'}</div>
                    <div>replyGate.gateType/armed/canReply: {(window.__CHAT_DEBUG__ as any)?.sandbox?.replyGate?.gateType ?? '-'} / {String((window.__CHAT_DEBUG__ as any)?.sandbox?.replyGate?.armed ?? false)} / {String((window.__CHAT_DEBUG__ as any)?.sandbox?.replyGate?.canReply ?? false)}</div>
                    <div>postRevealChat.status: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealChatState ?? '-'}</div>
                    <div>nextQuestion.ready/emitted: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionReady ?? false)} / {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionEmitted ?? false)}</div>
                    <div>nextQuestion.from-&gt;to: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionFromIndex ?? '-'} {'->'} {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionToIndex ?? '-'}</div>
                    <div>nextQuestion.fromQuestionId/toQuestionId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionFromQuestionId || '-'} {'->'} {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionToQuestionId || '-'}</div>
                    <div>nextQuestion.decidedAt/emittedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionDecidedAt ?? 0} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionEmittedAt ?? 0}</div>
                    <div>nextQuestion.consumer: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionConsumer || '-'}</div>
                    <div>nextQuestion.stage: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionStage || '-'}</div>
                    <div>nextQuestion.blockedReason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionBlockedReason ?? '-'}</div>
                    <div>nextQuestion.blockedReason.source: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextQuestionBlockedReasonSource ?? '-'}</div>
                    <div>reveal.guardReady: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealGuardReady ?? false)}</div>
                    <div>reveal.completionReady: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealCompletionReady ?? false)}</div>
                    <div>reveal.visibilityOnly: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealVisibilityOnly ?? false)}</div>
                    <div>reveal.transitionEligible: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealTransitionEligible ?? false)}</div>
                    <div>reveal.transitionBlockedBy: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealTransitionBlockedBy ?? '-'}</div>
                    <div>reveal.transitionCommitAttempted: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealTransitionCommitAttempted ?? false)}</div>
                    <div>reveal.transitionCommittedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealTransitionCommittedAt ?? 0}</div>
                    <div>reveal.transitionCommitReason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealTransitionCommitReason ?? '-'}</div>
                    <div>reveal.transitionCommitBlockedBy: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealTransitionCommitBlockedBy ?? '-'}</div>
                    <div>reveal.eligibilitySnapshotId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealEligibilitySnapshotId ?? '-'}</div>
                    <div>reveal.commitSourceSnapshotId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealCommitSourceSnapshotId ?? '-'}</div>
                    <div>reveal.snapshotQuestionId/wordKey: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealSnapshotQuestionId ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealSnapshotWordKey ?? '-'}</div>
                    <div>reveal.committedQuestionId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealCommittedQuestionId ?? '-'}</div>
                    <div>reveal.notEntered: {String(!((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealEligibilitySnapshotId))}</div>
                    <div>reveal.blockedReason.source: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealBlockedReasonSource ?? '-'}</div>
                    <div>reveal.hasObservableTiming: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.revealHasObservableTiming ?? false)}</div>
                    <div>postReveal.guardReady: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealGuardReady ?? false)}</div>
                    <div>postReveal.startEligible: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealStartEligible ?? false)}</div>
                    <div>postReveal.startBlockedBy: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealStartBlockedBy || '-'}</div>
                    <div>postReveal.enteredAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealEnteredAt ?? 0}</div>
                    <div>postReveal.startAttempted: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealStartAttempted ?? false)}</div>
                    <div>postReveal.startedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealStartedAt ?? 0}</div>
                    <div>postReveal.completedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealCompletedAt ?? 0}</div>
                    <div>postReveal.completionReason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealCompletionReason || '-'}</div>
                    <div>postReveal.startedQuestionId/completedQuestionId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealStartedQuestionId || '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealCompletedQuestionId || '-'}</div>
                    <div>answerEval.completedQuestionId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.answerEvalCompletedQuestionId || '-'}</div>
                    <div>postReveal.completionEligible: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealCompletionEligible ?? false)}</div>
                    <div>postReveal.completionBlockedBy: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.postRevealCompletionBlockedBy || '-'}</div>
                    <div>advanceNext.guardReady: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.advanceNextGuardReady ?? false)}</div>
                    <div>advanceNext.enteredAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.advanceNextEnteredAt ?? 0}</div>
                    <div>render.stateQuestionId/renderedQuestionId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.renderSync?.stateQuestionId ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.renderSync?.renderedQuestionId ?? '-'}</div>
                    <div>render.blockedReason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.renderSync?.renderBlockedReason ?? '-'}</div>
                    <div>render.expectedSceneKey/video.currentKey: {(window.__CHAT_DEBUG__ as any)?.sandbox?.renderSync?.expectedSceneKey ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.renderSync?.videoCurrentKey ?? '-'}</div>
                    <div>scene.expectedRawKey/currentRawKey: {(window.__CHAT_DEBUG__ as any)?.sandbox?.renderSync?.expectedRawKey ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.renderSync?.currentRawKey ?? '-'}</div>
                    <div>scene.expectedCanonicalKey/currentCanonicalKey: {(window.__CHAT_DEBUG__ as any)?.sandbox?.renderSync?.expectedCanonicalKey ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.renderSync?.currentCanonicalKey ?? '-'}</div>
                    <div>renderSync.reason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.renderSync?.renderSyncReason ?? '-'}</div>
                    <div>debugAction.name: {(window.__CHAT_DEBUG__ as any)?.sandbox?.debugAction?.name ?? '-'}</div>
                    <div>debugAction.intent: {(window.__CHAT_DEBUG__ as any)?.sandbox?.debugAction?.intent ?? '-'}</div>
                    <div>debugAction.sourceQuestionId/targetQuestionId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.debugAction?.sourceQuestionId ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.debugAction?.targetQuestionId ?? '-'}</div>
                    <div>debugAction.resultStep: {(window.__CHAT_DEBUG__ as any)?.sandbox?.debugAction?.resultStep ?? '-'}</div>
                    <div>debugAction.usedCanonicalAnswer: {(window.__CHAT_DEBUG__ as any)?.sandbox?.debugAction?.usedCanonicalAnswer ?? '-'}</div>
                    <div>debugAction.usedAcceptedCandidates: {((window.__CHAT_DEBUG__ as any)?.sandbox?.debugAction?.usedAcceptedCandidates ?? []).join(', ') || '-'}</div>
                    <div>debugAction.reconciled: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.debugAction?.reconciled ?? false)}</div>
                    <div>introGate.startedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.audit?.introGate?.startedAt ?? 0}</div>
                    <div>introGate.minDurationMs: {(window.__CHAT_DEBUG__ as any)?.sandbox?.audit?.introGate?.minDurationMs ?? 0}</div>
                    <div>introGate.passed: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.audit?.introGate?.passed ?? false)}</div>
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>FLOW / GATE DIAGNOSTICS</strong></div>
                    <div>introGate.remainingMs: {(window.__CHAT_DEBUG__ as any)?.sandbox?.introGate?.remainingMs ?? '-'}</div>
                    <div>sandboxFlow.replyGateActive/replyTarget: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.replyGateActive ?? false)} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.replyTarget ?? '-'}</div>
                    <div>sandboxFlow.gateType/canReply: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.gateType ?? '-'} / {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.canReply ?? false)}</div>
                    <div>sandboxFlow.retryCount/retryLimit: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.retryCount ?? 0} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.retryLimit ?? 0}</div>
                    <div>sandboxFlow.lastPromptAt/nextRetryAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.lastPromptAt ?? 0} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextRetryAt ?? 0}</div>
                    <div>sandboxFlow.gateConsumed/replyGateActive: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.gateConsumed ?? false)} / {String((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.replyGateActive ?? false)}</div>
                    <div>sandboxFlow.promptFingerprint/normalizedPrompt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.questionPromptFingerprint ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.normalizedPrompt ?? '-'}</div>
                    <div>sandboxFlow.questionEmitter/retryEmitter: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.questionEmitterId ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.retryEmitterId ?? '-'}</div>
                    <div>sandboxFlow.activeSpeakerRoles: {JSON.stringify((window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.activeSpeakerRoles ?? [])}</div>
                    <div>sandboxFlow.introElapsedMs/nextBeatAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.introElapsedMs ?? 0} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.nextBeatAt ?? 0}</div>
                    <div>sandboxFlow.backlogTechMessages.length: {(window.__CHAT_DEBUG__ as any)?.sandbox?.sandboxFlow?.backlogTechMessagesLength ?? 0}</div>
                    <div>audit.flow.step/stepEnteredAt/questionIndex: {(window.__CHAT_DEBUG__ as any)?.sandbox?.audit?.flow?.step ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.audit?.flow?.stepEnteredAt ?? 0} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.audit?.flow?.questionIndex ?? 0}</div>
                    <div>audit.transitions (source: state.audit.transitions | fallback): {JSON.stringify((window.__CHAT_DEBUG__ as any)?.sandbox?.audit?.transitions ?? [])}</div>
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>AUTHORITATIVE JUDGE AUDIT</strong></div>
                    <div>word.reveal.phase: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.phase ?? '-'}</div>
                    <div>word.reveal.visible: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.visible ?? false)}</div>
                    <div>word.reveal.rendered: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.rendered ?? false)}</div>
                    <div>word.reveal.blockedReason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.blockedReason ?? '-'}</div>
                    <div>word.reveal.wordKey: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.wordKey ?? '-'}</div>
                    <div>word.reveal.text/base/rest: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.text ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.base ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.rest ?? '-'}</div>
                    <div>word.reveal.startedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.startedAt ?? 0}</div>
                    <div>word.reveal.finishedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.finishedAt ?? 0}</div>
                    <div>reply.lastInjectedMessageId/text/at: {(window.__CHAT_DEBUG__ as any)?.sandbox?.reply?.lastInjectedMessageId ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.reply?.lastInjectedText ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.reply?.lastInjectedAt ?? 0}</div>
                    <div>reply.lastConsumedMessageId/text/at: {(window.__CHAT_DEBUG__ as any)?.sandbox?.reply?.lastConsumedMessageId ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.reply?.lastConsumedText ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.reply?.lastConsumedAt ?? 0}</div>
                    <div>reply.consumeSource/result/blocked: {(window.__CHAT_DEBUG__ as any)?.sandbox?.reply?.consumeSource ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.reply?.consumeResult ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.reply?.consumeBlockedReason ?? '-'}</div>
                    <div>parse.raw: {(window.__CHAT_DEBUG__ as any)?.sandbox?.parse?.raw ?? '-'}</div>
                    <div>parse.normalized: {(window.__CHAT_DEBUG__ as any)?.sandbox?.parse?.normalized ?? '-'}</div>
                    <div>parse.kind: {(window.__CHAT_DEBUG__ as any)?.sandbox?.parse?.kind ?? '-'}</div>
                    <div>parse.ok: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.parse?.ok ?? false)}</div>
                    <div>parse.matchedAlias: {(window.__CHAT_DEBUG__ as any)?.sandbox?.parse?.matchedAlias ?? '-'}</div>
                    <div>judge.expectedConsonant: {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.expectedConsonant ?? '-'}</div>
                    <div>judge.acceptedCandidates: {JSON.stringify((window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.acceptedCandidates ?? [])}</div>
                    <div>judge.compareInput: {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.compareInput ?? '-'}</div>
                    <div>judge.compareMode: {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.compareMode ?? '-'}</div>
                    <div>judge.result: {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.judgeResult ?? '-'}</div>
                    <div>judge.resultReason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.resultReason ?? '-'}</div>
                    <div>judge.gateType: {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.gateType ?? '-'}</div>
                    <div>judge.sourcePromptId/questionId/wordKey: {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.sourcePromptId ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.sourceQuestionId ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.sourceWordKey ?? '-'}</div>
                    <div>judge.consumedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.consumedAt ?? 0}</div>
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>DISPLAY METADATA (PROMPT ONLY, NOT AUTHORITATIVE)</strong></div>
                    <div>currentPrompt.answerSource: {(window.__CHAT_DEBUG__ as any)?.sandbox?.currentPrompt?.answerSource ?? '-'}</div>
                    <div>currentPrompt.classicQuestionId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.currentPrompt?.classicQuestionId ?? '-'}</div>
                    <div>currentPrompt.displayAcceptedAnswers: {JSON.stringify((window.__CHAT_DEBUG__ as any)?.sandbox?.currentPrompt?.displayAcceptedAnswers ?? [])}</div>
                    <div>currentPrompt.displayAliases: {JSON.stringify((window.__CHAT_DEBUG__ as any)?.sandbox?.currentPrompt?.displayAliases ?? [])}</div>
                    <div>currentPrompt.runtimeAcceptedCandidates: {JSON.stringify((window.__CHAT_DEBUG__ as any)?.sandbox?.currentPrompt?.runtimeAcceptedCandidates ?? [])}</div>
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>LEGACY COMPATIBILITY</strong></div>
                    <div><strong>[LEGACY COMPATIBILITY – NON AUTHORITATIVE]</strong></div>
                    <div>answerGate is legacy compatibility layer. replyGate is the authoritative gate.</div>
                    <div>answerGate.waiting: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.answer?.gateWaiting ?? false)}</div>
                    <div>answerGate.askedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.answer?.gateAskedAt ?? '-'}</div>
                    <div>answerGate.pausedChat: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.answer?.gatePausedChat ?? false)}</div>
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>SCHEDULER / AUXILIARY</strong></div>
                    <div>scheduler.phase (non-authoritative): {(window.__CHAT_DEBUG__ as any)?.sandbox?.schedulerPhase ?? '-'}</div>
                    <div>scheduler.authority: {(window.__CHAT_DEBUG__ as any)?.sandbox?.scheduler?.authority ?? '-'}</div>
                    <div>scheduler.blockedReason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.scheduler?.blockedReason ?? '-'}</div>
                  </div>
                  <div className="debug-route-meta" style={{ marginTop: 8 }}>
                    <div><strong>VISUAL STATE – NOT FLOW AUTHORITY</strong></div>
                    <div>Visual UI state. Not authoritative for story flow.</div>
                    <div>ui.consonantBubble.visible: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.consonantBubble?.visible ?? true)}</div>
                    <div>ui.promptGlyph.className: {(window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.promptGlyph?.className ?? '-'}</div>
                    <div>ui.promptGlyph.colorResolved: {(window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.promptGlyph?.colorResolved ?? '-'}</div>
                    <div>ui.promptGlyph.opacityResolved: {(window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.promptGlyph?.opacityResolved ?? '-'}</div>
                    <div>ui.promptGlyph.source: {(window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.promptGlyph?.source ?? '-'}</div>
                    <div>ui.promptGlyph.isBlueExpected: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.promptGlyph?.isBlueExpected ?? false)}</div>
                    <div>ui.divergence.promptVisibleButNotAnswerable: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.divergence?.promptVisibleButNotAnswerable ?? false)}</div>
                    <div>ui.divergence.answerableButPromptHidden: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.divergence?.answerableButPromptHidden ?? false)}</div>
                    <div>sandbox.debug.isolatedTagLock: {String(debugIsolatedTagLock)}</div>
                    <div>freeze.active / pinned.text: {String((window.__CHAT_DEBUG__ as any)?.chat?.freeze?.isFrozen ?? false)} / {((window.__CHAT_DEBUG__ as any)?.ui?.pinned?.textPreview ?? '-')}</div>
                    <div>sandbox.pinned.sourceType: {(window.__CHAT_DEBUG__ as any)?.ui?.sandboxPinned?.sourceType ?? '-'}</div>
                    <div>pinned.lastWriter.source: {(window.__CHAT_DEBUG__ as any)?.sandbox?.prompt?.pinned?.lastWriter?.source ?? '-'}</div>
                    <div>pinned.lastWriter.blockedReason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.prompt?.pinned?.lastWriter?.blockedReason ?? '-'}</div>
                    <div>pinned.lastWriter.writerBlocked: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.prompt?.pinned?.lastWriter?.writerBlocked ?? false)}</div>
                  </div>
                </div>
              )}
            </aside>
          )}
        </section>
        <section ref={chatAreaRef} className="chat-area chat-container input-surface">
          <ChatPanel
            messages={sortedMessages}
            input={input}
            onChange={(value) => {
              setInput(value);
            }}
            onToggleTranslation={(id) => dispatch({ type: 'TOGGLE_CHAT_TRANSLATION', payload: { id } })}
            onAutoPauseChange={setChatAutoPaused}
            isSending={isSending}
            isReady={isReady}
            loadingStatusText={initStatusText}
            onInputHeightChange={setChatInputHeight}
            sendFeedback={sendFeedback?.reason ?? null}
            onSubmit={submit}
            onCompositionStateChange={setIsComposing}
            isComposing={isComposing}
            onDebugSimulateSend={() => submit('debug_simulate')}
            onDebugToggleSelfTag={() => {
              setDebugIsolatedTagLock((prev) => !prev);
            }}
            onDebugToggleComposing={() => {
              setDebugComposingOverride((prev) => (prev == null ? true : !prev));
            }}
            onDebugInjectMention={() => {
              const handle = activeUserInitialHandleRef.current || activeUserProfileRef.current?.handle || 'you';
              dispatchChatMessage({
                id: crypto.randomUUID(),
                username: 'npc_mod',
                text: `[visual only][no formal gate] 測試提及 @${handle}，請看高亮與自動滾動`,
                language: 'zh'
              }, { source: 'debug_tester', sourceTag: 'mention_autoscroll_isolated' });
            }}
            onSendButtonClick={handleSendButtonClick}
            isLocked={lockStateRef.current.isLocked}
            lockTarget={lockStateRef.current.target}
            questionMessageId={qnaStateRef.current.active.questionMessageId}
            qnaStatus={qnaStateRef.current.active.status}
            replyPreviewSuppressedReason={replyPreviewSuppressedReason}
            sandboxReplyGateState={sandboxReplyGateState}
            activeUserInitialHandle={activeUserInitialHandleRef.current}
            activeUserId={activeUserProfileRef.current?.id ?? 'activeUser'}
            onTagHighlightEvaluated={handleTagHighlightEvaluated}
            autoScrollMode={chatAutoScrollMode}
            forceScrollSignalReason={pendingForceScrollReason}
            onReplyPinMountedChange={(mounted) => {
              replyPinMountedRef.current = mounted;
              setReplyPinMounted(mounted);
            }}
            sandboxPinnedEntry={sandboxPinnedEntry}
            onSandboxPinnedMountedChange={setSandboxPinnedMounted}
            sandboxControl={{
              enabled: modeIdRef.current === 'sandbox_story',
              valueToken: sandboxInputControl.valueToken,
              value: sandboxInputControl.value,
              sendToken: sandboxInputControl.sendToken,
              onAutoSend: handleSandboxAutoSend
            }}
            onForceScrollDebug={(payload) => {
              setLastForceToBottomReason(payload.reason);
              setLastForceToBottomAt(payload.at);
              setLastForceScrollMetrics(payload.metrics);
              setLastForceContainerFound(payload.containerFound);
              setLastForceResult(payload.result);
              setPendingForceScrollReason(null);
            }}
          />
        </section>
        {!isDesktopLayout && debugEnabled && (
          <aside className="mobile-layout-debug" data-tick={layoutMetricsTick}>
            <div>visualViewport.height: {mobileViewportHeight ? Math.round(mobileViewportHeight) : 'n/a'}</div>
            <div>window.innerHeight: {Math.round(mobileInnerHeight)}</div>
            <div>container height: {containerHeight ? Math.round(containerHeight) : 'n/a'}</div>
            <div>video height: {videoHeight ? Math.round(videoHeight) : 'n/a'}</div>
            <div>chat height: {chatHeight ? Math.round(chatHeight) : 'n/a'}</div>
            <div>header height: {headerHeight ? Math.round(headerHeight) : 'n/a'}</div>
            <div>input height: {chatInputHeight ? Math.round(chatInputHeight) : 'n/a'}</div>
            <div>keyboard open: {isKeyboardOpen ? 'true' : 'false'}</div>
          </aside>
        )}
      </main>
      )}
    </div>
  );
}
