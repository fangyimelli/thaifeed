import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

process.on('uncaughtException', (error) => {
  console.error('[netlify-build] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[netlify-build] Unhandled rejection:', reason);
  process.exit(1);
});

const sceneViewPath = 'src/ui/scene/SceneView.tsx';
const sceneViewSource = readFileSync(sceneViewPath, 'utf8');

if (sceneViewSource.includes('useMemo')) {
  console.error(`[netlify-build] Unexpected token "useMemo" found in ${sceneViewPath}.`);
  process.exit(1);
}

console.log('[netlify-build] SceneView import check passed (no useMemo token).');

const appPath = 'src/app/App.tsx';
const appSource = readFileSync(appPath, 'utf8');

if (appSource.includes('setChatTickRestartKey') || appSource.includes('chatTickRestartKey')) {
  console.error(`[netlify-build] Unexpected legacy chatTickRestartKey token found in ${appPath}. Remove stale state/setter before build.`);
  process.exit(1);
}

console.log('[netlify-build] App legacy chatTickRestartKey check passed.');

const run = (cmd, args, label) => {
  console.log(`[netlify-build] Running ${label}...`);
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(`[netlify-build] ${label} failed to start.`, result.error);
    return 1;
  }
  if (result.status !== 0) {
    const signalText = result.signal ? ` signal=${result.signal}` : '';
    console.error(`[netlify-build] ${label} failed with exit=${result.status ?? 'null'}${signalText}.`);
    return result.status ?? 1;
  }
  console.log(`[netlify-build] ${label} completed successfully.`);
  return 0;
};

const runViteBuild = () => run('node', ['./node_modules/vite/bin/vite.js', 'build'], 'vite build');

const tscExit = run('node', ['./node_modules/typescript/bin/tsc', '-b', '--force'], 'tsc -b --force');
if (tscExit !== 0) {
  process.exit(tscExit);
}

let viteExit = runViteBuild();

if (viteExit !== 0) {
  console.warn('[netlify-build] Initial vite build failed, running npm install once and retrying build.');
  const installExit = run('npm', ['install'], 'npm install');
  if (installExit !== 0) {
    process.exit(installExit);
  }
  viteExit = runViteBuild();
}

if (viteExit !== 0) {
  process.exit(viteExit);
}
