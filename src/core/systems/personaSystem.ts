export function buildPersonaMessage(): string {
  throw new Error('buildPersonaMessage has been disabled. Use generateChatMessageV2 from chatEngineV2 as the only chat source.');
}

export function getPersonaCorpusStats() {
  return {
    status: 'disabled',
    reason: 'Legacy persona template engine has been retired in favor of chatEngineV2.'
  };
}
