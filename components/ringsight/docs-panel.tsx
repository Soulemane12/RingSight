'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

export function DocsPanel() {
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-zinc-400">
        Loading dataset…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-200 bg-white">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>
        <span className="text-xs text-zinc-400">
          {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} rows
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-500" />
          </button>
          <span className="text-xs text-zinc-500 min-w-[80px] text-center">
            {page + 1} / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-zinc-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-zinc-400 w-12">#</th>
              {headers.map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-zinc-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="px-3 py-1.5 text-zinc-300 font-mono">{page * PAGE_SIZE + i + 1}</td>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-1.5 text-zinc-700 font-mono whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
