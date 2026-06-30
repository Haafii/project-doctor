import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Fix, FixOptions, FixResult, FixRunOptions, FixSummary, HealthReport, Issue, PackageJson, ScanContext } from '../types/index.js';
import { runCommand } from '../utils/command.js';
import { pathExists, readJsonFile } from '../utils/file.js';

type WritePlan = {
  path: string;
  content: string;
  mode: 'create' | 'overwrite' | 'append';
};

function result(message: string, plan: WritePlan[], dryRun: boolean): FixResult {
  return {
    success: true,
    filesCreated: dryRun ? [] : plan.filter((item) => item.mode === 'create').map((item) => item.path),
    filesModified: dryRun ? [] : plan.filter((item) => item.mode !== 'create').map((item) => item.path),
    filesDeleted: [],
    commandsRun: [],
    message
  };
}

async function applyWritePlan(root: string, plan: WritePlan[], options: FixOptions, message: string): Promise<FixResult> {
  if (options.dryRun) {
    return result(message, plan, true);
  }

  for (const item of plan) {
    const absolute = path.join(root, item.path);
    await mkdir(path.dirname(absolute), { recursive: true });

    if (item.mode === 'append' && (await pathExists(absolute))) {
      const current = await readFile(absolute, 'utf8');
      await writeFile(absolute, `${current.trimEnd()}\n${item.content.trim()}\n`);
      continue;
    }

    await writeFile(absolute, item.content);
  }

  return result(message, plan, false);
}

async function updatePackageJson(context: ScanContext, options: FixOptions, updater: (pkg: PackageJson) => PackageJson, message: string): Promise<FixResult> {
  const pkg = await readJsonFile<PackageJson>(context.packageJsonPath);
  const next = updater(pkg);
  if (!options.dryRun) {
    await writeFile(context.packageJsonPath, `${JSON.stringify(next, null, 2)}\n`);
  }

  return {
    success: true,
    filesCreated: [],
    filesModified: options.dryRun ? [] : ['package.json'],
    filesDeleted: [],
    commandsRun: [],
    message
  };
}

async function runNpmFix(context: ScanContext, options: FixOptions, args: string[], message: string): Promise<FixResult> {
  const command = `npm ${args.join(' ')}`;
  if (options.dryRun) {
    return {
      success: true,
      filesCreated: [],
      filesModified: [],
      filesDeleted: [],
      commandsRun: [command],
      message
    };
  }

  const result = await runCommand('npm', args, {
    cwd: context.root,
    timeoutMs: 120000
  });

  return {
    success: result.exitCode === 0,
    filesCreated: [],
    filesModified: [],
    filesDeleted: [],
    commandsRun: [command],
    message: result.exitCode === 0 ? message : `${message} Command exited with code ${result.exitCode}.`,
    error: result.exitCode === 0 ? undefined : new Error(result.stderr || result.stdout || `Command failed: ${command}`)
  };
}

function manualNpmFix(message: string, command: string): FixResult {
  return {
    success: true,
    filesCreated: [],
    filesModified: [],
    filesDeleted: [],
    commandsRun: [command],
    message
  };
}

const gitignoreEntries = ['node_modules/', 'dist/', 'build/', 'coverage/', '.cache/', '*.log', '.env', '.env.*', '!.env.example'];

export const coreFixes: Fix[] = [
  {
    id: 'generate:gitignore',
    name: 'Generate .gitignore',
    description: 'Create a Node.js oriented .gitignore.',
    tier: 'safe',
    resolves: ['best-practices/gitignore-missing'],
    applicable: async (context) => !(await pathExists(path.join(context.root, '.gitignore'))),
    apply: async (context, options) =>
      applyWritePlan(
        context.root,
        [{ path: '.gitignore', content: `${gitignoreEntries.join('\n')}\n`, mode: 'create' }],
        options,
        'Created .gitignore.'
      )
  },
  {
    id: 'fix:gitignore',
    name: 'Repair .gitignore',
    description: 'Append common Node.js ignore entries.',
    tier: 'safe',
    resolves: ['best-practices/node-modules-tracked'],
    applicable: async () => true,
    apply: async (context, options) =>
      applyWritePlan(
        context.root,
        [{ path: '.gitignore', content: gitignoreEntries.join('\n'), mode: (await pathExists(path.join(context.root, '.gitignore'))) ? 'append' : 'create' }],
        options,
        'Updated .gitignore.'
      )
  },
  {
    id: 'fix:add-env-to-gitignore',
    name: 'Ignore env files',
    description: 'Add .env patterns to .gitignore.',
    tier: 'safe',
    resolves: ['security/env-file-present'],
    applicable: async () => true,
    apply: async (context, options) =>
      applyWritePlan(
        context.root,
        [{ path: '.gitignore', content: '.env\n.env.*\n!.env.example', mode: (await pathExists(path.join(context.root, '.gitignore'))) ? 'append' : 'create' }],
        options,
        'Added env patterns to .gitignore.'
      )
  },
  {
    id: 'generate:editorconfig',
    name: 'Generate .editorconfig',
    description: 'Create a standard EditorConfig file.',
    tier: 'safe',
    resolves: ['quality/editorconfig-missing'],
    applicable: async (context) => !(await pathExists(path.join(context.root, '.editorconfig'))),
    apply: async (context, options) =>
      applyWritePlan(
        context.root,
        [
          {
            path: '.editorconfig',
            mode: 'create',
            content: 'root = true\n\n[*]\ncharset = utf-8\nend_of_line = lf\ninsert_final_newline = true\nindent_style = space\nindent_size = 2\ntrim_trailing_whitespace = true\n'
          }
        ],
        options,
        'Created .editorconfig.'
      )
  },
  {
    id: 'generate:prettier-config',
    name: 'Generate Prettier config',
    description: 'Create .prettierrc.json with common defaults.',
    tier: 'safe',
    resolves: ['quality/prettier-missing'],
    applicable: async (context) => !(await pathExists(path.join(context.root, '.prettierrc.json'))),
    apply: async (context, options) =>
      applyWritePlan(
        context.root,
        [{ path: '.prettierrc.json', mode: 'create', content: '{\n  "singleQuote": true,\n  "trailingComma": "none",\n  "printWidth": 100\n}\n' }],
        options,
        'Created .prettierrc.json.'
      )
  },
  {
    id: 'generate:tsconfig',
    name: 'Generate tsconfig',
    description: 'Create a strict tsconfig.json.',
    tier: 'safe',
    resolves: ['quality/tsconfig-missing'],
    applicable: async (context) => !(await pathExists(path.join(context.root, 'tsconfig.json'))),
    apply: async (context, options) =>
      applyWritePlan(
        context.root,
        [
          {
            path: 'tsconfig.json',
            mode: 'create',
            content: '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "NodeNext",\n    "moduleResolution": "NodeNext",\n    "strict": true,\n    "skipLibCheck": true\n  },\n  "include": ["src/**/*.ts"]\n}\n'
          }
        ],
        options,
        'Created tsconfig.json.'
      )
  },
  {
    id: 'fix:typescript-strict',
    name: 'Enable TypeScript strict mode',
    description: 'Set compilerOptions.strict to true.',
    tier: 'confirmation',
    resolves: ['quality/typescript-strict-disabled'],
    applicable: async (context) => pathExists(path.join(context.root, 'tsconfig.json')),
    apply: async (context, options) => {
      const tsconfigPath = path.join(context.root, 'tsconfig.json');
      const tsconfig = JSON.parse(await readFile(tsconfigPath, 'utf8')) as { compilerOptions?: Record<string, unknown> };
      tsconfig.compilerOptions = { ...tsconfig.compilerOptions, strict: true };
      if (!options.dryRun) {
        await writeFile(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
      }

      return {
        success: true,
        filesCreated: [],
        filesModified: options.dryRun ? [] : ['tsconfig.json'],
        filesDeleted: [],
        commandsRun: [],
        message: 'Enabled TypeScript strict mode.'
      };
    }
  },
  {
    id: 'generate:contributing',
    name: 'Generate CONTRIBUTING.md',
    description: 'Create a minimal contribution guide.',
    tier: 'safe',
    resolves: ['documentation/contributing-missing'],
    applicable: async (context) => !(await pathExists(path.join(context.root, 'CONTRIBUTING.md'))),
    apply: async (context, options) =>
      applyWritePlan(
        context.root,
        [
          {
            path: 'CONTRIBUTING.md',
            mode: 'create',
            content: '# Contributing\n\nThanks for helping improve this project.\n\n## Local setup\n\n1. Install dependencies.\n2. Run the test suite before opening a pull request.\n3. Keep changes focused and document behavior changes.\n'
          }
        ],
        options,
        'Created CONTRIBUTING.md.'
      )
  },
  {
    id: 'generate:github-actions-ci',
    name: 'Generate GitHub Actions CI',
    description: 'Create a basic CI workflow for Node.js projects.',
    tier: 'safe',
    resolves: ['cicd/pipeline-missing', 'testing/no-ci-test-step', 'cicd/no-lint-step'],
    applicable: async (context) => !(await pathExists(path.join(context.root, '.github/workflows/ci.yml'))),
    apply: async (context, options) =>
      applyWritePlan(
        context.root,
        [
          {
            path: '.github/workflows/ci.yml',
            mode: 'create',
            content: 'name: CI\n\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\njobs:\n  quality:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n      - run: npm ci\n      - run: npm run lint --if-present\n      - run: npm run type-check --if-present\n      - run: npm test --if-present\n      - run: npm run build --if-present\n'
          }
        ],
        options,
        'Created .github/workflows/ci.yml.'
      )
  },
  {
    id: 'generate:dependabot',
    name: 'Generate Dependabot config',
    description: 'Create weekly npm dependency update automation.',
    tier: 'safe',
    resolves: ['cicd/dependency-automation-missing'],
    applicable: async (context) => !(await pathExists(path.join(context.root, '.github/dependabot.yml'))),
    apply: async (context, options) =>
      applyWritePlan(
        context.root,
        [
          {
            path: '.github/dependabot.yml',
            mode: 'create',
            content: 'version: 2\nupdates:\n  - package-ecosystem: npm\n    directory: /\n    schedule:\n      interval: weekly\n'
          }
        ],
        options,
        'Created .github/dependabot.yml.'
      )
  },
  {
    id: 'fix:add-npmignore',
    name: 'Add .npmignore',
    description: 'Create a conservative .npmignore.',
    tier: 'safe',
    resolves: ['security/publish-surface-unspecified'],
    applicable: async (context) => !(await pathExists(path.join(context.root, '.npmignore'))),
    apply: async (context, options) =>
      applyWritePlan(
        context.root,
        [{ path: '.npmignore', mode: 'create', content: 'test/\ncoverage/\n.github/\n*.log\n.env\n.env.*\nproject-doctor-report.*\n' }],
        options,
        'Created .npmignore.'
      )
  },
  {
    id: 'fix:generate-lockfile',
    name: 'Generate npm lockfile',
    description: 'Run npm install --package-lock-only to generate a lockfile.',
    tier: 'safe',
    resolves: ['dependencies/lockfile-missing'],
    applicable: async (context) => !(await pathExists(path.join(context.root, 'package-lock.json'))),
    apply: async (context, options) =>
      runNpmFix(context, options, ['install', '--package-lock-only'], 'Generated package-lock.json.')
  },
  {
    id: 'fix:npm-audit',
    name: 'Run npm audit fix',
    description: 'Run npm audit fix for auto-fixable vulnerabilities.',
    tier: 'confirmation',
    resolves: ['security/npm-audit-critical', 'security/npm-audit-high', 'security/npm-audit-moderate', 'security/npm-audit-medium', 'security/npm-audit-low'],
    applicable: async (context) => context.lockfileType === 'npm',
    apply: async (context, options) => runNpmFix(context, options, ['audit', 'fix'], 'Ran npm audit fix.')
  },
  {
    id: 'fix:update-deps',
    name: 'Update npm dependencies',
    description: 'Run npm update to move dependencies within allowed package.json ranges.',
    tier: 'confirmation',
    resolves: ['dependencies/outdated-major', 'dependencies/outdated-minor', 'dependencies/deprecated'],
    applicable: async (context) => context.lockfileType === 'npm',
    apply: async (context, options) => runNpmFix(context, options, ['update'], 'Ran npm update.')
  },
  {
    id: 'fix:add-missing-deps',
    name: 'Install missing dependencies',
    description: 'Shows the command shape for missing dependency installation.',
    tier: 'confirmation',
    resolves: ['dependencies/missing'],
    applicable: async () => true,
    apply: async () => manualNpmFix('Install the missing packages listed in the report.', 'npm install <missing-package>')
  },
  {
    id: 'fix:remove-unused-deps',
    name: 'Remove unused dependencies',
    description: 'Shows the command shape for removing unused dependencies.',
    tier: 'confirmation',
    resolves: ['dependencies/unused'],
    applicable: async () => true,
    apply: async () => manualNpmFix('Remove the unused packages listed in the report after confirming they are truly unused.', 'npm uninstall <unused-package>')
  },
  {
    id: 'fix:add-engines',
    name: 'Add engines.node',
    description: 'Declare the supported Node.js runtime range.',
    tier: 'safe',
    resolves: ['best-practices/engines-missing'],
    applicable: async () => true,
    apply: async (context, options) =>
      updatePackageJson(
        context,
        options,
        (pkg) => ({ ...pkg, engines: { ...pkg.engines, node: '>=20' } }),
        'Added engines.node to package.json.'
      )
  },
  {
    id: 'fix:add-description',
    name: 'Add package description placeholder',
    description: 'Add a placeholder description that can be refined.',
    tier: 'safe',
    resolves: ['best-practices/description-missing'],
    applicable: async () => true,
    apply: async (context, options) =>
      updatePackageJson(
        context,
        options,
        (pkg) => ({ ...pkg, description: pkg.description ?? 'Project health analysis for JavaScript and TypeScript projects.' }),
        'Added package description.'
      )
  },
  {
    id: 'fix:add-test-script',
    name: 'Add test script placeholder',
    description: 'Add a safe test script if one is missing.',
    tier: 'safe',
    resolves: ['testing/framework-missing'],
    applicable: async () => true,
    apply: async (context, options) =>
      updatePackageJson(
        context,
        options,
        (pkg) => ({ ...pkg, scripts: { ...pkg.scripts, test: pkg.scripts?.test ?? 'node --test' } }),
        'Added test script.'
      )
  },
  {
    id: 'fix:add-lint-script',
    name: 'Add lint script placeholder',
    description: 'Add a lint script if one is missing.',
    tier: 'safe',
    resolves: ['quality/eslint-missing'],
    applicable: async () => true,
    apply: async (context, options) =>
      updatePackageJson(
        context,
        options,
        (pkg) => ({ ...pkg, scripts: { ...pkg.scripts, lint: pkg.scripts?.lint ?? 'eslint .' } }),
        'Added lint script.'
      )
  },
  {
    id: 'fix:add-type-check-script',
    name: 'Add type-check script',
    description: 'Add a TypeScript type-check script.',
    tier: 'safe',
    resolves: ['quality/tsconfig-missing', 'quality/typescript-strict-disabled'],
    applicable: async () => true,
    apply: async (context, options) =>
      updatePackageJson(
        context,
        options,
        (pkg) => ({ ...pkg, scripts: { ...pkg.scripts, 'type-check': pkg.scripts?.['type-check'] ?? 'tsc --noEmit' } }),
        'Added type-check script.'
      )
  }
];

export async function summarizeFixes(context: ScanContext, issues: Issue[], fixes: Fix[] = coreFixes): Promise<FixSummary> {
  const available = await getAvailableFixes(context, issues, fixes);
  return {
    available: available.length,
    safe: available.filter((fix) => fix.tier === 'safe').length,
    requiresConfirmation: available.filter((fix) => fix.tier === 'confirmation').length,
    destructive: available.filter((fix) => fix.tier === 'destructive').length
  };
}

export async function getAvailableFixes(context: ScanContext, issues: Issue[], fixes: Fix[] = coreFixes): Promise<Fix[]> {
  const disabled = new Set(context.config.fixes.disable);
  const issueFixIds = new Set(issues.map((issue) => issue.fixId).filter(Boolean) as string[]);
  const available: Fix[] = [];

  for (const fix of fixes) {
    if (!issueFixIds.has(fix.id) || disabled.has(fix.id)) {
      continue;
    }

    if (await fix.applicable(context)) {
      available.push(fix);
    }
  }

  return available;
}

export async function applyFixes(context: ScanContext, report: HealthReport, options: FixRunOptions): Promise<FixResult[]> {
  const only = options.only ? new Set(options.only) : null;
  const skip = new Set(options.skip ?? []);
  const available = await getAvailableFixes(context, report.issues);
  const selected = available.filter((fix) => !skip.has(fix.id) && (!only || only.has(fix.id)));
  const runnable = selected.filter((fix) => fix.tier === 'safe' || options.force);
  const results: FixResult[] = [];

  for (const fix of runnable) {
    results.push(
      await fix.apply(context, {
        dryRun: options.dryRun ?? false,
        force: options.force ?? false,
        interactive: false
      })
    );
  }

  return results;
}
