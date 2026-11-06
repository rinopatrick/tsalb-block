import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Issue #11 map acceptance: the merged second spec exists in docs/issues and
// records every decided child ticket with implementation pointers.
const specPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'docs',
  'issues',
  '06-missions-progression.md'
);

test('merged missions spec exists', () => {
  assert.ok(fs.existsSync(specPath), 'missions merged spec missing from docs/issues');
});

test('merged spec records all five child decisions with pointers', () => {
  const spec = fs.readFileSync(specPath, 'utf8');
  for (const token of ['#12', 'local-first', '#13', 'counter', '#14', 'YYYY-MM-DD', '#16', 'missionEventFor', '#15', 'sketch']) {
    assert.ok(spec.includes(token), `merged spec must mention ${token}`);
  }
});

test('merged spec keeps hard constraints explicit', () => {
  const spec = fs.readFileSync(specPath, 'utf8');
  for (const token of ['Classic untouched', 'zero third-party', 'bb_missions', 'bb_dailies']) {
    assert.ok(spec.includes(token), `merged spec must keep constraint ${token}`);
  }
});
