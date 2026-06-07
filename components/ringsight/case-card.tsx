'use client';

import { formatMoneyFull, severityColor, actionLabel } from '@/lib/ui/format';
import type { RankedFraudCase } from '@/lib/agents/agent2/types';
import type { CaseActionPlan } from '@/lib/agents/agent3/types';

interface CaseCardProps {
  caseItem: RankedFraudCase;
  action?: CaseActionPlan;
  isSelected: boolean;
  onClick: () => void;
}

export function CaseCard({ caseItem, action, isSelected, onClick }: CaseCardProps) {
  const colors = severityColor(caseItem.severity);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        isSelected
          ? 'border-zinc-900 bg-zinc-900 text-white shadow-lg'
          : `border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-sm ${colors.bg}`
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold ${isSelected ? 'text-zinc-400' : 'text-zinc-400'}`}>
              #{caseItem.rank}
            </span>
            <span className={`text-xs font-mono font-semibold ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
              {caseItem.case_id}
            </span>
          </div>
          <p className={`font-semibold text-sm mt-0.5 ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
            {caseItem.title}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${
          isSelected
            ? 'bg-zinc-700 text-zinc-200 border-zinc-600'
            : `${colors.bg} ${colors.text} ${colors.border}`
        }`}>
          {caseItem.severity}
        </span>
      </div>

      <div className={`flex items-center gap-3 mt-3 flex-wrap text-xs ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
        <span className="font-semibold">{caseItem.risk_score}/100</span>
        <span>{formatMoneyFull(caseItem.total_exposure)} funds at risk</span>
        <span>{caseItem.accounts.length} accounts</span>
      </div>

      {action && (
        <div className={`mt-2 text-xs font-medium ${
          isSelected ? 'text-zinc-300' : colors.text
        }`}>
          {actionLabel(action.recommended_action)} · {action.urgency}
        </div>
      )}
    </button>
  );
}
