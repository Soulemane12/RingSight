'use client';

import { AlertTriangle, ShieldCheck, Search, Eye, Activity } from 'lucide-react';
import { actionLabel, urgencyBadge } from '@/lib/ui/format';
import type { CaseActionPlan } from '@/lib/agents/agent3/types';

interface ActionPanelProps {
  action: CaseActionPlan;
}

function ActionIcon({ action }: { action: string }) {
  if (action === 'TEMPORARILY_RESTRICT_AND_ESCALATE') return <AlertTriangle className="h-8 w-8 text-red-100" />;
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
        ? 'border-red-900 bg-red-950 shadow-red-200'
        : 'border-orange-200 bg-orange-50 shadow-orange-100'
    }`}>
      <div className={`flex items-center gap-4 border-b px-5 py-5 ${
        isImmediate
          ? 'border-red-800 bg-red-900'
          : 'border-orange-200 bg-white'
      }`}>
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
          isImmediate ? 'bg-red-950 ring-1 ring-red-700' : 'bg-orange-100'
        }`}>
          <ActionIcon action={action.recommended_action} />
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-black uppercase tracking-wide ${isImmediate ? 'text-red-100' : 'text-orange-600'}`}>
            Recommended Action
          </div>
          <div className={`mt-0.5 text-2xl font-black leading-tight ${isImmediate ? 'text-white' : 'text-zinc-950'}`}>
            {actionLabel(action.recommended_action)}
          </div>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-3 py-1 text-sm font-black ${
          isImmediate ? 'bg-red-100 text-red-900 ring-1 ring-red-300' : urgencyBadge(action.urgency)
        }`}>
          {action.urgency}
        </span>
      </div>

      <div className="space-y-5 p-5">
        <p className={`text-base font-medium leading-7 ${isImmediate ? 'text-red-50' : 'text-zinc-800'}`}>{action.plain_english_action}</p>

        {action.analyst_instructions.length > 0 && (
          <div>
            <p className={`mb-3 text-sm font-black uppercase tracking-wide ${isImmediate ? 'text-red-100' : 'text-zinc-600'}`}>Analyst instructions</p>
            <ol className="space-y-2">
              {action.analyst_instructions.map((instr, i) => (
                <li key={i} className={`flex gap-3 rounded-lg px-3 py-2 text-sm font-medium shadow-sm ${
                  isImmediate ? 'bg-red-900/80 text-red-50 ring-1 ring-red-800' : 'bg-white text-zinc-700'
                }`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-black ${
                    isImmediate ? 'bg-red-100 text-red-900' : 'bg-orange-100 text-orange-700'
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
          <span className={`rounded-full px-3 py-1 text-sm font-black shadow-sm ${
            isImmediate ? 'bg-red-100 text-red-900' : 'bg-white text-zinc-700'
          }`}>
            Confidence {Math.round(action.confidence * 100)}%
          </span>
          <span className={`rounded-full px-3 py-1 font-mono text-sm font-bold shadow-sm ${
            isImmediate ? 'bg-red-900 text-red-100 ring-1 ring-red-800' : 'bg-white text-zinc-500'
          }`}>
            Source: Agent 3
          </span>
        </div>
      </div>
    </div>
  );
}
