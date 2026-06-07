import type {
  EngineOutput,
  RelationshipSignal,
  NetworkComponent,
  NormalizedRow,
} from '@/lib/detection/types';
import type { Agent1Output } from '@/lib/agents/agent1/types';
import type { Agent2Output } from '@/lib/agents/agent2/types';

// ── Public output types ────────────────────────────────────────────────────

export type RecommendedAction =
  | 'MONITOR'
  | 'INVESTIGATE'
  | 'ESCALATE'
  | 'TEMPORARILY_RESTRICT_AND_ESCALATE'
  | 'REQUEST_ENHANCED_REVIEW';

export type ActionUrgency = 'Low' | 'Medium' | 'High' | 'Immediate';

export type ActionReasonCode =
  | 'CRITICAL_RISK_SCORE'
  | 'HIGH_TOTAL_EXPOSURE'
  | 'COORDINATED_NIGHT_ACTIVITY'
  | 'STRUCTURED_SMALL_TRANSFERS'
  | 'LAYERING_CHAIN'
  | 'CONNECTED_ACCOUNT_CLUSTER'
  | 'NEW_ACCOUNT_CLUSTER'
  | 'REPEATED_TRANSFER_PAIR'
  | 'AGENT_1_EVIDENCE'
  | 'AGENT_2_RANKING';

export interface ActionReason {
  reason_code: ActionReasonCode;
  explanation: string;
  supporting_finding_ids: string[];
  supporting_relationship_ids: string[];
  supporting_transaction_ids: string[];
}

export interface CaseActionPlan {
  action_id: string;
  run_id: string;
  case_id: string;
  rank: number;
  case_title: string;
  recommended_action: RecommendedAction;
  urgency: ActionUrgency;
  plain_english_action: string;
  analyst_instructions: string[];
  reasons: ActionReason[];
  risk_score: number;
  total_exposure: number;
  accounts: string[];
  confidence: number;
  source_agent: 'agent_3_action_recommender';
}

export interface Agent3Output {
  agent: 'agent_3_action_recommender';
  run_id: string;
  status: 'completed' | 'failed';
  started_at: string;
  completed_at: string;
  input_summary: {
    case_count: number;
    critical_case_count: number;
    cognee_recalled_agent_2: boolean;
  };
  summary: string;
  actions: CaseActionPlan[];
  cognee: {
    dataset_name: string;
    recalled_agent_2: boolean;
    stored_agent_3: boolean;
    stored_at: string | null;
    error: string | null;
  };
}

// ── Agent 3 input ──────────────────────────────────────────────────────────

export interface Agent3Input {
  run_id: string;
  engine: {
    metrics: EngineOutput['metrics'];
    relationships: RelationshipSignal[];
    network_components: NetworkComponent[];
    transactions: NormalizedRow[];
  };
  agent1: Agent1Output;
  agent2: Agent2Output;
  cognee_recall: {
    recalled_agent_2: boolean;
    dataset_name: string;
    query: string;
    result_count: number;
    raw_results: unknown[];
  };
}

// ── Raw LLM tool-call shapes ──────────────────────────────────────────────

export interface RawLLMActionEntry {
  case_id: string;
  plain_english_action: string;
  analyst_instructions: string[];
}

export interface RawLLMAgent3Output {
  overall_summary: string;
  actions: RawLLMActionEntry[];
}
