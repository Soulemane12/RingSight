import type {
  RiskLabel,
  AccountSignal,
  RelationshipSignal,
  NetworkComponent,
  EngineOutput,
} from '@/lib/detection/types';

export interface CandidateRelationship extends RelationshipSignal {
  supporting_transaction_ids: string[];
}

export interface Agent1Input {
  run_id: string;
  metrics: EngineOutput['metrics'];
  candidate_accounts: AccountSignal[];
  candidate_relationships: CandidateRelationship[];
  candidate_components: NetworkComponent[];
}

export type PatternType =
  | 'CIRCULAR_FLOW'
  | 'LAYERING_CHAIN'
  | 'TIMING_CLUSTER'
  | 'STRUCTURED_SMURFING'
  | 'MULE_NETWORK'
  | 'HIGH_VELOCITY_PASS_THROUGH'
  | 'NEW_ACCOUNT_BURST';

export interface Agent1Evidence {
  signal_name: string;
  measured_value: string | number;
  threshold: string | number;
  explanation: string;
  supporting_transaction_ids: string[];
}

export interface Agent1Finding {
  finding_id: string;
  pattern_type: PatternType;
  title: string;
  summary: string;
  source_entity_type: 'ACCOUNT' | 'RELATIONSHIP' | 'COMPONENT';
  source_entity_id: string;
  accounts: string[];
  relationship_ids: string[];
  transaction_ids: string[];
  exposure: number;
  engine_risk_score: number;
  engine_risk_label: RiskLabel;
  evidence: Agent1Evidence[];
  confidence: number;
}

export interface Agent1Output {
  run_id: string;
  agent: 'pattern-finder';
  findings: Agent1Finding[];
  summary: string;
  processed_at: string;
  llm_model: string;
  cognee_stored: boolean;
}

// Raw finding shape returned by the LLM tool call (before validation assigns IDs/confidence)
export interface RawLLMFinding {
  pattern_type: string;
  title: string;
  summary: string;
  source_entity_type: string;
  source_entity_id: string;
  accounts: string[];
  relationship_ids: string[];
  transaction_ids: string[];
  exposure: number;
  engine_risk_score: number;
  engine_risk_label: string;
  evidence: {
    signal_name: string;
    measured_value: string | number;
    threshold: string | number;
    explanation: string;
    supporting_transaction_ids: string[];
  }[];
}

export interface RawLLMOutput {
  summary: string;
  findings: RawLLMFinding[];
}
