let currentContainer: HTMLDivElement | null = null;

export function registerChatScrollContainer(container: HTMLDivElement | null) {
  currentContainer = container;
}

export function getChatScrollContainer() {
  return currentContainer;
}
