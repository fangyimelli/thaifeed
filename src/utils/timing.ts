export function createRandomInterval(run: () => void, minMs: number, maxMs: number) {
  let timer: number;

  const schedule = () => {
    const next = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
    timer = window.setTimeout(() => {
      run();
      schedule();
    }, next);
  };

  schedule();

  return () => window.clearTimeout(timer);
}
