import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Analyzer, Issue } from '../../types/index.js';

export const typescriptAnalyzer: Analyzer = {
  id: 'quality/typescript',
  name: 'TypeScript configuration',
  description: 'Checks TypeScript projects for a tsconfig and strict mode.',
  category: 'quality',
  async run(context) {
    const isTypeScriptProject =
      context.fileSystem.sourceFiles.some((file) => /\.(ts|tsx|mts|cts)$/.test(file)) ||
      Boolean(context.packageJson.devDependencies?.typescript ?? context.packageJson.dependencies?.typescript);

    if (!isTypeScriptProject) {
      return [];
    }

    const issues: Issue[] = [];
    const tsconfig = context.fileSystem.configFiles.find((file) => file === 'tsconfig.json');
    if (!tsconfig) {
      issues.push({
        id: 'quality/tsconfig-missing',
        title: 'tsconfig.json is missing',
        description: 'TypeScript projects should have an explicit tsconfig so type checking is reproducible.',
        category: 'quality',
        severity: 'warning',
        fixable: true,
        fixId: 'generate:tsconfig',
        analyzer: this.id,
        deduction: 3
      });
      return issues;
    }

    const raw = await readFile(path.join(context.root, tsconfig), 'utf8');
    try {
      const parsed = JSON.parse(raw) as { compilerOptions?: { strict?: boolean } };
      if (parsed.compilerOptions?.strict !== true) {
        issues.push({
          id: 'quality/typescript-strict-disabled',
          title: 'TypeScript strict mode is disabled',
          description: 'Strict mode catches nullability, implicit any, and unsafe assignment bugs earlier.',
          category: 'quality',
          severity: 'warning',
          files: [tsconfig],
          fixable: true,
          fixId: 'fix:typescript-strict',
          analyzer: this.id,
          deduction: 5
        });
      }
    } catch {
      issues.push({
        id: 'quality/tsconfig-invalid',
        title: 'tsconfig.json could not be parsed',
        description: 'The TypeScript configuration is invalid JSON.',
        category: 'quality',
        severity: 'error',
        files: [tsconfig],
        fixable: false,
        analyzer: this.id,
        deduction: 3
      });
    }

    return issues;
  }
};
