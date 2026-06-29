import type { Formatter } from '../types/index.js';
import { withFilteredIssues } from './filter.js';

export const jsonFormatter: Formatter = {
  format: 'json',
  render(report, options) {
    const filtered = withFilteredIssues(report, options.minSeverity);
    return JSON.stringify(
      {
        ...filtered,
        timestamp: filtered.timestamp.toISOString()
      },
      null,
      2
    );
  }
};
