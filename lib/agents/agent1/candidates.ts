import type { EngineOutput, NormalizedRow } from '@/lib/detection/types';
import type { Agent1Input } from './types';

// Pick ~10 representative transactions for a relationship:
// first 3 + last 3 + 4 closest to the average amount (deduped)
function pickRepresentativeTxns(txns: NormalizedRow[], max = 10): string[] {
  if (txns.length <= max) return txns.map(t => t.txn_id);

  const sorted = [...txns].sort(
    (a, b) => a.timestamp_dt.getTime() - b.timestamp_dt.getTime(),
  );

  const first = sorted.slice(0, 3);
  const last = sorted.slice(-3);

  const avg = txns.reduce((s, t) => s + t.amount, 0) / txns.length;
  const middle = [...txns]
    .filter(t => !first.includes(t) && !last.includes(t))
    .sort((a, b) => Math.abs(a.amount - avg) - Math.abs(b.amount - avg))
    .slice(0, 4);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of [...first, ...last, ...middle]) {
    if (!seen.has(t.txn_id)) {
      seen.add(t.txn_id);
      result.push(t.txn_id);
    }
  }
  return result;
}

export function buildAgent1Input(
  engine: EngineOutput,
): Agent1Input {
  // Top 25 accounts by risk_score >= 65 (High / Critical)
  const candidateAccounts = [...engine.accounts]
    .filter(a => a.risk_score >= 65)
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 25);

  // Top 25 relationships by risk_score >= 65
  const candidateRelationships = [...engine.relationships]
    .filter(r => r.risk_score >= 65)
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 25);

  // Top 10 components (already scored — take highest-scoring)
  const candidateComponents = [...engine.network_components]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 10);

  // Build supporting transaction slice for each relationship
  const relationshipsWithTxns = candidateRelationships.map(rel => {
    const txns = engine.transactions.filter(
      t =>
        t.account_id === rel.sender &&
        t.counterparty_id === rel.receiver,
    );
    return {
      ...rel,
      supporting_transaction_ids: pickRepresentativeTxns(txns),
    };
  });

  return {
    run_id: engine.run_id,
    metrics: engine.metrics,
    candidate_accounts: candidateAccounts,
    candidate_relationships: relationshipsWithTxns,
    candidate_components: candidateComponents,
  };
}

// Re-export the extended type so callers have it
export type RelationshipWithTxns = ReturnType<typeof buildAgent1Input>['candidate_relationships'][number];
