import { type NextRequest } from 'next/server';
import { runEngine } from '@/lib/detection/engine';
import { runPatternFinder } from '@/lib/agents/agent1/pattern-finder';
import { runCaseRankerAgent } from '@/lib/agents/agent2/case-ranker';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<Response> {
  let csvText: string;

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'Missing file in multipart form' }, { status: 400 });
    }
    csvText = await (file as File).text();
  } else {
    csvText = await request.text();
    if (!csvText.trim()) {
      return Response.json({ error: 'Request body is empty' }, { status: 400 });
    }
  }

  let engineOutput;
  try {
    engineOutput = runEngine(csvText);
  } catch (err) {
    return Response.json(
      { error: 'Engine failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 422 },
    );
  }

  let agent1Output;
  try {
    agent1Output = await runPatternFinder(engineOutput);
  } catch (err) {
    return Response.json(
      { error: 'Agent 1 failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  let agent2Output;
  try {
    agent2Output = await runCaseRankerAgent({ engineOutput, agent1Output });
  } catch (err) {
    return Response.json(
      { error: 'Agent 2 failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return Response.json(agent2Output);
}
