import type { EngineOutput } from '@/lib/detection/types';
import type { Agent1Finding } from '@/lib/agents/agent1/types';
import type { Agent2Output, RankedFraudCase } from '@/lib/agents/agent2/types';
import type {
  RawLLMAgent3Output,
  CaseActionPlan,
  ActionReason,
} from './types';
import { chooseAction, buildReasons, computeConfidence } from './action-policy';

// Strip language that claims legal conclusion or final report
const LEGAL_CONCLUSION_PATTERNS: [RegExp, string][] = [
  [/\bfraud (is|has been|was) (confirmed|proven|established)\b/gi, 'suspicious activity is strongly indicated'],
  [/\bmoney laundering (is|has been|was) (confirmed|proven|established)\b/gi, 'suspicious transfer behavior is strongly indicated'],
  [/\bcase closed\b/gi, 'case escalated for review'],
  [/\bfinal report\b/gi, 'investigation summary'],
  [/\bsigned report\b/gi, 'investigation summary'],
  [/\bfraud proven\b/gi, 'suspicious activity strongly indicated'],
];

function sanitizeText(text: string): string {
  let s = text;
  for (const [pattern, replacement] of LEGAL_CONCLUSION_PATTERNS) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

function padAction(n: number): string {
  return String(n).padStart(5, '0');
}

export function validateAndBuildActions(
  llmOutput: RawLLMAgent3Output,
  agent2Output: Agent2Output,
  agent1Findings: Agent1Finding[],
  engine: EngineOutput,
  runId: string,
): { actions: CaseActionPlan[]; droppedCount: number } {
  const caseById = new Map<string, RankedFraudCase>(
    agent2Output.cases.map(c => [c.case_id, c]),
  );
  const txnIds = new Set(engine.transactions.map(t => t.txn_id));

  const built: CaseActionPlan[] = [];
  let droppedCount = 0;
  const seenCases = new Set<string>();

  for (const llmAction of llmOutput.actions) {
    const caseItem = caseById.get(llmAction.case_id);
    if (!caseItem) {
      droppedCount++;
      continue;
    }
    // One action per case
    if (seenCases.has(llmAction.case_id)) {
      droppedCount++;
      continue;
    }
    seenCases.add(llmAction.case_id);

    // Deterministic action — model cannot change this
    const { action, urgency } = chooseAction(caseItem);

    // Deterministic reasons
    const reasons: ActionReason[] = buildReasons(caseItem, agent1Findings);

    // Validate transaction IDs in reasons — prune phantoms
    const cleanReasons = reasons.map(r => ({
      ...r,
      supporting_transaction_ids: r.supporting_transaction_ids.filter(id => txnIds.has(id)),
    }));

    const confidence = computeConfidence(
      caseItem.risk_score,
      cleanReasons,
      caseItem.total_exposure,
    );

    const plainEnglish = sanitizeText(
      llmAction.plain_english_action ?? 'Review this case promptly.',
    );
    const instructions = (llmAction.analyst_instructions ?? []).map(sanitizeText);

    built.push({
      action_id: '', // assigned after sort
      run_id: runId,
      case_id: caseItem.case_id,
      rank: caseItem.rank,
      case_title: caseItem.title,
      recommended_action: action,       // deterministic
      urgency,                           // deterministic
      plain_english_action: plainEnglish,
      analyst_instructions: instructions,
      reasons: cleanReasons,
      risk_score: caseItem.risk_score,       // deterministic
      total_exposure: caseItem.total_exposure, // deterministic
      accounts: caseItem.accounts,             // deterministic
      confidence,
      source_agent: 'agent_3_action_recommender',
    });
  }

  // For any case the LLM missed, create a fallback action
  for (const caseItem of agent2Output.cases) {
    if (!seenCases.has(caseItem.case_id)) {
      const { action, urgency } = chooseAction(caseItem);
      const reasons = buildReasons(caseItem, agent1Findings).map(r => ({
        ...r,
        supporting_transaction_ids: r.supporting_transaction_ids.filter(id => txnIds.has(id)),
      }));
      const confidence = computeConfidence(caseItem.risk_score, reasons, caseItem.total_exposure);

      built.push({
        action_id: '',
        run_id: runId,
        case_id: caseItem.case_id,
        rank: caseItem.rank,
        case_title: caseItem.title,
        recommended_action: action,
        urgency,
        plain_english_action: `Review ${caseItem.case_id}: ${caseItem.title}`,
        analyst_instructions: [
          'Review the accounts and transactions listed in the case.',
          'Compare against known fraud patterns for this case type.',
        ],
        reasons,
        risk_score: caseItem.risk_score,
        total_exposure: caseItem.total_exposure,
        accounts: caseItem.accounts,
        confidence,
        source_agent: 'agent_3_action_recommender',
      });
    }
  }

  // Sort by case rank (ascending)
  built.sort((a, b) => a.rank - b.rank);

  // Assign stable A3-ACTION IDs after sort
  built.forEach((a, i) => {
    a.action_id = `A3-ACTION-${padAction(i + 1)}`;
  });

  return { actions: built, droppedCount };
}
