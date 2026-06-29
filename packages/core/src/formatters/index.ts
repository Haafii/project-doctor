import type { Formatter, OutputFormat } from '../types/index.js';
import { htmlFormatter } from './html.js';
import { jsonFormatter } from './json.js';
import { markdownFormatter } from './markdown.js';
import { terminalFormatter } from './terminal.js';

const formatters: Record<OutputFormat, Formatter> = {
  terminal: terminalFormatter,
  json: jsonFormatter,
  html: htmlFormatter,
  markdown: markdownFormatter
};

export function getFormatter(format: OutputFormat): Formatter {
  return formatters[format];
}

export { htmlFormatter, jsonFormatter, markdownFormatter, terminalFormatter };
