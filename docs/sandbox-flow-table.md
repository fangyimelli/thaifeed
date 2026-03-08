# Sandbox deterministic flow table

| Step | Output rule | Reply gate |
|---|---|---|
| PREJOIN | 0 output | false |
| PREHEAT | preheat only, no question | false |
| TAG_PLAYER_1 | single tag then freeze | false -> WAIT_REPLY_1 |
| WAIT_REPLY_1 | global freeze, 0 non-player output | true |
| POSSESSION_AUTOFILL | UI autofill only | false |
| POSSESSION_AUTOSEND | autosend through same submit pipeline | false |
| CROWD_REACT_WORD | fixed short burst | false |
| VIP_SUMMARY_1 | fixed one line | false |
| TAG_PLAYER_2_PRONOUNCE | single tag then freeze | false -> WAIT_REPLY_2 |
| WAIT_REPLY_2 | global freeze, 0 non-player output | true |
| DISCUSS_PRONOUNCE | fixed burst | false |
| VIP_SUMMARY_2 | fixed one line | false |
| TAG_PLAYER_3_MEANING | single tag then freeze | false -> WAIT_REPLY_3 |
| WAIT_REPLY_3 | global freeze, backlog accumulation allowed | true |
| FLUSH_TECH_BACKLOG | flush backlog once (max 8), clear backlog | false |
| ADVANCE_NEXT | questionIndex++, step -> TAG_PLAYER_1 | false |

## Enforcement notes

- Sandbox output must come from flow engine source tags only.
- `replyGateActive` is derived only from `sandboxFlow.step` (`WAIT_REPLY_*` => true).
- `backlogTechMessages` only accumulates in `WAIT_REPLY_3`.
