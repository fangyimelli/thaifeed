export const SANDBOX_WORD_RIOT_BURST_COUNT = 6;
export const SANDBOX_REVEAL_VISIBLE_MIN_MS = 2500;
export const SANDBOX_REVEAL_TO_POST_REVEAL_MAX_STALL_MS = 1800;
export const SANDBOX_POST_REVEAL_AUTO_COMPLETE_MS = 900;
export const SANDBOX_POSSESSION_AUTOSEND_MIN_MS = 300;
export const SANDBOX_POSSESSION_AUTOSEND_MAX_MS = 700;

export type RevealTransitionSnapshot = {
  snapshotId: string;
  sourceQuestionId: string;
  sourceWordKey: string;
  guardReady: boolean;
  completionReady: boolean;
  transitionEligible: boolean;
  transitionBlockedBy: string;
  hasObservableTiming: boolean;
};

export type PostRevealRuntimeStatus = {
  guardReady: boolean;
  startEligible: boolean;
  startBlockedBy: string;
  completionEligible: boolean;
  completionBlockedBy: string;
};

export const resolveSandboxWaitReplyConsumedReason = (waitReplyIndex: number): string => {
  if (waitReplyIndex === 1) return 'player_reply_1_consumed';
  if (waitReplyIndex === 2) return 'player_reply_2_consumed';
  if (waitReplyIndex === 3) return 'player_reply_3_consumed';
  return `player_reply_${waitReplyIndex}_consumed`;
};

export const parseSandboxTagStepIndex = (step: string | undefined): number | null => {
  if (!step) return null;
  if (step === 'TAG_PLAYER_1') return 1;
  const match = /^TAG_PLAYER_(\d+)$/.exec(step);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const resolveSandboxTagStepByQuestionNumber = (questionNumber: number): string => {
  if (questionNumber <= 1) return 'TAG_PLAYER_1';
  return `TAG_PLAYER_${questionNumber}`;
};

export const buildRevealTransitionSnapshot = (sandboxState: any): RevealTransitionSnapshot => {
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

export const derivePostRevealRuntimeStatus = (sandboxState: any): PostRevealRuntimeStatus => {
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
      ? 'guard_not_ready'
      : (startedAt <= 0
        ? 'not_started'
        : (postRevealState !== 'started'
          ? 'state_not_started'
          : (hasReplyGate
            ? 'reply_gate_armed'
            : (elapsedFromStart < SANDBOX_POST_REVEAL_AUTO_COMPLETE_MS ? 'min_duration_not_met' : 'unknown')))));
  return {
    guardReady,
    startEligible,
    startBlockedBy,
    completionEligible,
    completionBlockedBy
  };
};
