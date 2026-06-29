import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Analyzer, Issue, PackageJson, ScanContext } from '../../types/index.js';
import { getAllDependencies, getProductionDependencies, packageNameFromSpecifier } from '../../utils/package.js';

const importPattern =
  /(?:import\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?|export\s+[^'"]+\s+from\s+|require\(|import\()\s*['"]([^'"]+)['"]/g;

export const dependencyImportsAnalyzer: Analyzer = {
  id: 'dependencies/imports',
  name: 'Dependency imports',
  description: 'Checks import statements against package.json dependencies.',
  category: 'dependencies',
  async run(context) {
    const scopes = getPackageScopes(context);
    const importedByScope = new Map<string, Set<string>>(scopes.map((scope) => [scope.root, new Set<string>()]));
    const missing = new Set<string>();

    for (const file of context.fileSystem.sourceFiles) {
      const content = await readFile(path.join(context.root, file), 'utf8');
      const scope = findScope(scopes, file);
      const allDependencies = getAllDependencies(scope.packageJson);
      const importedPackages = importedByScope.get(scope.root);
      for (const match of content.matchAll(importPattern)) {
        const packageName = packageNameFromSpecifier(match[1] ?? '');
        if (packageName) {
          importedPackages?.add(packageName);
          if (!allDependencies[packageName]) {
            missing.add(`${scope.name}: ${packageName}`);
          }
        }
      }
    }

    const issues: Issue[] = [];
    const missingList = [...missing].sort();
    if (missingList.length > 0) {
      issues.push({
        id: 'dependencies/missing',
        title: 'Imported packages are missing from package.json',
        description: 'Source files import packages that are not declared as dependencies.',
        category: 'dependencies',
        severity: 'error',
        context: { type: 'list', data: missingList },
        fixable: true,
        fixId: 'fix:add-missing-deps',
        analyzer: this.id,
        deduction: missingList.length * 5
      });
    }

    const ignoredRuntimePackages = new Set(['@types/node']);
    const unused: string[] = [];
    for (const scope of scopes) {
      const productionDependencies = getProductionDependencies(scope.packageJson);
      const importedPackages = importedByScope.get(scope.root) ?? new Set<string>();
      for (const packageName of Object.keys(productionDependencies)) {
        if (!ignoredRuntimePackages.has(packageName) && !importedPackages.has(packageName)) {
          unused.push(`${scope.name}: ${packageName}`);
        }
      }
    }

    if (unused.length > 0 && context.fileSystem.sourceFiles.length > 0) {
      issues.push({
        id: 'dependencies/unused',
        title: 'Dependencies appear unused',
        description: 'These runtime dependencies were not imported from source files during the static scan.',
        category: 'dependencies',
        severity: 'warning',
        context: { type: 'list', data: unused.sort() },
        fixable: true,
        fixId: 'fix:remove-unused-deps',
        analyzer: this.id,
        deduction: unused.length * 2
      });
    }

    return issues;
  }
};

type PackageScope = {
  name: string;
  root: string;
  packageJson: PackageJson;
};

function getPackageScopes(context: ScanContext): PackageScope[] {
  return [
    {
      name: context.packageJson.name ?? 'root',
      root: '',
      packageJson: context.packageJson
    },
    ...context.workspaces.map((workspace) => ({
      name: workspace.name,
      root: workspace.root,
      packageJson: workspace.packageJson
    }))
  ].sort((left, right) => right.root.length - left.root.length);
}

function findScope(scopes: PackageScope[], file: string): PackageScope {
  return scopes.find((scope) => scope.root && (file === scope.root || file.startsWith(`${scope.root}/`))) ?? scopes[scopes.length - 1];
}
