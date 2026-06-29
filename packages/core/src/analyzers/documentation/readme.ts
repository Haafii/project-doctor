import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Analyzer, Issue } from '../../types/index.js';
import { findFirstFile } from '../../utils/file.js';

export const readmeAnalyzer: Analyzer = {
  id: 'documentation/readme',
  name: 'README quality',
  description: 'Checks that a README exists and has enough substance to onboard users.',
  category: 'documentation',
  async run(context) {
    const readme = findFirstFile(context.fileSystem.documentationFiles, ['README.md', 'README']);
    if (!readme) {
      return [
        {
          id: 'documentation/readme-missing',
          title: 'README is missing',
          description: 'A README is the first stop for users and contributors. Add installation, usage, and development notes.',
          category: 'documentation',
          severity: 'error',
          fixable: true,
          fixId: 'generate:readme',
          analyzer: this.id,
          deduction: 10
        }
      ];
    }

    const content = await readFile(path.join(context.root, readme), 'utf8');
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    if (words < 80) {
      return [
        {
          id: 'documentation/readme-stub',
          title: 'README is too brief',
          description: 'The README exists, but it is too short to explain setup, usage, and contribution basics.',
          category: 'documentation',
          severity: 'warning',
          files: [readme],
          fixable: false,
          analyzer: this.id,
          deduction: 5
        }
      ];
    }

    return [];
  }
};
