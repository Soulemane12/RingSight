'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle, Network, Brain, ShieldAlert, FileBarChart2, ArrowRight, Zap } from 'lucide-react';

const REQUIRED_HEADERS = [
  'txn_id', 'account_id', 'counterparty_id', 'amount', 'timestamp',
  'merchant_category', 'device_id', 'ip_region', 'account_open_date',
];
const MAX_MB = 50;

interface UploadPanelProps {
  onAnalyze: (file: File) => void;
  onLoadDemo: () => void;
  isLoadingDemo: boolean;
}

function validateCsvHeaders(text: string): string | null {
  const firstLine = text.split('\n')[0]?.trim() ?? '';
  const headers = firstLine.toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));
  if (missing.length > 0) return `Missing columns: ${missing.join(', ')}`;
  return null;
}

export function UploadPanel({ onAnalyze, onLoadDemo, isLoadingDemo }: UploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    setError(null);
    if (!f.name.toLowerCase().endsWith('.csv')) { setError('File must be a CSV (.csv)'); return; }
    if (f.size === 0) { setError('File is empty'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`File exceeds ${MAX_MB} MB limit`); return; }
    const text = await f.slice(0, 4096).text();
    const headerError = validateCsvHeaders(text);
    if (headerError) { setError(headerError); return; }
    setFile(f);
  }

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) await handleFile(dropped);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Network className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">RingSight</span>
        </div>
        <span className="text-xs text-zinc-500 font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-800">v1.0 · AI-Powered</span>
      </nav>

      {/* Hero */}
      <div className="flex flex-col items-center text-center px-6 pt-20 pb-14">
        <div className="flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-emerald-950 border border-emerald-800">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">4-agent AI pipeline · Results in minutes</span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-2xl">
          Uncover fraud rings<br />
          <span className="text-emerald-400">before they disappear.</span>
        </h1>
        <p className="mt-5 text-zinc-400 text-lg max-w-xl leading-relaxed">
          RingSight detects coordinated fraud networks hidden beneath normal alert thresholds — structured smurfing, layering chains, and velocity patterns — in a single CSV upload.
        </p>
      </div>

      {/* Feature row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800 border-t border-b border-zinc-800 mx-0">
        {[
          { icon: Network, label: 'Pattern Finder', desc: 'Scans every relationship for smurfing, layering, and velocity anomalies.' },
          { icon: ShieldAlert, label: 'Case Ranker', desc: 'Scores and ranks fraud cases by risk — so you work highest-priority first.' },
          { icon: Brain, label: 'Action Recommender', desc: 'Recommends freeze, restrict, or escalate based on severity thresholds.' },
          { icon: FileBarChart2, label: 'Report Writer', desc: 'Generates a full investigation report per case, ready to download.' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-zinc-950 px-6 py-6 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Icon className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Geodo research strip */}
      <div className="bg-zinc-900 border-t border-b border-zinc-800 px-8 py-5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Research-Informed Design</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono border border-zinc-700">Geodo</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="text-emerald-500">•</span> Ranked case triage — highest-risk first</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-500">•</span> Evidence-backed alerts with transaction citations</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-500">•</span> Downloadable investigation reports per case</span>
          </div>
        </div>
      </div>

      {/* Upload card */}
      <div className="flex flex-col items-center px-6 py-16 flex-1">
        <div className="w-full max-w-lg">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h2 className="font-semibold text-white text-base mb-1">Upload Transaction CSV</h2>
            <p className="text-xs text-zinc-500 mb-5">Drop your export and let the agents go to work.</p>

            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={`flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-950/40'
                  : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDragging ? 'bg-emerald-900' : 'bg-zinc-800'}`}>
                <Upload className={`w-5 h-5 ${isDragging ? 'text-emerald-400' : 'text-zinc-400'}`} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-300">Drag and drop a CSV file</p>
                <p className="text-xs text-zinc-500 mt-1">or click to browse · up to {MAX_MB} MB</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={async e => {
                  const f = e.target.files?.[0];
                  if (f) await handleFile(f);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 mt-3 p-3 bg-red-950/60 border border-red-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Selected file */}
            {file && (
              <div className="flex items-center gap-3 mt-3 p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => { setFile(null); setError(null); }} className="p-1 hover:bg-zinc-700 rounded-md transition-colors">
                  <X className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
            )}

            {/* Analyze */}
            <button
              disabled={!file}
              onClick={() => file && onAnalyze(file)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Analyze Transactions
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-600">or</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            <button
              onClick={onLoadDemo}
              disabled={isLoadingDemo}
              className="w-full py-2.5 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              {isLoadingDemo ? 'Loading…' : 'Load Completed Demo'}
            </button>
            <p className="text-xs text-zinc-600 text-center mt-2">
              Loads a previously completed run — clearly marked as demo data
            </p>
          </div>

          {/* Required headers */}
          <details className="mt-4">
            <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 select-none transition-colors">
              Required CSV columns
            </summary>
            <p className="text-xs text-zinc-600 mt-2 font-mono leading-relaxed">
              {REQUIRED_HEADERS.join(', ')}
            </p>
          </details>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-8 py-4 flex items-center justify-between">
        <span className="text-xs text-zinc-600">RingSight · Fraud Intelligence Platform</span>
        <span className="text-xs text-zinc-700">Powered by 4 AI agents + Cognee memory</span>
      </div>
    </div>
  );
}
