import type { Command } from 'commander';

export function readActionOptions<T extends object>(candidate: T | Command): T {
  const maybeCommand = candidate as Command & { opts?: unknown };
  if (typeof maybeCommand.opts === 'function') {
    return maybeCommand.opts() as T;
  }

  return candidate as T;
}
