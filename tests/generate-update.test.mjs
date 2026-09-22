import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { generate, indiaDay } from '../scripts/generate-update.mjs';

test('India day changes at 18:30 UTC', () => {
  assert.equal(indiaDay(new Date('2026-09-22T18:29:59Z')), '2026-09-22');
  assert.equal(indiaDay(new Date('2026-09-22T18:30:00Z')), '2026-09-23');
});

test('partial recovery, repeated runs, next day, bounded executable output', () => {
  const root = mkdtempSync(join(tmpdir(), 'autogitupdater-test-'));
  try {
    assert.equal(generate(1, root, '2026-09-22'), true);
    assert.equal(generate(1, root, '2026-09-22'), false);
    for (const slot of [2, 3]) assert.equal(generate(slot, root, '2026-09-22'), true);
    for (const slot of [1, 2, 3]) {
      assert.equal(generate(slot, root, '2026-09-22'), false);
      assert.equal(generate(slot, root, '2026-09-23'), true);
      const code = readFileSync(join(root, 'Project_github1', `example-${slot}.js`), 'utf8');
      assert.ok(code.length < 500);
      runInNewContext(code, {}, { timeout: 1000 });
    }
    assert.equal(readdirSync(join(root, 'Project_github1')).length, 3);
    assert.throws(() => generate(1, root, '2026-09-22'), /backdate/);
    assert.throws(() => generate(4, root), /Slot/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('does not overwrite an unrelated file', () => {
  const root = mkdtempSync(join(tmpdir(), 'autogitupdater-test-'));
  try {
    mkdirSync(join(root, 'Project_github1'));
    writeFileSync(join(root, 'Project_github1/example-1.js'), '// my work');
    assert.throws(() => generate(1, root), /unrecognized/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
