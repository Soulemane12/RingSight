'use client';

import { useState } from 'react';
import { formatDateTime, formatMoneyFull } from '@/lib/ui/format';
import type { NormalizedRow } from '@/lib/detection/types';

type FilterKey = 'all' | 'night' | 'structured' | 'internal';

interface TransactionTableProps {
  transactions: NormalizedRow[];
  highlightIds?: Set<string>;
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'night', label: 'Nighttime' },
  { key: 'structured', label: 'Structured amount' },
  { key: 'internal', label: 'Internal transfer' },
];

export function TransactionTable({ transactions, highlightIds }: TransactionTableProps) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const PAGE_SIZE = 25;

  const filtered = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'night') return t.is_night;
    if (filter === 'structured') return t.amount_band_400_900;
    if (filter === 'internal') return t.is_internal_transfer;
    return true;
  }).slice(0, PAGE_SIZE);

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1 rounded-full font-medium border transition-colors ${
              filter === f.key
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-xs">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              {['Transaction ID', 'Sender', 'Receiver', 'Amount', 'Timestamp', 'Category'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-zinc-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-400">No transactions match this filter</td>
              </tr>
            ) : filtered.map(t => (
              <tr
                key={t.txn_id}
                className={`hover:bg-zinc-50 ${highlightIds?.has(t.txn_id) ? 'bg-yellow-50' : ''}`}
              >
                <td className="px-3 py-2 font-mono text-zinc-700">{t.txn_id}</td>
                <td className="px-3 py-2 font-mono text-zinc-600">{t.account_id}</td>
                <td className="px-3 py-2 font-mono text-zinc-600">{t.counterparty_id}</td>
                <td className="px-3 py-2 font-medium text-zinc-800">{formatMoneyFull(t.amount)}</td>
                <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{formatDateTime(t.timestamp_dt.toString())}</td>
                <td className="px-3 py-2 text-zinc-500">{t.merchant_category || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === PAGE_SIZE && (
          <div className="px-3 py-2 text-xs text-zinc-400 bg-zinc-50 border-t border-zinc-100">
            Showing first {PAGE_SIZE} rows
          </div>
        )}
      </div>
    </div>
  );
}
