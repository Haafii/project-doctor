#!/usr/bin/env node
import { main } from './main.js';

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Project Doctor failed: ${message}`);
  process.exitCode = 1;
});
