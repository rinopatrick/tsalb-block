# ADR 0001: missions stay local-first, no backend

Date: 2026-11-06
Resolves: #12 (part of #11)
Status: accepted

## Context

Issue #11 sets the missions destination as local-first missions plus dailies in the single self-contained `index.html`, with the pure-logic seam extended, Classic untouched, and zero third-party requests kept. A prior scope pick said backend included. That pick contradicts the SPEC out-of-scope list (accounts, login, cloud saves, leaderboards, social sharing, backend, databases, analytics, push notifications) and the destination itself. Issue #12 asks for one answer to unblock #13 through #16.

## Decision

The missions map includes no backend. Accounts, auth, sync, cloud saves, leaderboards, analytics, and push stay out. Mission state, daily seed and streak state live in `localStorage` beside the existing best score, theme, and toggle keys. The daily seed derives from the calendar date on device. No network calls exist and none get added.

## Consequences

Tickets #13 (mission model), #14 (daily seed, streak, persistence shape), #15 (prototype sketch), and #16 (seam extension) proceed on a local-only basis. #14 must define streak behavior across missed days and time zones from the device clock alone, since no server clock exists. The contrast and zero-request gate in `tests/contrast-deploy-gate.test.mjs` keeps guarding the shipped file, so any future network addition fails the suite. If a later spec wants cloud saves or leaderboards, it reopens this ADR with its own ticket.
