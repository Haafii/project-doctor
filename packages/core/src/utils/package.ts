import { builtinModules } from 'node:module';
import type { PackageJson } from '../types/index.js';

const builtinNames = new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`)
]);

export function getAllDependencies(packageJson: PackageJson): Record<string, string> {
  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
    ...packageJson.optionalDependencies
  };
}

export function getProductionDependencies(packageJson: PackageJson): Record<string, string> {
  return {
    ...packageJson.dependencies,
    ...packageJson.peerDependencies,
    ...packageJson.optionalDependencies
  };
}

export function getDirectDependencyNames(packageJson: PackageJson): string[] {
  return Object.keys(getAllDependencies(packageJson)).sort();
}

export function packageNameFromSpecifier(specifier: string): string | null {
  if (!specifier || specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('#')) {
    return null;
  }

  if (builtinNames.has(specifier)) {
    return null;
  }

  const withoutNodePrefix = specifier.replace(/^node:/, '');
  if (builtinNames.has(withoutNodePrefix)) {
    return null;
  }

  if (specifier.startsWith('@')) {
    const [scope, name] = specifier.split('/');
    return scope && name ? `${scope}/${name}` : null;
  }

  return specifier.split('/')[0] ?? null;
}

export function packageHasScript(packageJson: PackageJson, words: string[]): boolean {
  const scripts = Object.values(packageJson.scripts ?? {}).join('\n').toLowerCase();
  return words.some((word) => scripts.includes(word.toLowerCase()));
}
