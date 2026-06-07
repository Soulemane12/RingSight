import type { EngineOutput } from '@/lib/detection/types';
import type { RawLLMFinding, RawLLMOutput, Agent1Finding, PatternType } from './types';

const VALID_PATTERN_TYPES: Set<string> = new Set([
  'CIRCULAR_FLOW',
  'LAYERING_CHAIN',
  'TIMING_CLUSTER',
  'STRUCTURED_SMURFING',
  'MULE_NETWORK',
  'HIGH_VELOCITY_PASS_THROUGH',
  'NEW_ACCOUNT_BURST',
]);

const VALID_ENTITY_TYPES = new Set(['ACCOUNT', 'RELATIONSHIP', 'COMPONENT']);

function pad(n: number, width = 5): string {
  return String(n).padStart(width, '0');
}

function computeConfidence(validEvidenceCount: number, engineRiskScore: number): number {
  return Math.min(0.99, 0.50 + 0.08 * validEvidenceCount + 0.15 * (engineRiskScore / 100));
}

export function validateAndEnrich(
  raw: RawLLMOutput,
  engine: EngineOutput,
): { findings: Agent1Finding[]; droppedCount: number } {
  const accountIds = new Set(engine.accounts.map(a => a.account_id));
  const relationshipIds = new Set(engine.relationships.map(r => r.edge_id));
  const componentIds = new Set(engine.network_components.map(c => c.component_id));
  const txnIds = new Set(engine.transactions.map(t => t.txn_id));

  const findings: Agent1Finding[] = [];
  let droppedCount = 0;
  let seq = 1;

  for (const raw_f of raw.findings) {
    // Drop findings with invalid pattern type
    if (!VALID_PATTERN_TYPES.has(raw_f.pattern_type)) {
      droppedCount++;
      continue;
    }
    if (!VALID_ENTITY_TYPES.has(raw_f.source_entity_type)) {
      droppedCount++;
      continue;
    }

    // Validate source entity exists
    const entityType = raw_f.source_entity_type;
    const sourceExists =
      entityType === 'ACCOUNT' ? accountIds.has(raw_f.source_entity_id) :
      entityType === 'RELATIONSHIP' ? relationshipIds.has(raw_f.source_entity_id) :
      componentIds.has(raw_f.source_entity_id);

    if (!sourceExists) {
      droppedCount++;
      continue;
    }

    // Filter to only valid IDs — don't drop finding, just prune phantom references
    const validAccounts = raw_f.accounts.filter(id => accountIds.has(id));
    const validRelationships = raw_f.relationship_ids.filter(id => relationshipIds.has(id));
    const validTxns = raw_f.transaction_ids.filter(id => txnIds.has(id));

    // Validate evidence items: only keep those with valid supporting txn IDs
    const validEvidence = raw_f.evidence.map(ev => ({
      ...ev,
      supporting_transaction_ids: ev.supporting_transaction_ids.filter(id => txnIds.has(id)),
    }));

    const confidence = computeConfidence(validEvidence.length, raw_f.engine_risk_score);

    findings.push({
      finding_id: `A1-FIND-${pad(seq++)}`,
      pattern_type: raw_f.pattern_type as PatternType,
      title: raw_f.title,
      summary: raw_f.summary,
      source_entity_type: entityType as Agent1Finding['source_entity_type'],
      source_entity_id: raw_f.source_entity_id,
      accounts: validAccounts,
      relationship_ids: validRelationships,
      transaction_ids: validTxns,
      exposure: raw_f.exposure,
      engine_risk_score: raw_f.engine_risk_score,
      engine_risk_label: raw_f.engine_risk_label as Agent1Finding['engine_risk_label'],
      evidence: validEvidence,
      confidence,
    });
  }

  // Sort descending by engine_risk_score then confidence
  findings.sort(
    (a, b) =>
      b.engine_risk_score - a.engine_risk_score ||
      b.confidence - a.confidence,
  );

  // Re-assign sequential IDs after sort
  findings.forEach((f, i) => {
    f.finding_id = `A1-FIND-${pad(i + 1)}`;
  });

  return { findings, droppedCount };
}
