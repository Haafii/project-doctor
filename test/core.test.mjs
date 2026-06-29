import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runScan, renderReport } from '../packages/core/dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = (name) => path.join(root, 'test/fixtures', name);

test('minimal fixture receives a low score and dependency findings', async () => {
  const report = await runScan({ root: fixture('minimal-js') });
  assert.ok(report.score.total < 50);
  assert.ok(report.issues.some((issue) => issue.id === 'dependencies/missing'));
  assert.ok(report.issues.some((issue) => issue.id === 'dependencies/unused'));
});

test('healthy fixture receives a high score', async () => {
  const report = await runScan({ root: fixture('healthy-ts') });
  assert.ok(report.score.total >= 80);
  assert.equal(report.issues.some((issue) => issue.severity === 'critical'), false);
});

test('json formatter emits parseable output', async () => {
  const report = await runScan({ root: fixture('healthy-ts') });
  const rendered = renderReport(report, 'json', { minSeverity: 'info' });
  const parsed = JSON.parse(rendered.toString());
  assert.equal(parsed.project.name, 'healthy-ts');
  assert.equal(typeof parsed.score.total, 'number');
});
