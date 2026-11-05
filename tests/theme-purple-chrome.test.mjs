import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Issue #4: purple-only cute chrome. CSS-conformance seam over index.html.
// Every expectation derives from the issue's acceptance criteria, not from
// current values: pinks banned, contrast floors, exact-property transitions,
// .96 press, reduced-motion coverage, classic untouched, varied pieces,
// zero third-party requests.
const html = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'),
  'utf8'
);
const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
const script = html.slice(html.indexOf('<script>'), html.indexOf('</script>'));

function lum(hex) {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

test('no pink chrome outside classic selectors', () => {
  for (const pink of ['ec4899', 'a21caf', '831843']) {
    assert.ok(
      !new RegExp(pink, 'i').test(style),
      `pink #${pink} must not appear in any chrome rule`
    );
  }
  // rgba(236,72,153) is #ec4899 in another notation: banned too
  assert.ok(!/236\s*,\s*72\s*,\s*153/.test(style), 'pink rgba(236,72,153) must not remain');
});

test('white button text on purple ramp passes 4.5:1; cute body text passes 4.5:1', () => {
  assert.ok(contrast('#ffffff', '#7c3aed') >= 4.5, 'white on #7c3aed');
  assert.ok(contrast('#ffffff', '#6d28d9') >= 4.5, 'white on #6d28d9');
  assert.ok(contrast('#4c1d95', '#f5f3ff') >= 4.5, 'cute text on cute bg1');
  assert.ok(contrast('#4c1d95', '#ede9fe') >= 4.5, 'cute text on cute bg2');
  assert.ok(contrast('#4c1d95', '#ffffff') >= 4.5, 'cute text on tray/card white');
});

test('press scales to .96 with exact-property transitions, no double-scale', () => {
  assert.ok(/button\.icon:not\([^)]*\):active\s*\{\s*scale\s*:\s*\.96/.test(style), 'icon press .96');
  assert.ok(/\.card button:not\([^)]*\):active\s*\{\s*scale\s*:\s*\.96/.test(style), 'card button press .96');
  // scale property and transform:scale(.96) must never stack on the same :active
  const actives = style.match(/[^{]*:active\s*\{[^}]*\}/g) || [];
  assert.ok(actives.length > 0, 'press rules exist');
  for (const rule of actives) {
    const hasScaleProp = /(^|[;{])\s*scale\s*:/.test(rule);
    const hasTransformScale = /transform\s*:[^;}]*scale\s*\(\s*\.96/.test(rule);
    assert.ok(!(hasScaleProp && hasTransformScale), `double-scale in: ${rule}`);
  }
  // transitions name exact properties, never `all`
  const transitions = style.match(/transition-property\s*:[^;]+;/g) || [];
  assert.ok(transitions.length > 0, 'transition-property rules exist');
  for (const t of transitions) assert.ok(!/:\s*all\b/.test(t), `must not transition all: ${t}`);
});

test('reduced-motion disables animations and press transitions', () => {
  const mq = style.match(/@media\s*\(prefers-reduced-motion\s*:\s*reduce\)\s*\{([^]*?)\}\s*<\/style>/);
  const block = (mq && mq[1]) || style.slice(style.indexOf('prefers-reduced-motion'));
  assert.ok(/animation\s*:\s*none/.test(block), 'animations disabled under reduced motion');
  assert.ok(/transition\s*:\s*none/.test(block), 'press transitions disabled under reduced motion');
});

test('classic theme selectors and copy untouched by purple ramp', () => {
  const classicRules = style.match(/html\[data-theme="classic"\][^{]*\{[^}]*\}/g) || [];
  assert.ok(classicRules.length > 0, 'classic selectors exist');
  for (const rule of classicRules) {
    assert.ok(!/7c3aed|6d28d9|4c1d95|a855f7|--cute-|--mid-/.test(rule), `purple leaked into classic: ${rule}`);
  }
  assert.ok(script.includes('"🧱 Block Blast"'), 'classic title copy intact');
  assert.ok(script.includes('"Game Over"'), 'classic game-over copy intact');
  // classic keeps its own piece palette seam
  assert.ok(/CLASSIC_COLORS\s*=\s*\[/.test(script), 'classic palette seam intact');
});

test('pieces stay varied in all themes', () => {
  for (const name of ['CUTE_COLORS', 'CLASSIC_COLORS']) {
    const m = script.match(new RegExp(name + '\\s*=\\s*\\[([^\\]]*)\\]'));
    assert.ok(m, `${name} palette exists`);
    const entries = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    assert.ok(entries.length >= 5, `${name} keeps >=5 piece colors, got ${entries.length}`);
    assert.ok(new Set(entries).size === entries.length, `${name} colors distinct`);
  }
});

test('zero third-party requests in index.html', () => {
  assert.ok(!/https?:\/\//.test(html), 'no remote URLs');
  assert.ok(!/\burl\s*\(/i.test(style), 'no CSS url() fetches');
});
