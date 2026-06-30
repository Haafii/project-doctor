import type { Analyzer, Issue, IssueSeverity } from '../../types/index.js';
import { pathExists } from '../../utils/file.js';
import { parseJsonOutput, runCommand } from '../../utils/command.js';

type NpmAuditSeverity = 'low' | 'moderate' | 'medium' | 'high' | 'critical';

interface NpmAuditReport {
  vulnerabilities?: Record<
    string,
    {
      name?: string;
      severity?: NpmAuditSeverity;
      via?: Array<string | { title?: string; severity?: NpmAuditSeverity; url?: string }>;
      effects?: string[];
      range?: string;
      fixAvailable?: boolean | { name?: string; version?: string; isSemVerMajor?: boolean };
    }
  >;
}

const severityToIssueSeverity: Record<NpmAuditSeverity, IssueSeverity> = {
  critical: 'critical',
  high: 'error',
  moderate: 'warning',
  medium: 'warning',
  low: 'info'
};

const severityDeduction: Record<NpmAuditSeverity, number> = {
  critical: 25,
  high: 10,
  moderate: 5,
  medium: 5,
  low: 1
};

export const npmAuditAnalyzer: Analyzer = {
  id: 'security/npm-audit',
  name: 'npm audit',
  description: 'Runs npm audit and converts vulnerabilities into Project Doctor security issues.',
  category: 'security',
  async run(context) {
    if (context.lockfileType !== 'npm' || !(await pathExists(`${context.root}/node_modules`))) {
      return [];
    }

    const result = await runCommand('npm', ['audit', '--json', '--audit-level=low'], {
      cwd: context.root,
      timeoutMs: 10000
    });
    const report = parseJsonOutput<NpmAuditReport>(result.stdout);
    if (!report) {
      return result.timedOut
        ? [
            {
              id: 'security/npm-audit-timeout',
              title: 'npm audit timed out',
              description: 'Project Doctor could not complete npm audit within the timeout window.',
              category: 'security',
              severity: 'info',
              fixable: false,
              analyzer: npmAuditAnalyzer.id,
              deduction: 0
            }
          ]
        : [];
    }

    return issuesFromAuditReport(report, npmAuditAnalyzer.id);
  }
};

export function issuesFromAuditReport(report: NpmAuditReport, analyzerId = 'security/npm-audit'): Issue[] {
  const groups = new Map<NpmAuditSeverity, string[]>();

  for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
    const severity = normalizeAuditSeverity(vulnerability.severity);
    if (!severity) {
      continue;
    }

    const viaTitles = (vulnerability.via ?? [])
      .map((via) => (typeof via === 'string' ? via : via.title))
      .filter(Boolean);
    const label = viaTitles.length > 0 ? `${name}: ${viaTitles.slice(0, 2).join('; ')}` : name;
    groups.set(severity, [...(groups.get(severity) ?? []), label]);
  }

  const issues: Issue[] = [];
  for (const severity of ['critical', 'high', 'moderate', 'medium', 'low'] as const) {
    const entries = groups.get(severity) ?? [];
    if (entries.length === 0) {
      continue;
    }

    issues.push({
      id: `security/npm-audit-${severity}`,
      title: `${entries.length} ${severity} npm audit ${entries.length === 1 ? 'finding' : 'findings'}`,
      description: 'npm audit found dependency vulnerabilities that should be reviewed and patched.',
      category: 'security',
      severity: severityToIssueSeverity[severity],
      context: { type: 'list', data: entries.sort() },
      fixable: true,
      fixId: 'fix:npm-audit',
      analyzer: analyzerId,
      deduction: severity === 'critical' ? 25 : entries.length * severityDeduction[severity]
    });
  }

  return issues;
}

function normalizeAuditSeverity(value: string | undefined): NpmAuditSeverity | null {
  if (value === 'critical' || value === 'high' || value === 'moderate' || value === 'medium' || value === 'low') {
    return value;
  }

  return null;
}
