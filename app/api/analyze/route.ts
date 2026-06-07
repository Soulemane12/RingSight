import type { NextRequest } from 'next/server';
import { runEngine } from '@/lib/detection/engine';

// graphology requires Node.js APIs
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file uploaded. Send a multipart/form-data POST with field "file".' }, { status: 400 });
    }

    const csvText = await (file as File).text();

    if (!csvText.trim()) {
      return Response.json({ error: 'Uploaded file is empty.' }, { status: 400 });
    }

    const result = runEngine(csvText);
    return Response.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/analyze]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
