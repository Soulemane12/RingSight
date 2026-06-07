import { recallFromCognee } from '@/lib/cognee/client';
import type { CogneeRecallResult } from '@/lib/cognee/types';

const RECALL_QUERY =
  'Recall Agent 1 pattern findings for this RingSight run. Return suspicious relationships, accounts, transaction IDs, risk scores, exposure, and evidence summaries.';

export async function recallAgent1FromCognee(runId: string): Promise<CogneeRecallResult> {
  const datasetName = `ringsight-${runId}`;
  return recallFromCognee(datasetName, RECALL_QUERY);
}
