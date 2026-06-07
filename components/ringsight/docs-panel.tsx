'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

interface DocsPanelProps {
  initialSearch?: string;
  metrics?: { row_count: number; account_count: number; internal_transfer_count: number; date_range: { start: string; end: string } };
  caseCount?: number;
  findingCount?: number;
  totalExposure?: number;
}

export function DocsPanel({ initialSearch = '', metrics, caseCount, findingCount, totalExposure }: DocsPanelProps) {
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setSearch(initialSearch);
    setPage(0);
  }, [initialSearch]);

  useEffect(() => {
    fetch('/demo/dataset.csv')
      .then(r => r.text())
      .then(text => {
        const lines = text.trim().split('\n');
        setHeaders(lines[0].split(','));
        setRows(lines.slice(1).map(l => l.split(',')));
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(row => row.some(cell => cell.toLowerCase().includes(q)));
  }, [rows, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(0);
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 overflow-y-auto p-5 space-y-6">
        <div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Dataset</p>
          <dl className="space-y-2.5">
            <Stat label="Total rows" value={metrics ? metrics.row_count.toLocaleString() : '5,000'} />
            <Stat label="Accounts" value={metrics ? metrics.account_count.toLocaleString() : '294'} />
            <Stat label="Transfers" value={metrics ? metrics.internal_transfer_count.toLocaleString() : '250'} />
            <Stat label="Date range" value={metrics ? `${metrics.date_range.start} → ${metrics.date_range.end}` : 'Jan – Jun 2026'} />
          </dl>
        </div>
        {(caseCount !== undefined || findingCount !== undefined) && (
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Analysis</p>
            <dl className="space-y-2.5">
              {caseCount !== undefined && <Stat label="Fraud cases" value={String(caseCount)} />}
              {findingCount !== undefined && <Stat label="Patterns found" value={String(findingCount)} />}
              {totalExposure !== undefined && <Stat label="Total exposure" value={fmt(totalExposure)} />}
            </dl>
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Columns</p>
          <ul className="space-y-1">
            {headers.map(h => (
              <li key={h} className="text-xs font-mono text-zinc-500 cursor-pointer hover:text-zinc-900 transition-colors" onClick={() => handleSearch(h)}>
                {h}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Table area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-200 bg-white shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by account, amount, region…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
          {search && (
            <button onClick={() => handleSearch('')} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
              Clear
            </button>
          )}
          <span className="text-xs text-zinc-400 ml-auto">
            {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} rows
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4 text-zinc-500" />
            </button>
            <span className="text-xs text-zinc-500 min-w-[72px] text-center">
              {page + 1} / {totalPages || 1}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center flex-1 text-sm text-zinc-400">Loading dataset…</div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-400 w-10">#</th>
                  {headers.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-zinc-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-100 hover:bg-blue-50/40">
                    <td className="px-3 py-1.5 text-zinc-300 font-mono">{page * PAGE_SIZE + i + 1}</td>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={`px-3 py-1.5 font-mono whitespace-nowrap ${
                          search && cell.toLowerCase().includes(search.toLowerCase())
                            ? 'bg-yellow-100 text-yellow-900 font-semibold'
                            : 'text-zinc-700'
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-zinc-400">{label}</dt>
      <dd className="text-xs font-semibold text-zinc-800 mt-0.5">{value}</dd>
    </div>
  );
}
