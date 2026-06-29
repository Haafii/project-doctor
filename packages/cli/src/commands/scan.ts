import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';
import {
  applyFixes,
  createScanContext,
  isPassing,
  normalizeFormat,
  normalizeSeverity,
  renderReport,
  runScan
} from '@haafii/project-doctor-core';
import type { OutputFormat } from '@haafii/project-doctor-core';
import { readActionOptions } from './options.js';

export type ScanCliOptions = {
  format?: string;
  output?: string;
  severity?: string;
  fix?: boolean;
  color?: boolean;
  quiet?: boolean;
  config?: string;
  ci?: boolean;
  minScore?: number;
};

export function registerScanCommand(program: Command): void {
  program
    .command('scan')
    .description('Scan a JavaScript or TypeScript project.')
    .argument('[path]', 'Project path to scan', '.')
    .option('-f, --format <format>', 'Output format: terminal, json, html, markdown', 'terminal')
    .option('-o, --output <path>', 'Write report to a file')
    .option('-s, --severity <severity>', 'Minimum severity to show', 'info')
    .option('--fix', 'Apply safe fixes after scanning')
    .option('--no-color', 'Disable color output')
    .option('-q, --quiet', 'Print score only')
    .option('-c, --config <path>', 'Path to a config file')
    .option('--ci', 'Exit with code 1 if score is below the threshold')
    .option('--min-score <score>', 'Minimum score for CI mode', parseInteger)
    .action(async (projectPath: string, options: Command | ScanCliOptions) => {
      await runScanCommand(projectPath, readActionOptions<ScanCliOptions>(options));
    });
}

export async function runScanCommand(projectPath: string, options: ScanCliOptions): Promise<void> {
  const format = normalizeFormat(options.format, 'terminal');
  const minSeverity = normalizeSeverity(options.severity, 'info');
  const report = await runScan({
    root: projectPath,
    configPath: options.config,
    format,
    minSeverity,
    color: options.color
  });

  if (options.quiet) {
    console.log(report.score.total);
  } else {
    const rendered = renderReport(report, format, {
      color: options.color ?? true,
      minSeverity
    });

    if (options.output) {
      await writeOutput(options.output, rendered);
      if (format === 'terminal') {
        console.log(`Report written to ${path.resolve(options.output)}`);
      }
    } else {
      process.stdout.write(rendered);
    }
  }

  if (options.fix) {
    const context = await createScanContext({ root: projectPath, configPath: options.config });
    const results = await applyFixes(context, report, { dryRun: false, force: false });
    for (const result of results) {
      console.log(result.message);
    }
  }

  if (options.ci) {
    const minScore = options.minScore ?? 70;
    if (!isPassing(report, minScore)) {
      process.exitCode = 1;
    }
  }
}

async function writeOutput(outputPath: string, content: string | Buffer): Promise<void> {
  await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await writeFile(outputPath, content);
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Expected a number, received "${value}".`);
  }

  return parsed;
}

export function defaultOutputPath(format: OutputFormat): string {
  switch (format) {
    case 'html':
      return 'project-doctor-report.html';
    case 'markdown':
      return 'project-doctor-report.md';
    case 'json':
      return 'project-doctor-report.json';
    default:
      return 'project-doctor-report.txt';
  }
}
