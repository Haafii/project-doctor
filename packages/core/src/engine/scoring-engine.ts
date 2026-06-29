import type { CategoryScore, Issue, IssueCategory, IssueSeverity, ScoreBreakdown } from '../types/index.js';
import { categoryMaxPoints } from '../config/defaults.js';

const categoryOrder: IssueCategory[] = [
  'security',
  'dependencies',
  'testing',
  'quality',
  'documentation',
  'cicd',
  'bestPractices',
  'performance'
];

const severityDeduction: Record<IssueSeverity, number> = {
  critical: Number.POSITIVE_INFINITY,
  error: 10,
  warning: 3,
  info: 0.5
};

export function scoreIssues(issues: Issue[]): ScoreBreakdown {
  const categories = Object.fromEntries(
    categoryOrder.map((category) => [category, scoreCategory(category, issues.filter((issue) => issue.category === category))])
  ) as Record<IssueCategory, CategoryScore>;

  const total = Math.round(
    categoryOrder.reduce((sum, category) => {
      const max = categoryMaxPoints[category];
      if (max === 0) {
        return sum;
      }

      return sum + categories[category].score;
    }, 0)
  );

  const rating = getRating(total);
  return {
    total,
    grade: rating.grade,
    label: rating.label,
    categories
  };
}

function scoreCategory(category: IssueCategory, issues: Issue[]): CategoryScore {
  const max = categoryMaxPoints[category];
  const issueCount = {
    critical: 0,
    error: 0,
    warning: 0,
    info: 0
  };

  let deductions = 0;
  for (const issue of issues) {
    issueCount[issue.severity] += 1;
    if (issue.severity === 'critical') {
      deductions = max;
      break;
    }

    deductions += issue.deduction ?? severityDeduction[issue.severity];
  }

  const score = Math.max(0, roundToHalf(max - deductions));
  return {
    score,
    max,
    grade: getRating(max === 0 ? 100 : (score / max) * 100).grade,
    issueCount
  };
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function getRating(score: number): { grade: 'A' | 'B' | 'C' | 'D' | 'F'; label: ScoreBreakdown['label'] } {
  if (score >= 90) {
    return { grade: 'A', label: 'Excellent' };
  }

  if (score >= 75) {
    return { grade: 'B', label: 'Good' };
  }

  if (score >= 60) {
    return { grade: 'C', label: 'Fair' };
  }

  if (score >= 40) {
    return { grade: 'D', label: 'Poor' };
  }

  return { grade: 'F', label: 'Critical' };
}
