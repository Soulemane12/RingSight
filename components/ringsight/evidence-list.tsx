'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { EvidenceDrawer } from './evidence-drawer';
import { formatMoneyFull, formatDateTime } from '@/lib/ui/format';
import type { Agent1Finding, Agent1Evidence } from '@/lib/agents/agent1/types';
import type { NormalizedRow } from '@/lib/detection/types';

const INLINE_CITATION_LIMIT = 4;

interface EvidenceListProps {
  findings: Agent1Finding[];
  allTransactions: NormalizedRow[];
  onViewInDocs?: (query: string) => void;
}

export function EvidenceList({ findings, allTransactions, onViewInDocs }: EvidenceListProps) {
  const [expanded, setExpanded] = useState<string | null>(findings[0]?.finding_id ?? null);
  const [drawerInfo, setDrawerInfo] = useState<{ title: string; txnIds: string[] } | null>(null);

  const txnMap = new Map(allTransactions.map(t => [t.txn_id, t]));

  const drawerTxns = drawerInfo
    ? drawerInfo.txnIds.map(id => txnMap.get(id)).filter(Boolean) as NormalizedRow[]
    : [];
  const highlightIds = new Set(drawerInfo?.txnIds ?? []);

  if (findings.length === 0) {
    return <p className="text-sm text-zinc-400 py-4">No pattern findings for this case.</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {findings.map(finding => (
          <FindingCard
            key={finding.finding_id}
            finding={finding}
            isExpanded={expanded === finding.finding_id}
            txnMap={txnMap}
            onToggle={() =>
              setExpanded(expanded === finding.finding_id ? null : finding.finding_id)
            }
            onViewAllTransactions={(title, txnIds) => setDrawerInfo({ title, txnIds })}
            onViewInDocs={onViewInDocs}
          />
        ))}
      </div>

      {drawerInfo && (
        <EvidenceDrawer
          title={drawerInfo.title}
          transactions={drawerTxns}
          highlightIds={highlightIds}
          onClose={() => setDrawerInfo(null)}
        />
      )}
    </>
  );
}

// ── Finding card ─────────────────────────────────────────────────────────────

interface FindingCardProps {
  finding: Agent1Finding;
  isExpanded: boolean;
  txnMap: Map<string, NormalizedRow>;
  onToggle: () => void;
  onViewAllTransactions: (title: string, txnIds: string[]) => void;
  onViewInDocs?: (query: string) => void;
}

function FindingCard({
  finding,
  isExpanded,
  txnMap,
  onToggle,
  onViewAllTransactions,
  onViewInDocs,
}: FindingCardProps) {
  const scoreColor =
    finding.confidence >= 0.85 ? 'text-red-600' :
    finding.confidence >= 0.65 ? 'text-orange-600' :
    'text-yellow-600';

  const scoreBg =
    finding.confidence >= 0.85 ? 'bg-red-50 border-red-200' :
    finding.confidence >= 0.65 ? 'bg-orange-50 border-orange-200' :
    'bg-yellow-50 border-yellow-200';

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <button
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-zinc-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-zinc-900">{finding.title}</span>
            <span className={`text-[10px] font-mono border px-1.5 py-0.5 rounded ${scoreBg} ${scoreColor}`}>
              {finding.finding_id}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{finding.summary}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`text-xs font-bold ${scoreColor}`}>
              {Math.round(finding.confidence * 100)}% confidence
            </span>
            <span className="text-xs text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">
              {finding.evidence.length} signal{finding.evidence.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">
              {finding.transaction_ids.length} transaction{finding.transaction_ids.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-zinc-400">·</span>
            <span className="flex items-center gap-1 text-xs text-zinc-500 flex-wrap">
              {finding.accounts.map((a, i) => (
                <span key={a} className="flex items-center gap-1">
                  {i > 0 && <span className="text-zinc-300">→</span>}
                  <button onClick={e => { e.stopPropagation(); onViewInDocs?.(a); }} className="font-mono hover:text-blue-600 hover:underline transition-colors">{a}</button>
                </span>
              ))}
            </span>
          </div>
        </div>
        <div className="shrink-0 mt-0.5">
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-zinc-400" />
            : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </div>
      </button>

      {/* Expanded: signals with inline citations */}
      {isExpanded && (
        <div className="border-t border-zinc-100 divide-y divide-zinc-100">
          {finding.evidence.map((ev, i) => (
            <EvidenceSignal
              key={i}
              evidence={ev}
              txnMap={txnMap}
              onViewAll={() =>
                onViewAllTransactions(`${finding.title} — ${ev.signal_name}`, ev.supporting_transaction_ids)
              }
              onViewInDocs={onViewInDocs}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Signal block with inline citations ───────────────────────────────────────

interface EvidenceSignalProps {
  evidence: Agent1Evidence;
  txnMap: Map<string, NormalizedRow>;
  onViewAll: () => void;
  onViewInDocs?: (query: string) => void;
}

function EvidenceSignal({ evidence, txnMap, onViewAll, onViewInDocs }: EvidenceSignalProps) {
  const citations = evidence.supporting_transaction_ids
    .slice(0, INLINE_CITATION_LIMIT)
    .map(id => txnMap.get(id))
    .filter((t): t is NormalizedRow => t !== undefined);

  const remaining = evidence.supporting_transaction_ids.length - INLINE_CITATION_LIMIT;

  return (
    <div className="p-4 bg-white">
      {/* Signal header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
            {evidence.signal_name}
          </p>
          <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{evidence.explanation}</p>

          {/* Measured vs threshold */}
          <div className="flex items-center gap-4 mt-2 p-2 bg-zinc-50 rounded-lg border border-zinc-100 text-xs">
            <div>
              <span className="text-zinc-400">Measured </span>
              <span className="font-bold text-zinc-900">{String(evidence.measured_value)}</span>
            </div>
            <div className="w-px h-4 bg-zinc-200" />
            <div>
              <span className="text-zinc-400">Threshold </span>
              <span className="font-semibold text-zinc-600">{String(evidence.threshold)}</span>
            </div>
            <div className="w-px h-4 bg-zinc-200" />
            <div className="text-zinc-400">
              {evidence.supporting_transaction_ids.length} transaction{evidence.supporting_transaction_ids.length !== 1 ? 's' : ''} flagged
            </div>
          </div>
        </div>
      </div>

      {/* Inline transaction citations */}
      {citations.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
            Source transactions
          </p>
          <div className="rounded-lg border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
            {citations.map(t => (
              <TransactionCitation key={t.txn_id} txn={t} onViewInDocs={onViewInDocs} />
            ))}
          </div>
          {remaining > 0 && (
            <button
              onClick={onViewAll}
              className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              View all {evidence.supporting_transaction_ids.length} transactions
            </button>
          )}
        </div>
      )}

      {citations.length === 0 && evidence.supporting_transaction_ids.length > 0 && (
        <button
          onClick={onViewAll}
          className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          View {evidence.supporting_transaction_ids.length} transactions
        </button>
      )}
    </div>
  );
}

// ── Single transaction citation row ─────────────────────────────────────────

function TransactionCitation({ txn, onViewInDocs }: { txn: NormalizedRow; onViewInDocs?: (q: string) => void }) {
  const tags: string[] = [];
  if (txn.is_night) tags.push('nighttime');
  if (txn.amount_band_400_900) tags.push('structured amt');
  if (txn.is_internal_transfer) tags.push('internal');

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white hover:bg-zinc-50 text-xs">
      {/* TX ID */}
      <button
        onClick={() => onViewInDocs?.(txn.txn_id)}
        className="font-mono text-blue-600 hover:underline shrink-0 w-20 truncate text-left"
        title="View in dataset"
      >
        {txn.txn_id}
      </button>

      {/* Flow */}
      <span className="text-zinc-700 shrink-0 font-mono text-[10px] flex items-center gap-1">
        <button onClick={() => onViewInDocs?.(txn.account_id)} className="hover:text-blue-600 hover:underline">{txn.account_id}</button>
        <span>→</span>
        <button onClick={() => onViewInDocs?.(txn.counterparty_id)} className="hover:text-blue-600 hover:underline">{txn.counterparty_id}</button>
      </span>

      {/* Amount */}
      <span className="font-bold text-zinc-900 shrink-0">{formatMoneyFull(txn.amount)}</span>

      {/* Timestamp */}
      <span className="text-zinc-400 shrink-0">
        {formatDateTime(txn.timestamp_dt.toString())}
      </span>

      {/* Tags */}
      <div className="flex gap-1 flex-wrap">
        {tags.map(tag => (
          <span
            key={tag}
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
              tag === 'nighttime' ? 'bg-indigo-100 text-indigo-700' :
              tag === 'structured amt' ? 'bg-amber-100 text-amber-700' :
              'bg-zinc-100 text-zinc-500'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Category */}
      {txn.merchant_category && (
        <span className="text-zinc-400 text-[10px] ml-auto shrink-0">{txn.merchant_category}</span>
      )}
    </div>
  );
}
