import OpenAI from 'openai';
import type { EngineOutput } from '@/lib/detection/types';
import type { Agent1Output } from '@/lib/agents/agent1/types';
import type { Agent2Output } from '@/lib/agents/agent2/types';
import type { Agent3Output, Agent3Input, RawLLMAgent3Output } from './types';
import { recallAgent2FromCognee } from './recall';
import { chooseAction } from './action-policy';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import { validateAndBuildActions } from './validate';
import { storeInCognee } from '@/lib/cognee/client';

const MODEL = 'gpt-4o';

const TOOL_SCHEMA: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'recommend_actions',
    description:
      'Return plain-English action plans for each ranked fraud case. One entry per case_id provided.',
    parameters: {
      type: 'object',
      required: ['overall_summary', 'actions'],
      properties: {
        overall_summary: {
          type: 'string',
          description:
            '2–3 sentence summary of the recommended actions across all cases.',
        },
        actions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['case_id', 'plain_english_action', 'analyst_instructions'],
            properties: {
              case_id: { type: 'string' },
              plain_english_action: {
                type: 'string',
                description:
                  'One sentence describing the recommended action in plain English for a bank analyst.',
              },
              analyst_instructions: {
                type: 'array',
                items: { type: 'string' },
                description: '2–5 step-by-step instructions for the analyst.',
              },
            },
          },
        },
      },
    },
  },
};

export async function runActionRecommenderAgent(params: {
  engineOutput: EngineOutput;
  agent1Output: Agent1Output;
  agent2Output: Agent2Output;
  requireCognee?: boolean;
}): Promise<Agent3Output> {
  const {
    engineOutput: engine,
    agent1Output: agent1,
    agent2Output: agent2,
    requireCognee = false,
  } = params;
  const started_at = new Date().toISOString();
  const cogDataset = `agent-3-action-plans-${engine.run_id}`;

  // ── Step 2: Recall Agent 2 from Cognee ──────────────────────────────────
  const cogneeRecall = await recallAgent2FromCognee(engine.run_id);

  if (requireCognee && !cogneeRecall.recalled) {
    return {
      agent: 'agent_3_action_recommender',
      run_id: engine.run_id,
      status: 'failed',
      started_at,
      completed_at: new Date().toISOString(),
      input_summary: {
        case_count: agent2.cases.length,
        critical_case_count: agent2.cases.filter(c => c.severity === 'Critical').length,
        cognee_recalled_agent_2: false,
      },
      summary: 'Agent 3 could not verify Cognee recall of Agent 2. Run aborted (requireCognee=true).',
      actions: [],
      cognee: {
        dataset_name: cogDataset,
        recalled_agent_2: false,
        stored_agent_3: false,
        stored_at: null,
        error: cogneeRecall.error ?? 'Cognee recall returned no results',
      },
    };
  }

  // ── Step 3: Build deterministic action decisions from Agent 2 cases ──────
  const actionDecisions = agent2.cases.map(c => ({
    case_id: c.case_id,
    ...chooseAction(c),
  }));

  // ── Fast path: no cases ───────────────────────────────────────────────────
  if (agent2.cases.length === 0) {
    const emptyOutput: Agent3Output = {
      agent: 'agent_3_action_recommender',
      run_id: engine.run_id,
      status: 'completed',
      started_at,
      completed_at: new Date().toISOString(),
      input_summary: {
        case_count: 0,
        critical_case_count: 0,
        cognee_recalled_agent_2: cogneeRecall.recalled,
      },
      summary: 'No action plans were created because Agent 2 produced no ranked cases.',
      actions: [],
      cognee: {
        dataset_name: cogDataset,
        recalled_agent_2: cogneeRecall.recalled,
        stored_agent_3: false,
        stored_at: null,
        error: null,
      },
    };
    const stored = await storeInCognee(cogDataset, buildCogneePayload(emptyOutput));
    emptyOutput.cognee.stored_agent_3 = stored.success;
    emptyOutput.cognee.stored_at = stored.success ? new Date().toISOString() : null;
    emptyOutput.cognee.error = stored.error ?? null;
    return emptyOutput;
  }

  // ── Step 4: Build Agent3Input ─────────────────────────────────────────────
  const agent3Input: Agent3Input = {
    run_id: engine.run_id,
    engine: {
      metrics: engine.metrics,
      relationships: engine.relationships,
      network_components: engine.network_components,
      transactions: engine.transactions,
    },
    agent1,
    agent2,
    cognee_recall: {
      recalled_agent_2: cogneeRecall.recalled,
      dataset_name: cogneeRecall.dataset_name,
      query: cogneeRecall.query,
      result_count: cogneeRecall.result_count,
      raw_results: cogneeRecall.raw_results,
    },
  };

  // ── Step 5: LLM call for plain-English wording ───────────────────────────
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: MODEL,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'function', function: { name: 'recommend_actions' } },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(agent3Input, actionDecisions) },
    ],
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== 'function') {
    throw new Error('Agent 3: LLM did not call recommend_actions tool');
  }

  let llmOutput: RawLLMAgent3Output;
  try {
    llmOutput = JSON.parse(toolCall.function.arguments) as RawLLMAgent3Output;
  } catch {
    throw new Error('Agent 3: Failed to parse recommend_actions arguments as JSON');
  }

  // ── Steps 6 & 7: Validate and override with deterministic values ─────────
  const { actions } = validateAndBuildActions(
    llmOutput,
    agent2,
    agent1.findings,
    engine,
    engine.run_id,
  );

  const criticalCount = actions.filter(
    a => a.recommended_action === 'TEMPORARILY_RESTRICT_AND_ESCALATE' || a.urgency === 'Immediate',
  ).length;

  const completed_at = new Date().toISOString();

  const output: Agent3Output = {
    agent: 'agent_3_action_recommender',
    run_id: engine.run_id,
    status: 'completed',
    started_at,
    completed_at,
    input_summary: {
      case_count: agent2.cases.length,
      critical_case_count: criticalCount,
      cognee_recalled_agent_2: cogneeRecall.recalled,
    },
    summary: llmOutput.overall_summary ?? '',
    actions,
    cognee: {
      dataset_name: cogDataset,
      recalled_agent_2: cogneeRecall.recalled,
      stored_agent_3: false,
      stored_at: null,
      error: null,
    },
  };

  // ── Step 9: Store Agent 3 output in Cognee ───────────────────────────────
  const stored = await storeInCognee(cogDataset, buildCogneePayload(output));
  output.cognee.stored_agent_3 = stored.success;
  output.cognee.stored_at = stored.success ? new Date().toISOString() : null;
  if (!stored.success) {
    output.cognee.error = stored.error ?? 'Unknown store error';
    console.warn(`[Agent3] Cognee store failed: ${stored.error}`);
  }

  return output;
}

function buildCogneePayload(output: Agent3Output) {
  return {
    memory_type: 'agent_output',
    product: 'RingSight',
    agent: 'agent_3_action_recommender',
    run_id: output.run_id,
    created_at: output.completed_at,
    input_summary: output.input_summary,
    summary: output.summary,
    actions: output.actions,
  };
}
