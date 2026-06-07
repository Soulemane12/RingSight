import type {
  EngineOutput,
  RelationshipSignal,
  NetworkComponent,
  NormalizedRow,
} from '@/lib/detection/types';
import type { Agent1Output, Agent1Finding } from '@/lib/agents/agent1/types';

// ── Public output types ────────────────────────────────────────────────────

export type CaseType =
  | 'COORDINATED_TRANSFER_NETWORK'
  | 'LAYERING_CHAIN'
  | 'REPEATED_TRANSFER_PAIR'
  | 'NEW_ACCOUNT_CLUSTER'
  | 'HIGH_EXPOSURE_NETWORK';

export type CaseSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface RankedCaseEvidence {
  evidence_id: string;
  source_finding_id: string;
  evidence_type: 'relationship' | 'network_component' | 'transaction' | 'account';
  title: string;
  explanation: string;
  accounts: string[];
  relationship_ids: string[];
  transaction_ids: string[];
  exposure: number;
  risk_score: number;
}

export interface RankedFraudCase {
  case_id: string;
  run_id: string;
  rank: number;
  case_type: CaseType;
  title: string;
  summary: string;
  severity: CaseSeverity;
  risk_score: number;
  confidence: number;
  accounts: string[];
  relationship_ids: string[];
  transaction_ids: string[];
  total_exposure: number;
  transaction_count: number;
  connector_accounts: string[];
  chains: string[][];
  cycles: string[][];
  ranking_reasons: string[];
  evidence: RankedCaseEvidence[];
  source_agent: 'agent_2_case_ranker';
}

export interface Agent2Output {
  agent: 'agent_2_case_ranker';
  run_id: string;
  status: 'completed' | 'failed';
  started_at: string;
  completed_at: string;
  input_summary: {
    agent1_finding_count: number;
    component_count: number;
    relationship_count: number;
    cognee_recalled: boolean;
  };
  summary: string;
  cases: RankedFraudCase[];
  cognee: {
    dataset_name: string;
    recalled_agent_1: boolean;
    stored_agent_2: boolean;
    stored_at: string | null;
    error: string | null;
  };
}

// ── Agent 2 input (what gets passed to the LLM prompt) ───────────────────

export interface Agent2Input {
  run_id: string;
  engine: {
    metrics: EngineOutput['metrics'];
    relationships: RelationshipSignal[];
    network_components: NetworkComponent[];
    transactions: NormalizedRow[];
  };
  agent1: Agent1Output;
  cognee_recall: {
    recalled: boolean;
    dataset_name: string;
    query: string;
    result_count: number;
    raw_results: unknown[];
  };
}

// ── Internal pipeline types ───────────────────────────────────────────────

export interface CandidateCase {
  component_id: string;
  accounts: string[];
  relationship_ids: string[];
  transaction_ids: string[];
  total_exposure: number;
  transaction_count: number;
  connector_accounts: string[];
  chains: string[][];
  cycles: string[][];
  risk_score: number;
  severity: CaseSeverity;
  confidence: number;
  attached_findings: Agent1Finding[];
  avg_finding_score: number;
}

// ── Raw LLM tool-call shapes ──────────────────────────────────────────────

export interface RawLLMEvidenceNote {
  source_finding_id: string;
  evidence_type: string;
  title: string;
  explanation: string;
}

export interface RawLLMCaseEntry {
  component_id: string;
  case_type: string;
  title: string;
  summary: string;
  ranking_reasons: string[];
  evidence_notes: RawLLMEvidenceNote[];
}

export interface RawLLMAgent2Output {
  overall_summary: string;
  cases: RawLLMCaseEntry[];
}
