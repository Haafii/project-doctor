import type { Analyzer } from '../../types/index.js';

const eslintFiles = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yaml',
  '.eslintrc.yml'
];

export const eslintAnalyzer: Analyzer = {
  id: 'quality/eslint',
  name: 'ESLint configuration',
  description: 'Checks for an ESLint configuration or dependency.',
  category: 'quality',
  async run(context) {
    const hasConfig = context.fileSystem.configFiles.some((file) => eslintFiles.includes(file));
    const hasDependency = Boolean(context.packageJson.devDependencies?.eslint ?? context.packageJson.dependencies?.eslint);
    if (hasConfig || hasDependency) {
      return [];
    }

    return [
      {
        id: 'quality/eslint-missing',
        title: 'ESLint is not configured',
        description: 'ESLint catches code quality defects and gives teams a common baseline for JavaScript and TypeScript.',
        category: 'quality',
        severity: 'warning',
        fixable: true,
        fixId: 'generate:eslint-config',
        analyzer: this.id,
        deduction: 5
      }
    ];
  }
};
