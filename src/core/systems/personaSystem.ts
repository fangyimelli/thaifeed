import { pickOne } from '../../utils/random';

const EMOJIS = ['👀', '😰', '😨', '😬', '😳', '🤔', '😶', '😵‍💫', '😶‍🌫️'] as const;

const LEADING_PARTICLES = ['欸', 'ㄟ', '欸欸', 'ㄟㄟ', '欸不是', '啊不是', '蛤', '等一下', '靠', '真的假的'];
const ENDING_PARTICLES = ['啦', '吧', '好嗎', '對不對', '是不是'];

type PersonaProfile = {
  leadingParticles: string[];
  endingParticles: string[];
  emojiRate: number;
  sentenceLength: 'short' | 'medium' | 'long';
  anchorMentionStrength: number;
  tone: string[];
};

const personaNames = [
  'chill', 'nervous', 'troll', 'quiet', 'observer', 'hype', 'skeptical', 'empath', 'meme', 'foodie',
  'gamer', 'sleepy', 'detective', 'caretaker', 'chaotic', 'polite', 'impatient', 'storyteller', 'minimalist', 'latecomer'
] as const;

export type PersonaName = (typeof personaNames)[number];

const PERSONAS: Record<PersonaName, PersonaProfile> = Object.fromEntries(
  personaNames.map((name, index) => [
    name,
    {
      leadingParticles: LEADING_PARTICLES.slice(0, 4 + (index % 6)),
      endingParticles: ENDING_PARTICLES.slice(0, 2 + (index % 4)),
      emojiRate: [0.3, 0.35, 0.4][index % 3],
      sentenceLength: (['short', 'medium', 'long'] as const)[index % 3],
      anchorMentionStrength: [0.55, 0.7, 0.85][index % 3],
      tone: [
        `${name}派覺得這邊超怪`,
        `${name}模式上線 這位置有點毛`,
        `${name}視角看這格真的不對`
      ]
    }
  ])
) as Record<PersonaName, PersonaProfile>;

const userPersonaMap = new Map<string, PersonaName>();
let lastParticle = '';
let sameParticleCount = 0;

function getPersonaByUsername(username: string): PersonaProfile {
  if (!userPersonaMap.has(username)) {
    userPersonaMap.set(username, pickOne([...personaNames]));
  }
  return PERSONAS[userPersonaMap.get(username)!];
}

function maybePickParticle(pool: string[]) {
  if (pool.length === 0 || Math.random() > 0.45) return '';
  let candidate = pickOne(pool);
  let guard = 0;
  while (guard < 8 && candidate === lastParticle && sameParticleCount >= 2) {
    candidate = pickOne(pool);
    guard += 1;
  }
  if (candidate === lastParticle) {
    sameParticleCount += 1;
  } else {
    sameParticleCount = 1;
    lastParticle = candidate;
  }
  return candidate;
}

export function buildPersonaMessage(input: {
  username: string;
  anchorKeyword: string;
  anchorBaseText: string;
}): string {
  const persona = getPersonaByUsername(input.username);
  const leading = maybePickParticle(persona.leadingParticles);
  const ending = Math.random() < 0.35 ? maybePickParticle(persona.endingParticles) : '';
  const mentionAnchor = Math.random() < persona.anchorMentionStrength;

  const fragments: string[] = [];
  if (leading) fragments.push(leading);
  fragments.push(mentionAnchor ? `${input.anchorKeyword}那邊` : input.anchorBaseText);

  const tone = pickOne(persona.tone);
  if (persona.sentenceLength !== 'short') fragments.push(tone);
  if (persona.sentenceLength === 'long') fragments.push('你先看那格');

  let text = fragments.join(' ').replace(/[。．｡!！?？，、；：]/g, '');
  if (ending) text = `${text} ${ending}`;
  if (Math.random() < persona.emojiRate) text = `${text} ${pickOne([...EMOJIS])}`;

  return text.trim();
}

