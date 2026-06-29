import type { Command } from 'commander';
import { applyFixes, createScanContext, runScan } from '@haafii/project-doctor-core';
import { readActionOptions } from './options.js';

type FixOptions = {
  dryRun?: boolean;
  force?: boolean;
  only?: string;
  skip?: string;
  config?: string;
};

export function registerFixCommand(program: Command): void {
  program
    .command('fix')
    .description('Apply safe automatic fixes for detected issues.')
    .argument('[path]', 'Project path to fix', '.')
    .option('--dry-run', 'Preview fixes without writing files')
    .option('--force', 'Allow confirmation-tier fixes in non-interactive mode')
    .option('--only <ids>', 'Comma-separated fix IDs to apply')
    .option('--skip <ids>', 'Comma-separated fix IDs to skip')
    .option('-c, --config <path>', 'Path to a config file')
    .action(async (projectPath: string, candidate: Command | FixOptions) => {
      const options = readActionOptions<FixOptions>(candidate);
      const report = await runScan({ root: projectPath, configPath: options.config });
      const context = await createScanContext({ root: projectPath, configPath: options.config });
      const results = await applyFixes(context, report, {
        dryRun: options.dryRun ?? false,
        force: options.force ?? false,
        only: splitIds(options.only),
        skip: splitIds(options.skip)
      });

      if (results.length === 0) {
        console.log('No safe fixes are available for the current issue set.');
        return;
      }

      for (const result of results) {
        console.log(`${options.dryRun ? 'Would apply' : 'Applied'}: ${result.message}`);
      }
    });
}

function splitIds(value: string | undefined): string[] | undefined {
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
