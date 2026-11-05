# 03: Combo-rules conformance pass

## Review record (2026-11-05, PR verification)

Standards: PASS, no documented-standard breaches. Seam stays pure with thin adapters. Weak Data Clumps note on `gainFor` arity, not blocking.
Spec: all five criteria hold (17/17 `node --test`). Caution: `gainFor` magnitudes have no numeric source in the ticket, self-consistent with tests only.
Blast radius: PROOF-OK 3000 randomized boards, seam `gameOverFor` identical to pre-refactor logic. Two-way door, single file, zero deps.

**What to build:** Edge-case behavior around game-over and tray refill matches the original: the run ends exactly when no remaining tray piece fits anywhere, the tray refills exactly when empty, and a refill that immediately dead-ends still ends the run fairly.

**Blocked by:** None (can start immediately).

**Status:** done (verified by user on real device, 2026-11-03)

- [x] Hand-verified matrix in browser: last-piece-fits keeps run alive; no-fit-anywhere ends run with overlay
- [x] Tray refills only when all three slots are used/cleared, never early or late
- [x] Fresh refill that fits nowhere triggers game over (no soft-lock on unplayable tray)
- [x] Streak resets on dry placement, builds only on consecutive clearing placements
- [x] Best score updates exactly when beaten, survives reload
