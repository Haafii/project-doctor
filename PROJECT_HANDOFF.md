# Project Doctor Handoff, Phase Status, and Roadmap

Last updated: 2026-07-14

This document is the practical handoff guide for the current `project-doctor` codebase. It explains what the product is, how the repository is structured, what has already been built, what is published, what is blocked, and what the next development phases should contain.

If you are taking over this project, read this file first, then read `README.md`, then use `project-doctor-planning.md` as the long-form product vision.

## 1. Product Summary

Project Doctor is a Lighthouse-style health scanner for JavaScript and TypeScript projects.

The goal is to give a project a single health score from `0` to `100`, backed by actionable findings across:

- security
- dependency hygiene
- testing
- code quality
- documentation
- CI/CD
- package and repository best practices

The user-facing CLI is:

```sh
npx @haafii/project-doctor scan .
```

The currently published package names are:

- `@haafii/project-doctor`
- `@haafii/project-doctor-core`

The GitHub repository is:

```text
https://github.com/Haafii/project-doctor
```

## 2. Current Release State

GitHub and npm are aligned for the current `0.2.0` release.

### GitHub / Local Code

The local repository at:

```text
/Users/hafismuhammed/Desktop/project-doctor
```

is currently clean and on `main`.

The codebase version is:

```text
0.2.0
```

Both workspace packages are also `0.2.0`:

```text
@haafii/project-doctor@0.2.0
@haafii/project-doctor-core@0.2.0
```

Phase 2 code has been committed and pushed to `main`.

The GitHub remote is configured over SSH:

```text
git@github.com:Haafii/project-doctor.git
```

### npm Published Version

The latest version published on npm is currently:

```text
@haafii/project-doctor@0.2.0
@haafii/project-doctor-core@0.2.0
```

Release and verification checks run on 2026-07-14:

- `npm test` passed.
- `npm pack --workspace @haafii/project-doctor-core --dry-run` passed for `0.2.0`.
- `npm pack --workspace @haafii/project-doctor --dry-run` passed for `0.2.0`.
- `npm whoami` now succeeds as `haafii`.
- `npm publish --workspace @haafii/project-doctor-core --access public` succeeded.
- `npm publish --workspace @haafii/project-doctor --access public` succeeded.
- `npm view @haafii/project-doctor version` returns `0.2.0`.
- `npm view @haafii/project-doctor-core version` returns `0.2.0`.
- `npx -y @haafii/project-doctor@0.2.0 scan .` passed from a temporary project.

### Tags

Remote GitHub tags:

```text
v0.1.1
v0.2.0
```

The `v0.2.0` tag has been pushed to GitHub and points at the Phase 2 implementation commit.

To use the current release:

```sh
npx @haafii/project-doctor scan .
```

If installing globally:

```sh
npm install -g @haafii/project-doctor
project-doctor scan .
```

## 3. Repository Structure

The repository is an npm workspaces TypeScript monorepo.

```text
project-doctor/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── analyzers/
│   │   │   ├── config/
│   │   │   ├── engine/
│   │   │   ├── formatters/
│   │   │   ├── scanner/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── README.md
│   │   ├── LICENSE
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── cli/
│       ├── src/
│       │   ├── commands/
│       │   ├── index.ts
│       │   └── main.ts
│       ├── README.md
│       ├── LICENSE
│       ├── package.json
│       └── tsconfig.json
├── test/
│   ├── core.test.mjs
│   └── fixtures/
├── project-doctor-planning.md
├── PROJECT_HANDOFF.md
├── README.md
├── package.json
├── package-lock.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── turbo.json
```

Even though `pnpm-workspace.yaml` exists because the original plan called for pnpm, the current implementation is verified with npm workspaces because npm was already installed and available locally.

## 4. Package Roles

### `@haafii/project-doctor`

This is the CLI package. It exposes the command:

```text
project-doctor
```

Source:

```text
packages/cli/src
```

Important files:

- `packages/cli/src/main.ts`: Commander setup and command registration.
- `packages/cli/src/index.ts`: executable CLI entry point with shebang.
- `packages/cli/src/commands/scan.ts`: `scan` command and default CLI behavior.
- `packages/cli/src/commands/score.ts`: score-only output.
- `packages/cli/src/commands/report.ts`: report generation.
- `packages/cli/src/commands/fix.ts`: safe and confirmation-tier fix runner.
- `packages/cli/src/commands/init.ts`: config file scaffolding.
- `packages/cli/src/commands/plugin.ts`: placeholder plugin commands.

### `@haafii/project-doctor-core`

This is the engine package. It contains:

- scanner
- analyzer registry
- scoring engine
- fix engine
- report formatters
- config loader
- public TypeScript types

Source:

```text
packages/core/src
```

The public API is exported from:

```text
packages/core/src/index.ts
```

Main exports include:

- `runScan`
- `createScanContext`
- `scanProject`
- `runAnalyzers`
- `scoreIssues`
- `renderReport`
- `applyFixes`
- `defineConfig`
- public TypeScript types

Example:

```ts
import { runScan, renderReport } from '@haafii/project-doctor-core';

const report = await runScan({ root: process.cwd() });
const markdown = renderReport(report, 'markdown', { minSeverity: 'info' });

console.log(report.score.total);
console.log(markdown);
```

## 5. How to Build, Test, and Run

Install dependencies:

```sh
npm install
```

Build both packages:

```sh
npm run build
```

Run tests:

```sh
npm test
```

Run a self-scan:

```sh
node packages/cli/dist/index.js scan .
```

Run from npm in another project:

```sh
npx @haafii/project-doctor scan .
```

Install globally:

```sh
npm install -g @haafii/project-doctor
project-doctor scan .
```

## 6. CLI Commands

### Scan

```sh
project-doctor scan .
project-doctor scan . --format json
project-doctor scan . --format markdown
project-doctor scan . --format html --output report.html
project-doctor scan . --ci --min-score 70
```

The scan command:

1. Loads config.
2. Scans project files, `package.json`, lockfile, git metadata, and workspaces.
3. Runs analyzers.
4. Scores issues.
5. Summarizes available fixes.
6. Renders terminal, JSON, Markdown, or HTML output.

### Score

```sh
project-doctor score .
project-doctor score . --format json
project-doctor score . --format badge
```

### Report

```sh
project-doctor report . --format html
project-doctor report . --format markdown --output HEALTH.md
project-doctor report . --format json --output report.json
```

### Fix

```sh
project-doctor fix . --dry-run
project-doctor fix .
project-doctor fix . --force
```

Current fix behavior:

- safe fixes run automatically
- confirmation-tier fixes only run with `--force`
- destructive fixes are not implemented yet

### Init

```sh
project-doctor init .
```

Creates:

```text
project-doctor.config.mjs
```

The MVP intentionally supports JS/MJS/CJS/JSON config files. TypeScript config loading is not implemented yet because that would require a runtime TS loader.

## 7. Current Scoring Model

Project Doctor scores seven primary categories:

| Category | Max Points |
|---|---:|
| Security | 25 |
| Dependencies | 20 |
| Testing | 15 |
| Code Quality | 15 |
| Documentation | 10 |
| CI/CD | 10 |
| Best Practices | 5 |

Total:

```text
100 points
```

Ratings:

| Score | Grade | Label |
|---:|:---:|---|
| 90-100 | A | Excellent |
| 75-89 | B | Good |
| 60-74 | C | Fair |
| 40-59 | D | Poor |
| 0-39 | F | Critical |

Scoring implementation:

```text
packages/core/src/engine/scoring-engine.ts
```

## 8. Scanner Implementation

Scanner entry point:

```text
packages/core/src/scanner/index.ts
```

The scanner currently collects:

- root path
- resolved config
- root `package.json`
- workspace packages from `workspaces`
- lockfile type and raw contents
- filesystem inventory
- git info when `.git` exists
- direct installed package metadata derived from `package.json`

Filesystem index includes:

- source files
- test files
- config files
- documentation files
- CI files
- all files

Workspace support is basic but useful. It detects workspace package folders from patterns such as:

```json
{
  "workspaces": ["packages/*"]
}
```

The dependency import analyzer uses workspace package scope so it does not falsely report package imports in `packages/cli` against the root `package.json`.

## 9. Analyzer Inventory

Analyzer registry:

```text
packages/core/src/analyzers/index.ts
```

### Security Analyzers

#### `security/baseline`

File:

```text
packages/core/src/analyzers/security/baseline.ts
```

Checks:

- `.env` files present in the project
- obvious secret patterns
- risky install lifecycle scripts
- unrestricted npm publish surface for public packages

Issue IDs:

- `security/env-file-present`
- `security/possible-secret`
- `security/risky-install-script`
- `security/publish-surface-unspecified`

#### `security/npm-audit`

File:

```text
packages/core/src/analyzers/security/npm-audit.ts
```

Added in Phase 2.

Runs:

```sh
npm audit --json --audit-level=low
```

Only runs when:

- project lockfile type is npm
- `node_modules` exists

This avoids slow or surprising network/install behavior in cold repositories.

Issue IDs:

- `security/npm-audit-critical`
- `security/npm-audit-high`
- `security/npm-audit-moderate`
- `security/npm-audit-medium`
- `security/npm-audit-low`
- `security/npm-audit-timeout`

Fix:

```text
fix:npm-audit
```

This is confirmation-tier and runs:

```sh
npm audit fix
```

### Dependency Analyzers

#### `dependencies/lockfile`

File:

```text
packages/core/src/analyzers/dependency/lockfile.ts
```

Checks whether a project with dependencies has a lockfile.

Issue ID:

```text
dependencies/lockfile-missing
```

Fix:

```text
fix:generate-lockfile
```

Runs:

```sh
npm install --package-lock-only
```

#### `dependencies/imports`

File:

```text
packages/core/src/analyzers/dependency/imports.ts
```

Checks:

- missing dependencies imported in source but not declared in package metadata
- unused runtime dependencies declared but not imported in source

Issue IDs:

- `dependencies/missing`
- `dependencies/unused`

Fix guidance:

- `fix:add-missing-deps`
- `fix:remove-unused-deps`

These are confirmation-tier guidance fixes because blindly installing or uninstalling dependencies can be unsafe.

#### `dependencies/outdated`

File:

```text
packages/core/src/analyzers/dependency/outdated.ts
```

Added in Phase 2.

Runs:

```sh
npm outdated --json --long
```

Only runs when `node_modules` exists.

Separates:

- major updates
- non-major updates

Issue IDs:

- `dependencies/outdated-major`
- `dependencies/outdated-minor`

Fix:

```text
fix:update-deps
```

Runs:

```sh
npm update
```

This is confirmation-tier.

#### `dependencies/deprecated`

File:

```text
packages/core/src/analyzers/dependency/deprecated.ts
```

Added in Phase 2.

Checks direct dependencies for npm registry deprecation messages.

Only runs when `node_modules` exists.

Issue ID:

```text
dependencies/deprecated
```

Fix:

```text
fix:update-deps
```

### Documentation Analyzers

Files:

```text
packages/core/src/analyzers/documentation/readme.ts
packages/core/src/analyzers/documentation/license.ts
packages/core/src/analyzers/documentation/changelog.ts
packages/core/src/analyzers/documentation/contributing.ts
```

Checks:

- README exists and has substance
- LICENSE exists
- CHANGELOG exists
- CONTRIBUTING guide exists

Issue IDs include:

- `documentation/readme-missing`
- `documentation/readme-stub`
- `documentation/license-missing`
- `documentation/changelog-missing`
- `documentation/contributing-missing`

### Code Quality Analyzers

Files:

```text
packages/core/src/analyzers/quality/eslint.ts
packages/core/src/analyzers/quality/prettier.ts
packages/core/src/analyzers/quality/typescript.ts
packages/core/src/analyzers/quality/editorconfig.ts
```

Checks:

- ESLint config/dependency
- Prettier config/dependency
- TypeScript config
- TypeScript strict mode
- EditorConfig

### Testing Analyzers

Files:

```text
packages/core/src/analyzers/testing/framework.ts
packages/core/src/analyzers/testing/ci-test.ts
```

Checks:

- test runner or test script
- test files
- coverage script/configuration
- CI test step

### CI/CD Analyzer

File:

```text
packages/core/src/analyzers/ci/pipeline.ts
```

Checks:

- CI workflow exists
- lint step in CI
- release automation
- Dependabot/Renovate

### Best Practices Analyzer

File:

```text
packages/core/src/analyzers/best-practices/package-fields.ts
```

Checks:

- `.gitignore`
- `node_modules` tracked by git
- `engines.node`
- `repository`
- `description`
- `keywords`

## 10. Fix Engine

Fix engine:

```text
packages/core/src/engine/fix-engine.ts
```

Current fix tiers:

- `safe`
- `confirmation`
- `destructive`

Implemented safe fixes include:

- generate `.gitignore`
- repair `.gitignore`
- add env patterns to `.gitignore`
- generate `.editorconfig`
- generate Prettier config
- generate `tsconfig.json`
- generate `CONTRIBUTING.md`
- generate GitHub Actions CI
- generate Dependabot config
- add `.npmignore`
- add `engines.node`
- add package description
- add test script
- add lint script
- add type-check script

Implemented confirmation-tier fixes include:

- enable TypeScript strict mode
- run `npm audit fix`
- run `npm update`
- show install command guidance for missing dependencies
- show uninstall command guidance for unused dependencies

The CLI currently applies:

- safe fixes by default
- confirmation-tier fixes when `--force` is passed

Interactive prompting is not implemented yet.

## 11. Formatters

Formatter directory:

```text
packages/core/src/formatters
```

Implemented formats:

- terminal
- JSON
- Markdown
- self-contained HTML

The HTML formatter is intentionally dependency-free and outputs a single file with inline CSS.

## 12. Config

Default config:

```text
packages/core/src/config/defaults.ts
```

Config loader:

```text
packages/core/src/config/loader.ts
```

Supported config files:

- `project-doctor.config.mjs`
- `project-doctor.config.js`
- `project-doctor.config.cjs`
- `project-doctor.config.json`

`project-doctor.config.ts` is intentionally rejected for now with a clear error because no TypeScript runtime loader is bundled.

Example config:

```js
import { defineConfig } from '@haafii/project-doctor-core';

export default defineConfig({
  root: '.',
  minScore: 70,
  output: {
    format: 'terminal',
    minSeverity: 'info'
  },
  plugins: {
    autoDetect: true
  }
});
```

## 13. Tests

Test file:

```text
test/core.test.mjs
```

Fixtures:

```text
test/fixtures/minimal-js
test/fixtures/healthy-ts
```

Current tests cover:

- minimal project gets a low score
- healthy TypeScript fixture gets a high score
- JSON formatter emits parseable JSON
- npm audit parser groups vulnerability severities
- npm outdated parser separates major and non-major updates
- deprecated package parser emits update guidance

Run tests:

```sh
npm test
```

## 14. What Has Been Completed

### Phase 0: Planning

Status: complete.

Source:

```text
project-doctor-planning.md
```

This file contains the original product vision, competitive analysis, architecture, scoring model, CLI design, output design, config API, public interfaces, roadmap, testing strategy, and CI/CD plan.

### Phase 1: MVP Foundation

Status: complete and published as `0.1.0`, then polished as `0.1.1`.

Completed:

- npm workspace monorepo
- TypeScript build setup
- core package
- CLI package
- scanner
- analyzer registry
- scoring engine
- terminal/JSON/Markdown/HTML formatters
- config loader
- basic fix engine
- documentation checks
- quality checks
- testing checks
- CI/CD checks
- best-practice checks
- basic security checks
- dependency import checks
- fixtures and tests
- GitHub repository push
- npm publish

Published:

```text
@haafii/project-doctor@0.1.1
@haafii/project-doctor-core@0.1.1
```

### Phase 1.1: Package Page Polish

Status: complete and published.

Completed:

- package-level `README.md` in `packages/cli`
- package-level `README.md` in `packages/core`
- package-level `LICENSE` in both packages
- root README install/package links
- `v0.1.1` tag pushed to GitHub
- npm package READMEs verified

### Phase 2: npm-Backed Dependency and Security Checks

Status: complete, pushed to GitHub, tagged, and published to npm.

Version:

```text
0.2.0
```

Completed:

- `npm audit --json` analyzer
- `npm outdated --json --long` analyzer
- npm registry deprecated-package analyzer
- command runner utility with timeouts
- parser-level tests for the new npm-backed analyzers
- confirmation-tier fixes for `npm audit fix` and `npm update`
- docs updated for live npm checks
- `v0.2.0` tag created and pushed to GitHub
- `@haafii/project-doctor-core@0.2.0` published to npm
- `@haafii/project-doctor@0.2.0` published to npm
- npm `latest` verified as `0.2.0` for both packages
- `npx @haafii/project-doctor@0.2.0 scan .` verified from a temporary project

## 15. Current Known Limitations

### npm Auth / Publishing Notes

Publishing requires npm authentication that can publish under `@haafii`.

As of 2026-07-14, the local npm registry session is valid:

```text
npm whoami -> haafii
```

The `0.2.0` packages were published after tests and npm dry-run packs passed for both workspaces.

The latest successful publish used a granular token with publish permission. That token should be revoked after use because it was shared through chat during the release process.

If publishing fails with:

```text
Two-factor authentication or granular access token with bypass 2fa enabled is required
```

create a fresh granular npm token with:

- read/write permission
- access to the `@haafii` scope
- publish/bypass-2FA enabled if the npm UI shows that option

### GitHub Remote Auth

The repository now uses the SSH remote:

```text
git@github.com:Haafii/project-doctor.git
```

SSH authentication works for the `Haafii` GitHub account on this machine. This fixed the earlier non-interactive HTTPS credential prompt problem.

### Live npm Checks Require Installed Dependencies

The Phase 2 live npm checks only run when `node_modules` exists.

This is deliberate. It prevents Project Doctor from unexpectedly installing dependencies or hanging on fresh clones.

### TypeScript Config Files

`project-doctor.config.ts` is planned but not supported yet.

### Interactive Fix Prompts

The current `fix` command is non-interactive.

Confirmation-tier fixes require:

```sh
project-doctor fix . --force
```

This should eventually become an interactive prompt flow.

### Monorepo Support

Workspace package detection exists, and dependency import checks are workspace-aware.

Full monorepo scoring is not implemented yet. There is no per-package score breakdown.

### Plugin System

Plugin commands exist as placeholders, but plugin loading is not implemented yet.

## 16. Planned Next Phases

### Phase 2.1: Publish and Stabilize `0.2.0`

Status: complete.

Completed:

- push `v0.2.0` tag
- publish `@haafii/project-doctor-core@0.2.0`
- publish `@haafii/project-doctor@0.2.0`
- verify npm latest is `0.2.0`
- run `npx @haafii/project-doctor scan .` from a temporary project

Recommended release notes:

```text
Project Doctor 0.2.0 adds live npm-backed dependency and security analysis:

- npm audit vulnerability checks
- npm outdated major/minor drift checks
- direct dependency deprecation checks
- confirmation-tier npm audit/update fixes
- parser tests for npm-backed analyzers
```

### Phase 2.2: Interactive Fix Engine

Priority: high.

Goal:

Make `project-doctor fix` safe and pleasant for real users.

Tasks:

- add interactive prompts for confirmation-tier fixes
- let users select fixes from a list
- show commands before executing
- show before/after summary
- preserve `--dry-run`
- keep `--force` for non-interactive CI usage
- improve result rendering when commands fail

Useful files:

```text
packages/cli/src/commands/fix.ts
packages/core/src/engine/fix-engine.ts
```

### Phase 2.3: Better Dependency Analysis

Priority: high.

Tasks:

- parse static imports more accurately
- recognize dynamic imports, JSX runtimes, config references, test-only imports
- distinguish runtime dependencies from dev-only usage
- avoid false positives for packages used only in config files
- add support for package manager detection
- add pnpm/yarn lockfile-aware behavior
- add lockfile out-of-sync detection

Useful files:

```text
packages/core/src/analyzers/dependency/imports.ts
packages/core/src/analyzers/dependency/lockfile.ts
packages/core/src/scanner/index.ts
```

### Phase 2.4: Security Hardening

Priority: high.

Tasks:

- improve secret detection with safer allowlists
- detect tracked `.env` files using git data, not only filesystem presence
- inspect GitHub Actions for dangerous patterns
- detect dependency confusion risk for scoped/private package patterns
- add package script risk scoring beyond install lifecycle scripts
- add tests for secret patterns and false positives

Useful files:

```text
packages/core/src/analyzers/security/baseline.ts
packages/core/src/analyzers/security/npm-audit.ts
```

### Phase 2.5: Coverage and Testing Analysis

Priority: medium.

Tasks:

- parse coverage summaries from `coverage/coverage-summary.json`
- support Vitest, Jest, c8, nyc, Playwright, Cypress
- report exact line/branch/function coverage
- apply thresholds from config
- detect tests in CI more robustly

Useful files:

```text
packages/core/src/analyzers/testing/framework.ts
packages/core/src/analyzers/testing/ci-test.ts
```

### Phase 3: Plugin System and Rich Reports

Priority: medium after Phase 2 stabilization.

Goal:

Implement the extensibility layer from the original planning document.

Tasks:

- plugin loader
- plugin compatibility validation
- plugin auto-detection
- plugin analyzers/fixes merge
- first-party React plugin
- first-party Vite plugin
- first-party Next.js plugin
- plugin command implementation
- richer HTML report dashboard

Useful files:

```text
packages/core/src/types/index.ts
packages/cli/src/commands/plugin.ts
```

Planned first-party plugins:

- `@haafii/project-doctor-plugin-react`
- `@haafii/project-doctor-plugin-vite`
- `@haafii/project-doctor-plugin-next`

### Phase 4: Monorepos and CI Integration

Priority: medium.

Tasks:

- per-package scanning
- per-package scores
- aggregate monorepo score
- pnpm workspace support
- Nx/Turborepo hints
- GitHub Actions annotations
- CI summary markdown output
- score threshold history

### Phase 5: Ecosystem and Product Polish

Priority: later.

Tasks:

- documentation site
- GitHub App
- VS Code extension
- web dashboard
- historical score trends
- comparison between branches
- framework-specific reports
- badges

### Mapping to the Original Roadmap

The original `project-doctor-planning.md` roadmap uses broader milestones:

- Phase 1: Foundation
- Phase 2: Quality and fixes
- Phase 3: Plugin system and reports
- Phase 4: Ecosystem and growth

This handoff keeps that direction but splits the current work into smaller execution phases:

- Phase 1 in this handoff equals the original Foundation phase.
- Phase 2.1 through Phase 2.5 are the remaining practical pieces of the original Quality and fixes phase.
- Phase 3 in this handoff equals the original Plugin system and reports phase.
- Phase 4 and Phase 5 in this handoff divide the original Ecosystem and growth phase into monorepo/CI work first, then product ecosystem polish later.

The original planning document also describes future version goals:

- Version 1.0: stable CLI health scanning, scoring, reporting, and safe fixes.
- Version 2.0: plugin ecosystem, deeper framework support, richer reports.
- Version 3.0: team workflows, dashboards, historical insights, and broader integrations.

The current code is still early pre-1.0. Treat `0.2.0` as an incremental Phase 2 release, not as a fully complete Version 1.0 product.

## 17. Recommended Immediate Next Tasks

If a new developer picks this up today, do these in order:

1. Revoke the npm token that was shared during the `0.2.0` publish.

2. Create GitHub release notes for `v0.2.0`.

3. Start Phase 2.2 interactive fixes.

4. Keep this `PROJECT_HANDOFF.md` file updated after every meaningful implementation, release, or publishing change.

## 18. Security Notes

Never commit npm tokens, GitHub tokens, `.env`, or local credentials.

The repository ignores:

- `.env`
- `.env.*`
- `.DS_Store`
- `node_modules`
- build output
- TypeScript build info
- generated Project Doctor reports

If a token was pasted into any chat or terminal log, revoke it immediately and create a new one.

Use short-lived or granular tokens for publishing whenever possible.

## 19. Release Checklist

Use this checklist for every release.

1. Update package versions:

   ```text
   package.json
   packages/core/package.json
   packages/cli/package.json
   package-lock.json
   ```

2. Run:

   ```sh
   npm install
   npm test
   node packages/cli/dist/index.js scan .
   npm pack --workspace @haafii/project-doctor-core --dry-run
   npm pack --workspace @haafii/project-doctor --dry-run
   ```

3. Commit:

   ```sh
   git add .
   git commit -m "feat: ..."
   git push origin main
   ```

4. Tag:

   ```sh
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```

5. Publish core first:

   ```sh
   npm publish --workspace @haafii/project-doctor-core --access public
   ```

6. Publish CLI second:

   ```sh
   npm publish --workspace @haafii/project-doctor --access public
   ```

7. Verify:

   ```sh
   npm view @haafii/project-doctor-core version
   npm view @haafii/project-doctor version
   npx @haafii/project-doctor scan .
   ```

## 20. Mental Model for Future Work

Keep Project Doctor opinionated but careful.

Good checks should be:

- explainable
- fast
- deterministic when possible
- safe by default
- configurable when opinions vary
- useful in CI
- useful locally

Good fixes should:

- avoid destructive behavior by default
- show exactly what they will do
- be easy to dry-run
- respect existing project style
- never hide command failures

The long-term product goal is still the original one:

```text
Lighthouse for JavaScript projects: scan, score, fix, repeat.
```
