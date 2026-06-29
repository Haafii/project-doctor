import type { HealthReport, Issue, IssueSeverity } from '../types/index.js';

const severityRank: Record<IssueSeverity, number> = {
  critical: 4,
  error: 3,
  warning: 2,
  info: 1
};

export function filterIssues(issues: Issue[], minSeverity: IssueSeverity): Issue[] {
  const min = severityRank[minSeverity];
  return issues.filter((issue) => severityRank[issue.severity] >= min);
}

export function withFilteredIssues(report: HealthReport, minSeverity: IssueSeverity): HealthReport {
  return {
    ...report,
    issues: filterIssues(report.issues, minSeverity)
  };
}

export function severityLabel(severity: IssueSeverity): string {
  return severity.toUpperCase();
}
