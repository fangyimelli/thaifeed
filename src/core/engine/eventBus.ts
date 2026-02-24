type EventMap = {
  ANSWER_SUBMITTED: { raw: string };
};

type EventKey = keyof EventMap;
type Handler<T extends EventKey> = (payload: EventMap[T]) => void;

export class EventBus {
  private listeners = new Map<EventKey, Set<Handler<EventKey>>>();

  on<T extends EventKey>(event: T, handler: Handler<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const eventHandlers = this.listeners.get(event)!;
    eventHandlers.add(handler as Handler<EventKey>);
    return () => eventHandlers.delete(handler as Handler<EventKey>);
  }

  emit<T extends EventKey>(event: T, payload: EventMap[T]) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => handler(payload));
  }
}
