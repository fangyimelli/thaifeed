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
if (!app.includes('const expectedGateType = waitReplyStep') || !app.includes('const gate = waitReplyStep')) {
  throw new Error('player input eval must derive gate from authoritative wait-reply flow step');
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
if (!app.includes("nextQuestionBlockedReason: 'advance_next_blocked:reply_gate_still_armed'")) {
  throw new Error('ADVANCE_NEXT should have single-path guard against armed replyGate');
}

if (!adapter.includes('result: JudgeResult')) {
  throw new Error('classic adapter judge audit must expose authoritative judge.result');
}
if (!app.includes('judgeResult: pipeline.audit.judge.result')) {
  throw new Error('consumePlayerReply must persist judge.result from authoritative pipeline audit');
}
if (!app.includes("nextQuestionConsumer: 'advance_next_effect'")) {
  throw new Error('ADVANCE_NEXT must have a single explicit consumer tag for next-question emission');
}
if (!app.includes('nextQuestionFromQuestionId') || !app.includes('nextQuestionToQuestionId') || !app.includes('nextQuestionDecidedAt') || !app.includes('nextQuestionEmittedAt')) {
  throw new Error('nextQuestion audit observability fields are incomplete');
}
if (!app.includes('sandboxPreheatDedupRef') || !app.includes('emittedFingerprints')) {
  throw new Error('preheat duplicate injection dedupe state missing');
}


if (!app.includes('const hasPostRevealCompletionEvidence = (state: any) => {')) {
  throw new Error('advance_next_effect must derive post-reveal completion from shared SSOT helper');
}
if (!app.includes("item?.to === 'ADVANCE_NEXT' && item?.reason === 'post_reveal_chat_done'")) {
  throw new Error('post-reveal completion helper must honor audit transition reason post_reveal_chat_done');
}
if (!app.includes('(state.sandboxFlow?.backlogTechMessages?.length ?? 0) === 0')) {
  throw new Error('post-reveal completion helper must include backlogTechMessages cleared condition');
}
if (!app.includes("nextFlowStep = beforeAdvance === 0 ? 'TAG_PLAYER_2_PRONOUNCE' : (beforeAdvance === 1 ? 'TAG_PLAYER_3_MEANING' : afterState.flow.step)")) {
  throw new Error('ADVANCE_NEXT must route to authoritative next tag step after emit');
}
if (!app.includes('sandboxModeRef.current.setCurrentPrompt({')) {
  throw new Error('ADVANCE_NEXT must switch currentPrompt to emitted next question prompt');
}
if (!app.includes('secondQuestionAuthoritative')) {
  throw new Error('Full Night Test must derive second-question success from authoritative flow state');
}
if (!app.includes("st.prompt.current?.wordKey === secondQuestionId")) {
  throw new Error('Full Night Test second question check must validate current prompt wordKey against emitted toQuestionId');
}
if (!app.includes('flowAdvanced') || !app.includes("st.flow.step === 'WAIT_REPLY_2'")) {
  throw new Error('Full Night Test second question check must include flow.step >= WAIT_REPLY_2 authoritative condition');
}
if (!app.includes("st.replyGate?.gateType === 'consonant_answer' && Boolean(st.replyGate?.armed)")) {
  throw new Error('Full Night Test second question check must include replyGate authoritative condition');
}
if (!app.includes('render.blockedReason')) {
  throw new Error('debug panel must expose renderBlockedReason for state/render mismatch diagnosis');
}
if (!app.includes('authoritative_flow_override')) {
  throw new Error('render observer sync must allow authoritative flow override when q2 advanced');
}
if (!app.includes('render.stateQuestionId/renderedQuestionId')) {
  throw new Error('debug panel must expose stateQuestionId and renderedQuestionId');
}
if (!app.includes('authoritative.secondQuestionAuthoritative')) {
  throw new Error('second question shown predicate must rely on authoritative secondQuestionAuthoritative');
}
if (!app.includes('REQUEST_VIDEO_SWITCH') || !app.includes('resolveSandboxSceneKeyByQuestionIndex')) {
  throw new Error('next question emit must trigger authoritative scene/video switch by questionIndex');
}
if (!mode.includes('renderSync: { stateQuestionId:')) {
  throw new Error('sandbox mode must own authoritative renderSync state');
}
if (!mode.includes('commitRenderSync: (payload:')) {
  throw new Error('sandbox mode must expose renderSync commit API');
}
if (!mode.includes('commitPromptPinnedRendered: (messageId: string) =>')) {
  throw new Error('sandbox mode must persist prompt pinned render commit instead of noop');
}
if (!app.includes('rawInput: pipeline.audit.parse.raw') || !app.includes('consumedAt: consumeAt')) {
  throw new Error('normal answer judge audit persistence must include rawInput and consumedAt');
}
if (!app.includes("rawInput: '[debug-force-correct]'") || !app.includes("resultReason: 'debug_override_forced_correct'")) {
  throw new Error('Force Correct Now must persist full authoritative judge audit payload');
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


if (!app.includes('<strong>Flow Test</strong>') || !app.includes('<strong>Force Debug</strong>')) {
  throw new Error('sandbox debug panel must separate Flow Test and Force Debug sections');
}
if (!app.includes('Run Night Smoke Test') || !app.includes('Pass Flow') || !app.includes('Force Correct Now') || !app.includes('Force Next Question') || !app.includes('Force Ghost Event')) {
  throw new Error('sandbox debug panel retained buttons are incomplete');
}
if (app.includes('Run Sandbox Flow Test') || app.includes('Trigger Random Ghost</button>') || app.includes('Force Correct</button>')) {
  throw new Error('sandbox debug panel still contains legacy button labels');
}
if (!app.includes("recordSandboxDebugAction('run_night_smoke_test'")) {
  throw new Error('Run Night Smoke Test must write debug action audit');
}
if (!app.includes("ensureBootstrapState?.('run_night_smoke_test_reset'") || !app.includes("setFlowStep('VIP_TAG_PLAYER', 'run_night_smoke_test_start_clean'")) {
  throw new Error('Run Night Smoke Test must bootstrap from a clean start');
}
if (!app.includes("recordSandboxDebugAction('force_next_question'")) {
  throw new Error('Force Next Question must write debug action audit');
}
if (!app.includes("forceAdvanceNode()") || !app.includes("nextQuestionConsumer: 'force_next_question_debug'")) {
  throw new Error('Force Next Question must use authoritative force-advance + nextQuestion audit');
}
if (!app.includes("recordSandboxDebugAction('force_correct_now'")) {
  throw new Error('Force Correct Now must write debug action audit');
}
if (!app.includes("blockedReason: 'missing_current_prompt'") || !app.includes("blockedReason: 'prompt_not_force_correct_capable'")) {
  throw new Error('Force Correct Now must expose clear blocked reasons');
}
if (!app.includes("recordSandboxDebugAction('force_ghost_event'")) {
  throw new Error('Force Ghost Event must write debug action audit');
}

if (!app.includes('const readFullNightAuthoritativeState = () =>')) {
  throw new Error('Run Full Night Test must resolve second-question result from authoritative nextQuestion state');
}
if (!app.includes("if (failedStep === 'second_question' && authoritative.emitted)")) {
  throw new Error('Run Full Night Test must not fail second_question after authoritative emit');
}
if (!app.includes("secondQuestionShown: authoritative.secondQuestionAuthoritative")) {
  throw new Error('Run Full Night Test failed result must expose authoritative secondQuestionShown state');
}
if (!app.includes("await waitFor(() => readFullNightAuthoritativeState().emitted")) {
  throw new Error('Run Full Night Test must re-converge on authoritative emit before failing second_question');
}

if (!app.includes("const answerConsumed = await waitFor(() =>")) {
  throw new Error('Run Full Night Test auto answer must wait for authoritative consume path');
}
if (!app.includes("(authoritative.flowStep !== 'WAIT_REPLY_1' || authoritative.gateConsumed || authoritative.consumedAt > 0)")) {
  throw new Error('Run Full Night Test auto answer must not stay at WAIT_REPLY_1 after submission');
}
if (!app.includes('st.lastReplyEval?.messageId === answerMessageId')) {
  throw new Error('Run Full Night Test auto answer must validate consumed messageId through authoritative lastReplyEval');
}
if (!app.includes("const judgeTriggered = await waitFor(() =>")) {
  throw new Error('Run Full Night Test auto answer must wait for authoritative parse/judge trigger');
}
if (!app.includes("authoritative.parseKind !== 'not_evaluated' && authoritative.parseRaw.length > 0")) {
  throw new Error('Run Full Night Test must enforce parse.kind/raw completion after auto answer');
}
if (!app.includes('if (judgeSnapshot.parseRaw !== answer)')) {
  throw new Error('Run Full Night Test must verify authoritative parse.raw equals the auto answer content');
}
if (!app.includes("'message_injected_but_not_consumed'") || !app.includes("'message_rejected_by_gate'") || !app.includes('parse_failed:${') || !app.includes("'judge_failed'")) {
  throw new Error('Run Full Night Test failure reasons must distinguish inject/gate/parse/judge authoritative states');
}
if (!app.includes("if (authoritative.flowStep === 'WAIT_REPLY_1')")) {
  throw new Error('Run Full Night Test must map reveal timeout failure to authoritative WAIT_REPLY_1 state');
}

if (!app.includes('const expectedGateType = waitReplyStep')) {
  throw new Error('consumePlayerReply must derive expected gate type from authoritative flow step');
}
if (!app.includes('replyGateType: expectedGateType')) {
  throw new Error('consumePlayerReply must override stale gateType during wait-reply steps');
}
if (!app.includes('const consumePlayerReply = useCallback((payload: { raw: string; messageId?: string; sourceType?: string; playerId?: string; targetPlayerId?: string; sourceMessageId?: string }) =>')) {
  throw new Error('consumePlayerReply must accept authoritative submission metadata payload');
}
if (!app.includes('messageId: playerMessage.id') || !app.includes('sourceType: source') || !app.includes('sourceMessageId: lockStateRef.current.replyingToMessageId || qnaStateRef.current.active.questionMessageId || undefined')) {
  throw new Error('real player submit path must pass authoritative message metadata to consumePlayerReply');
}
if (!app.includes("sourceType: 'sandbox_autoplay_mock_reply'") || !app.includes('targetPlayerId: sandboxState.replyGate?.targetPlayerId || undefined')) {
  throw new Error('auto-answer submission path must pass authoritative metadata to consumePlayerReply');
}
if (!app.includes('messageId: payload.messageId || `player:${now}`')) {
  throw new Error('lastReplyEval must preserve authoritative messageId when available');
}
if (!app.includes("expectedConsonant: pipeline.audit.judge.expectedConsonant") || !app.includes("acceptedCandidates: pipeline.audit.judge.acceptedCandidates") || !app.includes("compareMode: pipeline.audit.judge.compareMode") || !app.includes("resultReason: pipeline.audit.judge.resultReason") || !app.includes("sourcePromptId: currentPrompt.promptId") || !app.includes("sourceQuestionId: node?.id ?? currentPrompt.wordKey") || !app.includes("sourceWordKey: currentPrompt.wordKey") || !app.includes("consumedAt: consumeAt")) {
  throw new Error('consumePlayerReply must persist full authoritative judge audit fields for normal/auto answers');
}
if (!app.includes("rawInput: '[debug-force-correct]'") || !app.includes("compareMode: 'debug_override_exact'") || !app.includes("resultReason: 'debug_override_forced_correct'") || !app.includes("consumedAt: now")) {
  throw new Error('Force Correct Now must persist complete authoritative judge audit fields');
}


if (!app.includes("run_night_smoke_test")) {
  throw new Error('debug action audit key must use run_night_smoke_test');
}
if (!app.includes('Run Night Smoke Test')) {
  throw new Error('flow test button label must be Run Night Smoke Test');
}
if (!app.includes('<div><strong>Night Smoke Test</strong></div>')) {
  throw new Error('flow test panel title must be Night Smoke Test');
}
if (app.includes('Run Full Night Test')) {
  throw new Error('legacy Run Full Night Test label should not remain in app debug panel');
}
if (!app.includes("renderBlockedReason: 'force_next_prompt_activated'") || !app.includes("commitSource: 'force_next_question_debug'")) {
  throw new Error('Force Next Question must commit prompt-visible renderSync state');
}
if (!app.includes("blockedReason: 'missing_next_node'")) {
  throw new Error('Force Next Question must block when next node is missing instead of emitting invalid state');
}
if (!mode.includes("commitSource: 'forceAdvanceNode_reset'")) {
  throw new Error('forceAdvanceNode must reset stale prompt/render state before next prompt activation');
}
if (!app.includes('const gateAuthoritativeReady = Boolean(sandboxState.replyGate?.armed && sandboxState.replyGate?.canReply && sandboxState.replyGate?.gateType === \'consonant_answer\');')) {
  throw new Error('renderSync must expose authoritative gate readiness for scene desync recovery');
}
if (!app.includes('const forceVisiblePrompt = promptVisuallyReady && (isAnswerablePromptStep || authoritativeQ2Advanced || gateAuthoritativeReady);')) {
  throw new Error('renderSync must enforce visible prompt on authoritative answerable question transitions and gate-ready recovery');
}
if (!app.includes("scene_not_synced_warning")) {
  throw new Error('renderSync scene_not_synced should be warning when authoritative prompt is already visible');
}


if (!app.includes('const SANDBOX_REVEAL_VISIBLE_MIN_MS = 2500;')) {
  throw new Error('reveal duration guard missing minimum visible duration constant');
}
if (!app.includes("if (sandboxState.flow.step === 'REVEAL_WORD') {") || !app.includes('const revealDoneReady = sandboxState.reveal.phase === \'done\'')) {
  throw new Error('REVEAL_WORD must derive revealDoneReady from authoritative reveal state');
}
if (!app.includes("setFlowStep('POST_REVEAL_CHAT', 'reveal_word_done')")) {
  throw new Error('reveal_word_done transition missing');
}
if (!app.includes("word.reveal.rendered") || !app.includes("word.reveal.blockedReason") || !app.includes("word.reveal.startedAt") || !app.includes("word.reveal.finishedAt")) {
  throw new Error('debug observability for reveal.rendered/blockedReason/startedAt/finishedAt is incomplete');
}
if (!mode.includes("rendered: false") || !mode.includes("startedAt: 0") || !mode.includes("finishedAt: 0") || !mode.includes("blockedReason: ''")) {
  throw new Error('sandbox reveal state schema must include rendered/start/finish/blockedReason fields');
}


if (!app.includes("commitSource: 'wait_reply_1_gate_armed'") || !app.includes("renderedQuestionId: currentPrompt.wordKey")) {
  throw new Error('normal WAIT_REPLY_1 activation must commit authoritative prompt visibility sync');
}
if (!app.includes("'authoritative_reply_gate_sync'") || !app.includes("'reveal_prompt_cleanup'")) {
  throw new Error('debug ui.promptGlyph visibility source must expose authoritative and reveal-cleanup paths');
}
if (!app.includes("rendered: Boolean(revealText)") || !app.includes("revealHasObservableTiming") || !app.includes("reveal_word_done_timing_repaired") || !app.includes("sandboxState.reveal.blockedReason === 'hidden'") || !app.includes("ensureRevealActivatedForNormalFlow()")) {
  throw new Error('REVEAL_WORD must keep visible/rendered/timing observability and self-repair hidden/non-rendered reveal state');
}
if (!app.includes("startedAt: nextStartedAt")) {
  throw new Error('reveal render-state callback must backfill startedAt when rendered evidence arrives');
}
if (!mode.includes('forceRevealDone: () => { const now = Date.now(); const finishedAt = state.reveal.finishedAt > 0 ? state.reveal.finishedAt : Math.max(now, state.reveal.startedAt || now);')) {
  throw new Error('forceRevealDone must preserve authoritative reveal timing before cleanup');
}
if (!mode.includes('forceRevealCurrent: () => { const prompt = state.prompt.current; if (!prompt) return null;') || !mode.includes('startedAt: now, finishedAt: 0, doneAt: 0, cleanupAt: 0')) {
  throw new Error('forceRevealCurrent must reset reveal timing and cleanup fields from authoritative payload');
}


if (!app.includes("const revealPromptSuppressed = sandboxState.reveal.phase === 'word' || sandboxState.reveal.phase === 'done'")) {
  throw new Error('prompt glyph cleanup must suppress bubble during/after reveal completion');
}
if (!app.includes("source: revealPromptSuppressed") || !app.includes("'reveal_prompt_cleanup'")) {
  throw new Error('prompt glyph debug source must expose reveal_prompt_cleanup path');
}
if (!mode.includes('cleanupAt: 0')) {
  throw new Error('reveal lifecycle must track cleanupAt in sandbox mode state');
}
if (!mode.includes('finishedAt = state.reveal.finishedAt > 0 ? state.reveal.finishedAt : Math.max(doneAt, state.reveal.startedAt || doneAt)')) {
  throw new Error('markRevealDone must preserve authoritative finishedAt timing');
}
if (!app.includes("reason: 'submit_accepted', messageId: playerMessage.id")) {
  throw new Error('submit success eval must retain authoritative player messageId');
}

if (!app.includes("nextQuestionBlockedReasonSource") || !app.includes("nextQuestionStage")) {
  throw new Error('nextQuestion blocked reason debug source/stage fields are missing');
}
if (!app.includes("reveal.guardReady") || !app.includes("reveal.hasObservableTiming") || !app.includes("postReveal.guardReady") || !app.includes("advanceNext.guardReady")) {
  throw new Error('debug panel must expose reveal/post_reveal/advance guard readiness fields');
}
if (!app.includes("nextQuestion.blockedReason.source") || !app.includes("nextQuestion.stage")) {
  throw new Error('debug panel must expose nextQuestion blocked reason source and stage');
}
if (!app.includes("post_reveal_blocked:pending_post_reveal_chat") || !app.includes("advance_next_blocked:pending_emit") || !app.includes("reveal_guard_blocked:")) {
  throw new Error('stage-scoped nextQuestion blocked reason prefixes are missing');
}
if (!app.includes("renderBlockedReason === 'scene_not_synced' ? 'scene_not_synced_warning' : renderBlockedReason")) {
  throw new Error('scene_not_synced must be downgraded to warning and not block second-question emit');
}
if (!app.includes("setFlowStep('POST_REVEAL_CHAT', 'reveal_word_done_timing_repaired')")) {
  throw new Error('REVEAL_WORD missing timing fallback transition to POST_REVEAL_CHAT');
}
if (!app.includes("setReveal?.({ startedAt: repairedStartedAt, finishedAt: repairedFinishedAt")) {
  throw new Error('REVEAL_WORD must repair missing observability timing before advancing');
}
if (!app.includes("if (sandboxState.flow.step === 'POST_REVEAL_CHAT') {") || !app.includes("setFlowStep('ADVANCE_NEXT', 'post_reveal_chat_done')")) {
  throw new Error('POST_REVEAL_CHAT must stably advance to ADVANCE_NEXT');
}
if (!app.includes("setRunning({ lastPassedStep: 'first_question', fromQuestionId: firstPrompt.wordKey, currentStep: 'auto_answer_q1' })") || !app.includes("setRunning({ lastPassedStep: 'reveal_post_reveal', currentStep: 'second_question' })")) {
  throw new Error('Night Smoke Test must cover first_question -> second_question_shown path');
}
