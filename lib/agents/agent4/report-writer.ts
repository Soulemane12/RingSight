import OpenAI from 'openai';
import type { Agent1Output } from '@/lib/agents/agent1/types';
import type { Agent2Output } from '@/lib/agents/agent2/types';
import type { Agent3Output } from '@/lib/agents/agent3/types';
import type { Agent4Output, Agent4Input, RawLLMAgent4Output } from './types';
import { recallAllAgentsFromCognee } from './recall';
import { geodoResearch } from '@/lib/research/geodo-research';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import { validateAndBuildReports } from './validate';
import { cacheReport } from './cache';
import { storeInCognee } from '@/lib/cognee/client';

const MODEL = 'gpt-4o';

const TOOL_SCHEMA: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'write_investigation_reports',
    description:
      'Write readable investigation reports for each ranked fraud case. One entry per case_id provided.',
    parameters: {
      type: 'object',
      required: ['overall_summary', 'reports'],
      properties: {
        overall_summary: {
          type: 'string',
          description: '2–3 sentence summary across all generated reports.',
        },
        reports: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'case_id',
              'title',
              'executive_summary',
              'key_evidence',
              'network_summary',
              'action_summary',
              'limitations',
              'analyst_signoff',
            ],
            properties: {
              case_id: { type: 'string' },
              title: { type: 'string' },
              executive_summary: {
                type: 'string',
                description: '2–4 sentences summarising the suspicious activity in plain English.',
              },
              key_evidence: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['heading', 'body'],
                  properties: {
                    heading: { type: 'string' },
                    body: { type: 'string' },
                  },
                },
                description: 'Up to 4 evidence sections, one per major finding.',
              },
              network_summary: {
                type: 'string',
                description: '1–2 sentences describing how the accounts are connected.',
              },
              action_summary: {
                type: 'string',
                description: '1–2 sentences describing the recommended action from Agent 3.',
              },
              limitations: {
                type: 'string',
                description: 'Limitations statement. Must state this report does not prove fraud.',
              },
              analyst_signoff: {
                type: 'string',
                description: 'Sign-off block with blank fields for Reviewed by, Date, Decision.',
              },
            },
          },
        },
      },
    },
  },
};

export async function runReportWriterAgent(params: {
  agent1Output: Agent1Output;
  agent2Output: Agent2Output;
  agent3Output: Agent3Output;
  requireCognee?: boolean;
}): Promise<Agent4Output> {
  const { agent1Output: agent1, agent2Output: agent2, agent3Output: agent3, requireCognee = false } = params;
  const runId = agent2.run_id;
  const started_at = new Date().toISOString();
  const cogDataset = `agent-4-investigation-reports-${runId}`;

  // ── Step 2: Recall all agents from Cognee ────────────────────────────────
  const recall = await recallAllAgentsFromCognee(runId);

  if (requireCognee && (!recall.recalled_agent_1 || !recall.recalled_agent_2 || !recall.recalled_agent_3)) {
    return {
      agent: 'agent_4_report_writer',
      run_id: runId,
      status: 'failed',
      started_at,
      completed_at: new Date().toISOString(),
      input_summary: {
        case_count: agent2.cases.length,
        action_count: agent3.actions.length,
        recalled_agent_1: recall.recalled_agent_1,
        recalled_agent_2: recall.recalled_agent_2,
        recalled_agent_3: recall.recalled_agent_3,
      },
      summary: `Agent 4 could not recall all prior agents from Cognee. Missing: ${[
        !recall.recalled_agent_1 && 'Agent 1',
        !recall.recalled_agent_2 && 'Agent 2',
        !recall.recalled_agent_3 && 'Agent 3',
      ].filter(Boolean).join(', ')}.`,
      reports: [],
      cognee: {
        dataset_name: cogDataset,
        recalled_agent_1: recall.recalled_agent_1,
        recalled_agent_2: recall.recalled_agent_2,
        recalled_agent_3: recall.recalled_agent_3,
        stored_agent_4: false,
        stored_at: null,
        error: 'Required Cognee recall failed',
      },
    };
  }

  // ── Fast path: no cases ───────────────────────────────────────────────────
  if (agent2.cases.length === 0) {
    const empty: Agent4Output = {
      agent: 'agent_4_report_writer',
      run_id: runId,
      status: 'completed',
      started_at,
      completed_at: new Date().toISOString(),
      input_summary: { case_count: 0, action_count: 0, recalled_agent_1: recall.recalled_agent_1, recalled_agent_2: recall.recalled_agent_2, recalled_agent_3: recall.recalled_agent_3 },
      summary: 'No investigation reports were generated because Agent 2 produced no ranked cases.',
      reports: [],
      cognee: { dataset_name: cogDataset, recalled_agent_1: recall.recalled_agent_1, recalled_agent_2: recall.recalled_agent_2, recalled_agent_3: recall.recalled_agent_3, stored_agent_4: false, stored_at: null, error: null },
    };
    const stored = await storeInCognee(cogDataset, buildCogneePayload(empty));
    empty.cognee.stored_agent_4 = stored.success;
    empty.cognee.stored_at = stored.success ? new Date().toISOString() : null;
    empty.cognee.error = stored.error ?? null;
    return empty;
  }

  // ── Step 3: Build Agent4Input ─────────────────────────────────────────────
  const agent4Input: Agent4Input = {
    run_id: runId,
    agent1,
    agent2,
    agent3,
    domain_research: {
      tool: geodoResearch.tool,
      researchedAt: geodoResearch.researchedAt,
      findings: geodoResearch.findings.map(f => ({
        finding: f.finding,
        productDecision: f.productDecision,
      })),
    },
    cognee_recall: {
      recalled_agent_1: recall.recalled_agent_1,
      recalled_agent_2: recall.recalled_agent_2,
      recalled_agent_3: recall.recalled_agent_3,
      dataset_name: cogDataset,
      result_count: recall.combined_result_count,
      raw_results: recall.all_raw_results,
    },
  };

  // ── Step 4: LLM call ──────────────────────────────────────────────────────
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: MODEL,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'function', function: { name: 'write_investigation_reports' } },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(agent4Input) },
    ],
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== 'function') {
    throw new Error('Agent 4: LLM did not call write_investigation_reports tool');
  }

  let llmOutput: RawLLMAgent4Output;
  try {
    llmOutput = JSON.parse(toolCall.function.arguments) as RawLLMAgent4Output;
  } catch {
    throw new Error('Agent 4: Failed to parse write_investigation_reports arguments as JSON');
  }

  // ── Steps 5–8: Validate, override, generate Markdown, assign IDs ─────────
  const { reports } = validateAndBuildReports(llmOutput, agent2, agent3, runId);

  // Populate the download cache
  for (const report of reports) {
    cacheReport(runId, report.case_id, report.markdown);
  }

  const completed_at = new Date().toISOString();

  const output: Agent4Output = {
    agent: 'agent_4_report_writer',
    run_id: runId,
    status: 'completed',
    started_at,
    completed_at,
    input_summary: {
      case_count: agent2.cases.length,
      action_count: agent3.actions.length,
      recalled_agent_1: recall.recalled_agent_1,
      recalled_agent_2: recall.recalled_agent_2,
      recalled_agent_3: recall.recalled_agent_3,
    },
    summary: llmOutput.overall_summary ?? '',
    reports,
    cognee: {
      dataset_name: cogDataset,
      recalled_agent_1: recall.recalled_agent_1,
      recalled_agent_2: recall.recalled_agent_2,
      recalled_agent_3: recall.recalled_agent_3,
      stored_agent_4: false,
      stored_at: null,
      error: null,
    },
  };

  // ── Step 9: Store in Cognee ───────────────────────────────────────────────
  const stored = await storeInCognee(cogDataset, buildCogneePayload(output));
  output.cognee.stored_agent_4 = stored.success;
  output.cognee.stored_at = stored.success ? new Date().toISOString() : null;
  if (!stored.success) {
    output.cognee.error = stored.error ?? 'Unknown store error';
    console.warn(`[Agent4] Cognee store failed: ${stored.error}`);
  }

  return output;
}

function buildCogneePayload(output: Agent4Output) {
  return {
    memory_type: 'agent_output',
    product: 'RingSight',
    agent: 'agent_4_report_writer',
    run_id: output.run_id,
    created_at: output.completed_at,
    input_summary: output.input_summary,
    summary: output.summary,
    reports: output.reports.map(r => ({
      report_id: r.report_id,
      case_id: r.case_id,
      title: r.title,
      risk_score: r.risk_score,
      severity: r.severity,
      recommended_action: r.recommended_action,
      total_exposure: r.total_exposure,
    })),
  };
}
