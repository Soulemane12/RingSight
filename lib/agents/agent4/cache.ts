// Module-level in-memory cache: populated by report-writer route, read by download route.
// Fine for single-server demo use.
const reportCache = new Map<string, string>(); // key: `${runId}::${caseId}`

export function cacheReport(runId: string, caseId: string, markdown: string): void {
  reportCache.set(`${runId}::${caseId}`, markdown);
}

export function getCachedReport(runId: string, caseId: string): string | undefined {
  return reportCache.get(`${runId}::${caseId}`);
}
