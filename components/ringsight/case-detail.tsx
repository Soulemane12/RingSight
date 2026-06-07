'use client';

import { CheckCircle } from 'lucide-react';
import { formatMoneyFull, severityColor, urgencyBadge } from '@/lib/ui/format';
import { NetworkGraph } from './network-graph';
import { EvidenceList } from './evidence-list';
import { ActionPanel } from './action-panel';
import { CogneeTimeline } from './cognee-timeline';
import { DownloadReportButton } from './download-report-button';
import { Linkify } from './linkify';
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
  autoFlagged: boolean;
  onViewInDocs?: (query: string) => void;
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
  autoFlagged,
  onViewInDocs,
}: CaseDetailProps) {
  const colors = severityColor(caseItem.severity);

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
              {autoFlagged && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  <CheckCircle className="w-3 h-3" />
                  Auto-flagged for review
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mt-1">{caseItem.title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {report && (
              <DownloadReportButton caseId={caseItem.case_id} markdown={report.markdown} />
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Risk Score" value={`${caseItem.risk_score}/100`} highlight />
          <Stat label="Total Funds at Risk" value={formatMoneyFull(caseItem.total_exposure)} />
          <Stat label="Accounts" value={String(caseItem.accounts.length)} />
        </div>

        {report && (
          <p className="text-sm text-zinc-600 mt-4 leading-relaxed">
            <Linkify text={report.executive_summary} onViewInDocs={q => onViewInDocs?.(q)} />
          </p>
        )}
      </div>

      {/* Network graph */}
      <Section title="Account Network">
        <NetworkGraph
          key={caseItem.case_id}
          caseItem={caseItem}
          allAccounts={allAccounts}
          allRelationships={allRelationships}
        />
        <div className="flex gap-2 mt-2 flex-wrap">
          {caseItem.accounts.map(id => (
            <button
              key={id}
              onClick={() => onViewInDocs?.(id)}
              title="View in dataset"
              className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
            >
              {id}
            </button>
          ))}
        </div>
      </Section>

      {/* Action panel */}
      {action && <ActionPanel action={action} />}

      {/* Evidence */}
      <Section title={`Pattern Evidence (${findings.length} findings)`}>
        <EvidenceList findings={findings} allTransactions={allTransactions} onViewInDocs={onViewInDocs} />
      </Section>

      {/* Key evidence from report */}
      {report && report.key_evidence.length > 0 && (
        <Section title="Investigation Notes">
          <div className="space-y-3">
            {report.key_evidence.map((ev, i) => (
              <div key={i} className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-zinc-800">
                  <Linkify text={ev.heading} onViewInDocs={q => onViewInDocs?.(q)} />
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  <Linkify text={ev.body} onViewInDocs={q => onViewInDocs?.(q)} />
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Network narrative */}
      {report?.network_summary && (
        <Section title="Network Behavior">
          <p className="text-sm text-zinc-600">
            <Linkify text={report.network_summary} onViewInDocs={q => onViewInDocs?.(q)} />
          </p>
        </Section>
      )}

      {/* Cognee timeline */}
      <CogneeTimeline
        agent4={agent4}
        agent1FindingCount={agent1FindingCount}
        agent2CaseCount={agent2CaseCount}
        agent3ActionCount={agent3ActionCount}
      />

      {/* Geodo Research-Informed Design */}
      <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Research-Informed Design</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-500 font-mono">Geodo</span>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-xs text-zinc-500">Geodo domain research on fraud analyst workflows influenced this product:</p>
          <ul className="space-y-1.5 text-xs text-zinc-700">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
              <span><span className="font-semibold">Ranked case triage</span> — highest-risk cases surface first so analysts spend 3 minutes per case, not 30.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
              <span><span className="font-semibold">Evidence-backed alerts</span> — every flag includes transaction IDs, sender→receiver, amounts, and timestamps for an audit-ready evidence trail.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
              <span><span className="font-semibold">Downloadable case documentation</span> — Agent 4 generates a full investigation report per case for analyst review and sign-off.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Limitations */}
      {report?.limitations && (
        <div className="border border-zinc-200 rounded-xl p-4 bg-amber-50">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Limitations</p>
          <p className="text-xs text-amber-800"><Linkify text={report.limitations} onViewInDocs={q => onViewInDocs?.(q)} /></p>
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
    <div className={`rounded-lg border px-4 py-3 ${highlight ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-zinc-50'}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${highlight ? 'text-red-600' : 'text-zinc-500'}`}>{label}</p>
      <p className={`mt-1 font-mono text-2xl font-black leading-none sm:text-3xl ${highlight ? 'text-red-700' : 'text-zinc-900'}`}>{value}</p>
    </div>
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
