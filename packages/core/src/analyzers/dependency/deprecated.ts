import type { Analyzer, Issue } from '../../types/index.js';
import { getAllDependencies } from '../../utils/package.js';
import { pathExists } from '../../utils/file.js';

interface Packument {
  versions?: Record<string, { deprecated?: string }>;
}

export const deprecatedAnalyzer: Analyzer = {
  id: 'dependencies/deprecated',
  name: 'Deprecated packages',
  description: 'Checks direct npm dependencies for registry deprecation notices.',
  category: 'dependencies',
  async run(context) {
    if (!(await pathExists(`${context.root}/node_modules`))) {
      return [];
    }

    const dependencies = getAllDependencies(context.packageJson);
    const deprecated: string[] = [];
    await Promise.all(
      Object.entries(dependencies).map(async ([name, range]) => {
        const installedVersion = findInstalledVersion(context.installedPackages, name) ?? normalizeRangeVersion(range);
        if (!installedVersion) {
          return;
        }

        const message = await fetchDeprecation(name, installedVersion);
        if (message) {
          deprecated.push(`${name}@${installedVersion}: ${message}`);
        }
      })
    );

    return issuesFromDeprecatedPackages(deprecated, deprecatedAnalyzer.id);
  }
};

export function issuesFromDeprecatedPackages(packages: string[], analyzerId = 'dependencies/deprecated'): Issue[] {
  if (packages.length === 0) {
    return [];
  }

  return [
    {
      id: 'dependencies/deprecated',
      title: `${packages.length} direct ${packages.length === 1 ? 'dependency is' : 'dependencies are'} deprecated`,
      description: 'Deprecated packages may stop receiving security and compatibility updates.',
      category: 'dependencies',
      severity: 'warning',
      context: { type: 'list', data: packages.sort() },
      fixable: true,
      fixId: 'fix:update-deps',
      analyzer: analyzerId,
      deduction: packages.length * 2
    }
  ];
}

function findInstalledVersion(installedPackages: { name: string; version: string }[], packageName: string): string | null {
  return installedPackages.find((pkg) => pkg.name === packageName)?.version ?? null;
}

function normalizeRangeVersion(range: string): string | null {
  const match = range.match(/\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/);
  return match?.[0] ?? null;
}

async function fetchDeprecation(name: string, version: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name).replace(/^%40/, '@')}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' }
    });
    if (!response.ok) {
      return null;
    }

    const packument = (await response.json()) as Packument;
    return packument.versions?.[version]?.deprecated ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
