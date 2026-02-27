import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const sceneViewPath = 'src/ui/scene/SceneView.tsx';
const sceneViewSource = readFileSync(sceneViewPath, 'utf8');

if (sceneViewSource.includes('useMemo')) {
  console.error(`[netlify-build] Unexpected token "useMemo" found in ${sceneViewPath}.`);
  process.exit(1);
}

console.log('[netlify-build] SceneView import check passed (no useMemo token).');

const run = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit' });

const runViteBuild = () => run('node', ['./node_modules/vite/bin/vite.js', 'build']);

const tscResult = run('node', ['./node_modules/typescript/bin/tsc', '-b', '--force']);

if (tscResult.status !== 0) {
  process.exit(tscResult.status ?? 1);
}

let viteResult = runViteBuild();

if (viteResult.status !== 0) {
  console.warn('[netlify-build] Initial vite build failed, running npm install once and retrying build.');
  const installResult = run('npm', ['install']);
  if (installResult.status !== 0) {
    process.exit(installResult.status ?? 1);
  }
  viteResult = runViteBuild();
}

if (viteResult.status !== 0) {
  process.exit(viteResult.status ?? 1);
}
