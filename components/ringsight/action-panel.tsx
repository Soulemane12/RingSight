'use client';

import { AlertTriangle, ShieldCheck, Search, Eye, Activity } from 'lucide-react';
import { actionLabel, urgencyBadge } from '@/lib/ui/format';
import type { CaseActionPlan } from '@/lib/agents/agent3/types';

interface ActionPanelProps {
  action: CaseActionPlan;
}

function ActionIcon({ action }: { action: string }) {
  if (action === 'TEMPORARILY_RESTRICT_AND_ESCALATE') return <AlertTriangle className="w-5 h-5 text-red-500" />;
  if (action === 'ESCALATE') return <ShieldCheck className="w-5 h-5 text-orange-500" />;
  if (action === 'INVESTIGATE') return <Search className="w-5 h-5 text-orange-400" />;
  if (action === 'REQUEST_ENHANCED_REVIEW') return <Eye className="w-5 h-5 text-yellow-500" />;
  return <Activity className="w-5 h-5 text-zinc-400" />;
}

export function ActionPanel({ action }: ActionPanelProps) {
  return (
    <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 bg-zinc-50">
        <ActionIcon action={action.recommended_action} />
        <div>
          <div className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Recommended Action</div>
          <div className="font-semibold text-sm text-zinc-900">{actionLabel(action.recommended_action)}</div>
        </div>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${urgencyBadge(action.urgency)}`}>
          {action.urgency}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-sm text-zinc-700">{action.plain_english_action}</p>

        {action.analyst_instructions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Analyst instructions</p>
            <ol className="space-y-1">
              {action.analyst_instructions.map((instr, i) => (
                <li key={i} className="flex gap-2 text-sm text-zinc-600">
                  <span className="shrink-0 font-medium text-zinc-400">{i + 1}.</span>
                  <span>{instr}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex gap-2 flex-wrap pt-1">
          <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
            Confidence {Math.round(action.confidence * 100)}%
          </span>
          <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-mono">
            Source: Agent 3
          </span>
        </div>
      </div>
    </div>
  );
}
