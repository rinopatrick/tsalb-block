import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

// Issue #31: device matrix gate and perf budget. CSS/payload-conformance seam
// over index.html. Every expectation derives from the issue plus SPEC:
// first paint fast on mobile data (single inline file, payload caps), 60fps
// via compositor-only animations whose durations match the JUICE policy.
const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'index.html'
);
const html = fs.readFileSync(filePath, 'utf8');
const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
const script = html.slice(html.indexOf('<script>'), html.indexOf('</script>'));

// Named budget registry: one source of truth, mirrors the PAIRS registry in
// the contrast gate. Floors come from SPEC + deploy evidence (34,556-byte
// fetch at 706ms load vs ~3s target), not from current values.
const PERF_EXPECTED = {
  RAW_MAX: 65536, // 64KB raw: fast on mobile data with ~50% headroom
  GZIP_MAX: 20480, // 20KB gzip: fast on mobile data with ~50% headroom
  FRAME_MS: 16.7, // 60fps frame budget, one frame per clear tick at most
};

function perfFromScript() {
  const m = script.match(/const PERF\s*=\s*\{([^}]*)\}/);
  assert.ok(m, 'PERF registry must exist in the pure-logic seam of index.html');
  const body = m[1];
  const num = (name) => {
    const hit = body.match(new RegExp(name + '\\s*:\\s*([0-9.]+)'));
    assert.ok(hit, `PERF.${name} must be named in the registry`);
    return parseFloat(hit[1]);
  };
  return { RAW_MAX: num('RAW_MAX'), GZIP_MAX: num('GZIP_MAX'), FRAME_MS: num('FRAME_MS') };
}

function juiceNum(name) {
  const hit = script.match(new RegExp(name + '\\s*:\\s*([0-9.]+)'));
  assert.ok(hit, `JUICE.${name} must exist in the pure-logic seam`);
  return parseFloat(hit[1]);
}

test('PERF registry names the budget floors from SPEC', () => {
  const perf = perfFromScript();
  assert.equal(perf.RAW_MAX, PERF_EXPECTED.RAW_MAX, 'raw payload cap is the SPEC-derived floor');
  assert.equal(perf.GZIP_MAX, PERF_EXPECTED.GZIP_MAX, 'gzip payload cap is the SPEC-derived floor');
  assert.equal(perf.FRAME_MS, PERF_EXPECTED.FRAME_MS, 'frame budget is one 60fps frame');
});

test('shipped file fits the payload budget (first-paint proxy)', () => {
  const perf = perfFromScript();
  const raw = fs.statSync(filePath).size;
  const gzip = zlib.gzipSync(fs.readFileSync(filePath)).length;
  assert.ok(raw <= perf.RAW_MAX, `raw ${raw}B fits RAW_MAX ${perf.RAW_MAX}B`);
  assert.ok(gzip <= perf.GZIP_MAX, `gzip ${gzip}B fits GZIP_MAX ${perf.GZIP_MAX}B`);
});

test('first-paint structure: single inline style/script, render-blocking-free', () => {
  assert.equal((html.match(/<style>/g) || []).length, 1, 'one inline <style>');
  assert.equal((html.match(/<script>/g) || []).length, 1, 'one inline <script>');
  assert.ok(!/<link[^>]*rel\s*=\s*["']stylesheet["']/i.test(html), 'no external stylesheet');
  assert.ok(!/<script[^>]*src\s*=/i.test(html), 'no external script');
  assert.ok(html.indexOf('<script>') > html.indexOf('id="board"'), 'script runs after board markup');
  assert.ok(html.includes('name="viewport"'), 'viewport meta for phone first paint');
});

test('animation durations match the JUICE policy (never block next placement)', () => {
  const clearMs = juiceNum('CLEAR_MS');
  const dropMs = juiceNum('DROP_MS');
  const comboMs = juiceNum('COMBO_MS');
  const dur = (sel) => {
    const hit = style.match(new RegExp(sel + '\\s*\\{[^}]*animation\\s*:\\s*\\S+\\s+([0-9.]+)s'));
    assert.ok(hit, `${sel} names an animation duration`);
    return Math.round(parseFloat(hit[1]) * 1000);
  };
  assert.equal(dur('\\.cell\\.clearing'), clearMs, 'pop duration equals JUICE.CLEAR_MS');
  assert.equal(dur('\\.cell\\.drop-in'), dropMs, 'drop duration equals JUICE.DROP_MS');
  assert.equal(dur('#combo-pop\\.show'), comboMs, 'comboPop duration equals JUICE.COMBO_MS');
  assert.ok(clearMs <= PERF_EXPECTED.FRAME_MS * 11, 'clear fits ~11 frames at 60fps');
});

test('keyframes stay compositor-only (transform/opacity/scale), no layout or paint props', () => {
  const blocks = [...style.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)];
  assert.ok(blocks.length >= 4, `at least pop/drop/comboPop/floatUp/hintPulse keyframes (found ${blocks.length})`);
  const banned = ['filter', 'box-shadow', 'background', 'width', 'height', 'top', 'left', 'margin', 'padding'];
  for (const [, name, body] of blocks) {
    const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
    for (const bad of banned) {
      assert.ok(!props.includes(bad), `@keyframes ${name}: banned property ${bad}`);
    }
    assert.ok(
      props.every((p) => ['transform', 'opacity', 'scale'].includes(p)),
      `@keyframes ${name}: only transform/opacity/scale (found ${[...new Set(props)].join(',')})`
    );
  }
});

test('transitions stay bounded (no `all`, short, state feedback only)', () => {
  assert.ok(!/transition\s*:\s*[^;]*\ball\b/.test(style), 'no transition:all');
  assert.ok(!/transition-property\s*:\s*[^;]*\ball\b/.test(style), 'no transition-property:all');
  const reduced = style.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([^@]*)\}/);
  assert.ok(reduced, 'prefers-reduced-motion block exists');
  assert.ok(/\.cell\.clearing/.test(reduced[1]), 'reduced motion disables clearing anims');
  assert.ok(/\.particle/.test(reduced[1]), 'reduced motion disables particles');
  assert.ok(/\.particle\s*\{[^}]*will-change\s*:\s*transform\s*,\s*opacity/.test(style), 'particles hint the compositor');
});
