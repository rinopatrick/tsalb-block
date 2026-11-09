import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Issue #29: mission done callout plus play-based daily streak.
// Behavior contract from #27: the done flip fires one callout through the
// single-callout path plus the list mark, exactly once per mission; lines
// missions accrue only on clears, score missions accrue every gain including
// dry placements; a played run advances the daily even with no clear;
// same-day idempotent, next-day plus one, gap of two or more resets to one.
// Expected values are hand-computed literals, never recomputed from the code.
const html = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'),
  'utf8'
);
const src = html.slice(html.indexOf('const N = 8;'), html.indexOf('/* ============ ADAPTERS'));
assert.ok(src.includes('function fits('), 'pure-logic seam missing from index.html');
const box = {};
vm.createContext(box);
vm.runInContext(
  src + '\nthis.__api = { missionEventFor, missionProgressFor, dailyStreakFor, sketchDailyFor, missionDoneFlipsFor, sketchAdvanceFor };',
  box
);
const api = box.__api;
const clone = (v) => JSON.parse(JSON.stringify(v));
const missionEventFor = (...a) => clone(api.missionEventFor(...a));
const missionProgressFor = (...a) => clone(api.missionProgressFor(...a));
const sketchDailyFor = (...a) => clone(api.sketchDailyFor(...a));
const missionDoneFlipsFor = (...a) => clone(api.missionDoneFlipsFor(...a));
const sketchAdvanceFor = (...a) => clone(api.sketchAdvanceFor(...a));

const DRY = { lines: 0, clearedCount: 0, streakAfter: 0, boardCleared: false, scoreGain: 2, isClear: false };
const CLEAR2 = { lines: 2, clearedCount: 15, streakAfter: 2, boardCleared: false, scoreGain: 244, isClear: true };

test('done flip: lines mission crossing target reports one flip', () => {
  const before = [{ id: 'l0', kind: 'lines', target: 10, progress: 9, done: false }];
  const after = [missionProgressFor(before[0], CLEAR2)];
  assert.deepEqual(after, [{ id: 'l0', kind: 'lines', target: 10, progress: 10, done: true }]);
  assert.deepEqual(missionDoneFlipsFor(before, after), after);
});

test('done flip: score mission completes on a dry gain', () => {
  const before = [{ id: 's1', kind: 'score', target: 500, progress: 498, done: false }];
  const after = [missionProgressFor(before[0], DRY)];
  assert.deepEqual(after, [{ id: 's1', kind: 'score', target: 500, progress: 500, done: true }]);
  assert.deepEqual(missionDoneFlipsFor(before, after), after);
});

test('done flip: pending missions report no flip', () => {
  const before = [{ id: 'l0', kind: 'lines', target: 10, progress: 3, done: false }];
  const after = [missionProgressFor(before[0], CLEAR2)];
  assert.deepEqual(missionDoneFlipsFor(before, after), []);
});

test('done flip: already done never flips again, exactly once per mission', () => {
  const done = { id: 'l0', kind: 'lines', target: 10, progress: 10, done: true };
  const again = missionProgressFor(done, CLEAR2);
  assert.deepEqual(again, done);
  assert.deepEqual(missionDoneFlipsFor([done], [again]), []);
});

test('advance: dry placement accrues score, freezes lines, advances daily next-day', () => {
  const missions = [
    { id: 'sk-lines', kind: 'lines', target: 10, progress: 3, done: false },
    { id: 'sk-score', kind: 'score', target: 500, progress: 498, done: false },
  ];
  const next = sketchAdvanceFor(missions, { streak: 3, lastDay: '2026-11-05' }, DRY, '2026-11-06');
  assert.deepEqual(next.missions, [
    { id: 'sk-lines', kind: 'lines', target: 10, progress: 3, done: false },
    { id: 'sk-score', kind: 'score', target: 500, progress: 500, done: true },
  ]);
  assert.deepEqual(next.flips, [
    { id: 'sk-score', kind: 'score', target: 500, progress: 500, done: true },
  ]);
  assert.deepEqual(next.daily, { seed: '2026-11-06', streak: 4, lastDay: '2026-11-06' });
});

test('advance: same-day dry run is idempotent, no second flip', () => {
  const missions = [
    { id: 'sk-lines', kind: 'lines', target: 10, progress: 3, done: false },
    { id: 'sk-score', kind: 'score', target: 500, progress: 500, done: true },
  ];
  const next = sketchAdvanceFor(missions, { streak: 4, lastDay: '2026-11-06' }, DRY, '2026-11-06');
  assert.deepEqual(next.missions, missions);
  assert.deepEqual(next.flips, []);
  assert.deepEqual(next.daily, { seed: '2026-11-06', streak: 4, lastDay: '2026-11-06' });
});

test('advance: clear accrues lines missions, gap of two plus days resets daily to one', () => {
  const missions = [{ id: 'sk-lines', kind: 'lines', target: 10, progress: 3, done: false }];
  const next = sketchAdvanceFor(missions, { streak: 7, lastDay: '2026-11-03' }, CLEAR2, '2026-11-06');
  assert.deepEqual(next.missions, [
    { id: 'sk-lines', kind: 'lines', target: 10, progress: 5, done: false },
  ]);
  assert.deepEqual(next.flips, []);
  assert.deepEqual(next.daily, { seed: '2026-11-06', streak: 1, lastDay: '2026-11-06' });
});

test('advance: both missions flipping same event list both, adapter fires one callout', () => {
  const missions = [
    { id: 'sk-lines', kind: 'lines', target: 10, progress: 9, done: false },
    { id: 'sk-score', kind: 'score', target: 500, progress: 400, done: false },
  ];
  const big = missionEventFor({ cellsPlaced: 4, clearedCount: 15, lines: 2, streakAfter: 2, boardCleared: false });
  const next = sketchAdvanceFor(missions, { streak: 3, lastDay: '2026-11-05' }, big, '2026-11-06');
  assert.equal(next.flips.length, 2);
  assert.deepEqual(next.daily, { seed: '2026-11-06', streak: 4, lastDay: '2026-11-06' });
});
