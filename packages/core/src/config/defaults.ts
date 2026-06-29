import type { IssueCategory, ProjectDoctorConfig, ResolvedConfig } from '../types/index.js';

export const categoryMaxPoints: Record<IssueCategory, number> = {
  security: 25,
  dependencies: 20,
  testing: 15,
  quality: 15,
  documentation: 10,
  cicd: 10,
  bestPractices: 5,
  performance: 0
};

export const defaultConfig: ResolvedConfig = {
  root: '.',
  ignore: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.cache/**',
    'coverage/**',
    '.git/**'
  ],
  minScore: 70,
  scoring: {
    weights: {
      security: 0.25,
      dependencies: 0.2,
      testing: 0.15,
      quality: 0.15,
      documentation: 0.1,
      cicd: 0.1,
      bestPractices: 0.05,
      performance: 0
    },
    coverageThreshold: 80
  },
  analyzers: {
    disable: [],
    overrides: {}
  },
  plugins: {
    autoDetect: true,
    enable: [],
    disable: []
  },
  output: {
    format: 'terminal',
    minSeverity: 'info'
  },
  fixes: {
    disable: [],
    autoApprove: [],
    defaultLicense: 'MIT',
    codeowners: []
  },
  ai: {
    enabled: false,
    provider: 'openai'
  }
};

export function defineConfig(config: ProjectDoctorConfig): ProjectDoctorConfig {
  return config;
}

export function resolveConfig(config: ProjectDoctorConfig = {}, rootOverride?: string): ResolvedConfig {
  return {
    ...defaultConfig,
    ...config,
    root: rootOverride ?? config.root ?? defaultConfig.root,
    ignore: config.ignore ?? defaultConfig.ignore,
    scoring: {
      ...defaultConfig.scoring,
      ...config.scoring,
      weights: {
        ...defaultConfig.scoring.weights,
        ...config.scoring?.weights
      }
    },
    analyzers: {
      disable: config.analyzers?.disable ?? defaultConfig.analyzers.disable,
      overrides: config.analyzers?.overrides ?? defaultConfig.analyzers.overrides
    },
    plugins: {
      autoDetect: config.plugins?.autoDetect ?? defaultConfig.plugins.autoDetect,
      enable: config.plugins?.enable ?? defaultConfig.plugins.enable,
      disable: config.plugins?.disable ?? defaultConfig.plugins.disable
    },
    output: {
      ...defaultConfig.output,
      ...config.output
    },
    fixes: {
      ...defaultConfig.fixes,
      ...config.fixes,
      disable: config.fixes?.disable ?? defaultConfig.fixes.disable,
      autoApprove: config.fixes?.autoApprove ?? defaultConfig.fixes.autoApprove,
      codeowners: config.fixes?.codeowners ?? defaultConfig.fixes.codeowners
    },
    ai: {
      ...defaultConfig.ai,
      ...config.ai
    }
  };
}
