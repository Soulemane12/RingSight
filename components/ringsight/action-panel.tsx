'use client';

import { AlertTriangle, ShieldCheck, Search, Eye, Activity } from 'lucide-react';
import { actionLabel, urgencyBadge } from '@/lib/ui/format';
import type { CaseActionPlan } from '@/lib/agents/agent3/types';

interface ActionPanelProps {
  action: CaseActionPlan;
}

function ActionIcon({ action }: { action: string }) {
  if (action === 'TEMPORARILY_RESTRICT_AND_ESCALATE') return <AlertTriangle className="h-8 w-8 text-red-600" />;
  if (action === 'ESCALATE') return <ShieldCheck className="h-8 w-8 text-orange-600" />;
  if (action === 'INVESTIGATE') return <Search className="h-8 w-8 text-orange-500" />;
  if (action === 'REQUEST_ENHANCED_REVIEW') return <Eye className="h-8 w-8 text-yellow-600" />;
  return <Activity className="h-8 w-8 text-zinc-500" />;
}

export function ActionPanel({ action }: ActionPanelProps) {
  const isImmediate = action.urgency === 'Immediate';

  return (
    <div className={`overflow-hidden rounded-xl border-2 shadow-lg ${
      isImmediate
        ? 'border-red-300 bg-red-50 shadow-red-100'
        : 'border-orange-200 bg-orange-50 shadow-orange-100'
    }`}>
      <div className={`flex items-center gap-4 border-b px-5 py-5 ${
        isImmediate
          ? 'border-red-200 bg-white'
          : 'border-orange-200 bg-white'
      }`}>
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
          isImmediate ? 'bg-red-100' : 'bg-orange-100'
        }`}>
          <ActionIcon action={action.recommended_action} />
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-black uppercase tracking-wide ${isImmediate ? 'text-red-600' : 'text-orange-600'}`}>
            Recommended Action
          </div>
          <div className="mt-0.5 text-2xl font-black leading-tight text-zinc-950">
            {actionLabel(action.recommended_action)}
          </div>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-3 py-1 text-sm font-black ${urgencyBadge(action.urgency)}`}>
          {action.urgency}
        </span>
      </div>

      <div className="space-y-5 p-5">
        <p className="text-base font-medium leading-7 text-zinc-800">{action.plain_english_action}</p>

        {action.analyst_instructions.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-zinc-600">Analyst instructions</p>
            <ol className="space-y-2">
              {action.analyst_instructions.map((instr, i) => (
                <li key={i} className="flex gap-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-black ${
                    isImmediate ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="leading-6">{instr}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-zinc-700 shadow-sm">
            Confidence {Math.round(action.confidence * 100)}%
          </span>
          <span className="rounded-full bg-white px-3 py-1 font-mono text-sm font-bold text-zinc-500 shadow-sm">
            Source: Agent 3
          </span>
        </div>
      </div>
    </div>
  );
}
