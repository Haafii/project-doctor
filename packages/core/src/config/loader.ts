import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ProjectDoctorConfig, ResolvedConfig } from '../types/index.js';
import { resolveConfig } from './defaults.js';

const configFileNames = [
  'project-doctor.config.mjs',
  'project-doctor.config.js',
  'project-doctor.config.cjs',
  'project-doctor.config.json',
  'project-doctor.config.ts'
];

export async function loadConfig(projectRoot: string, configPath?: string): Promise<ResolvedConfig> {
  const absoluteRoot = path.resolve(projectRoot);
  const foundPath = configPath ? path.resolve(absoluteRoot, configPath) : await findConfig(absoluteRoot);
  if (!foundPath) {
    return resolveConfig({}, absoluteRoot);
  }

  const userConfig = await readConfig(foundPath);
  return resolveConfig(userConfig, path.resolve(absoluteRoot, userConfig.root ?? '.'));
}

async function findConfig(root: string): Promise<string | null> {
  for (const name of configFileNames) {
    const candidate = path.join(root, name);
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Keep searching.
    }
  }

  return null;
}

async function readConfig(configPath: string): Promise<ProjectDoctorConfig> {
  if (configPath.endsWith('.json')) {
    return JSON.parse(await readFile(configPath, 'utf8')) as ProjectDoctorConfig;
  }

  if (configPath.endsWith('.ts')) {
    throw new Error(
      'TypeScript config files need a TS runtime. Use project-doctor.config.mjs for now, or pass --config to a JSON/JS config.'
    );
  }

  const imported = await import(pathToFileURL(configPath).href);
  return (imported.default ?? imported.config ?? imported) as ProjectDoctorConfig;
}
