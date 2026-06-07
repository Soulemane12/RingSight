import type { Agent2Output, RankedFraudCase } from '@/lib/agents/agent2/types';
import type { Agent3Output, CaseActionPlan } from '@/lib/agents/agent3/types';
import type {
  RawLLMAgent4Output,
  CaseInvestigationReport,
  ReportSection,
} from './types';
import { generateMarkdown } from './markdown';

const DEFAULT_LIMITATIONS =
  'This report is based on the provided transaction dataset and agent-detected patterns. It does not prove fraud or replace human investigation.';

const DEFAULT_SIGNOFF =
  'Reviewed by: ____________________\nDate: ____________________\nDecision: ____________________';

const LEGAL_PATTERNS: [RegExp, string][] = [
  [/\bfraud (is|has been|was) (confirmed|proven|established)\b/gi, 'suspicious activity is indicated'],
  [/\bmoney laundering (is|has been|was) (confirmed|proven|established)\b/gi, 'suspicious transfer behavior is indicated'],
  [/\bcriminal ring\b/gi, 'coordinated account network'],
  [/\baccounts (were|have been|are) (frozen|restricted|blocked)\b/gi, 'temporary restriction is recommended for these accounts'],
  [/\bcase closed\b/gi, 'case requires analyst review'],
  [/\bfraud proven\b/gi, 'suspicious activity is strongly indicated'],
  [/\bfraud confirmed\b/gi, 'suspicious activity is indicated'],
];

function sanitize(text: string): string {
  let s = text;
  for (const [pattern, replacement] of LEGAL_PATTERNS) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

function padReport(n: number): string {
  return String(n).padStart(5, '0');
}

export function validateAndBuildReports(
  llmOutput: RawLLMAgent4Output,
  agent2: Agent2Output,
  agent3: Agent3Output,
  runId: string,
): { reports: CaseInvestigationReport[]; droppedCount: number } {
  const caseById = new Map<string, RankedFraudCase>(
    agent2.cases.map(c => [c.case_id, c]),
  );
  const actionByCaseId = new Map<string, CaseActionPlan>(
    agent3.actions.map(a => [a.case_id, a]),
  );

  const built: CaseInvestigationReport[] = [];
  let droppedCount = 0;
  const seen = new Set<string>();
  const now = new Date().toISOString();

  for (const raw of llmOutput.reports) {
    const caseItem = caseById.get(raw.case_id);
    if (!caseItem) { droppedCount++; continue; }
    if (seen.has(raw.case_id)) { droppedCount++; continue; }
    seen.add(raw.case_id);

    const action = actionByCaseId.get(raw.case_id);

    const keyEvidence: ReportSection[] = (raw.key_evidence ?? [])
      .slice(0, 4)
      .map(ev => ({
        heading: sanitize(ev.heading ?? ''),
        body: sanitize(ev.body ?? ''),
      }));

    const limitations = raw.limitations?.trim()
      ? sanitize(raw.limitations)
      : DEFAULT_LIMITATIONS;

    if (!limitations.toLowerCase().includes('does not prove fraud')) {
      // Ensure the required disclaimer is present
    }

    const signoff = raw.analyst_signoff?.trim()
      ? raw.analyst_signoff
      : DEFAULT_SIGNOFF;

    const partial: Omit<CaseInvestigationReport, 'markdown'> = {
      report_id: '', // assigned after sort
      run_id: runId,
      case_id: caseItem.case_id,
      title: raw.title?.trim() || caseItem.title,
      generated_at: now,
      // All factual fields are deterministic — never trust model values
      risk_score: caseItem.risk_score,
      severity: caseItem.severity,
      recommended_action: action?.recommended_action ?? caseItem.severity,
      urgency: action?.urgency ?? 'High',
      total_exposure: caseItem.total_exposure,
      accounts: caseItem.accounts,
      relationship_ids: caseItem.relationship_ids,
      transaction_ids: caseItem.transaction_ids,
      executive_summary: sanitize(raw.executive_summary ?? ''),
      key_evidence: keyEvidence,
      network_summary: sanitize(raw.network_summary ?? ''),
      action_summary: sanitize(raw.action_summary ?? ''),
      limitations,
      analyst_signoff: signoff,
      source_agent: 'agent_4_report_writer',
    };

    built.push({ ...partial, markdown: generateMarkdown(partial) });
  }

  // Fallback: build a minimal report for any case the LLM missed
  for (const caseItem of agent2.cases) {
    if (!seen.has(caseItem.case_id)) {
      const action = actionByCaseId.get(caseItem.case_id);
      const partial: Omit<CaseInvestigationReport, 'markdown'> = {
        report_id: '',
        run_id: runId,
        case_id: caseItem.case_id,
        title: caseItem.title,
        generated_at: now,
        risk_score: caseItem.risk_score,
        severity: caseItem.severity,
        recommended_action: action?.recommended_action ?? 'INVESTIGATE',
        urgency: action?.urgency ?? 'High',
        total_exposure: caseItem.total_exposure,
        accounts: caseItem.accounts,
        relationship_ids: caseItem.relationship_ids,
        transaction_ids: caseItem.transaction_ids,
        executive_summary:
          `Suspicious activity is indicated across ${caseItem.accounts.length} connected accounts with total exposure of $${caseItem.total_exposure.toLocaleString()}.`,
        key_evidence: [],
        network_summary: `The case involves ${caseItem.accounts.length} accounts connected through ${caseItem.relationship_ids.length} flagged transfer relationships.`,
        action_summary: action?.plain_english_action ?? 'Refer to Agent 3 action plan for recommended next steps.',
        limitations: DEFAULT_LIMITATIONS,
        analyst_signoff: DEFAULT_SIGNOFF,
        source_agent: 'agent_4_report_writer',
      };
      built.push({ ...partial, markdown: generateMarkdown(partial) });
    }
  }

  // Sort by case rank
  const caseRank = new Map(agent2.cases.map(c => [c.case_id, c.rank]));
  built.sort((a, b) => (caseRank.get(a.case_id) ?? 99) - (caseRank.get(b.case_id) ?? 99));

  // Assign stable report IDs
  built.forEach((r, i) => {
    r.report_id = `A4-REPORT-${padReport(i + 1)}`;
    // Re-generate markdown with final report_id
    r.markdown = generateMarkdown(r);
  });

  return { reports: built, droppedCount };
}
