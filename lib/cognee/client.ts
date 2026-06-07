import type { CogneeStoreResult, CogneeRecallResult } from './types';

const COGNEE_API_URL = process.env.COGNEE_API_URL ?? 'http://localhost:8000';
const COGNEE_API_KEY = process.env.COGNEE_API_KEY ?? '';

export async function storeInCognee(
  datasetName: string,
  payload: unknown,
): Promise<CogneeStoreResult> {
  try {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const form = new FormData();
    form.append('datasetName', datasetName);
    form.append('data', blob, `${datasetName}.json`);

    const response = await fetch(`${COGNEE_API_URL}/api/v1/remember`, {
      method: 'POST',
      headers: {
        'X-Api-Key': COGNEE_API_KEY,
      },
      body: form,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        success: false,
        dataset_name: datasetName,
        error: `HTTP ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    return { success: true, dataset_name: datasetName };
  } catch (err) {
    return {
      success: false,
      dataset_name: datasetName,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function recallFromCognee(
  datasetName: string,
  query: string,
): Promise<CogneeRecallResult> {
  const base: Omit<CogneeRecallResult, 'recalled' | 'result_count' | 'raw_results' | 'error'> = {
    dataset_name: datasetName,
    query,
  };

  try {
    const response = await fetch(`${COGNEE_API_URL}/api/v1/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': COGNEE_API_KEY,
      },
      body: JSON.stringify({
        query,
        searchType: 'GRAPH_COMPLETION',
        datasets: [datasetName],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        ...base,
        recalled: false,
        result_count: 0,
        raw_results: [],
        error: `HTTP ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    const body: unknown = await response.json();
    const results: unknown[] = Array.isArray(body)
      ? body
      : (body as Record<string, unknown>)?.results
        ? ((body as Record<string, unknown>).results as unknown[])
        : [body];

    return {
      ...base,
      recalled: results.length > 0,
      result_count: results.length,
      raw_results: results,
    };
  } catch (err) {
    return {
      ...base,
      recalled: false,
      result_count: 0,
      raw_results: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
