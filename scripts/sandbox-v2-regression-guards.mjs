import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const mode = fs.readFileSync(new URL('../src/modes/sandbox_story/sandboxStoryMode.ts', import.meta.url), 'utf8');
const adapter = fs.readFileSync(new URL('../src/modes/sandbox_story/classicConsonantAdapter.ts', import.meta.url), 'utf8');
const sharedEngine = fs.readFileSync(new URL('../src/shared/consonant-engine/engine.ts', import.meta.url), 'utf8');
const sharedQuestionBank = fs.readFileSync(new URL('../src/shared/consonant-engine/questionBank.ts', import.meta.url), 'utf8');
const sandboxWordMap = fs.readFileSync(new URL('../src/modes/sandbox_story/sandboxConsonantWordMap.ts', import.meta.url), 'utf8');

const checks = [
  {
    name: 'mode entry starts sandbox v2 runtime',
    run() {
      if (!app.includes("ensureSandboxRuntimeStarted('mode_switch_bootstrap')")) {
        throw new Error('sandbox_story mode entry does not call runtime starter');
      }
      if (!app.includes('ensureBootstrapState?.(reason, now, 30_000')) {
        throw new Error('runtime starter does not call mode ensureBootstrapState authority');
      }
      if (!mode.includes("const bootstrapRuntime = (reason = 'mode_entry'")) {
        throw new Error('sandbox mode missing bootstrapRuntime authority entry');
      }
    }
  },
  {
    name: 'flow.step initialized after sandbox mode entry',
    run() {
      if (!mode.includes("flow: { step: 'PREHEAT_CHAT'")) {
        throw new Error('flow.step is not initialized to PREHEAT_CHAT in v2 root state');
      }
      if (!mode.includes("questionIndex: 0")) {
        throw new Error('flow.questionIndex=0 is missing from v2 initialization');
      }
    }
  },
  {
    name: 'scheduler.phase initialized after sandbox mode entry',
    run() {
      if (!mode.includes("scheduler: { phase: 'preheat', blockedReason: '' }")) {
        throw new Error('scheduler.phase preheat default missing');
      }
      if (!mode.includes('setSchedulerPhase: (phase: string')) {
        throw new Error('scheduler phase setter missing');
      }
      if (!mode.includes("state.scheduler = { ...state.scheduler, phase: 'preheat'")) {
        throw new Error('bootstrapRuntime does not enter preheat scheduler phase');
      }
    }
  },
  {
    name: 'PREHEAT_CHAT join spam cap',
    run() {
      if (!app.includes('const SANDBOX_PREHEAT_JOIN_CAP = 4;')) {
        throw new Error('preheat join cap is missing');
      }
      if (!app.includes('joinEmitted >= SANDBOX_PREHEAT_JOIN_CAP')) {
        throw new Error('preheat join cap enforcement missing');
      }
    }
  },
  {
    name: 'same sender cannot emit repeated join-log flood',
    run() {
      if (!app.includes('lastJoinSender')) {
        throw new Error('preheat join sender anti-flood tracker missing');
      }
      if (!app.includes('preheatRuntime.lastJoinSender !== next.user')) {
        throw new Error('same sender join flood guard missing');
      }
    }
  },
  {
    name: 'legacy fallback join emitter blocked in sandbox mode',
    run() {
      if (!app.includes("if (modeRef.current.id === 'sandbox_story') return;")) {
        throw new Error('legacy join emitter is not blocked in sandbox mode');
      }
    }
  },
  {
    name: 'PREHEAT_CHAT contains natural chat, not only join logs',
    run() {
      if (!app.includes('SANDBOX_PREHEAT_CHAT_SEQUENCE')) {
        throw new Error('preheat orchestration sequence missing');
      }
      if (!app.includes("sourceTag: 'sandbox_preheat_chat'")) {
        throw new Error('preheat chat sourceTag missing');
      }
      if (!app.includes("kind: 'chat'")) {
        throw new Error('natural preheat chat entries missing');
      }
    }
  },
  {
    name: 'introGate preheat initialization',
    run() {
      if (!mode.includes('state.introGate = { ...state.introGate, startedAt: bootAt, minDurationMs, passed: false, remainingMs: minDurationMs }')) {
        throw new Error('introGate preheat initialization is missing or incomplete');
      }
    }
  },
  {
    name: 'replyGate schema uses gateType + targetPlayerId as formal keys',
    run() {
      if (!mode.includes("replyGate: { gateType:")) {
        throw new Error('replyGate.gateType formal schema missing');
      }
      if (!mode.includes('targetPlayerId')) {
        throw new Error('replyGate.targetPlayerId formal schema missing');
      }
      if (!app.includes('replyGate.gateType/armed/canReply')) {
        throw new Error('debug panel does not show authoritative replyGate.gateType/armed/canReply');
      }
    }
  },
  {
    name: 'transition log not empty after sandbox mode entry',
    run() {
      if (!mode.includes("{ event: 'INIT_SANDBOX_V2'")) {
        throw new Error('initial transition INIT_SANDBOX_V2 missing');
      }
      if (!mode.includes("{ event: 'ENTER_BOOT'")) {
        throw new Error('initial transition ENTER_BOOT missing');
      }
      if (!mode.includes("appendTransition('ENTER_PREHEAT_CHAT'")) {
        throw new Error('ENTER_PREHEAT_CHAT transition is not emitted');
      }
    }
  }
];

for (const check of checks) {
  check.run();
}

if (!mode.includes('let state: any = createSandboxV2InitialState();')) {
  throw new Error('sandbox_story root runtime is not mounted from v2 initial state');
}

if (!app.includes('ssot: sandboxState.ssot')) {
  throw new Error('debug hydration is not mapped from real sandbox root state (ssot)');
}

if (!app.includes('flow: {\n          step: sandboxState.flow.step')) {
  throw new Error('debug hydration is not mapped from real sandbox flow state');
}

if (!app.includes('version: sandboxState.ssot?.version || sandboxSsotVersion')) {
  throw new Error('sandbox.ssot.version guard missing');
}

if (!app.includes('step: sandboxState.flow.step') || !app.includes('phase: sandboxState.scheduler.phase')) {
  throw new Error('flow.step/scheduler.phase should not rely on legacy fallback after mode entry');
}

if (!app.includes("setFlowStep('VIP_TAG_PLAYER'")) { throw new Error('VIP_TAG_PLAYER transition missing'); }
if (!app.includes("'WAIT_WARMUP_REPLY'")) { throw new Error('WAIT_WARMUP_REPLY step missing'); }
if (!app.includes("gateType = waitStep === 'WAIT_WARMUP_REPLY' ? 'warmup_tag'")) { throw new Error('WAIT_WARMUP_REPLY must arm warmup_tag replyGate'); }
if (!app.includes("if (sandboxState.flow.step === 'WAIT_WARMUP_REPLY')")) { throw new Error('WAIT_WARMUP_REPLY gate repair guard missing'); }
if (!app.includes("needsWarmupGateRepair")) { throw new Error('WAIT_WARMUP_REPLY replyGate invariant repair missing'); }
if (!app.includes("if (sandboxState.flow.step === 'WAIT_REPLY_1')")) { throw new Error('WAIT_REPLY_1 consonant gate repair guard missing'); }
if (!app.includes("needsConsonantGateRepair")) { throw new Error('WAIT_REPLY_1 consonant replyGate invariant repair missing'); }
if (!app.includes("if (!gate?.gateType || gate.gateType === 'none')")) { throw new Error('WAIT_REPLY_1 must not allow gateType=none'); }
if (!app.includes('wait_reply_1_missing_source_message_id')) { throw new Error('WAIT_REPLY_1 must guard non-empty sourceMessageId'); }
if (!app.includes("if (isSandboxWaitReplyStep(sandboxState.flow.step))")) { throw new Error('wait-reply step should not fallback to free chat'); }
if (!app.includes("setFlowStep('POST_REPLY_CHAT'")) { throw new Error('POST_REPLY_CHAT transition missing'); }
if (!app.includes("setFlowStep('ANSWER_EVAL'")) { throw new Error('ANSWER_EVAL transition missing'); }
if (!app.includes("setFlowStep('REVEAL_WORD'")) { throw new Error('REVEAL_WORD transition missing'); }
if (!app.includes("setFlowStep('POST_REVEAL_CHAT'")) { throw new Error('POST_REVEAL_CHAT transition missing'); }
if (!app.includes("postRevealChatState: 'started'")) { throw new Error('POST_REVEAL_CHAT should write started boundary'); }
if (!app.includes("postRevealChatState: 'done'")) { throw new Error('POST_REVEAL_CHAT should write done boundary before advance'); }
if (!app.includes("const gate = (!derivedGate.replyGateType && waitReplyStep)")) {
  throw new Error('player input eval must not keep lastReplyEval.gateType as none during wait-reply');
}
if (!adapter.includes('normalizeInput(raw)') || !adapter.includes('parseThaiConsonant(normalized, input)') || !adapter.includes('judgeConsonantAnswer(parsed, input)')) {
  throw new Error('sandbox consonant flow must use classic normalize/parse/judge pipeline');
}
if (!sharedEngine.includes('export function parseConsonantAnswer') || !sharedEngine.includes("type: 'wrong_answer'") || !sharedEngine.includes("type: 'wrong_format'") || !sharedEngine.includes("type: 'correct'")) {
  throw new Error('shared consonant engine parse/judge contract is missing');
}
if (sharedQuestionBank.includes('wordKey') || sharedQuestionBank.includes('thaiWord') || sharedQuestionBank.includes('translationZh') || sharedQuestionBank.includes('story')) {
  throw new Error('shared question bank must not contain sandbox word/story metadata');
}
if (!sandboxWordMap.includes('SANDBOX_CONSONANT_WORD_MAP') || !sandboxWordMap.includes('wordKey') || !sandboxWordMap.includes('questionId')) {
  throw new Error('sandbox word mapping must stay in sandbox scope with questionId->wordKey mapping');
}
if (!app.includes("pipeline.result !== 'correct'")) {
  throw new Error('sandbox submit path must consume shared wrong_answer/wrong_format from shared judge result');
}
if (!app.includes('waitReply1SourceMessageBound:')) {
  throw new Error('debug must expose WAIT_REPLY_1 sourceMessageId binding invariant');
}
if (!mode.includes('consonantJudgeAudit')) {
  throw new Error('sandbox mode must own authoritative consonantJudgeAudit state');
}
if (!app.includes('setConsonantJudgeAudit?.({')) {
  throw new Error('consumePlayerReply must write authoritative judge audit state');
}
if (!app.includes('displayAcceptedAnswers') || !app.includes('runtimeAcceptedCandidates')) {
  throw new Error('debug must separate display metadata from runtime accepted candidates');
}
if (!app.includes('scheduler.phase (non-authoritative)')) {
  throw new Error('debug must mark scheduler.phase as non-authoritative');
}
if (!app.includes("nextQuestionBlockedReason: 'reply_gate_still_armed'")) {
  throw new Error('ADVANCE_NEXT should have single-path guard against armed replyGate');
}
console.log('sandbox v2 regression guards passed');


if (!mode.includes("audit: { transitions: [{ from: 'INIT', to: 'PREHEAT_CHAT'")) {
  throw new Error('audit.transitions bootstrap record missing in initial state');
}

if (!mode.includes("appendAuditTransition(prevStep, 'PREHEAT_CHAT'")) {
  throw new Error('audit.transitions missing PREHEAT_CHAT bootstrap transition');
}

if (!app.includes("!guardState.flow.step || !Number.isFinite(guardState.flow.questionIndex) || !guardState.scheduler.phase")) {
  throw new Error('guard recovery missing flow/scheduler bootstrap checks');
}

if (!app.includes("ensureBootstrapState?.('clearReplyUi_reinit'")) {
  throw new Error('clearReplyUi re-init guard missing');
}

if (!app.includes('visible: Boolean(sandboxState.flow.step && sandboxState.scheduler.phase && sandboxState.introGate.startedAt > 0)')) {
  throw new Error('consonant bubble should not appear before core bootstrap state is ready');
}
