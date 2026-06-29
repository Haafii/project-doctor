import type { Analyzer } from '../../types/index.js';

export const editorconfigAnalyzer: Analyzer = {
  id: 'quality/editorconfig',
  name: 'EditorConfig',
  description: 'Checks for a shared editor baseline.',
  category: 'quality',
  async run(context) {
    if (context.fileSystem.configFiles.includes('.editorconfig')) {
      return [];
    }

    return [
      {
        id: 'quality/editorconfig-missing',
        title: '.editorconfig is missing',
        description: 'EditorConfig keeps indentation and final newline behavior consistent across editors.',
        category: 'quality',
        severity: 'info',
        fixable: true,
        fixId: 'generate:editorconfig',
        analyzer: this.id,
        deduction: 1
      }
    ];
  }
};
