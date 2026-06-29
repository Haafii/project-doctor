import type { Formatter, IssueCategory } from '../types/index.js';
import { withFilteredIssues } from './filter.js';

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

export const markdownFormatter: Formatter = {
  format: 'markdown',
  render(report, options) {
    const filtered = withFilteredIssues(report, options.minSeverity);
    const title = options.title ?? 'Project Doctor Health Report';
    const lines: string[] = [];

    lines.push(`## ${title}`);
    lines.push('');
    lines.push(`**Score: ${report.score.total}/100** (${report.score.label}) - Scanned ${report.timestamp.toISOString()}`);
    lines.push('');
    lines.push('| Category | Score | Grade |');
    lines.push('|---|---:|:---:|');
    for (const category of order) {
      const score = report.score.categories[category];
      lines.push(`| ${categoryNames[category]} | ${score.score}/${score.max} | ${score.grade} |`);
    }

    lines.push('');
    lines.push('### Issues');
    if (filtered.issues.length === 0) {
      lines.push('');
      lines.push('No issues at the selected severity.');
    } else {
      for (const issue of filtered.issues) {
        lines.push(`- **${issue.severity.toUpperCase()} [${categoryNames[issue.category]}]** ${issue.title}`);
      }
    }

    lines.push('');
    lines.push(`Fixes available: ${report.fixes.available}`);
    return `${lines.join('\n')}\n`;
  }
};
