import type { Analyzer, Issue } from '../../types/index.js';

export const packageFieldsAnalyzer: Analyzer = {
  id: 'best-practices/package-fields',
  name: 'package.json metadata',
  description: 'Checks package metadata used by humans, package registries, and CI.',
  category: 'bestPractices',
  async run(context) {
    const issues: Issue[] = [];
    const pkg = context.packageJson;

    if (!context.fileSystem.allFiles.includes('.gitignore')) {
      issues.push({
        id: 'best-practices/gitignore-missing',
        title: '.gitignore is missing',
        description: 'A .gitignore prevents local build output, dependencies, and secrets from being committed.',
        category: 'bestPractices',
        severity: 'error',
        fixable: true,
        fixId: 'generate:gitignore',
        analyzer: this.id,
        deduction: 5
      });
    }

    if (context.git?.trackedFiles.some((file) => file === 'node_modules' || file.startsWith('node_modules/'))) {
      issues.push({
        id: 'best-practices/node-modules-tracked',
        title: 'node_modules is tracked by git',
        description: 'Dependencies should be restored from the lockfile, not committed to source control.',
        category: 'bestPractices',
        severity: 'critical',
        fixable: true,
        fixId: 'fix:gitignore',
        analyzer: this.id,
        deduction: 5
      });
    }

    if (!pkg.engines || !pkg.engines.node) {
      issues.push({
        id: 'best-practices/engines-missing',
        title: 'package.json has no engines.node field',
        description: 'Declaring the supported Node.js range prevents accidental installs on unsupported runtimes.',
        category: 'bestPractices',
        severity: 'info',
        fixable: true,
        fixId: 'fix:add-engines',
        analyzer: this.id,
        deduction: 1
      });
    }

    if (!pkg.repository) {
      issues.push({
        id: 'best-practices/repository-missing',
        title: 'package.json has no repository field',
        description: 'A repository field helps users find the source, issue tracker, and contribution path.',
        category: 'bestPractices',
        severity: 'info',
        fixable: true,
        fixId: 'fix:add-repository',
        analyzer: this.id,
        deduction: 0.5
      });
    }

    if (!pkg.description) {
      issues.push({
        id: 'best-practices/description-missing',
        title: 'package.json has no description',
        description: 'A short description makes package listings and reports easier to understand.',
        category: 'bestPractices',
        severity: 'info',
        fixable: true,
        fixId: 'fix:add-description',
        analyzer: this.id,
        deduction: 0.5
      });
    }

    if (!pkg.keywords || pkg.keywords.length === 0) {
      issues.push({
        id: 'best-practices/keywords-missing',
        title: 'package.json has no keywords',
        description: 'Keywords improve package discovery and help classify the project.',
        category: 'bestPractices',
        severity: 'info',
        fixable: true,
        fixId: 'fix:add-keywords',
        analyzer: this.id,
        deduction: 0.5
      });
    }

    return issues;
  }
};
