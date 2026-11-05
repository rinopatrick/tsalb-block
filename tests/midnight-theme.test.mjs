import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Issue #5: midnight theme end-to-end. CSS/JS-conformance seam over index.html.
// Every expectation derives from the issue's acceptance criteria, not from
// current values: exact midnight token ramp, cute->midnight->classic cycle
// with persistence and cute default, midnight readability rules, classic
// untouched, zero third-party requests.
const html = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'),
  'utf8'
);
const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
const script = html.slice(html.indexOf('<script>'), html.indexOf('</script>'));

test('midnight tokens land: bg, grid, tray, cell+border, accent, text', () => {
  for (const token of [
    '1a1025', // --mid-bg1
    '2a1b3d', // --mid-bg2
    '241a35', // --mid-grid (+card/icon surfaces)
    '201531', // --mid-tray
    '4c3d78', // --mid-cell
    '8b7cc0', // --mid-cell-border
    'a78bfa', // --mid-accent
    'e9e4ff', // --mid-text
  ]) {
    assert.ok(
      new RegExp(token, 'i').test(style),
      `midnight token #${token} must land in CSS`
    );
  }
  // tokens wire into the midnight board/cell/tray selectors, not just :root
  for (const sel of [
    'html[data-theme="midnight"] body',
    'html[data-theme="midnight"] #board',
    'html[data-theme="midnight"] .cell',
    'html[data-theme="midnight"] #tray',
  ]) {
    assert.ok(style.includes(sel), `${sel} rule exists`);
  }
});

test('toggle cycles cute->midnight->classic, persists, defaults cute', () => {
  // single-union cycle in exact order
  assert.ok(
    /theme\s*=\s*theme\s*===\s*"cute"\s*\?\s*"midnight"\s*:\s*theme\s*===\s*"midnight"\s*\?\s*"classic"\s*:\s*"cute"/.test(
      script
    ),
    'theme button cycles cute -> midnight -> classic -> cute'
  );
  // persistence round-trips through one key
  assert.ok(script.includes('store.get("bb_theme","cute")'), 'default cute');
  assert.ok(script.includes('store.set("bb_theme",theme)'), 'choice persists');
  // markup opens on cute before JS runs
  assert.ok(html.includes('data-theme="cute"'), 'markup defaults to cute');
});

test('overlays, callouts, particles, ghost previews read on midnight', () => {
  for (const sel of [
    'html[data-theme="midnight"] .card', // game-over + pause overlays
    'html[data-theme="midnight"] #combo-pop', // clear/combo/multi callouts
    'html[data-theme="midnight"] .particle', // clear particles
    'html[data-theme="midnight"] .score-card',
    'html[data-theme="midnight"] #newbest',
  ]) {
    assert.ok(style.includes(sel), `${sel} rule exists`);
  }
  // ghost previews are theme-agnostic outlines: visible on dark grid too
  assert.ok(/\.cell\.ghost-ok\s*\{[^}]*outline/.test(style), 'ghost-ok outline');
  assert.ok(/\.cell\.ghost-bad\s*\{[^}]*outline/.test(style), 'ghost-bad outline');
  // particles stay capped on midnight (same shared cap, board never hidden)
  assert.ok(/PARTICLE_MAX/.test(script), 'particle cap seam present');
  assert.ok(
    script.includes('pickParticleCells('),
    'capped sampling seam used by particle renderer'
  );
  // midnight reuses the varied cute piece palette, not a flat fill
  assert.ok(
    /function palette\(\)\s*\{\s*return theme\s*===\s*"classic"\s*\?\s*CLASSIC_COLORS\s*:\s*CUTE_COLORS/.test(
      script
    ),
    'midnight shares the varied cute palette'
  );
});

test('midnight branches theme-conditional copy on the single theme union', () => {
  assert.ok(script.includes('"💜 Princess Blast"'), 'midnight title keeps Princess');
  assert.ok(script.includes('"🌙"'), 'midnight theme-button glyph');
  assert.ok(script.includes('"💜 Game Over!"'), 'midnight over-emoji');
  assert.ok(/one more\? 🌙/.test(script), 'midnight over-msg keeps princess line');
});

test('classic selectors and copy untouched by midnight work', () => {
  const classicRules = style.match(/html\[data-theme="classic"\][^{]*\{[^}]*\}/g) || [];
  assert.ok(classicRules.length > 0, 'classic selectors exist');
  for (const rule of classicRules) {
    assert.ok(
      !/--mid-|a78bfa|8b7cc0|4c3d78|1a1025|2a1b3d|241a35|201531|e9e4ff/.test(rule),
      `midnight leaked into classic: ${rule}`
    );
  }
  assert.ok(script.includes('"🧱 Block Blast"'), 'classic title copy intact');
  // no pink anywhere: midnight is purple-only like cute
  for (const pink of ['ec4899', 'a21caf', '831843']) {
    assert.ok(!new RegExp(pink, 'i').test(style), `pink #${pink} absent`);
  }
});

test('zero third-party requests in index.html', () => {
  assert.ok(!/https?:\/\//.test(html), 'no remote URLs');
});
