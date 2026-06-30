import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runScan, renderReport } from '../packages/core/dist/index.js';
import { issuesFromOutdatedReport } from '../packages/core/dist/analyzers/dependency/outdated.js';
import { issuesFromDeprecatedPackages } from '../packages/core/dist/analyzers/dependency/deprecated.js';
import { issuesFromAuditReport } from '../packages/core/dist/analyzers/security/npm-audit.js';

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

test('npm audit parser groups vulnerability severities', () => {
  const issues = issuesFromAuditReport({
    vulnerabilities: {
      lodash: {
        severity: 'high',
        via: [{ title: 'Prototype pollution' }]
      },
      minimist: {
        severity: 'low',
        via: ['minimist']
      }
    }
  });

  assert.ok(issues.some((issue) => issue.id === 'security/npm-audit-high' && issue.fixId === 'fix:npm-audit'));
  assert.ok(issues.some((issue) => issue.id === 'security/npm-audit-low'));
});

test('npm outdated parser separates major from non-major updates', () => {
  const issues = issuesFromOutdatedReport({
    commander: { current: '12.1.0', wanted: '12.1.0', latest: '14.0.0' },
    typescript: { current: '5.7.0', wanted: '5.9.0', latest: '5.9.3' }
  });

  assert.ok(issues.some((issue) => issue.id === 'dependencies/outdated-major'));
  assert.ok(issues.some((issue) => issue.id === 'dependencies/outdated-minor'));
});

test('deprecated package parser emits update guidance', () => {
  const issues = issuesFromDeprecatedPackages(['left-pad@1.3.0: use String.prototype.padStart']);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].id, 'dependencies/deprecated');
  assert.equal(issues[0].fixId, 'fix:update-deps');
});
