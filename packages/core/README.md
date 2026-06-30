# Project Doctor Core

Core scanning, analysis, scoring, fixing, and report-formatting engine for Project Doctor.

Most users should install the CLI package:

```sh
npm install -D @haafii/project-doctor
```

Use this package directly when building integrations, custom commands, or future plugins.

## API

```ts
import { runScan, renderReport } from '@haafii/project-doctor-core';

const report = await runScan({ root: process.cwd() });
const markdown = renderReport(report, 'markdown', { minSeverity: 'info' });

console.log(report.score.total);
console.log(markdown);
```

## Main Exports

- `runScan`
- `createScanContext`
- `scanProject`
- `runAnalyzers`
- `scoreIssues`
- `renderReport`
- `applyFixes`
- `defineConfig`
- public TypeScript types for analyzers, issues, fixes, formatters, and reports

## Live npm Checks

When a scanned npm project has installed dependencies, the core analyzers can run npm-backed checks for:

- `npm audit --json`
- `npm outdated --json --long`
- direct dependency deprecation notices from the npm registry

## Repository

Source code and roadmap: <https://github.com/Haafii/project-doctor>
