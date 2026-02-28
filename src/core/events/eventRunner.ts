import { pickDialog } from './eventDialogs';
import type { EventRunRecord, EventSendResult, StoryEventKey } from './eventTypes';

export type EventRunnerContext = {
  activeUsers: string[];
  sendLine: (line: string, meta: { isTag: boolean; actor: string; lineId: string; phase: 'opener' | 'followUp' | 'closer' }) => EventSendResult;
  canRunEvent: (activeUser: string) => string | null;
  setLock: (actor: string) => void;
  getRecentEventLineIds: (key: StoryEventKey) => string[];
  rememberEventLineId: (key: StoryEventKey, lineId: string) => void;
  onEventRecord: (record: EventRunRecord) => void;
};

export function startEvent(eventKey: StoryEventKey, ctx: EventRunnerContext): EventRunRecord {
  const activePool = ctx.activeUsers;
  const activeUser = activePool.length > 0 ? activePool[Math.floor(Math.random() * activePool.length)] : '';
  const eventId = `${eventKey}_${Date.now()}`;

  if (!activeUser || !activePool.includes(activeUser)) {
    const record: EventRunRecord = {
      eventId,
      key: eventKey,
      state: 'aborted',
      at: Date.now(),
      starterTagSent: false,
      abortedReason: 'active_user_missing',
      lineIds: []
    };
    ctx.onEventRecord(record);
    return record;
  }

  const blockedReason = ctx.canRunEvent(activeUser);
  if (blockedReason) {
    const record: EventRunRecord = {
      eventId,
      key: eventKey,
      state: 'aborted',
      at: Date.now(),
      starterTagSent: false,
      abortedReason: blockedReason,
      lineIds: []
    };
    ctx.onEventRecord(record);
    return record;
  }

  const opener = pickDialog(eventKey, 'opener', activeUser, ctx.getRecentEventLineIds(eventKey));
  if (!opener.text.startsWith(`@${activeUser}`)) {
    const record: EventRunRecord = {
      eventId,
      key: eventKey,
      state: 'aborted',
      at: Date.now(),
      starterTagSent: false,
      abortedReason: 'starter_line_not_tagged',
      lineIds: [opener.id],
      openerLineId: opener.id
    };
    ctx.onEventRecord(record);
    return record;
  }

  const sendResult = ctx.sendLine(opener.text, { isTag: true, actor: activeUser, lineId: opener.id, phase: 'opener' });
  if (!sendResult.ok) {
    const record: EventRunRecord = {
      eventId,
      key: eventKey,
      state: 'aborted',
      at: Date.now(),
      starterTagSent: false,
      abortedReason: sendResult.blockedReason ?? 'send_failed',
      lineIds: [opener.id],
      openerLineId: opener.id
    };
    ctx.onEventRecord(record);
    return record;
  }

  ctx.rememberEventLineId(eventKey, opener.id);
  ctx.setLock(activeUser);
  const record: EventRunRecord = {
    eventId,
    key: eventKey,
    state: 'active',
    at: Date.now(),
    starterTagSent: true,
    openerLineId: opener.id,
    lineIds: [opener.id]
  };
  ctx.onEventRecord(record);
  return record;
}
