import { type NextRequest } from 'next/server';
import { getCachedReport } from '@/lib/agents/agent4/cache';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string; caseId: string }> },
): Promise<Response> {
  const { runId, caseId } = await params;

  const markdown = getCachedReport(runId, caseId);

  if (!markdown) {
    return Response.json(
      {
        error: 'Report not found',
        detail: `No report cached for run ${runId} / case ${caseId}. Run POST /api/agents/report-writer first.`,
      },
      { status: 404 },
    );
  }

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${caseId}-investigation-report.md"`,
    },
  });
}
