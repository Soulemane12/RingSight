import type { EngineOutput } from '@/lib/detection/types';
import type { Agent1Finding } from '@/lib/agents/agent1/types';
import type {
  RawLLMAgent2Output,
  CandidateCase,
  RankedFraudCase,
  RankedCaseEvidence,
  CaseType,
} from './types';

const VALID_CASE_TYPES = new Set<string>([
  'COORDINATED_TRANSFER_NETWORK',
  'LAYERING_CHAIN',
  'REPEATED_TRANSFER_PAIR',
  'NEW_ACCOUNT_CLUSTER',
  'HIGH_EXPOSURE_NETWORK',
]);

const VALID_EVIDENCE_TYPES = new Set<string>([
  'relationship',
  'network_component',
  'transaction',
  'account',
]);

// Replace cycle language when the component has no actual cycles
const CYCLE_REPLACEMENTS: [RegExp, string][] = [
  [/\bcircular flow\b/gi, 'connected flow'],
  [/\bclosed loop\b/gi, 'connected network'],
  [/\bcycle\b/gi, 'transfer chain'],
];

function sanitizeSummary(summary: string, hasCycles: boolean): string {
  if (hasCycles) return summary;
  let s = summary;
  for (const [pattern, replacement] of CYCLE_REPLACEMENTS) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

function padCase(n: number): string {
  return String(n).padStart(3, '0');
}

function padEvidence(n: number): string {
  return String(n).padStart(3, '0');
}

export function validateAndBuildCases(
  llmOutput: RawLLMAgent2Output,
  candidates: CandidateCase[],
  agent1Findings: Agent1Finding[],
  engine: EngineOutput,
  runId: string,
): { cases: RankedFraudCase[]; droppedCount: number } {
  const accountIds = new Set(engine.accounts.map(a => a.account_id));
  const edgeIds = new Set(engine.relationships.map(r => r.edge_id));
  const txnIds = new Set(engine.transactions.map(t => t.txn_id));

  // Index candidates and Agent 1 findings by ID
  const candidateByCompId = new Map(candidates.map(c => [c.component_id, c]));
  const findingById = new Map(agent1Findings.map(f => [f.finding_id, f]));

  const built: RankedFraudCase[] = [];
  let droppedCount = 0;

  for (const llmCase of llmOutput.cases) {
    const candidate = candidateByCompId.get(llmCase.component_id);
    if (!candidate) {
      droppedCount++;
      continue;
    }

    const caseType: CaseType = VALID_CASE_TYPES.has(llmCase.case_type)
      ? (llmCase.case_type as CaseType)
      : 'COORDINATED_TRANSFER_NETWORK';

    const hasCycles = candidate.cycles.length > 0;
    const summary = sanitizeSummary(llmCase.summary ?? '', hasCycles);

    // Prune phantom IDs — never drop the case, just remove the bad refs
    const validAccounts = candidate.accounts.filter(id => accountIds.has(id));
    const validRelationships = candidate.relationship_ids.filter(id => edgeIds.has(id));
    const validTxns = candidate.transaction_ids.filter(id => txnIds.has(id));

    // Build evidence items from LLM notes + Agent 1 finding data
    const evidence: RankedCaseEvidence[] = [];
    let evSeq = 1;
    for (const note of llmCase.evidence_notes ?? []) {
      const evType = VALID_EVIDENCE_TYPES.has(note.evidence_type)
        ? (note.evidence_type as RankedCaseEvidence['evidence_type'])
        : 'account';

      // Enrich from the Agent 1 finding if the ID is valid
      const a1Finding = note.source_finding_id
        ? findingById.get(note.source_finding_id)
        : undefined;

      evidence.push({
        evidence_id: `A2-EV-${padEvidence(evSeq++)}`,
        source_finding_id: a1Finding ? a1Finding.finding_id : note.source_finding_id ?? '',
        evidence_type: evType,
        title: note.title ?? '',
        explanation: note.explanation ?? '',
        accounts: a1Finding ? a1Finding.accounts.filter(id => accountIds.has(id)) : [],
        relationship_ids: a1Finding
          ? a1Finding.relationship_ids.filter(id => edgeIds.has(id))
          : [],
        transaction_ids: a1Finding
          ? a1Finding.transaction_ids.filter(id => txnIds.has(id))
          : [],
        exposure: a1Finding ? a1Finding.exposure : 0,
        risk_score: a1Finding ? a1Finding.engine_risk_score : 0,
      });
    }

    built.push({
      case_id: '', // assigned after sort
      run_id: runId,
      rank: 0,    // assigned after sort
      case_type: caseType,
      title: llmCase.title ?? `Fraud Case — ${candidate.component_id}`,
      summary,
      severity: candidate.severity,           // deterministic
      risk_score: candidate.risk_score,        // deterministic
      confidence: candidate.confidence,
      accounts: validAccounts,
      relationship_ids: validRelationships,
      transaction_ids: validTxns,
      total_exposure: candidate.total_exposure, // deterministic — never trust LLM value
      transaction_count: candidate.transaction_count,
      connector_accounts: candidate.connector_accounts,
      chains: candidate.chains,
      cycles: candidate.cycles,
      ranking_reasons: llmCase.ranking_reasons ?? [],
      evidence,
      source_agent: 'agent_2_case_ranker',
    });
  }

  // Sort: risk_score desc → exposure desc → account count desc → case_id asc
  built.sort((a, b) => {
    if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score;
    if (b.total_exposure !== a.total_exposure) return b.total_exposure - a.total_exposure;
    if (b.accounts.length !== a.accounts.length) return b.accounts.length - a.accounts.length;
    return a.run_id.localeCompare(b.run_id);
  });

  // Assign stable CASE IDs and ranks after sort
  built.forEach((c, i) => {
    c.case_id = `CASE-${padCase(i + 1)}`;
    c.rank = i + 1;
  });

  return { cases: built, droppedCount };
}
