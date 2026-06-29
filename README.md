# Project Doctor

Project Doctor is a Lighthouse-style health scanner for JavaScript and TypeScript projects. It scans project structure, package metadata, documentation, dependency declarations, testing setup, CI/CD files, basic security hygiene, and best-practice signals, then returns a 0-100 score with actionable issues and safe fixes.

This repository is the MVP implementation described in `project-doctor-planning.md`.

## Commands

```sh
npm install
npm run build
npx @haafii/project-doctor scan .
npx @haafii/project-doctor score .
npx @haafii/project-doctor report . --format html
npx @haafii/project-doctor fix . --dry-run
npx @haafii/project-doctor init .
```

## Package Layout

- `packages/core`: scanner, analyzers, scoring engine, fix engine, report formatters, and public TypeScript API.
- `packages/cli`: `project-doctor` command-line interface.
- `test/fixtures`: sample projects used by the Node test runner.

## MVP Scope

Included now:

- package.json, lockfile, filesystem, and git scanning
- dependency import checks for missing and unused runtime dependencies
- documentation checks for README, LICENSE, CHANGELOG, and CONTRIBUTING
- quality checks for ESLint, Prettier, TypeScript strict mode, and EditorConfig
- testing and CI/CD detection
- best-practice package metadata checks
- basic security checks for env files, obvious secrets, risky install scripts, and publish surface
- terminal, JSON, Markdown, and self-contained HTML reports
- safe fix registry for common generated files and package metadata

Planned next:

- registry-backed outdated/deprecated package checks
- npm audit integration
- interactive confirmation-tier fixes
- plugin loading and first-party framework plugins
- richer HTML dashboard and monorepo scoring

## Configuration

Run `project-doctor init` to generate `project-doctor.config.mjs`.

```js
import { defineConfig } from '@haafii/project-doctor-core';

export default defineConfig({
  minScore: 70,
  output: {
    format: 'terminal',
    minSeverity: 'info'
  }
});
```

TypeScript config files are part of the long-term plan. The MVP supports JS, MJS, CJS, and JSON config files without requiring a runtime loader.
