'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Flag, X } from 'lucide-react';
import { MetricCard } from './metric-card';
import { CaseList } from './case-list';
import { CaseDetail } from './case-detail';
import { formatMoneyFull } from '@/lib/ui/format';
import type { FullAnalysisResult } from '@/lib/ui/types';

interface ResultsDashboardProps {
  result: FullAnalysisResult;
  onReset: () => void;
}

type ToastVariant = 'success' | 'error';

interface FlagToast {
  variant: ToastVariant;
  title: string;
  detail: string;
  caseIds: string[];
}

interface AutoFlagResult {
  caseId: string;
  sent: boolean;
}

const autoFlagRuns = new Map<string, Promise<AutoFlagResult>>();

export function ResultsDashboard({ result, onReset }: ResultsDashboardProps) {
  const { engine, agent1, agent2, agent3, agent4 } = result;

  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    agent2.cases[0]?.case_id ?? '',
  );
  const [toast, setToast] = useState<FlagToast | null>(null);
  const [autoFlaggedCaseIds, setAutoFlaggedCaseIds] = useState<Set<string>>(
    () => new Set(),
  );

  const totalExposure = agent2.cases.reduce((s, c) => s + c.total_exposure, 0);
  const connectedAccounts = new Set(agent2.cases.flatMap(c => c.accounts)).size;

  const selectedCase = agent2.cases.find(c => c.case_id === selectedCaseId);
  const selectedAction = agent3.actions.find(a => a.case_id === selectedCaseId);
  const selectedReport = agent4.reports.find(r => r.case_id === selectedCaseId);

  // Auto-flag only the Critical/Immediate case the analyst is currently viewing.
  useEffect(() => {
    if (!selectedCase) return;
    if (selectedCase.severity !== 'Critical' && selectedAction?.urgency !== 'Immediate') {
      return;
    }

    let isActive = true;
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    const flagKey = `${engine.run_id}:${selectedCase.case_id}`;
    let flagRun = autoFlagRuns.get(flagKey);

    if (!flagRun) {
      flagRun = (async (): Promise<AutoFlagResult> => {
        try {
          const res = await fetch('/api/flag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              case_id: selectedCase.case_id,
              title: selectedCase.title,
              risk_score: selectedCase.risk_score,
              severity: selectedCase.severity,
              total_exposure: selectedCase.total_exposure,
              accounts: selectedCase.accounts,
              recommended_action: selectedAction?.recommended_action,
              urgency: selectedAction?.urgency,
            }),
          });

          return { caseId: selectedCase.case_id, sent: res.ok };
        } catch {
          return { caseId: selectedCase.case_id, sent: false };
        }
      })();

      autoFlagRuns.set(flagKey, flagRun);
    }

    flagRun.then(({ caseId, sent }) => {
      if (!isActive) return;

      if (sent) {
        setAutoFlaggedCaseIds(prev => new Set([...prev, caseId]));
      }

      const variant: ToastVariant = sent ? 'success' : 'error';
      const title = sent
        ? `${caseId} auto-flagged for human review`
        : 'Auto-flag email failed';
      const detail =
        sent
          ? 'Review email sent for the selected Critical/Immediate case.'
          : 'This selected case still needs human review.';

      setToast({
        variant,
        title,
        detail,
        caseIds: [caseId],
      });
      toastTimer = setTimeout(() => {
        if (isActive) setToast(null);
      }, 8000);
    });

    return () => {
      isActive = false;
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, [engine.run_id, selectedAction, selectedCase]);

  const caseRelIds = new Set(selectedCase?.relationship_ids ?? []);
  const caseTxnIds = new Set(selectedCase?.transaction_ids ?? []);
  const caseFindingsForCase = selectedCase
    ? agent1.findings.filter(
        f =>
          f.accounts.some(a => selectedCase.accounts.includes(a)) ||
          f.relationship_ids.some(r => caseRelIds.has(r)),
      )
    : [];
  const caseTxns = engine.transactions.filter(t => caseTxnIds.has(t.txn_id));

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white shadow-xl">
          {toast.variant === 'success' ? (
            <Flag className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{toast.title}</p>
            <p className="mt-0.5 text-xs text-zinc-400">{toast.detail}</p>
            <p className="mt-1 truncate font-mono text-[10px] text-zinc-500">
              {toast.caseIds.join(', ')}
            </p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="shrink-0 rounded p-0.5 transition-colors hover:bg-zinc-700"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="border-b border-zinc-200 bg-white px-4 py-5 sm:px-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div />
          <div className="flex min-w-0 flex-col items-center text-center">
            <span className="text-3xl font-black tracking-normal text-zinc-950 sm:text-4xl">RingSight</span>
            <span className="mt-1 font-mono text-sm font-semibold text-zinc-500">{engine.run_id}</span>
            <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Research-informed by Geodo
          </span>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onReset}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              New analysis
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        {/* Top metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Funds at Risk" value={formatMoneyFull(totalExposure)} sub="flagged transfer volume" />
          <MetricCard label="Fraud Cases" value={String(agent2.cases.length)} sub={`from ${agent1.findings.length} patterns found`} />
          <MetricCard label="Connected Accounts" value={String(connectedAccounts)} sub="in flagged networks" />
          <MetricCard label="Transfers Reviewed" value={engine.metrics.internal_transfer_count.toLocaleString()} sub={`${engine.metrics.account_count} accounts total`} />
        </div>

        {/* Main layout */}
        <div className="flex gap-5 min-h-0">
          <div className="w-80 shrink-0">
            <CaseList cases={agent2.cases} actions={agent3.actions} selectedCaseId={selectedCaseId} onSelect={setSelectedCaseId} />
          </div>
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
                autoFlagged={autoFlaggedCaseIds.has(selectedCaseId)}
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
