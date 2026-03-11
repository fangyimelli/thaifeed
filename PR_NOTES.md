# AUDIT ONLY — NIGHT1 consonant source and 10-question composition audit

## Executive summary
- This change is **AUDIT ONLY / NO FUNCTIONAL CHANGE**.
- Sandbox NIGHT1 authoritative question source is `SHARED_CONSONANT_QUESTION_BANK` mapped into `NIGHT1.nodes` via `buildSandboxNightNodes(...)`.
- NIGHT1 currently consumes exactly 10 questions because the shared bank currently has 10 entries and flow advance halts on `state.nodeIndex >= ssot.nodes.length - 1` (`end_of_nodes`).
- Classic and sandbox are both backed by the same shared consonant bank layer.

---

## Source-of-truth mapping
1. Shared consonant authoritative bank
   - `src/shared/consonant-engine/questionBank.ts`
   - Export: `SHARED_CONSONANT_QUESTION_BANK`

2. Sandbox NIGHT1 authoritative node build
   - `src/ssot/sandbox_story/night1.ts`
   - `nodes: buildSandboxNightNodes(SHARED_CONSONANT_QUESTION_BANK.map(...))`

3. Sandbox word/reveal mapping layer
   - `src/modes/sandbox_story/sandboxConsonantWordMap.ts`
   - `SANDBOX_CONSONANT_WORD_MAP` + `buildSandboxNightNodes`

4. Runtime prompt consume layer
   - `src/modes/sandbox_story/sandboxStoryMode.ts`
   - `setCurrentPrompt` / `advancePromptAtomically` writes `prompt.current` and `currentPrompt`

5. Judge consume layer
   - `src/app/App.tsx` `consumePlayerReply(...)`
   - `parseAndJudgeUsingClassic(...)` from `src/modes/sandbox_story/classicConsonantAdapter.ts`

6. Reveal consume layer
   - `src/modes/sandbox_story/sandboxStoryMode.ts` `forceRevealCurrent()` derives `reveal.text` from `ssot.nodes.find(...).wordText`

---

## A) NIGHT1 authoritative question list

| index | questionId | classicQuestionId | wordKey | expectedConsonant | acceptedCandidates | runtimeAcceptedCandidates | revealWord / reveal.text | source file / source function / selector / reducer |
|---|---|---|---|---|---|---|---|---|
| 1 | n01_q01_wait | n01_q01_wait | n01_q01_wait | ร | [ร, r, ㄖ, ro, rorua] | [ร, r, ㄖ, ro, rorua] | รอ | bank: `questionBank.ts`; node build: `buildSandboxNightNodes`; runtime prompt: `setCurrentPrompt/advancePromptAtomically`; judge candidates: `parseAndJudgeUsingClassic`; reveal: `forceRevealCurrent` |
| 2 | n01_q02_house | n01_q02_house | n01_q02_house | บ | [บ, b, ㄅ] | [บ, b, ㄅ] | บ้าน | same chain |
| 3 | n01_q03_child | n01_q03_child | n01_q03_child | ด | [ด, d, ㄉ] | [ด, d, ㄉ] | เด็ก | same chain |
| 4 | n01_q04_night | n01_q04_night | n01_q04_night | ก | [ก, k, ㄍ] | [ก, k, ㄍ] | กลางคืน | same chain |
| 5 | n01_q05_door | n01_q05_door | n01_q05_door | ป | [ป, p, ㄆ] | [ป, p, ㄆ] | ประตู | same chain |
| 6 | n01_q06_sound | n01_q06_sound | n01_q06_sound | ส | [ส, s, ㄙ] | [ส, s, ㄙ] | เสียง | same chain |
| 7 | n01_q07_wind | n01_q07_wind | n01_q07_wind | ล | [ล, l, ㄌ] | [ล, l, ㄌ] | ลม | same chain |
| 8 | n01_q08_return | n01_q08_return | n01_q08_return | ก | [ก, k, ㄍ] | [ก, k, ㄍ] | กลับ | same chain |
| 9 | n01_q09_why | n01_q09_why | n01_q09_why | ท | [ท, th, ㄊ] | [ท, th, ㄊ] | ทำไม | same chain |
| 10 | n01_q10_turn | n01_q10_turn | n01_q10_turn | ห | [ห, h, ㄏ] | [ห, h, ㄏ] | หัน | same chain |

Notes:
- `classicQuestionId` appears as debug projection in `App.tsx` and currently mirrors `questionId` from shared bank lookup by `wordKey`.
- `runtimeAcceptedCandidates` are runtime-computed from `getAcceptedAliasCandidates({ questionId, consonant })`.

---

## B) 題目來源鏈（data flow）

1. `classic question bank` 定義位置
   - Compatibility path: `src/shared/questionBank/night01QuestionBank.ts` (re-export)
   - Authoritative data: `src/shared/consonant-engine/questionBank.ts`

2. `shared_consonant_question_bank` 定義位置
   - `src/shared/consonant-engine/questionBank.ts` (`SHARED_CONSONANT_QUESTION_BANK`)

3. sandbox `currentPrompt` 來源
   - `NIGHT1.nodes` built in `src/ssot/sandbox_story/night1.ts`
   - Runtime assignment in `src/modes/sandbox_story/sandboxStoryMode.ts`
     - `setCurrentPrompt(...)`
     - `advancePromptAtomically(...)`

4. NIGHT1 flow consume 點
   - `src/app/App.tsx` `consumePlayerReply(...)` transitions wait-reply to `ANSWER_EVAL`

5. judge consume 點
   - `src/modes/sandbox_story/classicConsonantAdapter.ts` `parseAndJudgeUsingClassic(...)`
   - `acceptedCandidates` from shared engine `getAcceptedAliasCandidates(...)`

6. reveal consume 點
   - `src/modes/sandbox_story/sandboxStoryMode.ts` `forceRevealCurrent()` => `reveal.text = node.wordText`

---

## C) NIGHT1 為何是 10 題

Real limiting factors (current implementation):
1. **Array length cap**
   - `NIGHT1.nodes` is created from full `SHARED_CONSONANT_QUESTION_BANK.map(...)`.
   - Shared bank currently contains 10 entries.
2. **Flow termination condition**
   - `advancePromptAtomically`, `advancePrompt`, `forceAdvanceNode` guard:
     - if `state.nodeIndex >= ssot.nodes.length - 1` => blocked reason `end_of_nodes`.
3. **No explicit hardcoded `slice(0,10)` / `take(10)` / `MAX_QUESTIONS` / `NIGHT1_QUESTION_COUNT` found**
   - Result: 10 comes from current shared bank size + flow end condition by `ssot.nodes.length`.

---

## D) 必查搜尋結果（命中 + 結論）

- `shared_consonant_question_bank`
  - hit: debug projection in `src/app/App.tsx` (`currentPrompt.answerSource`, `answerAudit.source`)
  - conclusion: string is diagnostic label; authoritative data is shared bank module.

- `classicQuestionId`
  - hit: debug projection fields in `src/app/App.tsx`
  - conclusion: compatibility/debug field, mapped from `getSharedConsonantQuestionById(prompt.wordKey)`.

- `night1`
  - hit: `src/ssot/sandbox_story/night1.ts`, `src/modes/sandbox_story/sandboxStoryMode.ts`, `src/data/night1_words.ts`
  - conclusion: sandbox SSOT uses `src/ssot/sandbox_story/night1.ts`.

- `n01_q`
  - hit: shared bank + sandbox word map entries
  - conclusion: question ids are stable and one-to-one mapped.

- `q10`
  - hit: `n01_q10_turn` entries + `q10Special` debug/runtime flags
  - conclusion: Q10 exists as the tenth node; not selected by separate random selector.

- `expectedConsonant`
  - hit: judge audit write/read paths (`consumePlayerReply`, debug projection)
  - conclusion: populated from parse/judge pipeline using current prompt/node char.

- `acceptedCandidates`
  - hit: judge audit payload + classic adapter
  - conclusion: authoritative runtime candidate set from shared alias engine.

- `runtimeAcceptedCandidates`
  - hit: debug projection (`App.tsx`)
  - conclusion: runtime-derived display of `getAcceptedAliasCandidates(...)`; not standalone storage in mode state.

- `currentPrompt.answerSource`
  - hit: debug projection (`App.tsx`)
  - conclusion: diagnostic-only computed field.

- `end_of_nodes`
  - hit: `sandboxStoryMode.ts` (advance guards), `App.tsx` debug actions/flow blocked reasons
  - conclusion: canonical terminal condition for NIGHT1 progression.

- `advance_next_blocked`
  - hit: `App.tsx` next-question stage blocked reasons
  - conclusion: stage-scoped blocked diagnostics; progression authority still tied to `ssot.nodes.length` and guard chain.

- `slice(0,10)`
  - no hit in source for NIGHT1 selection.

- `take(10)`
  - no hit in source for NIGHT1 selection.

- `MAX_QUESTIONS`
  - no hit relevant to NIGHT1 source composition.

- `NIGHT1_QUESTION_COUNT`
  - no hit.

- `any registry listing 10 question nodes`
  - hit: `SHARED_CONSONANT_QUESTION_BANK` + `SANDBOX_CONSONANT_WORD_MAP` both currently list 10 matching `n01_q01..n01_q10` ids.

---

## E) 最終問題回答（yes/no + evidence）

1. NIGHT1 現在是否真的固定為 10 題？
   - **Yes (currently)**.
   - Evidence: `NIGHT1.nodes` built from full shared bank; shared bank has 10 rows now; flow halts at `end_of_nodes` by `ssot.nodes.length - 1`.

2. NIGHT1 這 10 題是否固定同一組？
   - **Yes (under current code/data revision)**.
   - Evidence: deterministic `.map(...)` order from constant bank array; no selector/filter/random/slice path found for NIGHT1.

3. NIGHT1 的 10 題具體是哪 10 個子音？
   - **Yes, concrete list**: ร, บ, ด, ก, ป, ส, ล, ก, ท, ห (question IDs `n01_q01` ~ `n01_q10`).

4. 這 10 題是由 flow node 決定，還是由題庫 selection 決定？
   - **Both layers, with source split**:
     - Composition: shared bank array defines which questions exist + order.
     - Runtime progression: flow node index (`ssot.nodes`) decides current active question and termination.
   - No independent top-10 selector exists.

5. classic 與 sandbox 是否共用同一份 authoritative 子音資料？
   - **Yes**.
   - Evidence:
     - shared bank used to build sandbox NIGHT1 nodes.
     - classic parse/judge adapter imports shared engine (`parseConsonantAnswer`, shared alias candidates).
     - `src/data/night1_words.ts` is also derived from shared bank.

---

## Final verdict
- **Authoritative NIGHT1 question composition source**: `src/shared/consonant-engine/questionBank.ts`.
- **Authoritative NIGHT1 runtime question carrier**: `src/ssot/sandbox_story/night1.ts -> NIGHT1.nodes`.
- **Why 10 now**: shared bank presently has 10 rows; flow progression bound by `ssot.nodes.length` and `end_of_nodes`.
- **Audit-only statement**: no sandbox/classic runtime logic changed in this patch.
