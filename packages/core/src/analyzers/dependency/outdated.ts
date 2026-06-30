import type { Analyzer, Issue } from '../../types/index.js';
import { pathExists } from '../../utils/file.js';
import { parseJsonOutput, runCommand } from '../../utils/command.js';

interface NpmOutdatedEntry {
  current?: string;
  wanted?: string;
  latest?: string;
  type?: string;
  dependent?: string;
  location?: string;
}

type NpmOutdatedReport = Record<string, NpmOutdatedEntry>;

export const outdatedAnalyzer: Analyzer = {
  id: 'dependencies/outdated',
  name: 'Outdated dependencies',
  description: 'Runs npm outdated and reports major and minor dependency drift.',
  category: 'dependencies',
  async run(context) {
    if (!(await pathExists(`${context.root}/node_modules`))) {
      return [];
    }

    const result = await runCommand('npm', ['outdated', '--json', '--long'], {
      cwd: context.root,
      timeoutMs: 10000
    });
    const report = parseJsonOutput<NpmOutdatedReport>(result.stdout);
    if (!report) {
      return [];
    }

    return issuesFromOutdatedReport(report, outdatedAnalyzer.id);
  }
};

export function issuesFromOutdatedReport(report: NpmOutdatedReport, analyzerId = 'dependencies/outdated'): Issue[] {
  const major: string[] = [];
  const minor: string[] = [];

  for (const [name, entry] of Object.entries(report)) {
    if (!entry.current || !entry.latest || entry.current === entry.latest) {
      continue;
    }

    const label = `${name}: ${entry.current} -> ${entry.latest}`;
    if (majorChanged(entry.current, entry.latest)) {
      major.push(label);
    } else {
      minor.push(label);
    }
  }

  const issues: Issue[] = [];
  if (major.length > 0) {
    issues.push({
      id: 'dependencies/outdated-major',
      title: `${major.length} ${major.length === 1 ? 'dependency has' : 'dependencies have'} newer major versions`,
      description: 'Major updates may include breaking changes. Review changelogs and update intentionally.',
      category: 'dependencies',
      severity: 'warning',
      context: { type: 'list', data: major.sort() },
      fixable: true,
      fixId: 'fix:update-deps',
      analyzer: analyzerId,
      deduction: major.length
    });
  }

  if (minor.length > 0) {
    issues.push({
      id: 'dependencies/outdated-minor',
      title: `${minor.length} ${minor.length === 1 ? 'dependency has' : 'dependencies have'} newer non-major versions`,
      description: 'Minor and patch updates usually carry bug fixes, security fixes, and compatibility improvements.',
      category: 'dependencies',
      severity: 'info',
      context: { type: 'list', data: minor.sort() },
      fixable: true,
      fixId: 'fix:update-deps',
      analyzer: analyzerId,
      deduction: minor.length * 0.5
    });
  }

  return issues;
}

function majorChanged(current: string, latest: string): boolean {
  const currentMajor = parseMajor(current);
  const latestMajor = parseMajor(latest);
  return currentMajor !== null && latestMajor !== null && latestMajor > currentMajor;
}

function parseMajor(version: string): number | null {
  const clean = version.replace(/^[^\d]*/, '');
  const major = Number.parseInt(clean.split('.')[0] ?? '', 10);
  return Number.isNaN(major) ? null : major;
}
