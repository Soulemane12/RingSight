'use client';

import { CaseCard } from './case-card';
import type { RankedFraudCase } from '@/lib/agents/agent2/types';
import type { CaseActionPlan } from '@/lib/agents/agent3/types';

interface CaseListProps {
  cases: RankedFraudCase[];
  actions: CaseActionPlan[];
  selectedCaseId: string | null;
  onSelect: (caseId: string) => void;
}

export function CaseList({ cases, actions, selectedCaseId, onSelect }: CaseListProps) {
  const actionMap = new Map(actions.map(a => [a.case_id, a]));

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide px-1">
        Ranked Cases
      </h2>
      {cases.map(c => (
        <CaseCard
          key={c.case_id}
          caseItem={c}
          action={actionMap.get(c.case_id)}
          isSelected={c.case_id === selectedCaseId}
          onClick={() => onSelect(c.case_id)}
        />
      ))}
    </div>
  );
}
