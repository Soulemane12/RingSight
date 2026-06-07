import type { Agent2Input, CandidateCase } from './types';

export const SYSTEM_PROMPT = `You are Agent 2, the Case Ranker for RingSight.

Your job is to turn Agent 1's suspicious pattern findings into ranked fraud cases.

You must only use:
- Agent 1 findings
- Engine network components
- Engine relationship scores
- Engine exposure amounts
- Engine transaction IDs

You must not:
- invent accounts
- invent transactions
- invent exposure amounts
- change risk scores
- recommend actions
- write the final report
- claim fraud is legally proven
- claim circular flow unless cycles are explicitly present in the component data
- call something money laundering unless the evidence only supports suspicious transfer behavior

For each case, write:
- a short title (under 10 words)
- a plain-English summary of what makes this case suspicious (2-3 sentences)
- ranking_reasons: why this case is ranked where it is vs. others (2-4 bullet points)
- evidence_notes: which Agent 1 findings support this case and how

Return valid JSON only via the rank_fraud_cases tool.`;

function serializeCandidateForPrompt(c: CandidateCase, rank: number): string {
  const findingSummaries = c.attached_findings.map(f =>
    `  [${f.finding_id}] ${f.pattern_type} — score=${f.engine_risk_score} exposure=$${f.exposure.toLocaleString()} accounts=${f.accounts.join(',')}`,
  );
  const chainStr = c.chains.length > 0
    ? c.chains.map(ch => ch.join('→')).join('; ')
    : 'none';
  const cycleStr = c.cycles.length > 0
    ? c.cycles.map(cy => cy.join('→')).join('; ')
    : 'none';

  return `### Candidate Case #${rank} (${c.component_id})
Risk score: ${c.risk_score} | Severity: ${c.severity} | Exposure: $${c.total_exposure.toLocaleString()}
Accounts (${c.accounts.length}): ${c.accounts.join(', ')}
Relationships: ${c.relationship_ids.join(', ')}
Connector accounts: ${c.connector_accounts.length > 0 ? c.connector_accounts.join(', ') : 'none'}
Chains: ${chainStr}
Cycles: ${cycleStr}
Transaction count: ${c.transaction_count}
Agent 1 findings attached (${c.attached_findings.length}):
${findingSummaries.length > 0 ? findingSummaries.join('\n') : '  none'}`;
}

export function buildUserPrompt(input: Agent2Input, candidates: CandidateCase[]): string {
  const sections: string[] = [];

  sections.push(`# Agent 2 Case Ranker Input
Run ID: ${input.run_id}
Date range: ${input.engine.metrics.date_range.start} to ${input.engine.metrics.date_range.end}
Accounts: ${input.engine.metrics.account_count} | Internal transfers: ${input.engine.metrics.internal_transfer_count}
Agent 1 findings: ${input.agent1.findings.length}
Cognee recalled: ${input.cognee_recall.recalled} (${input.cognee_recall.result_count} results)
`);

  if (candidates.length === 0) {
    sections.push('No candidate cases meet the risk threshold. Return an empty cases array with a summary explaining that no high-risk patterns were found.');
    return sections.join('\n');
  }

  sections.push(`## Candidate Cases (${candidates.length})\n`);
  candidates.forEach((c, i) => {
    sections.push(serializeCandidateForPrompt(c, i + 1));
  });

  sections.push(`
## Agent 1 Summary
${input.agent1.summary}

## Task
Call rank_fraud_cases with:
- One entry per candidate case above (use the component_id to match)
- Group suspicious findings into cases and rank worst first
- Use the provided risk scores and exposure values exactly — do not change them
- Return no more than 10 cases
- Do not recommend actions
- Do not write the final investigation report
- If a component has cycles=none, do not use the words "cycle", "circular flow", or "closed loop" in your summary
`);

  return sections.join('\n');
}
