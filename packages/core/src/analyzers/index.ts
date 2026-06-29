import type { Analyzer, Issue, ScanContext } from '../types/index.js';
import { lockfileAnalyzer } from './dependency/lockfile.js';
import { dependencyImportsAnalyzer } from './dependency/imports.js';
import { changelogAnalyzer } from './documentation/changelog.js';
import { contributingAnalyzer } from './documentation/contributing.js';
import { licenseAnalyzer } from './documentation/license.js';
import { readmeAnalyzer } from './documentation/readme.js';
import { packageFieldsAnalyzer } from './best-practices/package-fields.js';
import { ciAnalyzer } from './ci/pipeline.js';
import { editorconfigAnalyzer } from './quality/editorconfig.js';
import { eslintAnalyzer } from './quality/eslint.js';
import { prettierAnalyzer } from './quality/prettier.js';
import { typescriptAnalyzer } from './quality/typescript.js';
import { securityAnalyzer } from './security/baseline.js';
import { ciTestAnalyzer } from './testing/ci-test.js';
import { testingAnalyzer } from './testing/framework.js';

export const coreAnalyzers: Analyzer[] = [
  securityAnalyzer,
  lockfileAnalyzer,
  dependencyImportsAnalyzer,
  readmeAnalyzer,
  licenseAnalyzer,
  changelogAnalyzer,
  contributingAnalyzer,
  eslintAnalyzer,
  prettierAnalyzer,
  typescriptAnalyzer,
  editorconfigAnalyzer,
  testingAnalyzer,
  ciTestAnalyzer,
  ciAnalyzer,
  packageFieldsAnalyzer
];

export async function runAnalyzers(context: ScanContext, analyzers: Analyzer[] = coreAnalyzers): Promise<Issue[]> {
  const disabled = new Set(context.config.analyzers.disable);
  const issues: Issue[] = [];

  for (const analyzer of analyzers) {
    if (disabled.has(analyzer.id)) {
      continue;
    }

    const analyzerIssues = await analyzer.run(context);
    for (const issue of analyzerIssues) {
      const severityOverride = context.config.analyzers.overrides[issue.id] ?? context.config.analyzers.overrides[analyzer.id];
      issues.push({
        ...issue,
        severity: severityOverride ?? issue.severity
      });
    }
  }

  return issues;
}
