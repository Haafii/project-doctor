import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Analyzer, Issue } from '../../types/index.js';

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:api[_-]?key|secret|token|password)\s*=\s*['"]?[A-Za-z0-9_\-]{20,}/i
];

export const securityAnalyzer: Analyzer = {
  id: 'security/baseline',
  name: 'Security baseline',
  description: 'Checks for committed env files, obvious secrets, and risky install scripts.',
  category: 'security',
  async run(context) {
    const issues: Issue[] = [];

    const envFiles = context.fileSystem.allFiles.filter((file) => /^\.env(\.|$)/.test(file));
    if (envFiles.length > 0) {
      issues.push({
        id: 'security/env-file-present',
        title: '.env file is present in the project directory',
        description: 'Environment files often contain secrets. Keep real values out of source control and commit only .env.example.',
        category: 'security',
        severity: 'warning',
        files: envFiles,
        fixable: true,
        fixId: 'fix:add-env-to-gitignore',
        analyzer: this.id,
        deduction: 15
      });
    }

    const filesToInspect = context.fileSystem.allFiles.filter((file) =>
      /\.(js|jsx|ts|tsx|mjs|cjs|json|env|yml|yaml|md)$/.test(file)
    );
    const suspiciousFiles: string[] = [];
    for (const file of filesToInspect) {
      const content = await readFile(path.join(context.root, file), 'utf8');
      if (secretPatterns.some((pattern) => pattern.test(content))) {
        suspiciousFiles.push(file);
      }
    }

    if (suspiciousFiles.length > 0) {
      issues.push({
        id: 'security/possible-secret',
        title: 'Possible secret found in project files',
        description: 'Project Doctor found text matching common secret patterns. Review these files before publishing or pushing.',
        category: 'security',
        severity: 'critical',
        files: suspiciousFiles,
        fixable: false,
        analyzer: this.id,
        deduction: 25
      });
    }

    const scripts = context.packageJson.scripts ?? {};
    const risky = Object.entries(scripts)
      .filter(([name]) => ['preinstall', 'install', 'postinstall', 'prepare'].includes(name))
      .filter(([, value]) => /\b(curl|wget|sudo|chmod\s+777|rm\s+-rf)\b/.test(value));

    if (risky.length > 0) {
      issues.push({
        id: 'security/risky-install-script',
        title: 'Install lifecycle script looks risky',
        description: 'Install scripts run on contributor and CI machines. Review shell commands carefully.',
        category: 'security',
        severity: 'warning',
        context: { type: 'table', data: risky },
        fixable: false,
        analyzer: this.id,
        deduction: 5
      });
    }

    if (!context.packageJson.private && !context.packageJson.files && !context.fileSystem.allFiles.includes('.npmignore')) {
      issues.push({
        id: 'security/publish-surface-unspecified',
        title: 'Package publish surface is not restricted',
        description: 'Use a package.json files field or .npmignore to avoid publishing tests, config, or local files accidentally.',
        category: 'security',
        severity: 'info',
        fixable: true,
        fixId: 'fix:add-npmignore',
        analyzer: this.id,
        deduction: 2
      });
    }

    return issues;
  }
};
