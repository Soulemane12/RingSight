import type { Agent4Input } from './types';
import type { RankedFraudCase } from '@/lib/agents/agent2/types';
import type { CaseActionPlan } from '@/lib/agents/agent3/types';
import type { Agent1Finding } from '@/lib/agents/agent1/types';

export const SYSTEM_PROMPT = `You are Agent 4, the Report Writer for RingSight.

Your job is to write readable fraud investigation reports using only prior agent outputs.

You may use:
- Agent 1 suspicious pattern findings
- Agent 2 ranked fraud cases
- Agent 3 action recommendations
- case scores, exposure amounts, account IDs, relationship IDs, transaction IDs

You must not:
- invent accounts, transactions, or exposure amounts
- change scores or recommended actions
- claim fraud is legally proven
- say accounts were actually frozen or restricted
- add new findings that were not produced by Agents 1–3
- write legal conclusions

Use careful language:
- "suspicious activity is indicated"
- "the pattern is consistent with coordinated behavior"
- "recommended for analyst review"
- "temporary restriction is recommended"

Avoid:
- "fraud is confirmed"
- "money laundering proven"
- "criminal ring"
- "accounts must be frozen"
- "case closed"

Every report must include:
- A limitations section stating this does not prove fraud
- An analyst sign-off section with blank fields for the reviewer

Return valid JSON only via the write_investigation_reports tool.`;

function evidenceSummary(findings: Agent1Finding[], caseAccounts: string[]): string {
  const linked = findings.filter(f => f.accounts.some(a => caseAccounts.includes(a)));
  if (linked.length === 0) return 'No Agent 1 findings directly linked.';
  return linked
    .map(f => `[${f.finding_id}] ${f.pattern_type}: ${f.summary}`)
    .join('\n');
}

export function buildUserPrompt(input: Agent4Input): string {
  const sections: string[] = [];

  sections.push(`# Agent 4 Report Writer Input
Run ID: ${input.run_id}
Cases: ${input.agent2.cases.length}
Actions: ${input.agent3.actions.length}
Cognee recalled — Agent 1: ${input.cognee_recall.recalled_agent_1} | Agent 2: ${input.cognee_recall.recalled_agent_2} | Agent 3: ${input.cognee_recall.recalled_agent_3}
`);

  if (input.agent2.cases.length === 0) {
    sections.push('No cases to report. Return an empty reports array with a summary.');
    return sections.join('\n');
  }

  // Build a lookup for actions by case_id
  const actionByCaseId = new Map<string, CaseActionPlan>(
    input.agent3.actions.map(a => [a.case_id, a]),
  );

  sections.push('## Cases to Report\n');

  for (const c of input.agent2.cases) {
    const action = actionByCaseId.get(c.case_id);
    const findings = evidenceSummary(input.agent1.findings, c.accounts);
    const chainStr = c.chains.length > 0
      ? c.chains.map(ch => ch.join(' → ')).join('; ')
      : 'No transfer chains detected';
    const cycleStr = c.cycles.length > 0
      ? c.cycles.map(cy => cy.join(' → ')).join('; ')
      : 'No cycles detected';

    sections.push(`### ${c.case_id} — ${c.title}
Type: ${c.case_type} | Severity: ${c.severity} | Score: ${c.risk_score}/100
Accounts (${c.accounts.length}): ${c.accounts.join(', ')}
Exposure: $${c.total_exposure.toLocaleString()} | Transactions: ${c.transaction_count}
Chains: ${chainStr}
Cycles: ${cycleStr}
Connector accounts: ${c.connector_accounts.length > 0 ? c.connector_accounts.join(', ') : 'none'}
Ranking reasons: ${c.ranking_reasons.join(' | ')}
Agent 1 evidence:
${findings}
Agent 2 summary: ${input.agent2.summary.slice(0, 200)}
Agent 3 action: ${action?.recommended_action ?? 'N/A'} (urgency: ${action?.urgency ?? 'N/A'})
Agent 3 plain-English: ${action?.plain_english_action ?? 'N/A'}
Agent 3 instructions: ${action?.analyst_instructions?.slice(0, 3).join(' | ') ?? 'N/A'}
`);
  }

  sections.push(`## Task
Call write_investigation_reports with one report per case above.

Each report must:
- Have an executive_summary (2–4 sentences, plain English for a fraud analyst)
- Have key_evidence sections (one per major Agent 1 finding or Agent 2 evidence item, max 4)
- Have a network_summary (1–2 sentences describing how accounts connect)
- Have an action_summary (1–2 sentences referencing Agent 3's recommendation)
- Include a limitations section: "This report is based on the provided transaction dataset and agent-detected patterns. It does not prove fraud or replace human investigation."
- Include an analyst_signoff with blank fields: Reviewed by, Date, Decision
- Be readable by a fraud analyst in under three minutes
- Not claim fraud is legally proven
- Not say accounts were frozen`);

  return sections.join('\n');
}
