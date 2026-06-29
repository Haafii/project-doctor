import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';
import { readActionOptions } from './options.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Create a Project Doctor configuration file.')
    .argument('[path]', 'Project path', '.')
    .option('--min-score <score>', 'Minimum score for CI mode', '70')
    .action(async (projectPath: string, candidate: Command | { minScore: string }) => {
      const options = readActionOptions<{ minScore: string }>(candidate);
      const output = path.resolve(projectPath, 'project-doctor.config.mjs');
      const minScore = Number.parseInt(options.minScore, 10);
      const config = `import { defineConfig } from '@haafii/project-doctor-core';

export default defineConfig({
  root: '.',
  minScore: ${Number.isNaN(minScore) ? 70 : minScore},
  ignore: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.git/**'],
  output: {
    format: 'terminal',
    minSeverity: 'info'
  },
  plugins: {
    autoDetect: true
  },
  fixes: {
    defaultLicense: 'MIT'
  }
});
`;
      await writeFile(output, config);
      console.log(`Created ${output}`);
    });
}
