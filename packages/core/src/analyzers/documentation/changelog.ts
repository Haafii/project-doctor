import type { Analyzer } from '../../types/index.js';
import { findFirstFile } from '../../utils/file.js';

export const changelogAnalyzer: Analyzer = {
  id: 'documentation/changelog',
  name: 'Changelog',
  description: 'Checks for a changelog file.',
  category: 'documentation',
  async run(context) {
    if (findFirstFile(context.fileSystem.documentationFiles, ['CHANGELOG.md', 'CHANGELOG'])) {
      return [];
    }

    return [
      {
        id: 'documentation/changelog-missing',
        title: 'CHANGELOG is missing',
        description: 'A changelog gives users a durable history of notable project changes.',
        category: 'documentation',
        severity: 'info',
        fixable: true,
        fixId: 'generate:changelog',
        analyzer: this.id,
        deduction: 2
      }
    ];
  }
};
