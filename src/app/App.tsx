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
  parsePlayerReplyToOption,
  setQnaQuestionActor,
  startQnaFlow,
  stopQnaFlow,
  updateLastAskedPreview
} from '../game/qna/qnaEngine';
import { createClassicMode } from '../modes/classic/classicMode';
import { createSandboxStoryMode, type SandboxFearDebugState, type SandboxPrompt } from '../modes/sandbox_story/sandboxStoryMode';
import { getClassicConsonantPrompt, parseAndJudgeUsingClassic } from '../modes/sandbox_story/classicConsonantAdapter';
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
const SANDBOX_POSSESSION_AUTOSEND_MIN_MS = 300;
const SANDBOX_POSSESSION_AUTOSEND_MAX_MS = 700;

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
  const sandboxPromptIssuedAtRef = useRef<number>(0);
  const sandboxConsonantTagOwnerRef = useRef<string>('mod_live');
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
  const [sandboxAutoPlayNight, setSandboxAutoPlayNight] = useState(false);
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
      const isWaitReplyStep = sandboxFlow.step === 'WAIT_WARMUP_REPLY' || sandboxFlow.step === 'WAIT_REPLY_1' || sandboxFlow.step === 'WAIT_REPLY_2' || sandboxFlow.step === 'WAIT_REPLY_3';
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
    if (!sandboxState.joinGate.satisfied) {
      sandboxModeRef.current.setJoinGate({ satisfied: true, submittedAt: now });
    }
    const bootstrappedState = sandboxModeRef.current.ensureBootstrapState?.(reason, now, 30_000, bootstrapMissing || sandboxState.flow.step === 'PREJOIN')
      ?? sandboxModeRef.current.getState();
    sandboxModeRef.current.setPreheatState({ enabled: true, lastJoinAt: bootstrappedState.preheat.lastJoinAt || now });
    preheatRuntime.startedAt = bootstrappedState.introGate.startedAt || now;
    preheatRuntime.lastEmitAt = 0;
    preheatRuntime.cursor = 0;
    preheatRuntime.joinEmitted = 0;
    preheatRuntime.lastJoinSender = '';
    preheatRuntime.completed = false;

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
        setSandboxRevealTick(Date.now());
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
    return {
      replyGateArmed: Boolean(gate?.armed),
      replyGateType: gate?.gateType && gate.gateType !== 'none' ? gate.gateType : null,
      replyTarget: gate?.targetPlayerId || null,
      replySourceMessageId: gate?.sourceMessageId || null,
      replySourceType: gate?.sourceType || null,
      canReply: Boolean(gate?.canReply)
    };
  }, []);

  const writeSandboxLastReplyEval = useCallback((payload: {
    rawInput: string;
    normalizedInput?: string;
    extractedAnswer?: string;
    consumed: boolean;
    reason: string;
    gate?: SandboxReplyGateState;
  }) => {
    const gate = payload.gate ?? deriveSandboxReplyGateState();
    const now = Date.now();
    sandboxModeRef.current.setSandboxFlow({ playerLastReply: payload.normalizedInput ?? payload.rawInput.trim() });
    const evalState = {
      timestamp: now,
      messageId: `player:${now}`,
      rawInput: payload.rawInput,
      normalizedInput: payload.normalizedInput ?? payload.rawInput.trim(),
      extractedAnswer: payload.extractedAnswer ?? payload.normalizedInput ?? payload.rawInput.trim(),
      gateType: gate.replyGateType ?? 'none',
      consumed: payload.consumed,
      reason: payload.reason,
      replyTarget: gate.replyTarget ?? '-',
      sourceMessageId: gate.replySourceMessageId ?? '-',
      sourceType: gate.replySourceType ?? '-'
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
      at: now
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
    qnaStateRef.current.awaitingReply = false;
    qnaStateRef.current.active.status = 'RESOLVED';
    qnaStateRef.current.active.resolvedAt = now;
    sandboxQnaDebugRef.current.lastResolveAt = now;
    sandboxQnaDebugRef.current.lastResolveReason = reason;
    clearReplyUi(`resolve:${reason}`);
    if (chatFreeze.isFrozen || chatAutoScrollMode !== 'FOLLOW') {
      clearChatFreeze(`qna_resolved:${reason}`);
    }
  }, [chatAutoScrollMode, chatFreeze.isFrozen, clearChatFreeze, clearReplyUi]);

  const consumePlayerReply = useCallback((raw: string) => {
    if (modeRef.current.id === 'sandbox_story') {
      const sandboxState = sandboxModeRef.current.getState();
      const stripped = raw.replace(/^(?:[\s　]*@[^\s　]+[\s　]*)+/u, '').trim();
      const derivedGate = deriveSandboxReplyGateState();
      const waitReplyStep = sandboxState.flow.step === 'WAIT_WARMUP_REPLY' || sandboxState.flow.step === 'WAIT_REPLY_1' || sandboxState.flow.step === 'WAIT_REPLY_2' || sandboxState.flow.step === 'WAIT_REPLY_3';
      const gate = (!derivedGate.replyGateType && waitReplyStep)
        ? {
            ...derivedGate,
            replyGateType: sandboxState.flow.step === 'WAIT_WARMUP_REPLY' ? 'warmup_tag' : 'consonant_answer',
            replyGateArmed: true,
            canReply: true,
            replySourceMessageId: sandboxState.replyGate?.sourceMessageId || lockStateRef.current.replyingToMessageId || qnaStateRef.current.active.questionMessageId || null
          }
        : derivedGate;
      if (!gate.replyGateType) {
        writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'no_gate', gate });
        return false;
      }
      if (!gate.replyGateArmed) {
        writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'gate_not_armed', gate });
        return false;
      }
      let consonantParsed = stripped;
      if (gate.replyGateType === 'consonant_guess' || gate.replyGateType === 'consonant_answer') {
        const currentPrompt = sandboxState.prompt.current;
        const node = sandboxModeRef.current.getCurrentNode();
        if (currentPrompt?.kind === 'consonant') {
          const pipeline = parseAndJudgeUsingClassic(raw, {
            nodeChar: currentPrompt.consonant,
            node: node && node.id === currentPrompt.wordKey ? node : undefined,
            activeUser: normalizeHandle(activeUserInitialHandleRef.current || '') || 'you'
          });
          consonantParsed = pipeline.parsed;
          sandboxModeRef.current.commitConsonantJudgeResult({ input: raw, parsed: pipeline.parsed, judge: pipeline.result, classicJudgeResult: pipeline.result });
          if (pipeline.result === 'wrong_format' || pipeline.result === 'unknown') {
            writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: pipeline.parsed, extractedAnswer: pipeline.parsed, consumed: false, reason: pipeline.result, gate });
            setSandboxRevealTick(Date.now());
            return false;
          }
        }
      } else if (!stripped) {
        writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'stripped_empty', gate });
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

      if (sandboxState.flow.step === 'WAIT_WARMUP_REPLY') {
        sandboxModeRef.current.setFlowStep('POST_REPLY_CHAT', 'player_reply_warmup_consumed');
      } else if (sandboxState.flow.step === 'WAIT_REPLY_1') {
        sandboxModeRef.current.setFlowStep('ANSWER_EVAL', 'player_reply_1_consumed');
      } else if (sandboxState.flow.step === 'WAIT_REPLY_2') {
        sandboxModeRef.current.setFlowStep('ADVANCE_NEXT', 'player_reply_2_consumed');
      } else if (sandboxState.flow.step === 'WAIT_REPLY_3') {
        sandboxModeRef.current.setFlowStep('ADVANCE_NEXT', 'player_reply_3_consumed');
      } else {
        writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'submit_rejected', gate });
        return false;
      }
      writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: consonantParsed, extractedAnswer: consonantParsed, consumed: true, reason: 'consume_success', gate });
      setSandboxRevealTick(Date.now());
      return true;
    }
    if (!(qnaStateRef.current.isActive && qnaStateRef.current.awaitingReply)) {
      return false;
    }
    const stripped = raw.replace(/^(?:[\s　]*@[^\s　]+[\s　]*)+/u, '').trim();
    const parsed = parsePlayerReplyToOption(qnaStateRef.current, stripped);
    if (!parsed) {
      writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: false, reason: 'parse_miss' });
      return false;
    }
    qnaStateRef.current.matched = { optionId: parsed.optionId, keyword: parsed.matchedKeyword, at: Date.now() };
    resolveQna(`parsed:${parsed.optionId}`);
    if ((window.__CHAT_DEBUG__?.ui as { replyBarVisible?: boolean } | undefined)?.replyBarVisible) {
      clearReplyUi('anomaly_reply_bar_still_visible_after_resolve');
      sandboxQnaDebugRef.current.lastAnomaly = 'replyBarVisible_after_resolve';
    }
    writeSandboxLastReplyEval({ rawInput: raw, normalizedInput: stripped, extractedAnswer: stripped, consumed: true, reason: 'consume_success' });
    return true;
  }, [clearChatFreeze, clearReplyUi, deriveSandboxReplyGateState, resolveQna, writeSandboxLastReplyEval]);

  const isSandboxWaitReplyStep = useCallback((step: string | undefined) => {
    return step === 'WAIT_WARMUP_REPLY' || step === 'WAIT_REPLY_1' || step === 'WAIT_REPLY_2' || step === 'WAIT_REPLY_3';
  }, []);

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
      const blockedReason = sandboxState.scheduler.phase === 'awaitingAnswer' ? 'phaseBusy' : 'writerNotAllowed';
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
    qnaStateRef.current.awaitingReply = false;
    qnaStateRef.current.active.status = 'ABORTED';
    qnaStateRef.current.active.abortReason = hasQuestionSource ? 'source_inconsistent' : 'source_missing';
    qnaStateRef.current.active.resolvedAt = Date.now();
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
      setLastBlockedReason(appendFailedReason ?? 'qna_question_send_failed');
      return false;
    }

    setLastBlockedReason(null);
    updateLastAskedPreview(qnaStateRef.current, line);
    qnaStateRef.current.history = [...qnaStateRef.current.history, `ask:${qnaStateRef.current.stepId}:${Date.now()}`].slice(-40);
    return true;
  }, [debugEnabled, dispatchChatMessage, nextAnimationFrame, setScrollMode, sortedMessages]);

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

    if (source === 'user_input' && qnaStateRef.current.isActive && qnaStateRef.current.awaitingReply) {
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
        if (!qnaStateRef.current.awaitingReply && Date.now() >= qnaStateRef.current.nextAskAt) {
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
            qnaStateRef.current.awaitingReply = false;
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
      sandboxModeRef.current.commitPromptOverlay(canShowConsonantOverlay && promptBeforeTick?.kind === 'consonant' ? promptBeforeTick.consonant : '');
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
        if (sandboxState.flow.step === 'PREHEAT_CHAT') {
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
          dispatchChatMessage(createPlayerMessage(mock, activeUserInitialHandleRef.current || 'player'), { source: 'sandbox_consonant', sourceTag: 'sandbox_autoplay_mock_reply' });
          consumePlayerReply(mock);
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
      setSandboxRevealTick(now);
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
          nextBeatAt: sandboxState.sandboxFlow.nextBeatAt
        },
        unresolvedAmbient: {
          active: sandboxState.flow.step === 'WAIT_REPLY_1' && sandboxState.sandboxFlow.replyGateActive && !sandboxState.sandboxFlow.gateConsumed,
          remaining: Math.max(0, 2 - sandboxWaitReplyRuntimeRef.current.glitchCount),
          completed: sandboxWaitReplyRuntimeRef.current.completed
        },
        ui: {
          consonantBubble: {
            visible: Boolean(sandboxState.flow.step && sandboxState.scheduler.phase && sandboxState.introGate.startedAt > 0)
              && !(sandboxState.reveal.visible && sandboxState.reveal.phase !== 'idle' && sandboxState.reveal.phase !== 'done')
          },
          promptGlyph: {
            className: 'glyph-blink sandbox-story-prompt-glyph',
            colorResolved: '#8fd6ff',
            opacityResolved: !(sandboxState.reveal.visible && sandboxState.reveal.phase !== 'idle' && sandboxState.reveal.phase !== 'done') ? 'dynamic' : '0',
            source: 'cssVar',
            isBlueExpected: true
          }
        },
        word: {
          reveal: {
            active: sandboxState.reveal.visible,
            phase: sandboxState.reveal.phase,
            wordKey: sandboxState.reveal.wordKey,
            consonantFromPrompt: sandboxState.reveal.consonantFromPrompt || '-',
            durationMs: sandboxState.reveal.durationMs,
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
            }
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
        lastReplyEval: sandboxState.lastReplyEval,
        freeze: sandboxState.freeze,
        glitchBurst: sandboxState.glitchBurst,
        player: sandboxState.player,
        last: sandboxState.last,
        schedulerPhase: mapSandboxSchedulerPhase(sandboxState.scheduler.phase),
        scheduler: {
          phase: sandboxState.scheduler.phase,
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
          lastResult: sandboxState.consonant.judge.lastResult
        },
        ghost: { gate: { lastReason: sandboxState.ghostGate?.lastReason ?? '-' } },
        advance: {
          inFlight: sandboxState.advance.inFlight,
          lastAt: sandboxState.advance.lastAt || 0,
          lastReason: sandboxState.advance.lastReason || '-',
          blockedReason: sandboxState.advance.blockedReason || '-'
        },
        currentPrompt: sandboxState.currentPrompt,
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
        hint: {
          active: sandboxState.hint.active,
          lastText: sandboxState.hint.lastText || '-',
          count: sandboxState.hint.count,
          lastShownAt: sandboxState.hint.lastShownAt,
          lastTextPreview: (sandboxState.hint.lastText || '').slice(0, 40) || '-',
          source: sandboxState.hint.source || '-'
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
          active: sandboxState.reveal.visible && sandboxState.reveal.phase !== 'idle' && sandboxState.reveal.phase !== 'done',
          wordKey: sandboxState.reveal.wordKey || '-',
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
          topic: eventLifecycleRef.current?.topic
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

  const advanceSandboxPrompt = useCallback((reason: 'correct_done' | 'debug_pass') => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const st = sandboxModeRef.current.getState();
    if ((st?.prompt?.mismatch ?? false) || isSandboxPromptRevealMismatch(st)) {
      sandboxModeRef.current.commitAdvanceBlockedReason('mismatch');
      setSandboxRevealTick(Date.now());
      return;
    }
    sandboxModeRef.current.advancePrompt(reason);
    sandboxConsonantPromptNodeIdRef.current = null;
    clearSandboxAdvanceRetry();
    setSandboxRevealTick(Date.now());
  }, [clearSandboxAdvanceRetry, isSandboxPromptRevealMismatch]);

  const applySandboxCorrect = useCallback((payload?: { input?: string; matchedChar?: string; source?: string }) => {
    if (modeRef.current.id !== 'sandbox_story') return;
    sandboxModeRef.current.applyCorrect({ input: payload?.input, matchedChar: payload?.matchedChar });
    clearChatFreeze('sandbox_consonant_correct');
    setChatAutoPaused(false);
    sendCooldownUntil.current = Date.now() + 350;
    tagSlowActiveRef.current = false;
    setInput('');
    setSandboxRevealTick(Date.now());
  }, [clearChatFreeze]);

  const showHintForCurrentPrompt = useCallback((params: { judge: 'unknown' | 'wrong'; currentPrompt: { consonant: string; wordKey: string }; hintText?: string }) => {
    const hintLine = params.hintText?.trim() || '';
    if (!hintLine) return;
    sandboxModeRef.current.commitHintText(hintLine, 'classic_shared');
    dispatchChatMessage({
      id: crypto.randomUUID(),
      username: sandboxConsonantTagOwnerRef.current || 'mod_live',
      text: hintLine,
      language: 'zh',
      translation: hintLine
    }, { source: 'sandbox_consonant', sourceTag: params.judge === 'unknown' ? 'sandbox_consonant_hint_unknown' : 'sandbox_consonant_hint_wrong' });
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
    const markSent = (mode: string): SendResult => {
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
      return { ok: true, status: 'sent' };
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
      dispatchChatMessage(createPlayerMessage(outgoingText, activeUserInitialHandleRef.current), {
        source: 'player_input',
        sourceTag: source
      });
      sandboxChatEngineRef.current?.markPlayerReply(Date.now());
      const sandboxQnaConsumed = modeRef.current.id === 'sandbox_story' ? consumePlayerReply(outgoingText) : false;
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
          return markSent('sandbox_wait_reply_rejected');
        }
        writeSandboxLastReplyEval({ rawInput: outgoingText, normalizedInput: outgoingText.trim(), consumed: false, reason: 'consume_fallback_to_free_chat' });
        setInput('');
        sendCooldownUntil.current = Date.now() + 350;
        tagSlowActiveRef.current = false;
        return markSent('sandbox_free_chat_sent');
      }
      if (modeRef.current.id === 'sandbox_story' && sandboxQnaConsumed) {
        writeSandboxLastReplyEval({ rawInput: outgoingText, normalizedInput: outgoingText.trim(), consumed: true, reason: 'submit_accepted' });
        setInput('');
        sendCooldownUntil.current = Date.now() + 350;
        tagSlowActiveRef.current = false;
        return markSent('sandbox_qna_consumed');
      }

      if (!sandboxQnaConsumed && qnaStateRef.current.active.status === 'AWAITING_REPLY') {
        markQnaResolved(qnaStateRef.current, Date.now());
        qnaStateRef.current.awaitingReply = false;
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
        return markSent('pass');
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
        return markSent('hint');
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
        return markSent('answer_correct');
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
      return markSent('answer_wrong');
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
    sandboxModeRef.current.commitPromptOverlay(consonantShown);
    return consonantShown;
  }, [state.currentConsonant.letter]);

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

  const canAskConsonantNow = useCallback((sandboxState: ReturnType<ReturnType<typeof createSandboxStoryMode>['getState']>) => {
    if (modeRef.current.id !== 'sandbox_story') return false;
    if (!sandboxState.joinGate.satisfied) return false;
    if (!(sandboxState.flow.step === 'TAG_PLAYER_1' || sandboxState.flow.step === 'REVEAL_1_START')) return false;
    if (!sandboxState.introGate.passed) return false;
    if (sandboxState.sandboxFlow.gateType !== 'none') return false;
    if (sandboxState.sandboxFlow.replyGateActive || sandboxState.sandboxFlow.canReply) return false;
    return true;
  }, []);

  async function askSandboxConsonantNow() {
    if (modeRef.current.id !== 'sandbox_story') return;
    const sandboxState = sandboxModeRef.current.getState();
    const node = sandboxModeRef.current.getCurrentNode();
    if (!node) return;
    if (!canAskConsonantNow(sandboxState)) return;
    if (sandboxState.flow.tagAskedThisStep) return;
    if (sandboxState.last.lastAskAt && sandboxState.last.lastAskAt >= sandboxState.flow.stepStartedAt) return;

    const currentPrompt = sandboxModeRef.current.getCurrentPrompt();
    if (sandboxConsonantPromptNodeIdRef.current === node.id && currentPrompt?.kind === 'consonant' && currentPrompt.wordKey === node.id) {
      if (Date.now() - sandboxPromptIssuedAtRef.current < 3000) return;
      sandboxConsonantPromptNodeIdRef.current = null;
    }

    const activeUser = normalizeHandle(activeUserInitialHandleRef.current || '');
    const tagOwner = 'mod_live';
    sandboxConsonantTagOwnerRef.current = tagOwner;

    const prompt = getClassicConsonantPrompt({ nodeChar: node.char, node, activeUser: activeUser || 'you' });
    sandboxModeRef.current.setConsonantPromptText(prompt.promptText);
    const promptId = crypto.randomUUID();
    const sandboxPrompt: SandboxPrompt = {
      kind: 'consonant',
      promptId,
      consonant: node.char,
      wordKey: node.id,
      pinnedText: prompt.promptText,
      correctKeywords: node.correctKeywords ?? [node.char],
      unknownKeywords: node.unknownKeywords ?? ['不知道']
    };
    sandboxModeRef.current.setCurrentPrompt(sandboxPrompt);
    sandboxModeRef.current.commitPromptOverlay(sandboxPrompt.consonant);

    const line = prompt.promptText;
    const messageId = promptId;
    const tagFlowResult = await runTagStartFlow({
      tagMessage: {
        id: messageId,
        username: tagOwner,
        type: 'chat',
        text: line,
        language: 'zh',
        translation: line,
        tagTarget: tagOwner
      },
      pinnedText: prompt.promptText,
      shouldFreeze: true,
      appendMessage: (message) => {
        const sent = dispatchChatMessage(message, { source: 'sandbox_consonant', sourceTag: 'sandbox_consonant_prompt' });
        if (!sent.ok) return sent;
        return { ok: true as const, messageId: sent.messageId };
      },
      forceScrollToBottom: async ({ reason }) => {
        setScrollMode('FOLLOW', `sandbox_consonant_${reason}`);
        setChatFreeze({ isFrozen: false, reason: null, startedAt: null });
        setPendingForceScrollReason(`sandbox_consonant_${reason}`);
        await nextAnimationFrame();
      },
      setPinnedReply: ({ messageId: resolvedMessageId }) => {
        sandboxReplyGateDebugRef.current = {
          gateType: 'consonant_wait_reply',
          armed: true,
          sourceMessageId: resolvedMessageId,
          targetPlayerId: tagOwner,
          consumePolicy: 'classic_parse_and_judge'
        };
        const now = Date.now();
        markQnaQuestionCommitted(qnaStateRef.current, { messageId: resolvedMessageId, askedAt: now });
        lockStateRef.current = { isLocked: true, target: tagOwner, startedAt: now, replyingToMessageId: resolvedMessageId };
        const pinnedOk = setPinnedQuestionMessage({
          source: 'sandboxPromptCoordinator',
          messageId: resolvedMessageId,
          hasTagToActiveUser: true
        });
        if (!pinnedOk) {
          setReplyPreviewSuppressedReason('sandbox_pinned_writer_guard');
        }
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
      setLastBlockedReason(tagFlowResult.blockedReason);
      return;
    }
    const askedAt = Date.now();
    modeRef.current.onIncomingTag(line);
    sandboxModeRef.current.markTagAskedThisStep(askedAt);
    sandboxModeRef.current.setLastTimestamps({ lastAskAt: askedAt });
    sandboxTechBacklogRef.current = [];
    sandboxTechBacklogLastAtRef.current = 0;
    sandboxTechBacklogTotalWaitMsRef.current = 0;
    sandboxFreezeAndWaitForReply(askedAt, 'sandbox_tag_player_1', 'WAIT_REPLY_1');
    sandboxConsonantPromptNodeIdRef.current = node.id;
    sandboxPromptIssuedAtRef.current = askedAt;
  }

  const forceRevealCurrent = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const node = sandboxModeRef.current.forceRevealCurrent();
    if (!node) return;
    void playPronounce(node.audioKey);
    setSandboxRevealTick(Date.now());
  }, []);

  const forcePlayPronounce = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const node = sandboxModeRef.current.getCurrentNode();
    if (!node?.audioKey) return;
    void playPronounce(node.audioKey).then((result) => {
      sandboxModeRef.current.setPronounceState(result === 'played' ? 'playing' : 'error', { key: node.audioKey, reason: result });
      setSandboxRevealTick(Date.now());
    });
  }, []);

  const forceWave = useCallback((kind: 'related' | 'surprise' | 'guess') => {
    if (modeRef.current.id !== 'sandbox_story') return;
    sandboxModeRef.current.forceWave(kind);
    setSandboxRevealTick(Date.now());
  }, []);

  const handleSandboxDebugPass = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    sandboxDebugPassRef.current = { clickedAt: Date.now(), action: 'called_advance_prompt' };
    clearSandboxRevealDoneTimer();
    sandboxModeRef.current.advancePrompt('debug_pass');
    sandboxConsonantPromptNodeIdRef.current = null;
    clearReplyUi('sandbox_debug_pass');
    clearChatFreeze('sandbox_debug_pass');
    setChatAutoPaused(false);
    setInput('');
    setSandboxRevealTick(Date.now());
  }, [clearReplyUi, clearSandboxRevealDoneTimer, clearChatFreeze]);


  const handleSandboxDebugForceCorrect = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const currentPrompt = sandboxModeRef.current.getCurrentPrompt();
    if (currentPrompt?.kind !== 'consonant') return;
    sandboxModeRef.current.activateDebugOverride('button');
    applySandboxCorrect({ input: '[debug-force-correct]', matchedChar: currentPrompt.consonant, source: 'debug_button' });
  }, [applySandboxCorrect]);

  const forceResolveQna = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    resolveQna('debug_force_resolve');
  }, [resolveQna]);

  const handleClearReplyUi = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    clearReplyUi('debug_button_clear_reply_ui');
  }, [clearReplyUi]);

  const forceAskConsonantNow = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const sandboxState = sandboxModeRef.current.getState();
    if (!canAskConsonantNow(sandboxState)) return;
    sandboxConsonantPromptNodeIdRef.current = null;
    sandboxModeRef.current.forceAskConsonantNow();
    void askSandboxConsonantNow();
  }, []);

  const simulateConsonantAnswer = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const node = sandboxModeRef.current.getCurrentNode();
    const text = input.trim() || node?.correctKeywords?.[0] || 'บ';
    setInput(text);
    void submitChat(text, 'debug_simulate');
  }, [input, submitChat]);

  const forceAskComprehensionNow = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const sandboxState = sandboxModeRef.current.getState();
    if (!canAskConsonantNow(sandboxState)) return;
    sandboxModeRef.current.forceAskComprehensionNow();
  }, []);

  const forceGhostMotionNow = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const currentNode = sandboxModeRef.current.getCurrentNode();
    if (!currentNode?.audioKey) return;
    void playPronounce(currentNode.audioKey).then((result) => {
      sandboxModeRef.current.setPronounceState(result === 'played' ? 'playing' : 'error', { key: currentNode.audioKey, reason: result });
      setSandboxRevealTick(Date.now());
    });
  }, []);

  const forceAdvanceSandboxNode = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    sandboxModeRef.current.forceAdvanceNode();
    setSandboxRevealTick(Date.now());
  }, []);

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



  const sandboxFreezeAndWaitForReply = useCallback((askedAt: number, reason: string, waitStep: 'WAIT_WARMUP_REPLY' | 'WAIT_REPLY_1' | 'WAIT_REPLY_2' | 'WAIT_REPLY_3') => {
    sandboxModeRef.current.setFlowStep(waitStep, `${waitStep.toLowerCase()}_entered`, askedAt);
    sandboxModeRef.current.markTagAskedThisStep(askedAt);
    sandboxModeRef.current.setFreeze({ frozen: true, reason: 'AWAIT_PLAYER_INPUT', frozenAt: askedAt });
    sandboxModeRef.current.setAnswerGate({ waiting: true, askedAt, pausedChat: true });
    const gateType = waitStep === 'WAIT_WARMUP_REPLY' ? 'warmup_tag' : 'consonant_answer';
    const targetPlayerId = normalizeHandle(activeUserInitialHandleRef.current || sandboxModeRef.current.getState().player?.handle || 'player') || 'player';
    sandboxModeRef.current.setSandboxFlow({ replyGateActive: true, replyTarget: targetPlayerId, canReply: true, gateType, gateConsumed: false });
    sandboxModeRef.current.setReplyGate?.({ gateType, armed: true, canReply: true, gateConsumed: false, targetPlayerId, sourceMessageId: lockStateRef.current.replyingToMessageId || '', sourceType: 'flow_step_gate', consumePolicy: 'single', createdAt: askedAt });
    setChatFreeze({ isFrozen: true, reason: 'tagged_question', startedAt: askedAt });
    setPauseSetAt(askedAt);
    setPauseReason(reason);
    setScrollMode('FROZEN', reason);
    setChatAutoPaused(true);
  }, []);


  useEffect(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const sandboxState = sandboxModeRef.current.getState();
    const sandboxForcedReplyGateActive = qnaStateRef.current.active.status === 'AWAITING_REPLY'
      && Boolean(qnaStateRef.current.active.questionMessageId);
    const reveal = sandboxState.reveal;
    if (reveal.visible && reveal.phase === 'enter') {
      sandboxModeRef.current.setPronounceState('idle', { key: reveal.audioKey, reason: 'reserved_no_side_effect' });
    }
    if (reveal.visible && reveal.mode === 'correct' && reveal.startedAt > 0) {
      clearSandboxRevealDoneTimer();
      const elapsed = Date.now() - reveal.startedAt;
      const remainMs = Math.max(0, 4000 - elapsed);
      sandboxRevealDoneTimerRef.current = window.setTimeout(() => {
        sandboxModeRef.current.forceRevealDone();
        sandboxModeRef.current.markRevealDone();
        setSandboxRevealTick(Date.now());
      }, remainMs);
    }
    if (reveal.visible && reveal.phase === 'done') {
      sandboxModeRef.current.markRevealDone();
      setSandboxRevealTick(Date.now());
      return;
    }
    if (sandboxForcedReplyGateActive) {
      return () => {
        clearSandboxRevealDoneTimer();
      };
    }

    if (sandboxState.flow.step === 'WAIT_WARMUP_REPLY') {
      const gate = sandboxState.replyGate;
      const targetPlayerId = normalizeHandle(activeUserInitialHandleRef.current || sandboxState.player?.handle || 'player') || 'player';
      const sourceMessageId = gate?.sourceMessageId || lockStateRef.current.replyingToMessageId || qnaStateRef.current.active.questionMessageId || '';
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
      setSandboxRevealTick(Date.now());
    }
    if (sandboxState.flow.step === 'POST_REPLY_CHAT' && !sandboxWaveRunningRef.current) {
      sandboxWaveRunningRef.current = true;
      const warmupFollow = [
        { user: 'viewer_118', text: '歡迎歡迎～' },
        { user: 'viewer_203', text: '新朋友一起看～' }
      ];
      warmupFollow.forEach((item) => {
        dispatchChatMessage({ id: crypto.randomUUID(), username: item.user, type: 'chat', text: item.text, language: 'zh', translation: item.text }, { source: 'sandbox_consonant', sourceTag: 'sandbox_preheat_chat' });
      });
      sandboxWaveRunningRef.current = false;
      sandboxModeRef.current.setFlowStep('REVEAL_1_START', 'warmup_post_reply_done', Date.now());
      setSandboxRevealTick(Date.now());
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
      setSandboxRevealTick(Date.now());
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
        setSandboxRevealTick(Date.now());
      }, 900);
      setSandboxRevealTick(Date.now());
    }
    if (sandboxState.flow.step === 'TAG_PLAYER_1') {
      if (!hasSandboxQuestionPrerequisites(sandboxState)) {
        sandboxModeRef.current.commitAdvanceBlockedReason('prompt_missing_for_tag');
        return () => { clearSandboxRevealDoneTimer(); };
      }
      sandboxModeRef.current.setFlowStep('WAIT_REPLY_1', 'tag_gate_armed', Date.now());
      setSandboxRevealTick(Date.now());
    }
    if (sandboxState.flow.step === 'WAIT_REPLY_1') {
      const currentPrompt = sandboxState.prompt.current;
      const gate = sandboxState.replyGate;
      const fallbackSourceMessageId = gate?.sourceMessageId || lockStateRef.current.replyingToMessageId || qnaStateRef.current.active.questionMessageId || '';
      if (!gate?.gateType || gate.gateType === 'none') {
        sandboxModeRef.current.setReplyGate?.({ gateType: 'consonant_answer', armed: true, canReply: true, gateConsumed: false, sourceMessageId: fallbackSourceMessageId });
        sandboxModeRef.current.setSandboxFlow({ gateType: 'consonant_answer', replyGateActive: true, canReply: true, gateConsumed: false, replySourceMessageId: fallbackSourceMessageId });
      }
      if (!fallbackSourceMessageId) {
        sandboxModeRef.current.commitAdvanceBlockedReason('wait_reply_1_missing_source_message_id');
      }
      if (currentPrompt?.kind === 'consonant') {
        const targetPlayerId = normalizeHandle(activeUserInitialHandleRef.current || sandboxState.player?.handle || 'player') || 'player';
        const sourceMessageId = gate?.sourceMessageId || lockStateRef.current.replyingToMessageId || qnaStateRef.current.active.questionMessageId || '';
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
        setSandboxRevealTick(askedAt);
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
          sandboxFreezeAndWaitForReply(askedAt, reason, 'WAIT_REPLY_1');
        }
      });
      setSandboxRevealTick(Date.now());
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
      sandboxModeRef.current.setFlowStep('REVEAL_WORD', 'answer_eval_done');
      setSandboxRevealTick(Date.now());
    }
    if (sandboxState.flow.step === 'REVEAL_WORD') {
      const node = sandboxModeRef.current.forceRevealCurrent?.();
      if (node?.audioKey) {
        void playPronounce(node.audioKey).then((result) => {
          sandboxModeRef.current.setPronounceState(result === 'played' ? 'playing' : 'error', { key: node.audioKey, reason: result });
          setSandboxRevealTick(Date.now());
        });
      }
      sandboxModeRef.current.setFlowStep('POST_REVEAL_CHAT', 'reveal_word_done');
      setSandboxRevealTick(Date.now());
    }
    if (sandboxState.flow.step === 'POST_REVEAL_CHAT') {
      sandboxModeRef.current.setFlowStep('ADVANCE_NEXT', 'post_reveal_chat_done');
      setSandboxRevealTick(Date.now());
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
      setSandboxRevealTick(Date.now());
    }
    if (sandboxState.flow.step === 'POSSESSION_AUTOSEND') {
      const waitMs = randomInt(SANDBOX_POSSESSION_AUTOSEND_MIN_MS, SANDBOX_POSSESSION_AUTOSEND_MAX_MS);
      window.setTimeout(() => {
        sandboxPossessionRef.current.sendToken += 1;
        setSandboxInputControl((prev) => ({ ...prev, sendToken: sandboxPossessionRef.current.sendToken }));
        sandboxModeRef.current.setFlowStep('CROWD_REACT_WORD', 'possession_autosend_done');
        setSandboxRevealTick(Date.now());
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
        setSandboxRevealTick(Date.now());
      }, 900);
      setSandboxRevealTick(Date.now());
    }
    if (sandboxState.flow.step === 'VIP_SUMMARY_1') {
      const line = 'VIP 總結：先把剛剛那個單字記住，下一步確認發音。';
      dispatchChatMessage({ id: crypto.randomUUID(), username: SANDBOX_VIP.handle, type: 'chat', text: line, language: 'zh', translation: line, isVip: 'VIP_NORMAL', role: 'vip', badge: 'crown' }, { source: 'sandbox_consonant', sourceTag: 'sandbox_vip_summary_1' });
      sandboxModeRef.current.setFlowStep('DISCUSS_PRONOUNCE', 'vip_summary_1_done', Date.now());
      setSandboxRevealTick(Date.now());
    }

    if (sandboxState.flow.step === 'DISCUSS_PRONOUNCE' && !sandboxWaveRunningRef.current) {
      sandboxWaveRunningRef.current = true;
      const discuss = sandboxChatEngineRef.current?.emitReasoningWave(randomInt(3, 5)) ?? [];
      discuss.forEach((message) => {
        dispatchChatMessage(convertSandboxChatMessage(message), { source: 'sandbox_consonant', sourceTag: 'sandbox_discuss_pronounce' });
      });
      window.setTimeout(() => {
        sandboxWaveRunningRef.current = false;
        sandboxModeRef.current.setFlowStep('TAG_PLAYER_3_MEANING', 'discuss_pronounce_done', Date.now());
        setSandboxRevealTick(Date.now());
      }, 900);
      setSandboxRevealTick(Date.now());
    }

    if (sandboxState.flow.step === 'VIP_SUMMARY_2') {
      const line = 'VIP 總結：發音方向差不多了，最後確認這個詞在指誰。';
      dispatchChatMessage({ id: crypto.randomUUID(), username: SANDBOX_VIP.handle, type: 'chat', text: line, language: 'zh', translation: line, isVip: 'VIP_NORMAL', role: 'vip', badge: 'crown' }, { source: 'sandbox_consonant', sourceTag: 'sandbox_vip_summary_2' });
      sandboxModeRef.current.setFlowStep('TAG_PLAYER_3_MEANING', 'vip_summary_2_done', Date.now());
      setSandboxRevealTick(Date.now());
    }

    if (sandboxState.flow.step === 'TAG_PLAYER_2_PRONOUNCE') {
      if (sandboxState.flow.tagAskedThisStep) return () => { clearSandboxRevealDoneTimer(); };
      const taggedUser = normalizeHandle(activeUserInitialHandleRef.current || 'player') || 'player';
      const speaker = 'mod_live';
      const line = `@${taggedUser} 所以到底怎麼唸？`;
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
          const sent = dispatchChatMessage(message, { source: 'sandbox_consonant', sourceTag: 'sandbox_tag_player_2' });
          if (!sent.ok) return sent;
          return { ok: true as const, messageId: sent.messageId };
        },
        forceScrollToBottom: async ({ reason }) => {
          setScrollMode('FOLLOW', `sandbox_tag2_${reason}`);
          setChatFreeze({ isFrozen: false, reason: null, startedAt: null });
          setPendingForceScrollReason(`sandbox_tag2_${reason}`);
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
          sandboxTechBacklogLastAtRef.current = 0;
          sandboxTechBacklogTotalWaitMsRef.current = 0;
          sandboxModeRef.current.markTagAskedThisStep(askedAt);
          sandboxFreezeAndWaitForReply(askedAt, reason, 'WAIT_REPLY_2');
        }
      });
      setSandboxRevealTick(Date.now());
    }

    if (sandboxState.flow.step === 'TAG_PLAYER_3_MEANING') {
      if (sandboxState.flow.tagAskedThisStep) return () => { clearSandboxRevealDoneTimer(); };
      const taggedUser = normalizeHandle(activeUserInitialHandleRef.current || 'player') || 'player';
      const speaker = 'mod_live';
      const line = `@${taggedUser} 這個單字你覺得代表什麼？在指誰？`;
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
          const sent = dispatchChatMessage(message, { source: 'sandbox_consonant', sourceTag: 'sandbox_tag_player_3' });
          if (!sent.ok) return sent;
          return { ok: true as const, messageId: sent.messageId };
        },
        forceScrollToBottom: async ({ reason }) => {
          setScrollMode('FOLLOW', `sandbox_tag3_${reason}`);
          setChatFreeze({ isFrozen: false, reason: null, startedAt: null });
          setPendingForceScrollReason(`sandbox_tag3_${reason}`);
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
          sandboxFreezeAndWaitForReply(askedAt, reason, 'WAIT_REPLY_3');
        }
      });
      setSandboxRevealTick(Date.now());
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
      setSandboxRevealTick(Date.now());
    }
    if (sandboxState.flow.step === 'ADVANCE_NEXT') {
      sandboxWaveRunningRef.current = false;
      const beforeAdvance = sandboxModeRef.current.getState().flow.questionIndex;
      sandboxModeRef.current.forceAdvanceNode();
      if (beforeAdvance >= 10) {
        sandboxModeRef.current.setSandboxFlow({ autoplayNightStatus: 'completed' });
      }
      sandboxModeRef.current.setAnswerGate({ waiting: false, pausedChat: false });
      sandboxModeRef.current.setLastTimestamps({ lastAskAt: 0 });
      sandboxConsonantPromptNodeIdRef.current = null;
      setSandboxRevealTick(Date.now());
    }
    return () => {
      clearSandboxRevealDoneTimer();
    };
  }, [advanceSandboxPrompt, clearSandboxRevealDoneTimer, convertSandboxChatMessage, hasSandboxQuestionPrerequisites, sandboxRevealTick]);


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

  const triggerRandomGhostEvent = useCallback(() => {
    if (modeRef.current.id !== 'sandbox_story') return;
    const state = getGhostEventManagerDebugState();
    const readyEvents = state.events.filter((entry) => entry.status === 'ready').map((entry) => entry.eventName);
    if (readyEvents.length <= 0) return;
    const picked = pickOne(readyEvents);
    triggerEventFromTester(picked);
    setGhostEventDebugState(getGhostEventManagerDebugState());
  }, [getGhostEventManagerDebugState, triggerEventFromTester]);

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
                  wordText: st.reveal.text
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
                  <button type="button" onClick={forceRevealCurrent}>ForceRevealCurrent</button>
                  <button type="button" onClick={forceAskConsonantNow}>ForceAskConsonantNow</button>
                  <button type="button" onClick={simulateConsonantAnswer}>SimulateConsonantAnswer(text)</button>
                  <button type="button" onClick={forceAskComprehensionNow}>ForceAskComprehensionNow</button>
                  <button type="button" onClick={forceGhostMotionNow}>ForceGhostMotion</button>
                  <button type="button" onClick={forceAdvanceSandboxNode}>ForceAdvanceNode</button>
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
                  <div className="debug-route-controls">
                    <button type="button" onClick={() => setSandboxAutoPlayNight((prev) => !prev)}>
                      Auto Play Night: {sandboxAutoPlayNight ? 'ON' : 'OFF'}
                    </button>
                    <button type="button" onClick={handleSandboxDebugPass}>PASS (advancePrompt)</button>
                    <button type="button" onClick={handleSandboxDebugForceCorrect}>ForceCorrect (debug override)</button>
                    <button type="button" onClick={forceResolveQna}>ForceResolveQna</button>
                    <button type="button" onClick={handleClearReplyUi}>ClearReplyUi</button>
                    <button type="button" onClick={forceAdvanceSandboxNode}>Force Next Node</button>
                    <button type="button" onClick={forceRevealCurrent}>Force Reveal Word</button>
                    <button type="button" onClick={forcePlayPronounce}>ForcePlayPronounce</button>
                    <button type="button" onClick={() => forceWave('related')}>ForceWave(related)</button>
                    <button type="button" onClick={() => forceWave('surprise')}>ForceWave(surprise)</button>
                    <button type="button" onClick={() => forceWave('guess')}>ForceWave(guess)</button>
                    <button type="button" onClick={triggerRandomGhostEvent}>Trigger Random Ghost</button>
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
                    <div><strong>CORE FLOW STATE – TRUSTED</strong></div>
                    <div>flow.step: {(window.__CHAT_DEBUG__ as any)?.sandbox?.flow?.step ?? '-'}</div>
                    <div>flow.questionIndex: {(window.__CHAT_DEBUG__ as any)?.sandbox?.flow?.questionIndex ?? '-'}</div>
                    <div>flow.stepStartedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.flow?.stepStartedAt ?? '-'}</div>
                    <div>scheduler.phase: {(window.__CHAT_DEBUG__ as any)?.sandbox?.schedulerPhase ?? '-'}</div>
                    <div>scheduler.blockedReason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.scheduler?.blockedReason ?? '-'}</div>
                    <div>introGate.startedAt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.audit?.introGate?.startedAt ?? 0}</div>
                    <div>introGate.minDurationMs: {(window.__CHAT_DEBUG__ as any)?.sandbox?.audit?.introGate?.minDurationMs ?? 0}</div>
                    <div>introGate.passed: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.audit?.introGate?.passed ?? false)}</div>
                    <div>sandbox.replyGate.gateType/armed: {(window.__CHAT_DEBUG__ as any)?.sandbox?.replyGate?.gateType ?? '-'} / {String((window.__CHAT_DEBUG__ as any)?.sandbox?.replyGate?.armed ?? false)}</div>
                    <div>sandbox.replyGate.gateType: {(window.__CHAT_DEBUG__ as any)?.sandbox?.replyGate?.gateType ?? '-'}</div>
                    <div>sandbox.replyGate.armed: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.replyGate?.armed ?? false)}</div>
                    <div>sandbox.replyGate.canReply: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.replyGate?.canReply ?? false)}</div>
                    <div>sandbox.replyGate.targetPlayerId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.replyGate?.targetPlayerId ?? '-'}</div>
                    <div>sandbox.replyGate.sourceMessageId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.replyGate?.sourceMessageId ?? '-'}</div>
                    <div>sandbox.lastReplyEval.messageId/gateType: {(window.__CHAT_DEBUG__ as any)?.sandbox?.lastReplyEval?.messageId ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.lastReplyEval?.gateType ?? '-'}</div>
                    <div>sandbox.lastReplyEval.consumed/reason: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.lastReplyEval?.consumed ?? false)} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.lastReplyEval?.reason ?? '-'}</div>
                    <div>sandbox.lastReplyEval.raw/normalized: {(window.__CHAT_DEBUG__ as any)?.sandbox?.lastReplyEval?.rawInput ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.lastReplyEval?.normalizedInput ?? '-'}</div>
                    <div>sandbox.lastReplyEval.extractedAnswer: {(window.__CHAT_DEBUG__ as any)?.sandbox?.lastReplyEval?.extractedAnswer ?? '-'}</div>
                    <div>sandbox.prompt.current.kind: {(window.__CHAT_DEBUG__ as any)?.sandbox?.prompt?.current?.kind ?? '-'}</div>
                    <div>sandbox.prompt.current.id: {(window.__CHAT_DEBUG__ as any)?.sandbox?.prompt?.current?.id ?? '-'}</div>
                    <div>sandbox.prompt.current.promptId: {(window.__CHAT_DEBUG__ as any)?.sandbox?.prompt?.current?.promptId ?? '-'}</div>
                    <div>sandbox.prompt.current.consonant: {(window.__CHAT_DEBUG__ as any)?.sandbox?.prompt?.current?.consonant ?? '-'}</div>
                    <div>sandbox.prompt.current.wordKey: {(window.__CHAT_DEBUG__ as any)?.sandbox?.prompt?.current?.wordKey ?? '-'}</div>
                    <div>sandbox.judge.result: {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.result ?? '-'}</div>
                    <div>word.reveal.active: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.active ?? false)}</div>
                    <div>word.reveal.wordKey: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.wordKey ?? '-'}</div>
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
                    <div><strong>PROMPT / JUDGE / REVEAL</strong></div>
                    <div>word.reveal.phase: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.phase ?? '-'}</div>
                    <div>word.reveal.base/rest/restLen: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.base ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.rest ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.restLen ?? '-'}</div>
                    <div>word.reveal.splitter: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.splitter ?? '-'}</div>
                    <div>word.reveal.position.xPct/yPct: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.position?.xPct ?? '-'} / {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.position?.yPct ?? '-'}</div>
                    <div>word.reveal.safeRect: {JSON.stringify((window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.safeRect ?? {})}</div>
                    <div>word.reveal.consonantFromPrompt: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.consonantFromPrompt ?? '-'}</div>
                    <div>word.reveal.durationMs: {(window.__CHAT_DEBUG__ as any)?.sandbox?.word?.reveal?.durationMs ?? '-'}</div>
                    <div>consonant.judge.lastInput: {(window.__CHAT_DEBUG__ as any)?.sandbox?.consonant?.judge?.lastInput ?? '-'}</div>
                    <div>consonant.judge.lastResult: {(window.__CHAT_DEBUG__ as any)?.sandbox?.consonant?.judge?.lastResult ?? 'none'}</div>
                    <div>sandbox.judge.blockedReason: {(window.__CHAT_DEBUG__ as any)?.sandbox?.judge?.blockedReason ?? '-'}</div>
                    <div>sandbox.prompt.next.id: {(window.__CHAT_DEBUG__ as any)?.sandbox?.promptNext?.id ?? '-'}</div>
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
                    <div><strong>VISUAL STATE – NOT FLOW AUTHORITY</strong></div>
                    <div>Visual UI state. Not authoritative for story flow.</div>
                    <div>ui.consonantBubble.visible: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.consonantBubble?.visible ?? true)}</div>
                    <div>ui.promptGlyph.className: {(window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.promptGlyph?.className ?? '-'}</div>
                    <div>ui.promptGlyph.colorResolved: {(window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.promptGlyph?.colorResolved ?? '-'}</div>
                    <div>ui.promptGlyph.opacityResolved: {(window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.promptGlyph?.opacityResolved ?? '-'}</div>
                    <div>ui.promptGlyph.source: {(window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.promptGlyph?.source ?? '-'}</div>
                    <div>ui.promptGlyph.isBlueExpected: {String((window.__CHAT_DEBUG__ as any)?.sandbox?.ui?.promptGlyph?.isBlueExpected ?? false)}</div>
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
