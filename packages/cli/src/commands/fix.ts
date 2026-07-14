import { stdin, stdout } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import type { Command } from 'commander';
import { applyFixes, createScanContext, getAvailableFixes, runScan } from '@haafii/project-doctor-core';
import type { Fix, FixResult, HealthReport } from '@haafii/project-doctor-core';
import { readActionOptions } from './options.js';

type FixOptions = {
  dryRun?: boolean;
  force?: boolean;
  interactive?: boolean;
  only?: string;
  skip?: string;
  config?: string;
};

export function registerFixCommand(program: Command): void {
  program
    .command('fix')
    .description('Apply safe automatic fixes for detected issues.')
    .argument('[path]', 'Project path to fix', '.')
    .option('--dry-run', 'Preview fixes without writing files')
    .option('--force', 'Allow confirmation-tier fixes in non-interactive mode')
    .option('--no-interactive', 'Disable prompts and apply safe fixes only unless --force is used')
    .option('--only <ids>', 'Comma-separated fix IDs to apply')
    .option('--skip <ids>', 'Comma-separated fix IDs to skip')
    .option('-c, --config <path>', 'Path to a config file')
    .action(async (projectPath: string, candidate: Command | FixOptions) => {
      const options = readActionOptions<FixOptions>(candidate);
      const report = await runScan({ root: projectPath, configPath: options.config });
      const context = await createScanContext({ root: projectPath, configPath: options.config });
      const only = splitIds(options.only);
      const skip = splitIds(options.skip);
      const available = await getAvailableFixes(context, report.issues);
      const filtered = filterFixes(available, only, skip);

      if (available.length === 0) {
        console.log('No fixes are available for the current issue set.');
        return;
      }

      if (filtered.length === 0) {
        console.log('No fixes matched the current --only/--skip filters.');
        console.log(`Available fixes: ${available.map((fix) => fix.id).join(', ')}`);
        return;
      }

      const dryRun = options.dryRun ?? false;
      const force = options.force ?? false;
      const interactive = options.interactive !== false && stdin.isTTY === true && stdout.isTTY === true && !force;
      let selected = filtered;
      let allowConfirmation = force || dryRun;
      let approvedConfirmation = false;

      if (interactive && !only) {
        selected = await chooseFixesInteractively(filtered, dryRun);
        approvedConfirmation = selected.some((fix) => fix.tier === 'confirmation');
      } else if (interactive && !dryRun && selected.some((fix) => fix.tier === 'confirmation')) {
        approvedConfirmation = await confirmConfirmationFixes(selected.filter((fix) => fix.tier === 'confirmation'));
        if (!approvedConfirmation) {
          selected = selected.filter((fix) => fix.tier === 'safe');
        }
      }

      allowConfirmation = force || dryRun || approvedConfirmation;

      const selectedNonDestructive = selected.filter((fix) => fix.tier !== 'destructive');
      const skippedDestructive = selected.filter((fix) => fix.tier === 'destructive');
      const skippedConfirmation = selectedNonDestructive.filter((fix) => fix.tier === 'confirmation' && !allowConfirmation);
      const runnable = selectedNonDestructive.filter((fix) => fix.tier === 'safe' || (fix.tier === 'confirmation' && allowConfirmation));

      printPlan(runnable, skippedConfirmation, skippedDestructive, dryRun);

      if (runnable.length === 0) {
        console.log('No fixes were applied.');
        return;
      }

      const results = await applyFixes(context, report, {
        dryRun,
        force: allowConfirmation,
        interactive,
        only: runnable.map((fix) => fix.id),
        skip: []
      });

      if (results.length === 0) {
        console.log('No fixes were applied.');
        return;
      }

      printResults(results, dryRun);
      await printAfterSummary(projectPath, options.config, report, results, dryRun);

      if (results.some((result) => !result.success)) {
        process.exitCode = 1;
      }
    });
}

function filterFixes(fixes: Fix[], only: string[] | undefined, skip: string[] | undefined): Fix[] {
  const onlySet = only ? new Set(only) : null;
  const skipSet = new Set(skip ?? []);
  return fixes.filter((fix) => !skipSet.has(fix.id) && (!onlySet || onlySet.has(fix.id)));
}

async function confirmConfirmationFixes(fixes: Fix[]): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log('');
    console.log('Confirmation-tier fixes may run package-manager commands or change existing config.');
    for (const fix of fixes) {
      console.log(`- ${formatFix(fix)}`);
    }

    return askYesNo(rl, 'Apply confirmation-tier fixes? [y/N] ');
  } finally {
    rl.close();
  }
}

async function chooseFixesInteractively(fixes: Fix[], dryRun: boolean): Promise<Fix[]> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log('Available fixes');
    console.log('---------------');
    for (const [index, fix] of fixes.entries()) {
      console.log(`${index + 1}. ${formatFix(fix)}`);
      console.log(`   ${fix.description}`);
    }

    const selected = await askForSelection(rl, fixes);
    if (selected.length === 0) {
      return [];
    }

    const confirmationFixes = selected.filter((fix) => fix.tier === 'confirmation');
    if (!dryRun && confirmationFixes.length > 0) {
      console.log('');
      console.log('Confirmation-tier fixes may run package-manager commands or change existing config.');
      for (const fix of confirmationFixes) {
        console.log(`- ${formatFix(fix)}`);
      }

      const approved = await askYesNo(rl, 'Apply confirmation-tier fixes? [y/N] ');
      if (!approved) {
        return selected.filter((fix) => fix.tier === 'safe');
      }
    }

    return selected;
  } finally {
    rl.close();
  }
}

async function askForSelection(rl: Interface, fixes: Fix[]): Promise<Fix[]> {
  while (true) {
    const answer = await rl.question('Select fixes (comma numbers/ids, "all", "none"; Enter = safe fixes): ');
    const parsed = parseSelection(answer, fixes);
    if (parsed.ok) {
      return parsed.fixes;
    }

    console.log(parsed.message);
  }
}

async function askYesNo(rl: Interface, prompt: string): Promise<boolean> {
  const answer = (await rl.question(prompt)).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
}

type SelectionResult = { ok: true; fixes: Fix[] } | { ok: false; message: string };

function parseSelection(answer: string, fixes: Fix[]): SelectionResult {
  const trimmed = answer.trim();
  if (trimmed.length === 0) {
    return { ok: true, fixes: fixes.filter((fix) => fix.tier === 'safe') };
  }

  const normalized = trimmed.toLowerCase();
  if (normalized === 'all' || normalized === 'a' || normalized === '*') {
    return { ok: true, fixes };
  }

  if (normalized === 'none' || normalized === 'n' || normalized === 'q' || normalized === 'quit') {
    return { ok: true, fixes: [] };
  }

  const selected = new Map<string, Fix>();
  for (const token of trimmed.split(/[,\s]+/).filter(Boolean)) {
    const byNumber = Number.parseInt(token, 10);
    const fix = Number.isInteger(byNumber) && String(byNumber) === token ? fixes[byNumber - 1] : fixes.find((candidate) => candidate.id === token);
    if (!fix) {
      return { ok: false, message: `Unknown fix selection "${token}". Use a number, fix ID, "all", or "none".` };
    }

    selected.set(fix.id, fix);
  }

  return { ok: true, fixes: [...selected.values()] };
}

function printPlan(runnable: Fix[], skippedConfirmation: Fix[], skippedDestructive: Fix[], dryRun: boolean): void {
  console.log('');
  console.log(dryRun ? 'Fix preview' : 'Fix plan');
  console.log(dryRun ? '-----------' : '--------');

  if (runnable.length === 0) {
    console.log('No runnable fixes selected.');
  } else {
    for (const fix of runnable) {
      console.log(`- ${formatFix(fix)}`);
    }
  }

  if (skippedConfirmation.length > 0) {
    console.log('');
    console.log('Skipped confirmation-tier fixes. Run in an interactive terminal, pass --force, or preview with --dry-run:');
    for (const fix of skippedConfirmation) {
      console.log(`- ${formatFix(fix)}`);
    }
  }

  if (skippedDestructive.length > 0) {
    console.log('');
    console.log('Skipped destructive fixes. Destructive fixes are not enabled yet:');
    for (const fix of skippedDestructive) {
      console.log(`- ${formatFix(fix)}`);
    }
  }
}

function printResults(results: FixResult[], dryRun: boolean): void {
  console.log('');
  console.log(dryRun ? 'Dry-run results' : 'Results');
  console.log(dryRun ? '---------------' : '-------');

  for (const result of results) {
    const label = dryRun ? 'Would apply' : result.success ? 'Applied' : 'Failed';
    console.log(`${label}: ${result.message}`);
    printList('Created', result.filesCreated);
    printList('Modified', result.filesModified);
    printList('Deleted', result.filesDeleted);
    printList('Commands', result.commandsRun);

    if (result.error) {
      console.log(`Error: ${result.error.message}`);
    }
  }

  const succeeded = results.filter((result) => result.success).length;
  console.log('');
  console.log(`Fix summary: ${succeeded}/${results.length} succeeded.`);
}

async function printAfterSummary(projectPath: string, configPath: string | undefined, before: HealthReport, results: FixResult[], dryRun: boolean): Promise<void> {
  if (dryRun || !results.some((result) => result.success)) {
    return;
  }

  const after = await runScan({ root: projectPath, configPath });
  console.log('');
  console.log('After scan');
  console.log('----------');
  console.log(`Score: ${before.score.total}/100 -> ${after.score.total}/100`);
  console.log(`Issues: ${before.issues.length} -> ${after.issues.length}`);
  console.log(`Fixes available: ${before.fixes.available} -> ${after.fixes.available}`);
}

function printList(label: string, values: string[]): void {
  if (values.length > 0) {
    console.log(`  ${label}: ${values.join(', ')}`);
  }
}

function formatFix(fix: Fix): string {
  return `[${fix.tier}] ${fix.name} (${fix.id})`;
}

function splitIds(value: string | undefined): string[] | undefined {
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
