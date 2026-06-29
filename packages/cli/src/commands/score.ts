import type { Command } from 'commander';
import { runScan } from '@haafii/project-doctor-core';
import { readActionOptions } from './options.js';

type ScoreOptions = {
  format?: 'number' | 'json' | 'badge';
  config?: string;
};

export function registerScoreCommand(program: Command): void {
  program
    .command('score')
    .description('Print only the health score.')
    .argument('[path]', 'Project path to scan', '.')
    .option('--format <format>', 'number, json, or badge', 'number')
    .option('-c, --config <path>', 'Path to a config file')
    .action(async (projectPath: string, candidate: Command | ScoreOptions) => {
      const options = readActionOptions<ScoreOptions>(candidate);
      const report = await runScan({ root: projectPath, configPath: options.config });
      if (options.format === 'json') {
        console.log(JSON.stringify(report.score, null, 2));
        return;
      }

      if (options.format === 'badge') {
        const color = report.score.total >= 90 ? 'brightgreen' : report.score.total >= 75 ? 'green' : report.score.total >= 60 ? 'yellow' : report.score.total >= 40 ? 'orange' : 'red';
        console.log(`https://img.shields.io/badge/project--doctor-${report.score.total}%2F100-${color}`);
        return;
      }

      console.log(report.score.total);
    });
}
