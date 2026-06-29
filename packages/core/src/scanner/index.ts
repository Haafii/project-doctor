import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  FileSystemIndex,
  GitInfo,
  InstalledPackage,
  LockfileData,
  PackageJson,
  RegistryMeta,
  ResolvedConfig,
  ScanContext,
  WorkspacePackage
} from '../types/index.js';
import { getAllDependencies } from '../utils/package.js';
import { isDirectory, pathExists, readJsonFile, relativePath, toPosixPath, matchesAny } from '../utils/file.js';

const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
const configFilePattern = /(^|\/)(eslint\.config\.[cm]?[jt]s|\.eslintrc(\..+)?|\.prettierrc(\..+)?|prettier\.config\.[cm]?[jt]s|tsconfig\.json|\.editorconfig|vite\.config\.[cm]?[jt]s|webpack\.config\.[cm]?[jt]s)$/;
const documentationPattern = /(^|\/)(readme|license|changelog|contributing|code_of_conduct)(\.[a-z0-9]+)?$/i;
const ciPattern = /(^|\/)(\.github\/workflows\/.+\.ya?ml|\.gitlab-ci\.ya?ml|circle\.yml|\.circleci\/config\.yml)$/;

export async function scanProject(config: ResolvedConfig): Promise<ScanContext> {
  const root = path.resolve(config.root);
  const packageJsonPath = path.join(root, 'package.json');
  const packageJson = (await pathExists(packageJsonPath))
    ? await readJsonFile<PackageJson>(packageJsonPath)
    : {};

  const [fileSystem, lockfile, git, workspaces] = await Promise.all([
    scanFileSystem(root, config.ignore),
    readLockfile(root),
    readGitInfo(root),
    readWorkspaces(root, packageJson)
  ]);

  const installedPackages = createInstalledPackageIndex(packageJson);
  const registry: RegistryMeta = {
    packages: Object.fromEntries(installedPackages.map((pkg) => [pkg.name, pkg]))
  };

  return {
    root,
    config,
    packageJson,
    packageJsonPath,
    workspaces,
    lockfile,
    lockfileType: lockfile?.type ?? null,
    fileSystem,
    git,
    registry,
    installedPackages
  };
}

async function readWorkspaces(root: string, packageJson: PackageJson): Promise<WorkspacePackage[]> {
  const patterns = Array.isArray(packageJson.workspaces)
    ? packageJson.workspaces
    : packageJson.workspaces?.packages ?? [];

  const workspacePackages: WorkspacePackage[] = [];
  for (const pattern of patterns) {
    if (!pattern.endsWith('/*')) {
      continue;
    }

    const base = path.join(root, pattern.slice(0, -2));
    if (!(await isDirectory(base))) {
      continue;
    }

    const entries = await readdir(base, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const workspaceRoot = path.join(base, entry.name);
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      if (!(await pathExists(packageJsonPath))) {
        continue;
      }

      const workspacePackageJson = await readJsonFile<PackageJson>(packageJsonPath);
      workspacePackages.push({
        name: workspacePackageJson.name ?? entry.name,
        root: relativePath(root, workspaceRoot),
        packageJson: workspacePackageJson
      });
    }
  }

  return workspacePackages.sort((left, right) => left.root.localeCompare(right.root));
}

async function scanFileSystem(root: string, ignore: string[]): Promise<FileSystemIndex> {
  const allFiles: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = relativePath(root, absolute);
      if (!relative || matchesAny(relative, ignore)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        allFiles.push(relative);
      }
    }
  }

  await walk(root);
  allFiles.sort();

  const sourceFiles = allFiles.filter((file) => {
    const ext = path.extname(file);
    return sourceExtensions.has(ext) && !isTestFile(file) && !file.endsWith('.d.ts') && !configFilePattern.test(file);
  });

  return {
    sourceFiles,
    testFiles: allFiles.filter(isTestFile),
    configFiles: allFiles.filter((file) => configFilePattern.test(file)),
    documentationFiles: allFiles.filter((file) => documentationPattern.test(file)),
    ciFiles: allFiles.filter((file) => ciPattern.test(file)),
    allFiles
  };
}

function isTestFile(file: string): boolean {
  return /(^|\/)(__tests__|test|tests|spec)\//.test(file) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);
}

async function readLockfile(root: string): Promise<LockfileData | null> {
  const lockfiles: Array<{ name: string; type: LockfileData['type'] }> = [
    { name: 'package-lock.json', type: 'npm' },
    { name: 'npm-shrinkwrap.json', type: 'npm' },
    { name: 'pnpm-lock.yaml', type: 'pnpm' },
    { name: 'yarn.lock', type: 'yarn' }
  ];

  for (const candidate of lockfiles) {
    const filePath = path.join(root, candidate.name);
    if (await pathExists(filePath)) {
      return {
        path: filePath,
        type: candidate.type,
        raw: await readFile(filePath, 'utf8')
      };
    }
  }

  return null;
}

async function readGitInfo(root: string): Promise<GitInfo | null> {
  if (!(await isDirectory(path.join(root, '.git')))) {
    return null;
  }

  const runGit = (args: string[]): string | null => {
    try {
      return execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
    } catch {
      return null;
    }
  };

  const tracked = runGit(['ls-files']);
  const lastCommitDate = runGit(['log', '-1', '--format=%cI']);
  const porcelain = runGit(['status', '--porcelain']);

  return {
    remoteUrl: runGit(['config', '--get', 'remote.origin.url']),
    defaultBranch: runGit(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'])?.replace(/^origin\//, '') ?? null,
    lastCommitDate: lastCommitDate ? new Date(lastCommitDate) : null,
    trackedFiles: tracked ? tracked.split('\n').map(toPosixPath).filter(Boolean) : [],
    hasUncommittedChanges: Boolean(porcelain)
  };
}

function createInstalledPackageIndex(packageJson: PackageJson): InstalledPackage[] {
  const dependencies = getAllDependencies(packageJson);
  const devNames = new Set(Object.keys(packageJson.devDependencies ?? {}));

  return Object.entries(dependencies).map(([name, version]) => ({
    name,
    version,
    resolved: null,
    isDirect: true,
    isDevOnly: devNames.has(name),
    latestVersion: null,
    isDeprecated: false,
    deprecationMessage: null,
    vulnerabilities: [],
    license: null,
    estimatedSize: null
  }));
}

export async function readProjectFile(context: ScanContext, relativeFile: string): Promise<string> {
  return readFile(path.join(context.root, relativeFile), 'utf8');
}
