import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Analyzer } from '../../types/index.js';

export const ciTestAnalyzer: Analyzer = {
  id: 'testing/ci-test',
  name: 'Tests in CI',
  description: 'Checks whether CI appears to run tests.',
  category: 'testing',
  async run(context) {
    if (context.fileSystem.ciFiles.length === 0) {
      return [];
    }

    const ciText = (
      await Promise.all(context.fileSystem.ciFiles.map((file) => readFile(path.join(context.root, file), 'utf8')))
    ).join('\n');

    if (/\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\bnode\s+--test\b/.test(ciText)) {
      return [];
    }

    return [
      {
        id: 'testing/no-ci-test-step',
        title: 'CI does not appear to run tests',
        description: 'A CI pipeline exists, but Project Doctor could not find a test step.',
        category: 'testing',
        severity: 'warning',
        files: context.fileSystem.ciFiles,
        fixable: true,
        fixId: 'generate:github-actions-ci',
        analyzer: this.id,
        deduction: 5
      }
    ];
  }
};
