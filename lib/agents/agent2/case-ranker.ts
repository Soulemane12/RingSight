import OpenAI from 'openai';
import type { EngineOutput } from '@/lib/detection/types';
import type { Agent1Output } from '@/lib/agents/agent1/types';
import type { Agent2Output, Agent2Input, RawLLMAgent2Output } from './types';
import { recallAgent1FromCognee } from './recall';
import { buildCandidateCases } from './build-cases';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import { validateAndBuildCases } from './validate';
import { storeInCognee } from '@/lib/cognee/client';

const MODEL = 'gpt-4o';

const TOOL_SCHEMA: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'rank_fraud_cases',
    description:
      'Return ranked summaries for each candidate fraud case. Exactly one entry per component_id provided in the input.',
    parameters: {
      type: 'object',
      required: ['overall_summary', 'cases'],
      properties: {
        overall_summary: {
          type: 'string',
          description: '2–4 sentence summary of the fraud landscape across all ranked cases.',
        },
        cases: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'component_id',
              'case_type',
              'title',
              'summary',
              'ranking_reasons',
              'evidence_notes',
            ],
            properties: {
              component_id: { type: 'string' },
              case_type: {
                type: 'string',
                enum: [
                  'COORDINATED_TRANSFER_NETWORK',
                  'LAYERING_CHAIN',
                  'REPEATED_TRANSFER_PAIR',
                  'NEW_ACCOUNT_CLUSTER',
                  'HIGH_EXPOSURE_NETWORK',
                ],
              },
              title: { type: 'string' },
              summary: { type: 'string' },
              ranking_reasons: { type: 'array', items: { type: 'string' } },
              evidence_notes: {
                type: 'array',
                items: {
                  type: 'object',
                  required: [
                    'source_finding_id',
                    'evidence_type',
                    'title',
                    'explanation',
                  ],
                  properties: {
                    source_finding_id: { type: 'string' },
                    evidence_type: {
                      type: 'string',
                      enum: ['relationship', 'network_component', 'transaction', 'account'],
                    },
                    title: { type: 'string' },
                    explanation: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export async function runCaseRankerAgent(params: {
  engineOutput: EngineOutput;
  agent1Output: Agent1Output;
  requireCognee?: boolean;
}): Promise<Agent2Output> {
  const { engineOutput: engine, agent1Output: agent1, requireCognee = false } = params;
  const started_at = new Date().toISOString();

  // ── Step 1: Recall Agent 1 from Cognee ──────────────────────────────────
  const cogneeRecall = await recallAgent1FromCognee(engine.run_id);

  if (requireCognee && !cogneeRecall.recalled) {
    const completed_at = new Date().toISOString();
    return {
      agent: 'agent_2_case_ranker',
      run_id: engine.run_id,
      status: 'failed',
      started_at,
      completed_at,
      input_summary: {
        agent1_finding_count: agent1.findings.length,
        component_count: engine.network_components.length,
        relationship_count: engine.relationships.length,
        cognee_recalled: false,
      },
      summary: 'Agent 2 could not verify Cognee recall. Run aborted because requireCognee=true.',
      cases: [],
      cognee: {
        dataset_name: `ringsight-${engine.run_id}`,
        recalled_agent_1: false,
        stored_agent_2: false,
        stored_at: null,
        error: cogneeRecall.error ?? 'Cognee recall returned no results',
      },
    };
  }

  // ── Step 2: Handle no-findings fast path ───────────────────────────────
  if (agent1.findings.length === 0) {
    const emptyOutput: Agent2Output = {
      agent: 'agent_2_case_ranker',
      run_id: engine.run_id,
      status: 'completed',
      started_at,
      completed_at: new Date().toISOString(),
      input_summary: {
        agent1_finding_count: 0,
        component_count: engine.network_components.length,
        relationship_count: engine.relationships.length,
        cognee_recalled: cogneeRecall.recalled,
      },
      summary:
        'No fraud cases were created because Agent 1 found no high-risk suspicious patterns.',
      cases: [],
      cognee: {
        dataset_name: `ringsight-${engine.run_id}`,
        recalled_agent_1: cogneeRecall.recalled,
        stored_agent_2: false,
        stored_at: null,
        error: null,
      },
    };

    // Still write empty output to Cognee
    const storeResult = await storeInCognee(
      `agent-2-ranked-cases-${engine.run_id.toLowerCase()}`,
      buildCogneePayload(emptyOutput),
    );
    emptyOutput.cognee.stored_agent_2 = storeResult.success;
    emptyOutput.cognee.stored_at = storeResult.success ? new Date().toISOString() : null;
    emptyOutput.cognee.error = storeResult.error ?? null;

    return emptyOutput;
  }

  // ── Step 3 & 4: Build candidate cases and attach Agent 1 findings ──────
  const candidates = buildCandidateCases(engine, agent1);

  // ── Step 5 is done inside buildCandidateCases (deterministic scoring) ──

  // ── Step 6: Build Agent2Input and call LLM ──────────────────────────────
  const agent2Input: Agent2Input = {
    run_id: engine.run_id,
    engine: {
      metrics: engine.metrics,
      relationships: engine.relationships,
      network_components: engine.network_components,
      transactions: engine.transactions,
    },
    agent1,
    cognee_recall: {
      recalled: cogneeRecall.recalled,
      dataset_name: cogneeRecall.dataset_name,
      query: cogneeRecall.query,
      result_count: cogneeRecall.result_count,
      raw_results: cogneeRecall.raw_results,
    },
  };

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: MODEL,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'function', function: { name: 'rank_fraud_cases' } },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(agent2Input, candidates) },
    ],
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== 'function') {
    throw new Error('Agent 2: LLM did not call rank_fraud_cases tool');
  }

  let llmOutput: RawLLMAgent2Output;
  try {
    llmOutput = JSON.parse(toolCall.function.arguments) as RawLLMAgent2Output;
  } catch {
    throw new Error('Agent 2: Failed to parse rank_fraud_cases arguments as JSON');
  }

  // ── Steps 7 & 8: Validate and replace model scores with deterministic ───
  const { cases } = validateAndBuildCases(
    llmOutput,
    candidates,
    agent1.findings,
    engine,
    engine.run_id,
  );

  const completed_at = new Date().toISOString();

  const output: Agent2Output = {
    agent: 'agent_2_case_ranker',
    run_id: engine.run_id,
    status: 'completed',
    started_at,
    completed_at,
    input_summary: {
      agent1_finding_count: agent1.findings.length,
      component_count: engine.network_components.length,
      relationship_count: engine.relationships.length,
      cognee_recalled: cogneeRecall.recalled,
    },
    summary: llmOutput.overall_summary ?? '',
    cases,
    cognee: {
      dataset_name: `ringsight-${engine.run_id}`,
      recalled_agent_1: cogneeRecall.recalled,
      stored_agent_2: false,
      stored_at: null,
      error: null,
    },
  };

  // ── Step 10: Store Agent 2 output in Cognee ─────────────────────────────
  const storeResult = await storeInCognee(
    `agent-2-ranked-cases-${engine.run_id.toLowerCase()}`,
    buildCogneePayload(output),
  );
  output.cognee.stored_agent_2 = storeResult.success;
  output.cognee.stored_at = storeResult.success ? new Date().toISOString() : null;
  if (!storeResult.success) {
    output.cognee.error = storeResult.error ?? 'Unknown store error';
    console.warn(`[Agent2] Cognee store failed: ${storeResult.error}`);
  }

  return output;
}

function buildCogneePayload(output: Agent2Output) {
  return {
    memory_type: 'agent_output',
    product: 'RingSight',
    agent: 'agent_2_case_ranker',
    run_id: output.run_id,
    created_at: output.completed_at,
    input_summary: output.input_summary,
    summary: output.summary,
    cases: output.cases,
  };
}
