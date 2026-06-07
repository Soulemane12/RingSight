import type { EngineOutput } from '@/lib/detection/types';
import type { Agent1Output } from '@/lib/agents/agent1/types';
import type { Agent2Output } from '@/lib/agents/agent2/types';
import type { Agent3Output } from '@/lib/agents/agent3/types';
import type { Agent4Output } from '@/lib/agents/agent4/types';

export interface FullAnalysisResult {
  engine: EngineOutput;
  agent1: Agent1Output;
  agent2: Agent2Output;
  agent3: Agent3Output;
  agent4: Agent4Output;
}

export interface EngineHighlight {
  edge_id: string;
  sender: string;
  receiver: string;
  txn_count: number;
  exposure: number;
  risk_score: number;
  flags: string[];
}

export interface ComponentHighlight {
  component_id: string;
  accounts: string[];
  risk_score: number;
  has_chain: boolean;
}

export interface LiveFinding {
  finding_id: string;
  pattern_type: string;
  title: string;
  accounts: string[];
  confidence: number;
  exposure: number;
}

export interface LiveCase {
  case_id: string;
  title: string;
  risk_score: number;
  severity: string;
  total_exposure: number;
  accounts: string[];
}

export interface LiveAction {
  case_id: string;
  recommended_action: string;
  urgency: string;
}

export type AnalysisEvent =
  | { type: 'run_started'; run_id: string }
  | {
      type: 'engine_completed';
      run_id: string;
      metrics: EngineOutput['metrics'];
      highlights: {
        topRelationships: EngineHighlight[];
        topComponents: ComponentHighlight[];
      };
    }
  | { type: 'agent_started'; run_id: string; agent: 1 | 2 | 3 | 4; label: string }
  | {
      type: 'agent_completed';
      run_id: string;
      agent: 1 | 2 | 3 | 4;
      summary: string;
      cognee_read: boolean;
      cognee_write: boolean;
      findings?: LiveFinding[];
      cases?: LiveCase[];
      actions?: LiveAction[];
    }
  | { type: 'run_completed'; run_id: string; result: FullAnalysisResult }
  | { type: 'run_failed'; run_id?: string; stage: string; message: string };
