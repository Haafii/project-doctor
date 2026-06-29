import type { Analyzer } from '../../types/index.js';
import { getAllDependencies } from '../../utils/package.js';

export const lockfileAnalyzer: Analyzer = {
  id: 'dependencies/lockfile',
  name: 'Lockfile',
  description: 'Checks that dependency installs are reproducible.',
  category: 'dependencies',
  async run(context) {
    if (Object.keys(getAllDependencies(context.packageJson)).length === 0 || context.lockfile) {
      return [];
    }

    return [
      {
        id: 'dependencies/lockfile-missing',
        title: 'Lockfile is missing',
        description: 'A lockfile pins transitive dependency versions and makes CI installs reproducible.',
        category: 'dependencies',
        severity: 'error',
        fixable: true,
        fixId: 'fix:generate-lockfile',
        analyzer: this.id,
        deduction: 10
      }
    ];
  }
};
