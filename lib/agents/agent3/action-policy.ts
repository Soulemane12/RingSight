import type { RankedFraudCase } from '@/lib/agents/agent2/types';
import type { Agent1Finding } from '@/lib/agents/agent1/types';
import type {
  RecommendedAction,
  ActionUrgency,
  ActionReason,
  ActionReasonCode,
} from './types';

export const ACTION_COPY: Record<RecommendedAction, string> = {
  MONITOR:
    'Continue monitoring this case for additional suspicious activity.',
  INVESTIGATE:
    'Open an analyst investigation and review the supporting transactions.',
  ESCALATE:
    'Escalate this case to the fraud investigation queue for priority review.',
  TEMPORARILY_RESTRICT_AND_ESCALATE:
    'Recommend temporary restriction of outgoing transfers while escalating the case for immediate fraud review.',
  REQUEST_ENHANCED_REVIEW:
    'Request enhanced account review before taking stronger action.',
};

export function chooseAction(caseItem: RankedFraudCase): {
  action: RecommendedAction;
  urgency: ActionUrgency;
} {
  const { risk_score: score, total_exposure: exposure, chains, accounts } = caseItem;
  const hasChain = chains.length > 0;
  const hasManyAccounts = accounts.length >= 3;

  if (score >= 90 && exposure >= 50_000) {
    return { action: 'TEMPORARILY_RESTRICT_AND_ESCALATE', urgency: 'Immediate' };
  }
  if (score >= 85 && (hasChain || hasManyAccounts)) {
    return { action: 'ESCALATE', urgency: 'High' };
  }
  if (score >= 65) {
    return { action: 'INVESTIGATE', urgency: 'High' };
  }
  if (score >= 40) {
    return { action: 'REQUEST_ENHANCED_REVIEW', urgency: 'Medium' };
  }
  return { action: 'MONITOR', urgency: 'Low' };
}

export function buildReasons(
  caseItem: RankedFraudCase,
  agent1Findings: Agent1Finding[],
): ActionReason[] {
  const reasons: ActionReason[] = [];

  function addReason(
    code: ActionReasonCode,
    explanation: string,
    findingIds: string[] = [],
    relationshipIds: string[] = [],
    txnIds: string[] = [],
  ): void {
    reasons.push({
      reason_code: code,
      explanation,
      supporting_finding_ids: findingIds,
      supporting_relationship_ids: relationshipIds,
      supporting_transaction_ids: txnIds,
    });
  }

  if (caseItem.risk_score >= 85) {
    addReason(
      'CRITICAL_RISK_SCORE',
      `The case risk score is ${caseItem.risk_score} (Critical), requiring priority analyst review.`,
    );
  }

  if (caseItem.total_exposure >= 50_000) {
    addReason(
      'HIGH_TOTAL_EXPOSURE',
      `The case has high combined financial exposure ($${caseItem.total_exposure.toLocaleString()}), increasing potential loss if left unresolved.`,
    );
  }

  if (caseItem.chains.length > 0 || caseItem.case_type === 'LAYERING_CHAIN') {
    addReason(
      'LAYERING_CHAIN',
      'The case contains a transfer chain where funds move through connected accounts instead of a single isolated pair.',
      [],
      caseItem.relationship_ids,
    );
  }

  if (caseItem.accounts.length >= 3) {
    addReason(
      'CONNECTED_ACCOUNT_CLUSTER',
      `Multiple accounts (${caseItem.accounts.length}) appear in the same suspicious network, which is more concerning than a single repeated transfer pair.`,
    );
  }

  if (caseItem.case_type === 'REPEATED_TRANSFER_PAIR') {
    addReason(
      'REPEATED_TRANSFER_PAIR',
      'The same account pair repeatedly moved funds in a pattern identified by Agent 1.',
      [],
      caseItem.relationship_ids,
    );
  }

  if (caseItem.case_type === 'NEW_ACCOUNT_CLUSTER') {
    addReason(
      'NEW_ACCOUNT_CLUSTER',
      'New accounts show abnormal transaction volume in their first 45 days, a common indicator of mule or burst-fraud activity.',
    );
  }

  // Attach Agent 1 evidence
  const attachedFindings = agent1Findings.filter(f =>
    f.accounts.some(a => caseItem.accounts.includes(a)),
  );
  if (attachedFindings.length > 0) {
    addReason(
      'AGENT_1_EVIDENCE',
      `Agent 1 identified ${attachedFindings.length} suspicious pattern(s) linked to accounts in this case.`,
      attachedFindings.map(f => f.finding_id),
      attachedFindings.flatMap(f => f.relationship_ids),
      attachedFindings.flatMap(f => f.transaction_ids).slice(0, 10),
    );
  }

  // Attach Agent 2 ranking
  if (caseItem.ranking_reasons.length > 0) {
    addReason(
      'AGENT_2_RANKING',
      `Agent 2 ranked this case #${caseItem.rank}: ${caseItem.ranking_reasons[0]}`,
      [],
      caseItem.relationship_ids,
    );
  }

  return reasons;
}

export function computeConfidence(
  riskScore: number,
  reasons: ActionReason[],
  totalExposure: number,
): number {
  const raw =
    0.55 +
    0.15 * (riskScore / 100) +
    0.05 * reasons.length +
    0.05 * (totalExposure >= 50_000 ? 1 : 0);
  return Math.round(Math.min(0.99, raw) * 100) / 100;
}
