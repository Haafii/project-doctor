import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Analyzer, Issue } from '../../types/index.js';

export const ciAnalyzer: Analyzer = {
  id: 'cicd/pipeline',
  name: 'CI/CD pipeline',
  description: 'Checks for CI, release automation, dependency update automation, and common quality steps.',
  category: 'cicd',
  async run(context) {
    const issues: Issue[] = [];

    if (context.fileSystem.ciFiles.length === 0) {
      return [
        {
          id: 'cicd/pipeline-missing',
          title: 'No CI pipeline found',
          description: 'A CI pipeline should install dependencies, lint, type-check, and run tests for every change.',
          category: 'cicd',
          severity: 'error',
          fixable: true,
          fixId: 'generate:github-actions-ci',
          analyzer: this.id,
          deduction: 10
        }
      ];
    }

    const ciText = (
      await Promise.all(context.fileSystem.ciFiles.map((file) => readFile(path.join(context.root, file), 'utf8')))
    ).join('\n');

    if (!/\b(npm|pnpm|yarn|bun)\s+(run\s+)?lint\b/.test(ciText)) {
      issues.push({
        id: 'cicd/no-lint-step',
        title: 'CI does not appear to run linting',
        description: 'Running lint in CI prevents style and quality regressions from entering the default branch.',
        category: 'cicd',
        severity: 'info',
        files: context.fileSystem.ciFiles,
        fixable: true,
        fixId: 'generate:github-actions-ci',
        analyzer: this.id,
        deduction: 2
      });
    }

    const hasReleaseAutomation =
      context.fileSystem.ciFiles.some((file) => /release|publish/.test(file)) ||
      context.fileSystem.allFiles.some((file) => /(^|\/)(\.changeset|release-please-config\.json|\.releaserc|semantic-release)/.test(file));
    if (!hasReleaseAutomation) {
      issues.push({
        id: 'cicd/release-automation-missing',
        title: 'No release automation configured',
        description: 'Automated releases reduce manual publishing mistakes and make version history auditable.',
        category: 'cicd',
        severity: 'warning',
        fixable: true,
        fixId: 'generate:github-actions-release',
        analyzer: this.id,
        deduction: 3
      });
    }

    const hasDependencyAutomation = context.fileSystem.allFiles.some((file) =>
      file === '.github/dependabot.yml' || file === '.github/dependabot.yaml' || file === 'renovate.json'
    );
    if (!hasDependencyAutomation) {
      issues.push({
        id: 'cicd/dependency-automation-missing',
        title: 'No Dependabot or Renovate configuration found',
        description: 'Dependency update automation keeps routine package updates visible and reviewable.',
        category: 'cicd',
        severity: 'info',
        fixable: true,
        fixId: 'generate:dependabot',
        analyzer: this.id,
        deduction: 2
      });
    }

    return issues;
  }
};
