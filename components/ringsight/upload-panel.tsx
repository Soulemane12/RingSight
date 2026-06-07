'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';

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
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('File must be a CSV (.csv)');
      return;
    }
    if (f.size === 0) {
      setError('File is empty');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_MB} MB limit`);
      return;
    }
    const text = await f.slice(0, 4096).text();
    const headerError = validateCsvHeaders(text);
    if (headerError) {
      setError(headerError);
      return;
    }
    setFile(f);
  }

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) await handleFile(dropped);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">RingSight</h1>
        <p className="mt-3 text-zinc-500 max-w-md text-base">
          Find coordinated fraud networks hidden beneath normal alert thresholds.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm w-full max-w-lg p-6">
        <h2 className="font-semibold text-zinc-900 text-base mb-4">Upload Transaction CSV</h2>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`
            flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors
            ${isDragging ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'}
          `}
        >
          <Upload className="w-8 h-8 text-zinc-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700">Drag and drop a CSV file</p>
            <p className="text-xs text-zinc-400 mt-1">or click to browse · up to {MAX_MB} MB</p>
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
          <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Selected file */}
        {file && (
          <div className="flex items-center gap-3 mt-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
            <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 truncate">{file.name}</p>
              <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button onClick={() => { setFile(null); setError(null); }} className="p-1 hover:bg-zinc-200 rounded-md transition-colors">
              <X className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        )}

        {/* Analyze button */}
        <button
          disabled={!file}
          onClick={() => file && onAnalyze(file)}
          className="mt-4 w-full py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Analyze Transactions
        </button>

        {/* Demo separator */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-zinc-200" />
          <span className="text-xs text-zinc-400">or</span>
          <div className="flex-1 h-px bg-zinc-200" />
        </div>

        {/* Demo button */}
        <button
          onClick={onLoadDemo}
          disabled={isLoadingDemo}
          className="w-full py-2.5 border border-zinc-200 text-zinc-700 text-sm font-medium rounded-xl hover:bg-zinc-50 disabled:opacity-40 transition-colors"
        >
          {isLoadingDemo ? 'Loading…' : 'Load Completed Demo'}
        </button>
        <p className="text-xs text-zinc-400 text-center mt-2">
          Loads a previously completed run — clearly marked as demo data
        </p>
      </div>

      {/* Required headers hint */}
      <details className="mt-6 max-w-lg w-full">
        <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 select-none">
          Required CSV columns
        </summary>
        <p className="text-xs text-zinc-400 mt-2 font-mono leading-relaxed">
          {REQUIRED_HEADERS.join(', ')}
        </p>
      </details>
    </div>
  );
}
