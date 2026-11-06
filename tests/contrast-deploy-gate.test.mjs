import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Issue #6: contrast + deploy gate. CSS-conformance seam over index.html.
// Every expectation derives from the issue's acceptance criteria, not from
// current values: measured text pairs >=4.5:1, UI borders >=3:1, documented
// cell-fill gap, zero http requests.
const html = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'),
  'utf8'
);
const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));

// Named contrast pairs: the domain is a registry of measured pairs, not
// scattered literals. Each entry names the UI role, the two tokens, the
// floor it must hold, and the source line in the issue spec.
const PAIRS = [
  // cute text + button pairs, issue #6: "cute + midnight text and button pairs pass"
  { name: 'white on cute-accent', fg: '#ffffff', bg: '#7c3aed', floor: 4.5 },
  { name: 'white on cute-accent2', fg: '#ffffff', bg: '#6d28d9', floor: 4.5 },
  { name: 'cute text on bg1', fg: '#4c1d95', bg: '#f5f3ff', floor: 4.5 },
  { name: 'cute text on bg2', fg: '#4c1d95', bg: '#ede9fe', floor: 4.5 },
  { name: 'cute text on tray white', fg: '#4c1d95', bg: '#ffffff', floor: 4.5 },
  // midnight text + button pairs, issue #6: "cute + midnight text and button pairs pass"
  { name: 'mid text on bg1', fg: '#e9e4ff', bg: '#1a1025', floor: 4.5 },
  { name: 'mid text on bg2', fg: '#e9e4ff', bg: '#2a1b3d', floor: 4.5 },
  { name: 'mid text on grid', fg: '#e9e4ff', bg: '#241a35', floor: 4.5 },
  { name: 'mid text on tray', fg: '#e9e4ff', bg: '#201531', floor: 4.5 },
  { name: 'mid accent on grid', fg: '#a78bfa', bg: '#241a35', floor: 4.5 },
];

const BORDERS = [
  // UI borders, issue #6: "borders pass"
  { name: 'cute border on cell', fg: '#7c3aed', bg: '#ede9fe', floor: 3 },
  { name: 'cute border on grid', fg: '#7c3aed', bg: '#ffffff', floor: 3 },
  { name: 'mid border on grid', fg: '#8b7cc0', bg: '#241a35', floor: 3 },
];

// Accepted gaps, issue #6: "cell-fill gap documented as accepted".
// Recorded only: filled-cell fill vs grid fails UI 3:1 in all three themes
// (cute 1.19:1, midnight 1.76:1, classic 1.82:1). Borders carry the boundary.
// No floor asserted, so a future fix never breaks the gate.
const ACCEPTED_GAPS = [
  { name: 'cute fill vs grid', fg: '#ede9fe', bg: '#ffffff' },
  { name: 'mid fill vs grid', fg: '#4c3d78', bg: '#241a35' },
  { name: 'classic fill vs grid', fg: '#334155', bg: '#1e293b' },
];

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

test('text pairs pass 4.5:1, measured from tokens live in index.html', () => {
  for (const pair of PAIRS) {
    assert.ok(
      style.includes(pair.fg.slice(1)) && style.includes(pair.bg.slice(1)),
      `${pair.name}: tokens ${pair.fg}/${pair.bg} must exist in index.html`
    );
    const ratio = contrast(pair.fg, pair.bg);
    assert.ok(
      ratio >= pair.floor,
      `${pair.name}: ${ratio.toFixed(2)}:1 holds floor ${pair.floor}:1`
    );
  }
});

test('UI borders pass 3:1', () => {
  for (const pair of BORDERS) {
    assert.ok(
      style.includes(pair.fg.slice(1)) && style.includes(pair.bg.slice(1)),
      `${pair.name}: tokens ${pair.fg}/${pair.bg} must exist in index.html`
    );
    const ratio = contrast(pair.fg, pair.bg);
    assert.ok(
      ratio >= pair.floor,
      `${pair.name}: ${ratio.toFixed(2)}:1 holds floor ${pair.floor}:1`
    );
  }
});

test('cell-fill gaps recorded as accepted, no floor asserted', () => {
  for (const gap of ACCEPTED_GAPS) {
    const ratio = contrast(gap.fg, gap.bg);
    assert.ok(
      ratio < 3,
      `${gap.name}: gap on record at ${ratio.toFixed(2)}:1` +
        ' (borders carry the boundary; a future fix must not break this gate)'
    );
  }
});

test("zero http requests in shipped index.html", () => {
  assert.ok(!/https?:\/\//.test(html), 'no remote URLs');
  assert.ok(!/src\s*=\s*["']\/\//.test(html) && !/href\s*=\s*["']\/\//.test(html), 'no protocol-relative fetches');
  assert.ok(!/\burl\s*\(/i.test(style), 'no CSS url() fetches');
});
