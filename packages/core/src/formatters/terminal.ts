import type { CategoryScore, Formatter, HealthReport, IssueCategory } from '../types/index.js';
import { withFilteredIssues, severityLabel } from './filter.js';

const categoryNames: Record<IssueCategory, string> = {
  security: 'Security',
  dependencies: 'Dependencies',
  testing: 'Testing',
  quality: 'Code Quality',
  documentation: 'Documentation',
  cicd: 'CI/CD',
  bestPractices: 'Best Practices',
  performance: 'Performance'
};

const order: IssueCategory[] = ['security', 'dependencies', 'testing', 'quality', 'documentation', 'cicd', 'bestPractices'];

export const terminalFormatter: Formatter = {
  format: 'terminal',
  render(report, options) {
    const filtered = withFilteredIssues(report, options.minSeverity);
    const lines: string[] = [];

    lines.push('PROJECT DOCTOR');
    lines.push('==============');
    lines.push(`Project: ${report.project.name}@${report.project.version}`);
    lines.push(`Path:    ${report.project.path}`);
    lines.push(`Score:   ${report.score.total}/100 (${report.score.label}, ${report.score.grade})`);
    lines.push(`Scanned: ${report.timestamp.toISOString()}`);
    lines.push('');
    lines.push('Category Breakdown');
    lines.push('------------------');
    lines.push(`${pad('Category', 18)} ${pad('Score', 9)} Grade  Issues`);
    for (const category of order) {
      const categoryScore = report.score.categories[category];
      lines.push(`${pad(categoryNames[category], 18)} ${pad(formatScore(categoryScore), 9)} ${categoryScore.grade}      ${countIssues(categoryScore)}`);
    }

    lines.push('');
    lines.push('Top Issues');
    lines.push('----------');
    if (filtered.issues.length === 0) {
      lines.push('No issues at the selected severity.');
    } else {
      for (const issue of filtered.issues.slice(0, 12)) {
        lines.push(`${pad(severityLabel(issue.severity), 8)} [${categoryNames[issue.category]}] ${issue.title}`);
        if (issue.context?.type === 'list' && Array.isArray(issue.context.data)) {
          lines.push(`         ${issue.context.data.join(', ')}`);
        }
      }
    }

    lines.push('');
    lines.push(`Fixes available: ${report.fixes.available} (${report.fixes.safe} safe, ${report.fixes.requiresConfirmation} confirmation, ${report.fixes.destructive} destructive)`);
    lines.push(`Scan duration: ${report.meta.scanDurationMs}ms, files scanned: ${report.meta.filesScanned}`);
    return `${lines.join('\n')}\n`;
  }
};

function formatScore(score: CategoryScore): string {
  return `${score.score}/${score.max}`;
}

function countIssues(score: CategoryScore): number {
  return score.issueCount.critical + score.issueCount.error + score.issueCount.warning + score.issueCount.info;
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : `${value}${' '.repeat(width - value.length)}`;
}
