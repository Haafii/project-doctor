export type IssueCategory =
  | 'security'
  | 'dependencies'
  | 'testing'
  | 'quality'
  | 'documentation'
  | 'cicd'
  | 'bestPractices'
  | 'performance';

export type IssueSeverity = 'critical' | 'error' | 'warning' | 'info';

export type OutputFormat = 'terminal' | 'json' | 'html' | 'markdown';

export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  private?: boolean;
  license?: string;
  type?: string;
  main?: string;
  module?: string;
  types?: string;
  exports?: unknown;
  files?: string[];
  keywords?: string[];
  repository?: string | { type?: string; url?: string };
  engines?: Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  sideEffects?: boolean | string[];
  [key: string]: unknown;
}

export interface WorkspacePackage {
  name: string;
  root: string;
  packageJson: PackageJson;
}

export interface LockfileData {
  path: string;
  type: 'npm' | 'yarn' | 'pnpm';
  raw: string;
}

export interface FileSystemIndex {
  sourceFiles: string[];
  testFiles: string[];
  configFiles: string[];
  documentationFiles: string[];
  ciFiles: string[];
  allFiles: string[];
}

export interface GitInfo {
  remoteUrl: string | null;
  defaultBranch: string | null;
  lastCommitDate: Date | null;
  trackedFiles: string[];
  hasUncommittedChanges: boolean;
}

export interface Vulnerability {
  name: string;
  severity: IssueSeverity;
  title: string;
  url?: string;
}

export interface InstalledPackage {
  name: string;
  version: string;
  resolved: string | null;
  isDirect: boolean;
  isDevOnly: boolean;
  latestVersion: string | null;
  isDeprecated: boolean;
  deprecationMessage: string | null;
  vulnerabilities: Vulnerability[];
  license: string | null;
  estimatedSize: number | null;
}

export interface RegistryMeta {
  packages: Record<string, InstalledPackage>;
}

export interface ScoringConfig {
  weights: Record<IssueCategory, number>;
  coverageThreshold: number;
}

export interface ProjectDoctorConfig {
  root?: string;
  ignore?: string[];
  minScore?: number;
  scoring?: Partial<ScoringConfig> & {
    weights?: Partial<Record<IssueCategory, number>>;
  };
  analyzers?: {
    disable?: string[];
    overrides?: Partial<Record<string, IssueSeverity>>;
  };
  plugins?: {
    autoDetect?: boolean;
    enable?: string[];
    disable?: string[];
  };
  output?: {
    format?: OutputFormat;
    minSeverity?: IssueSeverity;
    file?: string;
    title?: string;
  };
  fixes?: {
    disable?: string[];
    autoApprove?: string[];
    defaultLicense?: string;
    codeowners?: string[];
  };
  ai?: {
    enabled?: boolean;
    provider?: 'anthropic' | 'openai' | string;
    apiKey?: string;
  };
}

export interface ResolvedConfig {
  root: string;
  ignore: string[];
  minScore: number;
  scoring: ScoringConfig;
  analyzers: {
    disable: string[];
    overrides: Partial<Record<string, IssueSeverity>>;
  };
  plugins: {
    autoDetect: boolean;
    enable: string[];
    disable: string[];
  };
  output: {
    format: OutputFormat;
    minSeverity: IssueSeverity;
    file?: string;
    title?: string;
  };
  fixes: {
    disable: string[];
    autoApprove: string[];
    defaultLicense: string;
    codeowners: string[];
  };
  ai: {
    enabled: boolean;
    provider: string;
    apiKey?: string;
  };
}

export interface ScanContext {
  readonly root: string;
  readonly config: ResolvedConfig;
  readonly packageJson: PackageJson;
  readonly packageJsonPath: string;
  readonly workspaces: WorkspacePackage[];
  readonly lockfile: LockfileData | null;
  readonly lockfileType: 'npm' | 'yarn' | 'pnpm' | null;
  readonly fileSystem: FileSystemIndex;
  readonly git: GitInfo | null;
  readonly registry: RegistryMeta;
  readonly installedPackages: InstalledPackage[];
}

export interface IssueContext {
  type: 'list' | 'table' | 'code' | 'text';
  data: unknown;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  context?: IssueContext;
  documentation?: string;
  fixable: boolean;
  fixId?: string;
  files?: string[];
  analyzer: string;
  plugin?: string;
  deduction?: number;
}

export type AnalyzerFn = (context: ScanContext) => Promise<Issue[]>;

export interface Analyzer {
  id: string;
  name: string;
  description: string;
  category: IssueCategory;
  run: AnalyzerFn;
}

export type FixTier = 'safe' | 'confirmation' | 'destructive';

export interface FixOptions {
  dryRun: boolean;
  force: boolean;
  interactive: boolean;
}

export interface FixResult {
  success: boolean;
  filesCreated: string[];
  filesModified: string[];
  filesDeleted: string[];
  commandsRun: string[];
  message: string;
  error?: Error;
}

export interface Fix {
  id: string;
  name: string;
  description: string;
  tier: FixTier;
  resolves: string[];
  applicable: (context: ScanContext) => Promise<boolean>;
  apply: (context: ScanContext, options: FixOptions) => Promise<FixResult>;
}

export interface ProjectDoctorPlugin {
  name: string;
  version: string;
  description: string;
  detect?: (context: ScanContext) => Promise<boolean>;
  initialize?: (context: ScanContext) => Promise<void>;
  analyzers?: Analyzer[];
  fixes?: Fix[];
  scoring?: Partial<ScoringConfig>;
}

export interface ProjectMeta {
  name: string;
  version: string;
  description: string | null;
  path: string;
}

export interface CategoryScore {
  score: number;
  max: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issueCount: Record<IssueSeverity, number>;
}

export interface ScoreBreakdown {
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  categories: Record<IssueCategory, CategoryScore>;
}

export interface FixSummary {
  available: number;
  safe: number;
  requiresConfirmation: number;
  destructive: number;
}

export interface ScanMeta {
  scanDurationMs: number;
  analyzersRun: number;
  filesScanned: number;
  dependenciesScanned: number;
  pluginsLoaded: string[];
}

export interface HealthReport {
  version: string;
  timestamp: Date;
  project: ProjectMeta;
  score: ScoreBreakdown;
  issues: Issue[];
  fixes: FixSummary;
  plugins: string[];
  meta: ScanMeta;
}

export interface FormatterOptions {
  color: boolean;
  minSeverity: IssueSeverity;
  title?: string;
}

export interface Formatter {
  format: OutputFormat;
  render: (report: HealthReport, options: FormatterOptions) => string | Buffer;
}

export interface ScanOptions {
  root?: string;
  configPath?: string;
  format?: OutputFormat;
  minSeverity?: IssueSeverity;
  color?: boolean;
}

export interface RunScanOptions extends ScanOptions {
  output?: string;
  ci?: boolean;
  minScore?: number;
}

export interface FixRunOptions extends ScanOptions {
  dryRun?: boolean;
  force?: boolean;
  only?: string[];
  skip?: string[];
}
