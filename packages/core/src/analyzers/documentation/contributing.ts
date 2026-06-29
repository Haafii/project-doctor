import type { Analyzer } from '../../types/index.js';
import { findFirstFile } from '../../utils/file.js';

export const contributingAnalyzer: Analyzer = {
  id: 'documentation/contributing',
  name: 'Contributing guide',
  description: 'Checks for contributor setup instructions.',
  category: 'documentation',
  async run(context) {
    if (findFirstFile(context.fileSystem.documentationFiles, ['CONTRIBUTING.md', 'CONTRIBUTING'])) {
      return [];
    }

    return [
      {
        id: 'documentation/contributing-missing',
        title: 'CONTRIBUTING guide is missing',
        description: 'A short contribution guide helps people run tests, format code, and open useful pull requests.',
        category: 'documentation',
        severity: 'info',
        fixable: true,
        fixId: 'generate:contributing',
        analyzer: this.id,
        deduction: 1
      }
    ];
  }
};
