export interface GameMode {
  id: string;
  label: string;
  init(): void;
  onIncomingTag(tagText: string): void;
  onPlayerReply(replyText: string): void;
  tick(now: number): void;
  dispose(): void;
}
