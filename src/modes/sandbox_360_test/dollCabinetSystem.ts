export type Sandbox360Shot = 'left' | 'center' | 'right';
export type DollVariant = 'neutral' | 'glance_to_player' | 'stare_player' | 'hard_stare';
export type DollCabinetStage = 0 | 1 | 2 | 3 | 4;
export type DollTriggerReason =
  | 'init'
  | 'right_stay'
  | 'right_revisit'
  | 'return_after_tv'
  | 'return_after_flash'
  | 'return_after_door'
  | 'return_after_story_tag'
  | 'cooldown'
  | 'blocked';

export type DollCabinetStageEffectSource = {
  overlaySource: string;
  audioSource: string;
  variantSource: string;
};

export type DollCabinetTarget = {
  id: string;
  cabinetSlot: 'top_left' | 'top_center' | 'top_right' | 'bottom_left' | 'bottom_center' | 'bottom_right';
  allowedVariants: DollVariant[];
  escalationOrder: DollVariant[];
  scarePriority: number;
};

export type DollCabinetState = {
  dollCabinetStage: DollCabinetStage;
  dollCabinetThreatLevel: number;
  dollCabinetFocusDuration: number;
  dollCabinetLookAtPlayerLevel: number;
  dollCabinetActiveVariantMap: Record<string, DollVariant>;
  dollCabinetActiveScare: boolean;
  dollCabinetCooldown: { active: boolean; until: number; remainingMs: number };
  dollCabinetLastTriggerReason: DollTriggerReason;
  dollCabinetCanEscalate: boolean;
  dollCabinetBlockReason: string;
  activeLookTargets: string[];
  pendingReturnTrigger: 'tv' | 'flash' | 'door' | 'story_tag' | null;
  rightRevisitCount: number;
  stageEnteredAt: number;
  scareStartedAt: number;
  stageEffectSource: DollCabinetStageEffectSource;
};

export const DOLL_CABINET_TARGETS: DollCabinetTarget[] = [
  { id: 'doll_01', cabinetSlot: 'top_left', allowedVariants: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], escalationOrder: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], scarePriority: 2 },
  { id: 'doll_02', cabinetSlot: 'top_center', allowedVariants: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], escalationOrder: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], scarePriority: 6 },
  { id: 'doll_03', cabinetSlot: 'top_right', allowedVariants: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], escalationOrder: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], scarePriority: 3 },
  { id: 'doll_04', cabinetSlot: 'bottom_left', allowedVariants: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], escalationOrder: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], scarePriority: 5 },
  { id: 'doll_05', cabinetSlot: 'bottom_center', allowedVariants: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], escalationOrder: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], scarePriority: 1 },
  { id: 'doll_06', cabinetSlot: 'bottom_right', allowedVariants: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], escalationOrder: ['neutral', 'glance_to_player', 'stare_player', 'hard_stare'], scarePriority: 4 }
];

const STAGE_EFFECT_SOURCE: Record<DollCabinetStage, DollCabinetStageEffectSource> = {
  0: { overlaySource: 'doll_stage0_neutral_shadow', audioSource: 'doll_wood_idle', variantSource: 'stage0_neutral' },
  1: { overlaySource: 'doll_stage1_darken_cabinet', audioSource: 'doll_glass_resonance_light', variantSource: 'stage1_single_glance' },
  2: { overlaySource: 'doll_stage2_local_light_pulse', audioSource: 'doll_wood_creak_mid', variantSource: 'stage2_multi_stare' },
  3: { overlaySource: 'doll_stage3_breathing_pressure', audioSource: 'doll_breathing_loop_near', variantSource: 'stage3_majority_stare' },
  4: { overlaySource: 'doll_stage4_hard_stare_burst', audioSource: 'doll_sting_hard_stare', variantSource: 'stage4_sync_hard_stare' }
};

const LOOK_LEVEL_BY_STAGE: Record<DollCabinetStage, number> = { 0: 0, 1: 0.28, 2: 0.56, 3: 0.84, 4: 1 };
const THREAT_BY_STAGE: Record<DollCabinetStage, number> = { 0: 0, 1: 25, 2: 55, 3: 80, 4: 100 };

const targetsByPriority = [...DOLL_CABINET_TARGETS].sort((a, b) => a.scarePriority - b.scarePriority);

export const createInitialDollCabinetState = (): DollCabinetState => ({
  dollCabinetStage: 0,
  dollCabinetThreatLevel: 0,
  dollCabinetFocusDuration: 0,
  dollCabinetLookAtPlayerLevel: 0,
  dollCabinetActiveVariantMap: Object.fromEntries(DOLL_CABINET_TARGETS.map((target) => [target.id, 'neutral'])),
  dollCabinetActiveScare: false,
  dollCabinetCooldown: { active: false, until: 0, remainingMs: 0 },
  dollCabinetLastTriggerReason: 'init',
  dollCabinetCanEscalate: true,
  dollCabinetBlockReason: '-',
  activeLookTargets: [],
  pendingReturnTrigger: null,
  rightRevisitCount: 0,
  stageEnteredAt: 0,
  scareStartedAt: 0,
  stageEffectSource: STAGE_EFFECT_SOURCE[0]
});

const applyStageVariants = (stage: DollCabinetStage) => {
  const variantMap: Record<string, DollVariant> = Object.fromEntries(DOLL_CABINET_TARGETS.map((target) => [target.id, 'neutral']));
  if (stage === 0) return { variantMap, activeLookTargets: [] as string[] };
  if (stage === 1) {
    const id = targetsByPriority[0]?.id;
    if (id) variantMap[id] = 'glance_to_player';
    return { variantMap, activeLookTargets: id ? [id] : [] };
  }
  if (stage === 2) {
    const lookTargets = targetsByPriority.slice(0, 3).map((target) => target.id);
    lookTargets.forEach((id, index) => {
      variantMap[id] = index === 0 ? 'glance_to_player' : 'stare_player';
    });
    return { variantMap, activeLookTargets: lookTargets };
  }
  if (stage === 3) {
    const lookTargets = targetsByPriority.slice(0, 5).map((target) => target.id);
    lookTargets.forEach((id) => {
      variantMap[id] = 'stare_player';
    });
    return { variantMap, activeLookTargets: lookTargets };
  }
  const lookTargets = targetsByPriority.map((target) => target.id);
  lookTargets.forEach((id) => {
    variantMap[id] = 'hard_stare';
  });
  return { variantMap, activeLookTargets: lookTargets };
};

const mapReason = (source: 'right_stay' | 'right_revisit' | 'tv' | 'flash' | 'door' | 'story_tag'): DollTriggerReason => {
  if (source === 'tv') return 'return_after_tv';
  if (source === 'flash') return 'return_after_flash';
  if (source === 'door') return 'return_after_door';
  if (source === 'story_tag') return 'return_after_story_tag';
  return source;
};

export const reduceDollCabinetForEscalation = (
  prev: DollCabinetState,
  input: { now: number; source: 'right_stay' | 'right_revisit' | 'tv' | 'flash' | 'door' | 'story_tag'; focusDurationMs: number }
): DollCabinetState => {
  const cooldownActive = prev.dollCabinetCooldown.until > input.now;
  if (cooldownActive) {
    return {
      ...prev,
      dollCabinetLastTriggerReason: 'cooldown',
      dollCabinetCanEscalate: false,
      dollCabinetBlockReason: 'cooldown_active',
      dollCabinetCooldown: {
        active: true,
        until: prev.dollCabinetCooldown.until,
        remainingMs: Math.max(0, prev.dollCabinetCooldown.until - input.now)
      }
    };
  }

  const stageStep = input.source === 'right_stay' ? 1 : input.source === 'right_revisit' ? 1 : 2;
  const nextStage = Math.min(4, prev.dollCabinetStage + stageStep) as DollCabinetStage;
  const { variantMap, activeLookTargets } = applyStageVariants(nextStage);
  const scare = nextStage === 4;
  const cooldownUntil = scare ? input.now + 12_000 : 0;

  return {
    ...prev,
    dollCabinetStage: nextStage,
    dollCabinetThreatLevel: THREAT_BY_STAGE[nextStage],
    dollCabinetFocusDuration: input.focusDurationMs,
    dollCabinetLookAtPlayerLevel: LOOK_LEVEL_BY_STAGE[nextStage],
    dollCabinetActiveVariantMap: variantMap,
    dollCabinetActiveScare: scare,
    dollCabinetCooldown: {
      active: scare,
      until: cooldownUntil,
      remainingMs: Math.max(0, cooldownUntil - input.now)
    },
    dollCabinetLastTriggerReason: mapReason(input.source),
    dollCabinetCanEscalate: !scare,
    dollCabinetBlockReason: scare ? 'scare_triggered_then_cooldown' : '-',
    activeLookTargets,
    pendingReturnTrigger: null,
    stageEnteredAt: input.now,
    scareStartedAt: scare ? input.now : prev.scareStartedAt,
    stageEffectSource: STAGE_EFFECT_SOURCE[nextStage]
  };
};

export const settleDollCabinet = (prev: DollCabinetState, now: number): DollCabinetState => {
  const cooldownRemainingMs = Math.max(0, prev.dollCabinetCooldown.until - now);
  if (prev.dollCabinetActiveScare && now - prev.scareStartedAt > 800) {
    const stage = 3 as DollCabinetStage;
    const { variantMap, activeLookTargets } = applyStageVariants(stage);
    return {
      ...prev,
      dollCabinetStage: stage,
      dollCabinetThreatLevel: THREAT_BY_STAGE[stage],
      dollCabinetLookAtPlayerLevel: LOOK_LEVEL_BY_STAGE[stage],
      dollCabinetActiveScare: false,
      dollCabinetActiveVariantMap: variantMap,
      activeLookTargets,
      dollCabinetCooldown: {
        active: cooldownRemainingMs > 0,
        until: prev.dollCabinetCooldown.until,
        remainingMs: cooldownRemainingMs
      },
      dollCabinetCanEscalate: cooldownRemainingMs === 0,
      dollCabinetBlockReason: cooldownRemainingMs > 0 ? 'cooldown_active' : '-',
      stageEffectSource: STAGE_EFFECT_SOURCE[stage]
    };
  }

  return {
    ...prev,
    dollCabinetCooldown: {
      active: cooldownRemainingMs > 0,
      until: prev.dollCabinetCooldown.until,
      remainingMs: cooldownRemainingMs
    },
    dollCabinetCanEscalate: cooldownRemainingMs === 0,
    dollCabinetBlockReason: cooldownRemainingMs > 0 ? 'cooldown_active' : prev.dollCabinetBlockReason
  };
};

export const markDollCabinetReturnTrigger = (prev: DollCabinetState, trigger: DollCabinetState['pendingReturnTrigger']) => ({
  ...prev,
  pendingReturnTrigger: trigger
});
