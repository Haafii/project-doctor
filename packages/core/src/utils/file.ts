import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

export function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

export function relativePath(root: string, filePath: string): string {
  return toPosixPath(path.relative(root, filePath));
}

export function hasAnyFile(files: string[], names: string[]): boolean {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return files.some((file) => wanted.has(path.basename(file).toLowerCase()));
}

export function findFirstFile(files: string[], names: string[]): string | undefined {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return files.find((file) => wanted.has(path.basename(file).toLowerCase()));
}

export function matchesAny(value: string, patterns: string[]): boolean {
  const normalized = toPosixPath(value);
  return patterns.some((pattern) => {
    const clean = pattern.replace(/^\.\//, '');
    if (clean.endsWith('/**')) {
      return normalized === clean.slice(0, -3) || normalized.startsWith(clean.slice(0, -2));
    }

    if (clean.includes('*')) {
      const escaped = clean.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
      return new RegExp(`^${escaped}$`).test(normalized);
    }

    return normalized === clean || normalized.startsWith(`${clean}/`);
  });
}
