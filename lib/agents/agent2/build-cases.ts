import type { EngineOutput } from '@/lib/detection/types';
import type { Agent1Output } from '@/lib/agents/agent1/types';
import type { CandidateCase, CaseSeverity } from './types';

function exposureBonus(exposure: number): number {
  if (exposure >= 75_000) return 10;
  if (exposure >= 50_000) return 7;
  if (exposure >= 25_000) return 4;
  return 0;
}

function computeCaseScore(
  componentScore: number,
  avgFindingScore: number,
  chainBonus: number,
  connectorBonus: number,
  expBonus: number,
): number {
  const raw =
    componentScore * 0.60 +
    avgFindingScore * 0.25 +
    expBonus +
    chainBonus +
    connectorBonus;
  return Math.min(100, Math.round(raw));
}

function severityFromScore(score: number): CaseSeverity {
  if (score >= 85) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

export function buildCandidateCases(
  engine: EngineOutput,
  agent1: Agent1Output,
): CandidateCase[] {
  const candidateComponents = engine.network_components
    .filter(c => c.risk_score >= 65)
    .sort((a, b) => {
      if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score;
      if (b.total_exposure !== a.total_exposure) return b.total_exposure - a.total_exposure;
      return a.component_id.localeCompare(b.component_id);
    });

  const cases: CandidateCase[] = [];

  for (const comp of candidateComponents) {
    const accountSet = new Set(comp.accounts);

    const relationship_ids = engine.relationships
      .filter(r => accountSet.has(r.sender) && accountSet.has(r.receiver))
      .map(r => r.edge_id);

    // Up to 20 internal-transfer txn IDs within the component
    const transaction_ids = engine.transactions
      .filter(
        t =>
          t.is_internal_transfer &&
          accountSet.has(t.account_id) &&
          accountSet.has(t.counterparty_id),
      )
      .slice(0, 20)
      .map(t => t.txn_id);

    // Agent 1 findings whose accounts overlap with this component
    const attached_findings = agent1.findings.filter(f =>
      f.accounts.some(a => accountSet.has(a)),
    );

    const avg_finding_score =
      attached_findings.length > 0
        ? attached_findings.reduce((s, f) => s + f.engine_risk_score, 0) /
          attached_findings.length
        : 0;

    const chainBonus = comp.chains.length > 0 ? 5 : 0;
    const connectorBonus = comp.hub_accounts.length > 0 ? 5 : 0;
    const expBonus = exposureBonus(comp.total_exposure);

    const risk_score = computeCaseScore(
      comp.risk_score,
      avg_finding_score,
      chainBonus,
      connectorBonus,
      expBonus,
    );

    const confidence = Math.min(
      0.99,
      0.40 + 0.10 * attached_findings.length + 0.20 * (risk_score / 100),
    );

    cases.push({
      component_id: comp.component_id,
      accounts: comp.accounts,
      relationship_ids,
      transaction_ids,
      total_exposure: comp.total_exposure,
      transaction_count: comp.transaction_count,
      connector_accounts: comp.hub_accounts,
      chains: comp.chains,
      cycles: comp.cycles,
      risk_score,
      severity: severityFromScore(risk_score),
      confidence: Math.round(confidence * 1000) / 1000,
      attached_findings,
      avg_finding_score: Math.round(avg_finding_score * 100) / 100,
    });
  }

  // Final ranking: score desc → exposure desc → account count desc → component_id asc
  cases.sort((a, b) => {
    if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score;
    if (b.total_exposure !== a.total_exposure) return b.total_exposure - a.total_exposure;
    if (b.accounts.length !== a.accounts.length) return b.accounts.length - a.accounts.length;
    return a.component_id.localeCompare(b.component_id);
  });

  return cases;
}
