import type { Agent3Input } from './types';
import type { RankedFraudCase } from '@/lib/agents/agent2/types';
import type { RecommendedAction, ActionUrgency } from './types';
import { ACTION_COPY } from './action-policy';

export const SYSTEM_PROMPT = `You are Agent 3, the Action Recommender for RingSight.

Your job is to turn ranked fraud cases into clear analyst actions.

You must only use:
- Agent 2 ranked cases
- Agent 1 evidence attached to those cases
- engine relationship IDs
- engine transaction IDs
- deterministic action decisions provided by the code

You must not:
- change the recommended action
- change the risk score
- change the exposure
- invent accounts
- invent transactions
- claim fraud is legally proven
- write the final report
- rerank cases
- say the bank already froze or restricted an account

For each case, write:
- a plain-English action sentence that a non-technical analyst can understand
- 2–5 concrete analyst instructions (what to do next, step by step)
- language a fraud analyst can understand in under three minutes

The action label for each case is provided — use it to guide your wording but do not change it.

Return valid JSON only via the recommend_actions tool.`;

function formatCase(
  c: RankedFraudCase,
  action: RecommendedAction,
  urgency: ActionUrgency,
): string {
  const chainStr = c.chains.length > 0
    ? c.chains.map(ch => ch.join('→')).join('; ')
    : 'none';

  return `### ${c.case_id} — Rank ${c.rank} [${c.severity} | score=${c.risk_score}]
Action decided by code: ${action} (Urgency: ${urgency})
Standard wording: "${ACTION_COPY[action]}"
Case type: ${c.case_type}
Accounts (${c.accounts.length}): ${c.accounts.join(', ')}
Exposure: $${c.total_exposure.toLocaleString()} | Transactions: ${c.transaction_count}
Connector accounts: ${c.connector_accounts.length > 0 ? c.connector_accounts.join(', ') : 'none'}
Chains: ${chainStr}
Ranking reasons from Agent 2: ${c.ranking_reasons.slice(0, 2).join(' | ')}
Evidence (${c.evidence.length} items): ${c.evidence.map(e => e.source_finding_id).join(', ')}`;
}

export function buildUserPrompt(
  input: Agent3Input,
  actionDecisions: Array<{ case_id: string; action: RecommendedAction; urgency: ActionUrgency }>,
): string {
  const sections: string[] = [];

  sections.push(`# Agent 3 Action Recommender Input
Run ID: ${input.run_id}
Cases to action: ${input.agent2.cases.length}
Cognee recalled Agent 2: ${input.cognee_recall.recalled_agent_2}
Agent 1 finding count: ${input.agent1.findings.length}
`);

  if (input.agent2.cases.length === 0) {
    sections.push('No cases from Agent 2. Return an empty actions array with a summary explaining that no cases required action.');
    return sections.join('\n');
  }

  sections.push('## Cases With Deterministic Action Decisions\n');
  for (const c of input.agent2.cases) {
    const decision = actionDecisions.find(d => d.case_id === c.case_id);
    if (!decision) continue;
    sections.push(formatCase(c, decision.action, decision.urgency));
  }

  sections.push(`
## Task
Call recommend_actions with one entry per case above.
- Use the "action decided by code" exactly as shown — do not change the label
- Write a clear plain-English action sentence for a bank fraud analyst
- Write 2–5 step-by-step analyst instructions for what to do next
- Do not claim fraud is legally proven
- Do not write the final investigation report (that is Agent 4's job)
- Do not say the bank already restricted or froze any account
- Use "recommend" language for restriction actions`);

  return sections.join('\n');
}
