import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Issue #16 slice 1: placement-derived mission event.
// Behavior contract from #13: single-objective progress derives from
// existing board reducer events only, never DOM reads or animation callbacks.
// Expected values are hand-computed from the rules seam, not from the code.
const html = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'),
  'utf8'
);
const src = html.slice(html.indexOf('const N = 8;'), html.indexOf('/* ============ ADAPTERS'));
assert.ok(src.includes('function fits('), 'pure-logic seam missing from index.html');
const box = {};
vm.createContext(box);
vm.runInContext(src + '\nthis.__api = { missionEventFor, missionProgressFor, dailySeedFor, dailyStreakFor, MISSION_KEYS };', box);
const api = box.__api;
const clone = (v) => JSON.parse(JSON.stringify(v));
const missionEventFor = (...a) => clone(api.missionEventFor(...a));
const missionProgressFor = (...a) => clone(api.missionProgressFor(...a));
const dailySeedFor = (...a) => api.dailySeedFor(...a);
const dailyStreakFor = (...a) => clone(api.dailyStreakFor(...a));

test('dry placement emits zero-progress event with hand-computed gain', () => {
  assert.deepEqual(
    missionEventFor({ cellsPlaced: 2, clearedCount: 0, lines: 0, streakAfter: 0, boardCleared: false }),
    { lines: 0, clearedCount: 0, streakAfter: 0, boardCleared: false, scoreGain: 2, isClear: false }
  );
});

test('single-line clear emits one clear with hand-computed gain 82', () => {
  assert.deepEqual(
    missionEventFor({ cellsPlaced: 2, clearedCount: 8, lines: 1, streakAfter: 1, boardCleared: false }),
    { lines: 1, clearedCount: 8, streakAfter: 1, boardCleared: false, scoreGain: 82, isClear: true }
  );
});

test('multi-line combo clear emits streak plus board state, gain 244', () => {
  assert.deepEqual(
    missionEventFor({ cellsPlaced: 4, clearedCount: 15, lines: 2, streakAfter: 2, boardCleared: false }),
    { lines: 2, clearedCount: 15, streakAfter: 2, boardCleared: false, scoreGain: 244, isClear: true }
  );
});

test('board clear passes the flag through with hand-computed gain 81', () => {
  assert.deepEqual(
    missionEventFor({ cellsPlaced: 1, clearedCount: 8, lines: 1, streakAfter: 1, boardCleared: true }),
    { lines: 1, clearedCount: 8, streakAfter: 1, boardCleared: true, scoreGain: 81, isClear: true }
  );
});

test('mission pending: clear lines accrue toward target, done stays false', () => {
  assert.deepEqual(
    missionProgressFor({ id: 'l0', kind: 'lines', target: 10, progress: 3, done: false }, { lines: 2, clearedCount: 15, streakAfter: 2, boardCleared: false, scoreGain: 244, isClear: true }),
    { id: 'l0', kind: 'lines', target: 10, progress: 5, done: false }
  );
});

test('mission completes: counter crossing target flips done once', () => {
  assert.deepEqual(
    missionProgressFor({ id: 'l0', kind: 'lines', target: 10, progress: 9, done: false }, { lines: 1, clearedCount: 8, streakAfter: 1, boardCleared: false, scoreGain: 82, isClear: true }),
    { id: 'l0', kind: 'lines', target: 10, progress: 10, done: true }
  );
});

test('mission done stays done: further clears do not move counter', () => {
  assert.deepEqual(
    missionProgressFor({ id: 'l0', kind: 'lines', target: 10, progress: 10, done: true }, { lines: 2, clearedCount: 16, streakAfter: 2, boardCleared: false, scoreGain: 244, isClear: true }),
    { id: 'l0', kind: 'lines', target: 10, progress: 10, done: true }
  );
});

test('mission ignores dry placements: counter moves only on clears', () => {
  assert.deepEqual(
    missionProgressFor({ id: 'l0', kind: 'lines', target: 10, progress: 3, done: false }, { lines: 0, clearedCount: 0, streakAfter: 0, boardCleared: false, scoreGain: 2, isClear: false }),
    { id: 'l0', kind: 'lines', target: 10, progress: 3, done: false }
  );
});

test('daily seed: device-local YYYY-MM-DD string, same date maps same', () => {
  assert.equal(dailySeedFor(2026, 11, 6), '2026-11-06');
  assert.equal(dailySeedFor(2026, 1, 5), '2026-01-05');
  assert.equal(dailySeedFor(2026, 11, 6), dailySeedFor(2026, 11, 6));
});

test('daily streak: next calendar day increments by one', () => {
  assert.deepEqual(
    dailyStreakFor({ streak: 3, lastDay: '2026-11-05' }, '2026-11-06'),
    { streak: 4, lastDay: '2026-11-06' }
  );
});

test('daily streak: same day is idempotent, never double-counts', () => {
  assert.deepEqual(
    dailyStreakFor({ streak: 3, lastDay: '2026-11-06' }, '2026-11-06'),
    { streak: 3, lastDay: '2026-11-06' }
  );
});

test('daily streak: gap of two or more days resets to one', () => {
  assert.deepEqual(
    dailyStreakFor({ streak: 7, lastDay: '2026-11-03' }, '2026-11-06'),
    { streak: 1, lastDay: '2026-11-06' }
  );
  assert.deepEqual(
    dailyStreakFor({ streak: 7, lastDay: '2026-11-04' }, '2026-11-06'),
    { streak: 1, lastDay: '2026-11-06' }
  );
});

test('mission keys: namespaced beside existing keys, Classic keys untouched', () => {
  const raw = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
  assert.ok(raw.includes('bb_missions') && raw.includes('bb_dailies'), 'namespaced keys live in index.html');
  assert.deepEqual(clone(api.MISSION_KEYS), { missions: 'bb_missions', dailies: 'bb_dailies' });
});

test('score mission: dry placement gain accrues, completes at target', () => {
  assert.deepEqual(
    missionProgressFor({ kind: 'score', target: 500, progress: 498, done: false }, { lines: 0, clearedCount: 0, streakAfter: 0, boardCleared: false, scoreGain: 2, isClear: false }),
    { kind: 'score', target: 500, progress: 500, done: true }
  );
});

test('score mission: clear gain accrues mid-run, identity preserved', () => {
  assert.deepEqual(
    missionProgressFor({ id: 's1', kind: 'score', target: 500, progress: 400, done: false }, { lines: 1, clearedCount: 8, streakAfter: 1, boardCleared: false, scoreGain: 82, isClear: true }),
    { id: 's1', kind: 'score', target: 500, progress: 482, done: false }
  );
});

test('lines mission: identity preserved through progress', () => {
  assert.deepEqual(
    missionProgressFor({ id: 'l1', kind: 'lines', target: 10, progress: 3, done: false }, { lines: 2, clearedCount: 15, streakAfter: 2, boardCleared: false, scoreGain: 244, isClear: true }),
    { id: 'l1', kind: 'lines', target: 10, progress: 5, done: false }
  );
});

test('daily streak: first run with no last day starts at one', () => {
  assert.deepEqual(
    dailyStreakFor({ streak: 0, lastDay: '' }, '2026-11-06'),
    { streak: 1, lastDay: '2026-11-06' }
  );
});

test('daily streak: invalid last day resets to one, never NaN', () => {
  assert.deepEqual(
    dailyStreakFor({ streak: 5, lastDay: 'not-a-date' }, '2026-11-06'),
    { streak: 1, lastDay: '2026-11-06' }
  );
});
