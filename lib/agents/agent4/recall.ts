import { recallFromCognee } from '@/lib/cognee/client';
import type { CogneeRecallResult } from '@/lib/cognee/types';

const RECALL_QUERY =
  'Recall all RingSight outputs for this run: Agent 1 pattern findings, Agent 2 ranked fraud cases, Agent 3 action plans. Return case IDs, findings, evidence, actions, risk scores, exposure, accounts, and transaction IDs.';

export interface Agent4RecallResult {
  agent1: CogneeRecallResult;
  agent2: CogneeRecallResult;
  agent3: CogneeRecallResult;
  recalled_agent_1: boolean;
  recalled_agent_2: boolean;
  recalled_agent_3: boolean;
  combined_result_count: number;
  all_raw_results: unknown[];
}

export async function recallAllAgentsFromCognee(runId: string): Promise<Agent4RecallResult> {
  // Run all three recalls in parallel
  const [r1, r2, r3] = await Promise.all([
    recallFromCognee(`ringsight-${runId}`, RECALL_QUERY),
    recallFromCognee(`agent-2-ranked-cases-${runId.toLowerCase()}`, RECALL_QUERY),
    recallFromCognee(`agent-3-action-plans-${runId}`, RECALL_QUERY),
  ]);

  return {
    agent1: r1,
    agent2: r2,
    agent3: r3,
    recalled_agent_1: r1.recalled,
    recalled_agent_2: r2.recalled,
    recalled_agent_3: r3.recalled,
    combined_result_count: r1.result_count + r2.result_count + r3.result_count,
    all_raw_results: [...r1.raw_results, ...r2.raw_results, ...r3.raw_results],
  };
}
