## Problem Statement

The user's girlfriend loves playing Block Blast but is tired of the heavy ad load in the original app. She wants the same game feel with zero ads, playable on her phone's browser.

## Solution

A web-based Block Blast clone shipped as a single self-contained `index.html` (inline CSS/JS, zero dependencies, zero ads, zero trackers), deployable as a Vercel static site. Phone-first portrait touch interaction (drag with tap-to-place fallback, ghost preview), desktop mouse support as a bonus. Classic Block Blast rules, three themes (classic, cute, midnight; default cute), local best-score persistence, clear/combo animations, sound + vibration toggles, pause/restart, game-over overlay.

## User Stories

### Core gameplay (player = girlfriend)

1. As a player, I want to open the game in my phone browser with no ads or popups, so that I can just play.
2. As a player, I want a portrait layout that fits my phone screen, so that I can play one-handed like the app.
3. As a player, I want to drag pieces from the tray onto the 8x8 grid with my finger, so that placement feels like Block Blast.
4. As a player, I want to tap a piece then tap a grid cell as a fallback, so that I can still place precisely when drag is awkward.
5. As a player, I want a ghost preview of the piece on the grid while dragging, so that I know exactly where it will land.
6. As a player, I want invalid placements to be rejected with clear visual feedback, so that I never place by accident.
7. As a player, I want 3 random pieces per batch with a fresh batch when the tray empties, so that the loop matches the original.
8. As a player, I want full rows and columns to clear with a satisfying animation, so that clearing feels rewarding.
9. As a player, I want combo/streak bonuses for consecutive clearing moves, so that skilled play scores higher.
10. As a player, I want my score to update immediately on every placement and clear, so that progress is always visible.
11. As a player, I want the game to end with a clear game-over state when none of my remaining pieces fit, so that each run has a fair ending.
12. As a player, I want a game-over overlay showing my score and best score with one-tap restart, so that I can jump straight into another run.

### Persistence and feel

13. As a player, I want my best score saved on my device across sessions, so that I can chase my record.
14. As a player, I want row/column clears and combos to play animations and particle effects, so that big moves feel exciting.
15. As a player, I want happy sound effects for placement, clears, and combos, so that the game feels alive.
16. As a player, I want to toggle sound off, so that I can play silently.
17. As a player, I want vibration feedback on placements and clears (where supported), so that moves feel tactile.
18. As a player, I want to toggle vibration off, so that I control the feel.
19. As a player, I want to pause and resume mid-run, so that interruptions don't kill my game.
20. As a player, I want an explicit restart control, so that I can abandon a bad run without waiting for game over.

### Themes (classic, cute, midnight)

21. As a player, I want the game to open in a cute theme (pastel purple, hearts/stars effects, affectionate title), so that it feels made for me.
22. As a player, I want a classic Block Blast-like theme available via toggle, so that I can switch looks anytime.
22b. As a player, I want a midnight theme (dark night palette, moon glow accents, calm title) available on the same toggle cycle, so that night play stays readable.
23. As a player, I want my theme choice remembered, so that I don't re-toggle every visit.

### Desktop and sharing (deployer = boyfriend)

24. As a player, I want the game to work with a mouse on desktop, so that I can also play on a computer.
25. As a deployer, I want the whole game in one `index.html` with no build step, so that I can deploy to Vercel static in minutes.
26. As a deployer, I want zero third-party requests in the page, so that no ad or tracker SDK can ever sneak in.
27. As a deployer, I want the game to load fast on mobile data, so that she isn't staring at a blank screen.
28. As a deployer, I want personalization (nickname on title, favorite colors) changeable in one obvious edit, so that placeholder "princess" styling can be swapped for the real thing later.

## Implementation Decisions

- **Single self-contained `index.html`.** All CSS and JS inline, no npm packages, no build step, no external requests (no fonts, no CDNs, no analytics). This is a deliberate quality decision, not just simplicity: touch input via Pointer Events, 60fps animations via CSS transforms, sound via synthesized WebAudio, vibration via `navigator.vibrate`, and best-score via `localStorage` are all native — a framework adds fragility and load time, not gameplay quality. Vercel serves it as a static file with zero config.
- **Classic rules clone.** 8x8 grid, batches of 3 random pieces, tray refills when empty, full rows and columns clear, combo bonus for clears on consecutive moves, game over when no tray piece fits anywhere. (Prototype check recommended during build: confirm original clears rows + columns only, no 3x3-square clears.)
- **Input model.** Pointer Events unify touch/mouse drag; ghost preview rendered on the grid during drag; tap-piece-then-tap-cell fallback for precision. Touch scrolling suppressed over the play area so drags never fight the page.
- **Theming via CSS variables.** `data-theme` attribute switches the classic, cute, and midnight palettes on one toggle cycle (cute, midnight, classic); toggle in header; choice persisted in `localStorage`; default cute. Each theme owns its palette, particles, and copy with no leaks across themes. Cute: pastel purple, hearts/star clear particles, affectionate "princess" title. Midnight: dark night palette with moon glow accents, star particles, calm night title. Classic: Block Blast-like board look, geometric particle glyphs, neutral copy. V1 placeholder personalization: title nickname "princess".
- **Audio without assets.** All sounds synthesized with WebAudio oscillators (place blip, clear chime, combo arpeggio, game-over tone); master sound toggle in header.
- **Single test seam.** All game rules live in pure board-state functions (placement validity, apply placement, clear detection, scoring/combo, game-over check, piece definitions) with no DOM, audio, or storage access. Rendering, input, sound, and persistence are thin adapters around that seam. One seam total.
- **State shape (from prototype discipline).** Board as 8x8 occupancy grid, tray as 3 slots (piece + used flag), score/best/combo-streak as numbers. Score events derive from one reducer-style transition: place → detect clears → award → check game over.

## Testing Decisions

- **Scope rule:** automated tests cover the pure-logic seam only. CSS, animation timing, and sound output are never asserted by automated tests. They are verified by the manual QA matrix below.
- **What makes a good test here:** external behavior of the pure-logic seam (given board + piece + position, placement accepted/rejected; given board, correct lines clear; given clear history, correct combo score; given board + tray, correct game-over verdict). Never test DOM structure, CSS, animation timing, or sound output.
- **What gets tested:** the game-logic seam functions listed above. Rendering/input/audio/persistence are verified by manual QA, not automation.
- **Prior art:** none — greenfield repo with no test infrastructure, and the zero-dependency constraint rules out test runners. Verification is a manual QA matrix on a real phone (Chrome + Safari): drag placement, tap fallback, ghost accuracy, clear/combo scoring vs. hand-computed cases, game-over correctness, best-score survival across reload, toggles (sound/vibration/theme/pause), and rotation/resize behavior.
- **Seam confirmation (pending user):** one pure-logic seam, DOM adapters untested-by-automation, manual phone QA as the gate. Confirm this matches expectations before build.

## Out of Scope

Local-first per ADR 0001 (`docs/adr/0001-missions-local-first-no-backend.md`): state lives on device in `localStorage`, no backend, no network calls. The zero third-party request rule in the Implementation Decisions guards this.

- Accounts, login, cloud saves, leaderboards, social sharing.
- Levels, missions, daily challenges, progression systems.
- Backend, databases, analytics, push notifications.
- Native app wrappers (Capacitor/Cordova), PWA install packaging (page works if saved, but install flow is not built).
- Sound asset files (all audio synthesized).
- 3x3-square clears unless the build-time prototype check of the original confirms them.
- Real-name personalization (ships as one-edit placeholder; swap happens post-V1).

## Further Notes

- Personalization swap (real nickname + her favorite colors) is designed as a single obvious edit — flag the exact lines with a comment in the file.
- If she later asks for missions/dailies, that becomes a second spec; V1 architecture (pure-logic seam) keeps that additive.
- Performance budget: first paint fast on mobile data, animations transform/opacity-only to hold 60fps on mid-range phones.
- Tracker publishing note: repo has no git remote, so `gh` publishing to the issue tracker was impossible; this spec lives at `SPEC.md` until a remote is connected, then it should be filed with the `ready-for-agent` label.
