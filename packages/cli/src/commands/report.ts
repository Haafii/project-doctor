import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';
import { normalizeFormat, normalizeSeverity, renderReport, runScan } from '@haafii/project-doctor-core';
import { readActionOptions } from './options.js';
import { defaultOutputPath } from './scan.js';

type ReportOptions = {
  format?: string;
  output?: string;
  severity?: string;
  config?: string;
  open?: boolean;
};

export function registerReportCommand(program: Command): void {
  program
    .command('report')
    .description('Generate a JSON, Markdown, or HTML report.')
    .argument('[path]', 'Project path to scan', '.')
    .option('-f, --format <format>', 'html, markdown, or json', 'html')
    .option('-o, --output <path>', 'Output file path')
    .option('-s, --severity <severity>', 'Minimum severity to show', 'info')
    .option('-c, --config <path>', 'Path to a config file')
    .option('--open', 'Print a browser-open hint after writing an HTML report')
    .action(async (projectPath: string, candidate: Command | ReportOptions) => {
      const options = readActionOptions<ReportOptions>(candidate);
      const format = normalizeFormat(options.format, 'html');
      const minSeverity = normalizeSeverity(options.severity, 'info');
      const output = options.output ?? defaultOutputPath(format);
      const report = await runScan({ root: projectPath, configPath: options.config });
      const rendered = renderReport(report, format, { minSeverity, color: false });
      await mkdir(path.dirname(path.resolve(output)), { recursive: true });
      await writeFile(output, rendered);
      console.log(`Report written to ${path.resolve(output)}`);
      if (options.open && format === 'html') {
        console.log(`Open ${path.resolve(output)} in your browser.`);
      }
    });
}
