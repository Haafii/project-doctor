import type { Analyzer } from '../../types/index.js';

const prettierFiles = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs'
];

export const prettierAnalyzer: Analyzer = {
  id: 'quality/prettier',
  name: 'Prettier configuration',
  description: 'Checks for a Prettier configuration or dependency.',
  category: 'quality',
  async run(context) {
    const hasConfig = context.fileSystem.configFiles.some((file) => prettierFiles.includes(file));
    const hasDependency = Boolean(context.packageJson.devDependencies?.prettier ?? context.packageJson.dependencies?.prettier);
    if (hasConfig || hasDependency) {
      return [];
    }

    return [
      {
        id: 'quality/prettier-missing',
        title: 'Prettier is not configured',
        description: 'A formatter removes style debates and keeps diffs easy to review.',
        category: 'quality',
        severity: 'info',
        fixable: true,
        fixId: 'generate:prettier-config',
        analyzer: this.id,
        deduction: 2
      }
    ];
  }
};
