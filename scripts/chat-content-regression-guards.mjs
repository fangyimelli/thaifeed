import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

execFileSync('node', ['scripts/generate-chat-content-artifacts.mjs'], { cwd: repoRoot, stdio: 'inherit' });

const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src/content/chat-content/chatContentManifest.generated.json'), 'utf8'));
const app = fs.readFileSync(path.join(repoRoot, 'src/app/App.tsx'), 'utf8');
const panel = fs.readFileSync(path.join(repoRoot, 'src/ui/chat/ChatPanel.tsx'), 'utf8');
const sandboxMode = fs.readFileSync(path.join(repoRoot, 'src/modes/sandbox_story/sandboxStoryMode.ts'), 'utf8');

const mustHaveKeys = [
  'classic.pool.safe_fallback',
  'classic.event_dialog.voice_confirm.opener',
  'classic.event_reaction.ghost',
  'classic.qna.voice_confirm_flow.s1.prompt',
  'sandbox.preheat.1',
  'sandbox.vip_summary.1',
  'sandbox.glitch.answer_eval.1',
  'sandbox.prompt.tag_question',
  'sandbox.hint.help_fallback',
  'shared.hint.consonant_template'
];
for (const key of mustHaveKeys) {
  assert(manifest.some((entry) => entry.key === key), `manifest missing key ${key}`);
}

assert(manifest.some((entry) => entry.status === 'parallel'), 'manifest missing parallel status entries');
assert(manifest.some((entry) => entry.status === 'inferred_runtime_wrapper'), 'manifest missing inferred runtime wrapper entries');
assert(manifest.some((entry) => (entry.tokens || []).some((token) => token.token === '@activeUser')), 'missing @activeUser token metadata');
assert(manifest.some((entry) => (entry.tokens || []).some((token) => token.token === '{imageMemoryHint}')), 'missing imageMemoryHint token metadata');

const extractedStrings = [
  '今天怎麼這麼多人一起在線？',
  'VIP 總結：先把剛剛那個單字記住，下一步確認發音。',
  'VIP 總結：發音方向差不多了，最後確認這個詞在指誰。',
  '暖場測試回覆'
];
for (const text of extractedStrings) {
  assert(!app.includes(text), `App.tsx still hardcodes extracted chat text: ${text}`);
}
assert(!sandboxMode.includes('請讀出剛剛閃過的字：${nextNode.char}'), 'sandboxStoryMode still hardcodes reveal prompt');
assert(panel.includes('UI_TEXT.chatInputPlaceholder'), 'ChatPanel no longer uses extracted UI text registry');
assert(app.includes('SANDBOX_PREHEAT_CHAT_SEQUENCE'), 'App should consume sandbox preheat registry');
assert(app.includes('renderSandboxPromptTemplate(SANDBOX_PROMPT_TEMPLATES.tagQuestion'), 'App should use sandbox tag question template');
assert(app.includes('SANDBOX_VIP_SUMMARY_LINES.VIP_SUMMARY_1'), 'App should use sandbox VIP summary template');

console.log('chat content regression guards passed');
