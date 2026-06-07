'use client';

import { useState } from 'react';
import { Flag, Loader, CheckCircle } from 'lucide-react';
import { formatMoneyFull, severityColor, actionLabel, urgencyBadge } from '@/lib/ui/format';
import { NetworkGraph } from './network-graph';
import { EvidenceList } from './evidence-list';
import { ActionPanel } from './action-panel';
import { CogneeTimeline } from './cognee-timeline';
import { DownloadReportButton } from './download-report-button';
import type { RankedFraudCase } from '@/lib/agents/agent2/types';
import type { CaseActionPlan } from '@/lib/agents/agent3/types';
import type { Agent1Finding } from '@/lib/agents/agent1/types';
import type { CaseInvestigationReport } from '@/lib/agents/agent4/types';
import type { Agent4Output } from '@/lib/agents/agent4/types';
import type { RelationshipSignal, AccountSignal, NormalizedRow } from '@/lib/detection/types';

interface CaseDetailProps {
  caseItem: RankedFraudCase;
  action: CaseActionPlan | undefined;
  findings: Agent1Finding[];
  report: CaseInvestigationReport | undefined;
  agent4: Agent4Output;
  agent1FindingCount: number;
  agent2CaseCount: number;
  agent3ActionCount: number;
  allAccounts: AccountSignal[];
  allRelationships: RelationshipSignal[];
  allTransactions: NormalizedRow[];
}

export function CaseDetail({
  caseItem,
  action,
  findings,
  report,
  agent4,
  agent1FindingCount,
  agent2CaseCount,
  agent3ActionCount,
  allAccounts,
  allRelationships,
  allTransactions,
}: CaseDetailProps) {
  const colors = severityColor(caseItem.severity);
  const [flagState, setFlagState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  async function handleFlag() {
    setFlagState('loading');
    try {
      const res = await fetch('/api/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseItem.case_id,
          title: caseItem.title,
          risk_score: caseItem.risk_score,
          severity: caseItem.severity,
          total_exposure: caseItem.total_exposure,
          accounts: caseItem.accounts,
          recommended_action: action?.recommended_action,
          urgency: action?.urgency,
        }),
      });
      setFlagState(res.ok ? 'sent' : 'error');
    } catch {
      setFlagState('error');
    }
  }

  return (
    <div className="flex flex-col gap-5 min-h-0">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-zinc-500">{caseItem.case_id}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                {caseItem.severity} Risk
              </span>
              {action && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyBadge(action.urgency)}`}>
                  {action.urgency} urgency
                </span>
              )}
              {flagState === 'sent' && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  <CheckCircle className="w-3 h-3" />
                  Flagged for human review
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mt-1">{caseItem.title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FlagButton state={flagState} onClick={handleFlag} />
            {report && (
              <DownloadReportButton caseId={caseItem.case_id} markdown={report.markdown} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <Stat label="Risk Score" value={`${caseItem.risk_score}/100`} highlight />
          <Stat label="Exposure" value={formatMoneyFull(caseItem.total_exposure)} />
          <Stat label="Accounts" value={String(caseItem.accounts.length)} />
        </div>

        {report && (
          <p className="text-sm text-zinc-600 mt-4 leading-relaxed">{report.executive_summary}</p>
        )}
      </div>

      {/* Network graph */}
      <Section title="Account Network">
        <NetworkGraph
          caseItem={caseItem}
          allAccounts={allAccounts}
          allRelationships={allRelationships}
        />
        <div className="flex gap-3 mt-2 text-xs text-zinc-400 flex-wrap">
          {caseItem.accounts.map(id => (
            <span key={id} className="font-mono">{id}</span>
          ))}
        </div>
      </Section>

      {/* Action panel */}
      {action && <ActionPanel action={action} />}

      {/* Evidence */}
      <Section title={`Pattern Evidence (${findings.length} findings)`}>
        <EvidenceList findings={findings} allTransactions={allTransactions} />
      </Section>

      {/* Key evidence from report */}
      {report && report.key_evidence.length > 0 && (
        <Section title="Investigation Notes">
          <div className="space-y-3">
            {report.key_evidence.map((ev, i) => (
              <div key={i} className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-zinc-800">{ev.heading}</p>
                <p className="text-xs text-zinc-600 mt-1">{ev.body}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Network narrative */}
      {report?.network_summary && (
        <Section title="Network Behavior">
          <p className="text-sm text-zinc-600">{report.network_summary}</p>
        </Section>
      )}

      {/* Cognee timeline */}
      <CogneeTimeline
        agent4={agent4}
        agent1FindingCount={agent1FindingCount}
        agent2CaseCount={agent2CaseCount}
        agent3ActionCount={agent3ActionCount}
      />

      {/* Limitations */}
      {report?.limitations && (
        <div className="border border-zinc-200 rounded-xl p-4 bg-amber-50">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Limitations</p>
          <p className="text-xs text-amber-800">{report.limitations}</p>
        </div>
      )}

      {/* Analyst sign-off */}
      {report?.analyst_signoff && (
        <div className="border border-zinc-200 rounded-xl p-4 bg-white">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Analyst Sign-Off</p>
          <pre className="text-xs text-zinc-600 font-sans whitespace-pre-line">{report.analyst_signoff}</pre>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-zinc-900' : 'text-zinc-800'}`}>{value}</p>
    </div>
  );
}

function FlagButton({ state, onClick }: { state: 'idle' | 'loading' | 'sent' | 'error'; onClick: () => void }) {
  if (state === 'sent') return null;

  return (
    <button
      onClick={onClick}
      disabled={state === 'loading'}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
        state === 'error'
          ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 disabled:opacity-60'
      }`}
    >
      {state === 'loading' ? (
        <Loader className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Flag className="w-3.5 h-3.5" />
      )}
      {state === 'error' ? 'Retry — send failed' : state === 'loading' ? 'Sending…' : 'Flag for Human Review'}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
        <h3 className="font-semibold text-sm text-zinc-900">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
