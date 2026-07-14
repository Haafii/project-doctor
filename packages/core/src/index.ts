import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runAnalyzers, coreAnalyzers } from './analyzers/index.js';
import { defineConfig } from './config/defaults.js';
import { loadConfig } from './config/loader.js';
import { summarizeFixes } from './engine/fix-engine.js';
import { scoreIssues } from './engine/scoring-engine.js';
import { getFormatter } from './formatters/index.js';
import { scanProject } from './scanner/index.js';
import type {
  FormatterOptions,
  HealthReport,
  IssueSeverity,
  OutputFormat,
  RunScanOptions,
  ScanContext,
  ScanOptions
} from './types/index.js';

export { defineConfig };
export { applyFixes, coreFixes, getAvailableFixes, summarizeFixes } from './engine/fix-engine.js';
export { scoreIssues, getRating } from './engine/scoring-engine.js';
export { getFormatter } from './formatters/index.js';
export { scanProject } from './scanner/index.js';
export { coreAnalyzers, runAnalyzers };
export type * from './types/index.js';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version?: string };
const version = packageJson.version ?? '0.0.0';

export async function createScanContext(options: ScanOptions = {}): Promise<ScanContext> {
  const projectRoot = path.resolve(options.root ?? process.cwd());
  const config = await loadConfig(projectRoot, options.configPath);
  return scanProject(config);
}

export async function runScan(options: RunScanOptions = {}): Promise<HealthReport> {
  const started = Date.now();
  const context = await createScanContext(options);
  const issues = await runAnalyzers(context);
  const score = scoreIssues(issues);
  const fixes = await summarizeFixes(context, issues);

  return {
    version,
    timestamp: new Date(),
    project: {
      name: context.packageJson.name ?? path.basename(context.root),
      version: context.packageJson.version ?? '0.0.0',
      description: context.packageJson.description ?? null,
      path: context.root
    },
    score,
    issues,
    fixes,
    plugins: [],
    meta: {
      scanDurationMs: Date.now() - started,
      analyzersRun: coreAnalyzers.filter((analyzer) => !context.config.analyzers.disable.includes(analyzer.id)).length,
      filesScanned: context.fileSystem.allFiles.length,
      dependenciesScanned: context.installedPackages.length,
      pluginsLoaded: []
    }
  };
}

export function renderReport(
  report: HealthReport,
  format: OutputFormat,
  options: Partial<FormatterOptions> = {}
): string | Buffer {
  return getFormatter(format).render(report, {
    color: options.color ?? true,
    minSeverity: options.minSeverity ?? 'info',
    title: options.title
  });
}

export async function writeReport(report: HealthReport, format: OutputFormat, outputPath: string, options: Partial<FormatterOptions> = {}): Promise<void> {
  const rendered = renderReport(report, format, options);
  await writeFile(outputPath, rendered);
}

export function isPassing(report: HealthReport, minScore: number): boolean {
  return report.score.total >= minScore;
}

export function normalizeSeverity(value: string | undefined, fallback: IssueSeverity = 'info'): IssueSeverity {
  if (value === 'critical' || value === 'error' || value === 'warning' || value === 'info') {
    return value;
  }

  return fallback;
}

export function normalizeFormat(value: string | undefined, fallback: OutputFormat = 'terminal'): OutputFormat {
  if (value === 'terminal' || value === 'json' || value === 'html' || value === 'markdown') {
    return value;
  }

  return fallback;
}
