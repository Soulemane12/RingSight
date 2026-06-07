import { recallFromCognee } from '@/lib/cognee/client';
import type { CogneeRecallResult } from '@/lib/cognee/types';

const RECALL_QUERY =
  'Recall Agent 2 ranked fraud cases for this RingSight run. Return case IDs, rankings, risk scores, exposure, accounts, relationships, transaction IDs, evidence, and ranking reasons.';

export async function recallAgent2FromCognee(runId: string): Promise<CogneeRecallResult> {
  // Agent 2 stores under lowercase run_id — must match exactly
  const datasetName = `agent-2-ranked-cases-${runId.toLowerCase()}`;
  return recallFromCognee(datasetName, RECALL_QUERY);
}
