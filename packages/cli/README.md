# Project Doctor

Lighthouse-style health checks for JavaScript and TypeScript projects.

Project Doctor scans a project for dependency hygiene, documentation, testing setup, code quality configuration, CI/CD readiness, package metadata, and basic security signals, then returns a 0-100 health score with actionable issues.

## Usage

Run without installing:

```sh
npx @haafii/project-doctor scan .
```

Install globally:

```sh
npm install -g @haafii/project-doctor
project-doctor scan .
```

Install in a project:

```sh
npm install -D @haafii/project-doctor
npx project-doctor scan .
```

## Commands

```sh
project-doctor scan .
project-doctor score .
project-doctor report . --format html
project-doctor report . --format json --output report.json
project-doctor fix . --dry-run
project-doctor fix .
project-doctor init .
```

## Examples

```sh
npx @haafii/project-doctor scan . --format json
npx @haafii/project-doctor scan . --ci --min-score 70
npx @haafii/project-doctor report . --format markdown --output HEALTH.md
```

## Current Scope

This early release includes:

- filesystem, package.json, lockfile, and git scanning
- missing and unused dependency checks
- live npm audit, outdated package, and deprecated package checks when dependencies are installed
- README, LICENSE, CHANGELOG, and CONTRIBUTING checks
- ESLint, Prettier, TypeScript strict mode, and EditorConfig checks
- test framework, test file, coverage, and CI checks
- basic security checks for secrets, env files, lifecycle scripts, and package publish surface
- terminal, JSON, Markdown, and self-contained HTML reports
- safe automatic fixes for common project hygiene files

## Repository

Source code and roadmap: <https://github.com/Haafii/project-doctor>
