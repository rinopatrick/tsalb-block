import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Issue #15: cheapest throwaway missions sketch surfaced in index.html.
// Behavior contract from #13/#14: missions read only from reducer events via
// the #16 seam (missionEventFor/missionProgressFor/dailySeedFor/dailyStreakFor),
// persisted under namespaced bb_missions/bb_dailies keys, Classic untouched.
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
  src + '\nthis.__api = { missionEventFor, missionProgressFor, dailySeedFor, dailyStreakFor, MISSION_KEYS, sketchMissionsFor, sketchDailyFor, sketchTextFor };',
  box
);
const api = box.__api;
const clone = (v) => JSON.parse(JSON.stringify(v));

test('sketch defines two throwaway missions with hand-set targets', () => {
  assert.deepEqual(clone(api.sketchMissionsFor()), [
    { id: 'sk-lines', kind: 'lines', target: 10, progress: 0, done: false },
    { id: 'sk-score', kind: 'score', target: 500, progress: 0, done: false },
  ]);
});

test('sketch lines text reads progress fraction from reducer events only', () => {
  const next = clone(
    api.missionProgressFor(
      { id: 'sk-lines', kind: 'lines', target: 10, progress: 3, done: false },
      { lines: 2, clearedCount: 15, streakAfter: 2, boardCleared: false, scoreGain: 244, isClear: true }
    )
  );
  assert.equal(api.sketchTextFor(next), 'Clear 10 lines: 5/10');
});

test('sketch score text reads done state once target reached', () => {
  const next = clone(
    api.missionProgressFor(
      { id: 'sk-score', kind: 'score', target: 500, progress: 498, done: false },
      { lines: 0, clearedCount: 0, streakAfter: 0, boardCleared: false, scoreGain: 2, isClear: false }
    )
  );
  assert.equal(next.done, true);
  assert.equal(api.sketchTextFor(next), 'Score 500 in one run: done!');
});

test('sketch daily text uses device-local seed plus streak, hand-computed', () => {
  const seed = api.dailySeedFor(2026, 11, 6);
  assert.equal(seed, '2026-11-06');
  const daily = clone(api.sketchDailyFor({ streak: 3, lastDay: '2026-11-05' }, seed));
  assert.deepEqual(daily, { seed: '2026-11-06', streak: 4, lastDay: '2026-11-06' });
  assert.equal(api.sketchTextFor({ id: 'sk-daily', kind: 'daily', target: 1, progress: 4, done: true }), 'Daily done — streak 4');
});

test('sketch panel exists in index.html without touching classic selectors', () => {
  assert.ok(html.includes('id="missions"'), 'throwaway missions panel missing from index.html');
  assert.ok(html.includes('bb_missions') && html.includes('bb_dailies'), 'namespaced keys missing from index.html');
  for (const token of ['--classic-grid', '--classic-cell', '--classic-accent']) {
    assert.ok(html.includes(token), `classic token ${token} must survive the sketch`);
  }
});

test('sketch adds zero http requests', () => {
  assert.ok(!/https?:\/\//.test(html), 'no remote URLs');
});
