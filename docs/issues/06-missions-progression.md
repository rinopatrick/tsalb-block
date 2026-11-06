## Problem Statement

The player has no reason to return after a run ends. Best score is the only
persistence, so sessions blur together and streaks of play go unrewarded.
We need local-first missions plus dailies inside the single self-contained
`index.html`, with the pure-logic seam extended, Classic untouched, and zero
third-party requests kept. Resolves map #11. Decided children: #12 (scope),
#13 (mission model), #14 (daily seed, streak, persistence), #16 (seam
extension), #15 (prototype sketch).

## User Stories

1. As a player, I want missions that count one objective each (clear N lines,
   score N in one run), so that I always know what to chase.
2. As a player, I want mission progress to accrue from board reducer events
   only, so that progress never depends on animation or DOM timing.
3. As a player, I want a mission completion callout plus a mark in the
   mission list, so that finishing feels acknowledged without currencies or
   unlocks.
4. As a player, I want per-run missions to reset each run, so that every run
   starts a fresh chase.
5. As a player, I want a daily seeded by my device calendar date, so that the
   same date always maps to the same daily on my device.
6. As a player, I want a strict consecutive-day streak (same day idempotent,
   gap of two or more days resets to one), so that daily play is rewarded and
   missed days are honest.
7. As a player, I want mission and daily state in namespaced localStorage keys
   (`bb_missions`, `bb_dailies`) beside existing keys, so that Classic keys
   stay untouched.
8. As a player, I want missions visible in the existing single-file UI without
   breaking Classic, so that the panel feels native to the game.
9. As a player, I want zero third-party requests after missions land, so that
   no ad or tracker can ever load.
10. As a deployer, I want the whole change in one `index.html` with no build
    step, so that Vercel static deploy stays trivial.

## Implementation Decisions

- **Decision #12 (ADR 0001): local-first, no backend.** Accounts, auth, sync,
  cloud saves, leaderboards, analytics, and push stay out. Mission and daily
  state live in `localStorage`. Daily seed derives from the device calendar
  date. No network calls exist and none get added.
- **Decision #13: single-objective counter plus done flag.** A mission is one
  objective with a counter and a done flag (clear 10 lines, score 500 in one
  run). Progress derives from existing board events only. Completion earns
  local acknowledgment only (callout plus mark in mission list), no currency,
  no unlocks, no backend entitlements.
- **Decision #14: device-local seed, strict streak, namespaced keys.** Seed
  key is the device-local YYYY-MM-DD string, so the same date always maps to
  the same daily and Classic logic never reads it. Streak is strict
  consecutive calendar days on the device clock: completion on the next
  calendar day increments, the same day is idempotent, any gap of two or more
  days resets to one on next completion. Time zones are device-local only, no
  server clock and no UTC normalization. Persistence is namespaced
  localStorage keys beside existing best, theme, and toggle keys
  (`bb_missions`, `bb_dailies`), JSON values, read once at boot and written on
  mission events only.
- **Decision #16: smallest pure seam extension (PR #18).** `missionEventFor`
  carries lines plus clearedCount plus streakAfter plus boardCleared plus
  scoreGain plus isClear from reducer facts. `missionProgressFor` accrues
  lines missions on clears and score missions on every move gain, preserves
  identity, clamps at target, flips done once. `dailySeedFor` encodes
  device-local YYYY-MM-DD. `dailyStreakFor` counts strict consecutive days
  with same-day idempotent and 2-plus-day gap reset. `MISSION_KEYS`
  namespaces `bb_missions` plus `bb_dailies`. `doPlace` builds its event
  through the pure helper. Adapters thin, tests behavior-only, Classic
  untouched, zero requests kept.
- **Decision #15: throwaway sketch (PR #19).** Panel with 3 rows
  (clear-10-lines, score-500, daily streak) in `index.html`, driven by the
  #16 seam events only. Per-run missions reset, daily streak persists under
  `bb_dailies`. Classic untouched, zero requests kept.
- **Merged spec roles.** This file is the #11 destination: the merged record
  of the five decisions above. Future mission work (new mission kinds,
  rewards beyond acknowledgment, cloud saves) opens its own ticket and, for
  backend asks, reopens ADR 0001.

## Testing Decisions

- **What makes a good test:** external behavior of the pure-logic seam (given
  reducer event, correct mission counter accrual and done flip; given date
  pair, correct streak verdict; given board plus tray, mission state never
  changes Classic verdicts). Never test DOM structure, CSS, animation timing,
  or sound output.
- **What gets tested:** `tests/missions-seam.test.mjs` (18 behavior tests on
  `missionEventFor`, `missionProgressFor`, `dailySeedFor`, `dailyStreakFor`,
  hand-computed literals, PR #18), `tests/missions-sketch.test.mjs` (6
  behavior tests on the throwaway panel contract, PR #19),
  `tests/missions-map.test.mjs` (this map acceptance: merged spec exists and
  records all five decisions with constraints). Full suite 58 pass via
  `node --test`.
- **Prior art:** `tests/rules-conformance.test.mjs` (placement, clears,
  streak, scoring, game over), `tests/contrast-deploy-gate.test.mjs`
  (contrast plus zero-request gate guarding the shipped file).

## Out of Scope

- Real-name personalization swap (separate effort).
- Native wrappers, PWA install flow.
- Sound asset files (synthesized audio stays).
- 3x3-square clears unless prototype check confirms.
- Backend, auth, sync, cloud saves, leaderboards, analytics, push (decided
  out in #12, ADR 0001).

## Further Notes

- Prototype check from V1 still stands: rows plus columns clear, no 3x3
  squares, unless a build-time check of the original confirms them.
- Live alias serves the pre-missions payload until `vercel deploy` ships the
  merged main. Commit then deploy to update the live URL.
