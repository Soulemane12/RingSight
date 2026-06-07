import OpenAI from 'openai';
import type { EngineOutput } from '@/lib/detection/types';
import type { Agent1Output, RawLLMOutput } from './types';
import { buildAgent1Input } from './candidates';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import { validateAndEnrich } from './validate';
import { storeInCognee } from '@/lib/cognee/client';

const MODEL = 'gpt-4o';

const TOOL_SCHEMA: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'report_fraud_patterns',
    description:
      'Report all identified fraud patterns as structured findings. Call this exactly once with all findings.',
    parameters: {
      type: 'object',
      required: ['summary', 'findings'],
      properties: {
        summary: {
          type: 'string',
          description: 'A 2–4 sentence overall summary of the fraud landscape for this run.',
        },
        findings: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'pattern_type',
              'title',
              'summary',
              'source_entity_type',
              'source_entity_id',
              'accounts',
              'relationship_ids',
              'transaction_ids',
              'exposure',
              'engine_risk_score',
              'engine_risk_label',
              'evidence',
            ],
            properties: {
              pattern_type: {
                type: 'string',
                enum: [
                  'CIRCULAR_FLOW',
                  'LAYERING_CHAIN',
                  'TIMING_CLUSTER',
                  'STRUCTURED_SMURFING',
                  'MULE_NETWORK',
                  'HIGH_VELOCITY_PASS_THROUGH',
                  'NEW_ACCOUNT_BURST',
                ],
              },
              title: { type: 'string' },
              summary: { type: 'string' },
              source_entity_type: {
                type: 'string',
                enum: ['ACCOUNT', 'RELATIONSHIP', 'COMPONENT'],
              },
              source_entity_id: { type: 'string' },
              accounts: { type: 'array', items: { type: 'string' } },
              relationship_ids: { type: 'array', items: { type: 'string' } },
              transaction_ids: { type: 'array', items: { type: 'string' } },
              exposure: { type: 'number' },
              engine_risk_score: { type: 'number' },
              engine_risk_label: {
                type: 'string',
                enum: ['Low', 'Medium', 'High', 'Critical'],
              },
              evidence: {
                type: 'array',
                items: {
                  type: 'object',
                  required: [
                    'signal_name',
                    'measured_value',
                    'threshold',
                    'explanation',
                    'supporting_transaction_ids',
                  ],
                  properties: {
                    signal_name: { type: 'string' },
                    measured_value: {},
                    threshold: {},
                    explanation: { type: 'string' },
                    supporting_transaction_ids: {
                      type: 'array',
                      items: { type: 'string' },
                    },
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

export async function runPatternFinder(engine: EngineOutput): Promise<Agent1Output> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const input = buildAgent1Input(engine);
  const userPrompt = buildUserPrompt(input);

  const response = await client.chat.completions.create({
    model: MODEL,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'function', function: { name: 'report_fraud_patterns' } },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== 'function') {
    throw new Error('Agent 1: LLM did not call report_fraud_patterns tool');
  }
  if (toolCall.function.name !== 'report_fraud_patterns') {
    throw new Error(`Agent 1: unexpected tool call '${toolCall.function.name}'`);
  }

  let rawOutput: RawLLMOutput;
  try {
    rawOutput = JSON.parse(toolCall.function.arguments) as RawLLMOutput;
  } catch {
    throw new Error('Agent 1: Failed to parse tool call arguments as JSON');
  }

  const { findings, droppedCount } = validateAndEnrich(rawOutput, engine);

  const datasetName = `ringsight-${engine.run_id}`;
  const cogneeResult = await storeInCognee(datasetName, {
    run_id: engine.run_id,
    agent: 'pattern-finder',
    findings,
    summary: rawOutput.summary,
  });

  if (!cogneeResult.success) {
    console.warn(`[Agent1] Cognee store failed for ${datasetName}: ${cogneeResult.error}`);
  }

  return {
    run_id: engine.run_id,
    agent: 'pattern-finder',
    findings,
    summary: rawOutput.summary,
    processed_at: new Date().toISOString(),
    llm_model: MODEL,
    cognee_stored: cogneeResult.success,
  };
}
