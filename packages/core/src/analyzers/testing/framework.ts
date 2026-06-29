import type { Analyzer, Issue } from '../../types/index.js';
import { packageHasScript } from '../../utils/package.js';

const knownFrameworks = [
  'vitest',
  'jest',
  '@jest/globals',
  'mocha',
  'ava',
  'uvu',
  'tap',
  'node:test',
  '@playwright/test',
  'cypress'
];

export const testingAnalyzer: Analyzer = {
  id: 'testing/framework',
  name: 'Testing setup',
  description: 'Checks that tests and coverage are discoverable.',
  category: 'testing',
  async run(context) {
    const allDeps = {
      ...context.packageJson.dependencies,
      ...context.packageJson.devDependencies
    };
    const hasFramework = knownFrameworks.some((name) => allDeps[name]) || packageHasScript(context.packageJson, ['test']);
    const issues: Issue[] = [];

    if (!hasFramework) {
      issues.push({
        id: 'testing/framework-missing',
        title: 'No test framework detected',
        description: 'Projects should have a repeatable test command and a known test runner.',
        category: 'testing',
        severity: 'error',
        fixable: true,
        fixId: 'fix:add-test-script',
        analyzer: this.id,
        deduction: 15
      });
    }

    if (context.fileSystem.testFiles.length === 0) {
      issues.push({
        id: 'testing/test-files-missing',
        title: 'No test files found',
        description: 'No files matching common test patterns were found.',
        category: 'testing',
        severity: 'warning',
        fixable: false,
        analyzer: this.id,
        deduction: 10
      });
    }

    if (!packageHasScript(context.packageJson, ['coverage']) && !context.fileSystem.configFiles.some((file) => /c8|nyc|vitest|jest/.test(file))) {
      issues.push({
        id: 'testing/coverage-missing',
        title: 'Coverage is not configured',
        description: 'Coverage reporting helps reveal untested code paths before releases.',
        category: 'testing',
        severity: 'info',
        fixable: false,
        analyzer: this.id,
        deduction: 3
      });
    }

    return issues;
  }
};
