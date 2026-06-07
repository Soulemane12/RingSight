'use client';

import type { Agent4Output } from '@/lib/agents/agent4/types';

interface CogneeTimelineProps {
  agent4: Agent4Output;
  agent1FindingCount: number;
  agent2CaseCount: number;
  agent3ActionCount: number;
}

interface TimelineStep {
  label: string;
  wrote: string;
  recalled: string | null;
  recalledOk: boolean;
  wroteOk: boolean;
  detail: string;
}

export function CogneeTimeline({
  agent4,
  agent1FindingCount,
  agent2CaseCount,
  agent3ActionCount,
}: CogneeTimelineProps) {
  const steps: TimelineStep[] = [
    {
      label: 'Agent 1 — Pattern Finder',
      recalled: null,
      recalledOk: true,
      wrote: `ringsight-${agent4.run_id}`,
      wroteOk: agent4.input_summary.recalled_agent_1,
      detail: `Found ${agent1FindingCount} suspicious pattern${agent1FindingCount !== 1 ? 's' : ''}`,
    },
    {
      label: 'Agent 2 — Case Ranker',
      recalled: `ringsight-${agent4.run_id}`,
      recalledOk: agent4.input_summary.recalled_agent_2,
      wrote: `agent-2-ranked-cases-${agent4.run_id.toLowerCase()}`,
      wroteOk: agent4.input_summary.recalled_agent_2,
      detail: `Ranked ${agent2CaseCount} fraud case${agent2CaseCount !== 1 ? 's' : ''}`,
    },
    {
      label: 'Agent 3 — Action Recommender',
      recalled: `agent-2-ranked-cases-${agent4.run_id.toLowerCase()}`,
      recalledOk: agent4.input_summary.recalled_agent_3,
      wrote: `agent-3-action-plans-${agent4.run_id}`,
      wroteOk: agent4.input_summary.recalled_agent_3,
      detail: `Created ${agent3ActionCount} action plan${agent3ActionCount !== 1 ? 's' : ''}`,
    },
    {
      label: 'Agent 4 — Report Writer',
      recalled: 'Agents 1, 2 & 3 datasets',
      recalledOk:
        agent4.cognee.recalled_agent_1 &&
        agent4.cognee.recalled_agent_2 &&
        agent4.cognee.recalled_agent_3,
      wrote: `agent-4-investigation-reports-${agent4.run_id}`,
      wroteOk: agent4.cognee.stored_agent_4,
      detail: `Generated ${agent4.reports.length} investigation report${agent4.reports.length !== 1 ? 's' : ''}`,
    },
  ];

  return (
    <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
      <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200">
        <h3 className="font-semibold text-sm text-zinc-900">Agent Collaboration</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Each agent reads from and writes to Cognee memory</p>
      </div>
      <div className="p-4 space-y-0">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            {/* Connector line */}
            <div className="flex flex-col items-center w-6 shrink-0">
              <div className={`w-3 h-3 rounded-full border-2 mt-1 shrink-0 ${
                step.wroteOk ? 'bg-green-500 border-green-500' : 'bg-zinc-300 border-zinc-300'
              }`} />
              {i < steps.length - 1 && (
                <div className="w-px flex-1 bg-zinc-200 my-1" />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 flex-1 min-w-0 ${i < steps.length - 1 ? 'mb-0' : ''}`}>
              <p className="text-sm font-semibold text-zinc-900">{step.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{step.detail}</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {step.recalled && (
                  <CogneePill
                    label={`Recalled: ${step.recalled}`}
                    active={step.recalledOk}
                    type="read"
                  />
                )}
                <CogneePill
                  label={`Wrote: ${step.wrote}`}
                  active={step.wroteOk}
                  type="write"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CogneePill({
  label,
  active,
  type,
}: {
  label: string;
  active: boolean;
  type: 'read' | 'write';
}) {
  const colors = active
    ? type === 'read'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-green-50 text-green-700 border-green-200'
    : 'bg-zinc-50 text-zinc-400 border-zinc-200';

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium truncate max-w-[260px] ${colors}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? (type === 'read' ? 'bg-blue-500' : 'bg-green-500') : 'bg-zinc-300'}`} />
      <span className="truncate">{label}</span>
    </span>
  );
}
