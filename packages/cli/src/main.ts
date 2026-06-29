import { Command } from 'commander';
import { registerFixCommand } from './commands/fix.js';
import { registerInitCommand } from './commands/init.js';
import { registerPluginCommands } from './commands/plugin.js';
import { registerReportCommand } from './commands/report.js';
import { registerScanCommand, runScanCommand } from './commands/scan.js';
import type { ScanCliOptions } from './commands/scan.js';
import { registerScoreCommand } from './commands/score.js';
import { readActionOptions } from './commands/options.js';

export async function main(): Promise<void> {
  const program = new Command();
  program.enablePositionalOptions();

  program
    .name('project-doctor')
    .description('Lighthouse-style project health checks for JavaScript and TypeScript projects.')
    .version('0.1.0')
    .argument('[path]', 'Project path to scan', '.')
    .option('-f, --format <format>', 'Output format: terminal, json, html, markdown', 'terminal')
    .option('-o, --output <path>', 'Write report to a file')
    .option('-s, --severity <severity>', 'Minimum severity to show: critical, error, warning, info', 'info')
    .option('--fix', 'Apply safe fixes after scanning')
    .option('--no-color', 'Disable color output')
    .option('-q, --quiet', 'Print score only')
    .option('-c, --config <path>', 'Path to a config file')
    .option('--ci', 'Exit with code 1 if score is below the threshold')
    .option('--min-score <score>', 'Minimum score for CI mode', parseInteger)
    .action(async (projectPath: string, options: Command) => {
      await runScanCommand(projectPath, readActionOptions<ScanCliOptions>(options));
    });

  registerScanCommand(program);
  registerFixCommand(program);
  registerReportCommand(program);
  registerScoreCommand(program);
  registerInitCommand(program);
  registerPluginCommands(program);

  await program.parseAsync(process.argv);
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Expected a number, received "${value}".`);
  }

  return parsed;
}
