import type { Agent1Output } from '@/lib/agents/agent1/types';
import type { Agent2Output } from '@/lib/agents/agent2/types';
import type { Agent3Output } from '@/lib/agents/agent3/types';

export interface ReportSection {
  heading: string;
  body: string;
}

export interface CaseInvestigationReport {
  report_id: string;
  run_id: string;
  case_id: string;
  title: string;
  generated_at: string;
  risk_score: number;
  severity: string;
  recommended_action: string;
  urgency: string;
  total_exposure: number;
  accounts: string[];
  relationship_ids: string[];
  transaction_ids: string[];
  executive_summary: string;
  key_evidence: ReportSection[];
  network_summary: string;
  action_summary: string;
  limitations: string;
  analyst_signoff: string;
  markdown: string;
  source_agent: 'agent_4_report_writer';
}

export interface Agent4Output {
  agent: 'agent_4_report_writer';
  run_id: string;
  status: 'completed' | 'failed';
  started_at: string;
  completed_at: string;
  input_summary: {
    case_count: number;
    action_count: number;
    recalled_agent_1: boolean;
    recalled_agent_2: boolean;
    recalled_agent_3: boolean;
  };
  summary: string;
  reports: CaseInvestigationReport[];
  cognee: {
    dataset_name: string;
    recalled_agent_1: boolean;
    recalled_agent_2: boolean;
    recalled_agent_3: boolean;
    stored_agent_4: boolean;
    stored_at: string | null;
    error: string | null;
  };
}

export interface Agent4Input {
  run_id: string;
  agent1: Agent1Output;
  agent2: Agent2Output;
  agent3: Agent3Output;
  cognee_recall: {
    recalled_agent_1: boolean;
    recalled_agent_2: boolean;
    recalled_agent_3: boolean;
    dataset_name: string;
    result_count: number;
    raw_results: unknown[];
  };
}

// ── Raw LLM tool shapes ────────────────────────────────────────────────────

export interface RawLLMReportEntry {
  case_id: string;
  title: string;
  executive_summary: string;
  key_evidence: { heading: string; body: string }[];
  network_summary: string;
  action_summary: string;
  limitations: string;
  analyst_signoff: string;
}

export interface RawLLMAgent4Output {
  overall_summary: string;
  reports: RawLLMReportEntry[];
}
