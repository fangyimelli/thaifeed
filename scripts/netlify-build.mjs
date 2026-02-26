import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const sceneViewPath = 'src/ui/scene/SceneView.tsx';
const sceneViewSource = readFileSync(sceneViewPath, 'utf8');

if (sceneViewSource.includes('useMemo')) {
  console.error(`[netlify-build] Unexpected token "useMemo" found in ${sceneViewPath}.`);
  process.exit(1);
}

console.log('[netlify-build] SceneView import check passed (no useMemo token).');

const tscResult = spawnSync('node', ['./node_modules/typescript/bin/tsc', '-b', '--force'], {
  stdio: 'inherit'
});

if (tscResult.status !== 0) {
  process.exit(tscResult.status ?? 1);
}

const viteResult = spawnSync('node', ['./node_modules/vite/bin/vite.js', 'build'], {
  stdio: 'inherit'
});

if (viteResult.status !== 0) {
  process.exit(viteResult.status ?? 1);
}
