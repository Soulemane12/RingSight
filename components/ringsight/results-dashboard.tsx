'use client';

import { useState } from 'react';
import { MetricCard } from './metric-card';
import { CaseList } from './case-list';
import { CaseDetail } from './case-detail';
import { formatMoneyFull } from '@/lib/ui/format';
import type { FullAnalysisResult } from '@/lib/ui/types';

interface ResultsDashboardProps {
  result: FullAnalysisResult;
  onReset: () => void;
}

export function ResultsDashboard({ result, onReset }: ResultsDashboardProps) {
  const { engine, agent1, agent2, agent3, agent4 } = result;

  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    agent2.cases[0]?.case_id ?? '',
  );

  const totalExposure = agent2.cases.reduce((s, c) => s + c.total_exposure, 0);
  const connectedAccounts = new Set(agent2.cases.flatMap(c => c.accounts)).size;

  const selectedCase = agent2.cases.find(c => c.case_id === selectedCaseId);
  const selectedAction = agent3.actions.find(a => a.case_id === selectedCaseId);
  const selectedReport = agent4.reports.find(r => r.case_id === selectedCaseId);

  // Findings for this case: match by accounts/relationships
  const caseRelIds = new Set(selectedCase?.relationship_ids ?? []);
  const caseTxnIds = new Set(selectedCase?.transaction_ids ?? []);
  const caseFindingsForCase = selectedCase
    ? agent1.findings.filter(
        f =>
          f.accounts.some(a => selectedCase.accounts.includes(a)) ||
          f.relationship_ids.some(r => caseRelIds.has(r)),
      )
    : [];

  // All transactions for this case
  const caseTxns = engine.transactions.filter(t => caseTxnIds.has(t.txn_id));

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top bar */}
      <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between">
        <div>
          <span className="font-bold text-zinc-900 text-lg">RingSight</span>
          <span className="ml-2 text-xs text-zinc-400 font-mono">{engine.run_id}</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-zinc-500 hover:text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          New analysis
        </button>
      </div>

      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {/* Top metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Suspicious Exposure"
            value={formatMoneyFull(totalExposure)}
            sub="across all ranked cases"
          />
          <MetricCard
            label="Fraud Cases"
            value={String(agent2.cases.length)}
            sub={`from ${agent1.findings.length} patterns found`}
          />
          <MetricCard
            label="Connected Accounts"
            value={String(connectedAccounts)}
            sub="in flagged networks"
          />
          <MetricCard
            label="Transfers Reviewed"
            value={engine.metrics.internal_transfer_count.toLocaleString()}
            sub={`${engine.metrics.account_count} accounts total`}
          />
        </div>

        {/* Main layout */}
        <div className="flex gap-5 min-h-0">
          {/* Left: case list */}
          <div className="w-80 shrink-0">
            <CaseList
              cases={agent2.cases}
              actions={agent3.actions}
              selectedCaseId={selectedCaseId}
              onSelect={setSelectedCaseId}
            />
          </div>

          {/* Right: case detail */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {selectedCase ? (
              <CaseDetail
                caseItem={selectedCase}
                action={selectedAction}
                findings={caseFindingsForCase}
                report={selectedReport}
                agent4={agent4}
                agent1FindingCount={agent1.findings.length}
                agent2CaseCount={agent2.cases.length}
                agent3ActionCount={agent3.actions.length}
                allAccounts={engine.accounts}
                allRelationships={engine.relationships}
                allTransactions={caseTxns}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
                Select a case to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
