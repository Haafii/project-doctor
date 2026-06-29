import type { Analyzer } from '../../types/index.js';
import { findFirstFile } from '../../utils/file.js';

export const licenseAnalyzer: Analyzer = {
  id: 'documentation/license',
  name: 'License',
  description: 'Checks for a repository license file.',
  category: 'documentation',
  async run(context) {
    if (findFirstFile(context.fileSystem.documentationFiles, ['LICENSE', 'LICENSE.md', 'LICENCE', 'LICENCE.md'])) {
      return [];
    }

    return [
      {
        id: 'documentation/license-missing',
        title: 'LICENSE is missing',
        description: 'A license tells users how they can use and contribute to the project.',
        category: 'documentation',
        severity: 'warning',
        fixable: true,
        fixId: 'generate:license',
        analyzer: this.id,
        deduction: 4
      }
    ];
  }
};
