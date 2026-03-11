export type SandboxWaitReplyStep = 'WAIT_WARMUP_REPLY' | `WAIT_REPLY_${number}`;

export const parseSandboxWaitReplyIndex = (step: string | undefined): number | null => {
  if (!step) return null;
  if (step === 'WAIT_WARMUP_REPLY') return 0;
  const match = /^WAIT_REPLY_(\d+)$/.exec(step);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const isSandboxWaitReplyStep = (step: string | undefined): step is SandboxWaitReplyStep => {
  return parseSandboxWaitReplyIndex(step) !== null;
};

export const resolveSandboxWaitReplyStepByQuestionNumber = (questionNumber: number): SandboxWaitReplyStep => {
  if (questionNumber <= 0) return 'WAIT_WARMUP_REPLY';
  return `WAIT_REPLY_${questionNumber}`;
};
