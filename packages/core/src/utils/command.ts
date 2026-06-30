import { execFile } from 'node:child_process';

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export async function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; timeoutMs?: number }
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = execFile(
      command,
      args,
      {
        cwd: options.cwd,
        timeout: options.timeoutMs ?? 8000,
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf8'
      },
      (error, stdout, stderr) => {
        const commandError = error as (Error & { code?: number | string; killed?: boolean }) | null;
        const exitCode = typeof commandError?.code === 'number' ? commandError.code : error ? 1 : 0;

        resolve({
          exitCode,
          stdout,
          stderr,
          timedOut: Boolean(commandError?.killed)
        });
      }
    );

    child.stdin?.end();
  });
}

export function parseJsonOutput<T>(stdout: string): T | null {
  if (!stdout.trim()) {
    return null;
  }

  try {
    return JSON.parse(stdout) as T;
  } catch {
    return null;
  }
}
