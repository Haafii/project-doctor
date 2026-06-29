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

export const htmlFormatter: Formatter = {
  format: 'html',
  render(report, options) {
    const filtered = withFilteredIssues(report, options.minSeverity);
    const title = escapeHtml(options.title ?? 'Project Doctor Health Report');
    const scoreColor = getScoreColor(report.score.total);
    const issueRows = filtered.issues
      .map(
        (issue) =>
          `<tr><td><span class="severity ${issue.severity}">${issue.severity}</span></td><td>${escapeHtml(categoryNames[issue.category])}</td><td>${escapeHtml(issue.title)}</td><td>${escapeHtml(issue.fixId ?? '')}</td></tr>`
      )
      .join('');

    const categoryCards = order
      .map((category) => {
        const score = report.score.categories[category];
        const percent = score.max === 0 ? 100 : Math.round((score.score / score.max) * 100);
        return `<section class="category"><div><strong>${escapeHtml(categoryNames[category])}</strong><span>${score.score}/${score.max} (${score.grade})</span></div><div class="bar"><span style="width:${percent}%"></span></div></section>`;
      })
      .join('');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f7f8fb; color: #16181d; }
    header { background: #121826; color: white; padding: 40px 32px; }
    main { max-width: 1100px; margin: 0 auto; padding: 28px; }
    h1 { margin: 0 0 8px; font-size: 34px; letter-spacing: 0; }
    h2 { margin-top: 32px; font-size: 22px; }
    .meta { color: #c9d1e3; margin: 0; }
    .score { display: inline-grid; place-items: center; width: 148px; height: 148px; border-radius: 50%; background: ${scoreColor}; color: white; font-size: 34px; font-weight: 800; margin-top: 24px; }
    .score small { display: block; font-size: 14px; font-weight: 600; opacity: .9; text-align: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .category { background: white; border: 1px solid #e3e7ef; border-radius: 8px; padding: 16px; }
    .category div:first-child { display: flex; justify-content: space-between; gap: 12px; }
    .bar { height: 8px; background: #edf0f5; border-radius: 999px; overflow: hidden; margin-top: 14px; }
    .bar span { display: block; height: 100%; background: #2f6fed; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e3e7ef; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px 14px; border-bottom: 1px solid #edf0f5; text-align: left; vertical-align: top; }
    th { background: #f0f3f8; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
    .severity { display: inline-block; min-width: 72px; border-radius: 999px; padding: 4px 8px; text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .critical, .error { background: #fde8e8; color: #b42318; }
    .warning { background: #fff3cd; color: #8a6100; }
    .info { background: #e8eefc; color: #2454b8; }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <p class="meta">${escapeHtml(report.project.name)} at ${escapeHtml(report.project.path)} - ${report.timestamp.toISOString()}</p>
    <div class="score">${report.score.total}<small>${escapeHtml(report.score.label)} / ${report.score.grade}</small></div>
  </header>
  <main>
    <h2>Category Breakdown</h2>
    <div class="grid">${categoryCards}</div>
    <h2>Issues</h2>
    <table>
      <thead><tr><th>Severity</th><th>Category</th><th>Issue</th><th>Fix</th></tr></thead>
      <tbody>${issueRows || '<tr><td colspan="4">No issues at the selected severity.</td></tr>'}</tbody>
    </table>
  </main>
</body>
</html>`;
  }
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function getScoreColor(score: number): string {
  if (score >= 90) {
    return '#16803c';
  }
  if (score >= 75) {
    return '#2f8a4c';
  }
  if (score >= 60) {
    return '#c78a00';
  }
  if (score >= 40) {
    return '#c2410c';
  }
  return '#b42318';
}
