export const allowNameInjection = true;

export type GhostLoreInjectInput = {
  fragment: string;
  level: number;
  activeUser: string;
};

export type GhostLoreInjectResult = {
  fragment: string;
  lastNameInjected: string;
};

export function createGhostLore() {
  let sinceLastInjected = 3;
  let justInjected = false;
  let lastNameInjected = '-';

  return {
    inject(input: GhostLoreInjectInput): GhostLoreInjectResult {
      const base = input.fragment;
      const user = input.activeUser.trim();
      const canInject = allowNameInjection
        && input.level >= 3
        && user.length > 0
        && sinceLastInjected >= 3
        && !justInjected
        && Math.random() < 0.35;

      if (!canInject) {
        sinceLastInjected += 1;
        justInjected = false;
        lastNameInjected = '-';
        return { fragment: base, lastNameInjected };
      }

      sinceLastInjected = 0;
      justInjected = true;
      const decorated = `${base} 他曾經叫過 ${user} 的名字`;
      lastNameInjected = user;
      return { fragment: decorated, lastNameInjected };
    }
  };
}
