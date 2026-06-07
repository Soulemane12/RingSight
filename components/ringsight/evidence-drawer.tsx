'use client';

import { X } from 'lucide-react';
import { TransactionTable } from './transaction-table';
import type { NormalizedRow } from '@/lib/detection/types';

interface EvidenceDrawerProps {
  title: string;
  transactions: NormalizedRow[];
  highlightIds: Set<string>;
  onClose: () => void;
}

export function EvidenceDrawer({ title, transactions, highlightIds, onClose }: EvidenceDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div>
            <h3 className="font-semibold text-zinc-900">{title}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{highlightIds.size} flagged transactions · showing up to 25 rows</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <TransactionTable transactions={transactions} highlightIds={highlightIds} />
        </div>
      </div>
    </div>
  );
}
