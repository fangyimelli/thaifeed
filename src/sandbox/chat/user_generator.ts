const PREFIXES = [
  'ghost', 'ptt', 'ayut', 'shadow', 'melon', 'sleepy', 'night', 'room', 'lurker', 'watch', 'chai', 'mango', 'cat', 'owl', 'moon'
];

const SUFFIXES = [
  'fish', 'lurker', 'watch', 'cat', 'boy', 'p', 'viewer', 'reader', 'line', 'echo', 'mask', 'duck', 'fox', 'note', 'lamp'
];

const CONNECTORS = ['', '_', ''];

export class SandboxUserGenerator {
  private readonly used = new Set<string>();

  next(): string {
    for (let i = 0; i < 300; i += 1) {
      const name = this.buildName();
      if (this.used.has(name)) continue;
      this.used.add(name);
      return name;
    }
    const fallback = `viewer_${this.used.size + 1}`;
    this.used.add(fallback);
    return fallback;
  }

  private buildName(): string {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)] ?? 'user';
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)] ?? 'live';
    const connector = CONNECTORS[Math.floor(Math.random() * CONNECTORS.length)] ?? '';
    return `${prefix}${connector}${suffix}`;
  }
}
