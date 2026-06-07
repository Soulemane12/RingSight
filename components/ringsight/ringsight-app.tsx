'use client';

import { useState, useCallback } from 'react';
import { UploadPanel } from './upload-panel';
import { AnalysisProgress } from './analysis-progress';
import { ResultsDashboard } from './results-dashboard';
import { ErrorPanel } from './error-panel';
import type { AnalysisEvent, FullAnalysisResult } from '@/lib/ui/types';

type ViewState = 'upload' | 'processing' | 'results' | 'error';

export function RingSightApp() {
  const [view, setView] = useState<ViewState>('upload');
  const [runId, setRunId] = useState<string | null>(null);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [result, setResult] = useState<FullAnalysisResult | null>(null);
  const [error, setError] = useState<{ stage: string; message: string } | null>(null);
  const [rowCount, setRowCount] = useState<number | undefined>();
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  const reset = useCallback(() => {
    setView('upload');
    setRunId(null);
    setEvents([]);
    setResult(null);
    setError(null);
    setRowCount(undefined);
  }, []);

  const handleAnalyze = useCallback(async (file: File) => {
    setEvents([]);
    setError(null);
    setView('processing');

    const formData = new FormData();
    formData.append('file', file);

    // Estimate row count from file size as a quick preview
    const estimatedRows = Math.round(file.size / 120);
    setRowCount(estimatedRows);

    let response: Response;
    try {
      response = await fetch('/api/analyze/stream', {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      setError({ stage: 'network', message: 'Could not reach server. Is Next.js running?' });
      setView('error');
      return;
    }

    if (!response.body) {
      setError({ stage: 'network', message: 'No response stream received' });
      setView('error');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let event: AnalysisEvent;
          try {
            event = JSON.parse(trimmed) as AnalysisEvent;
          } catch {
            continue;
          }

          setEvents(prev => [...prev, event]);

          if (event.type === 'run_started') {
            setRunId(event.run_id);
          } else if (event.type === 'engine_completed') {
            setRowCount(event.metrics.row_count);
          } else if (event.type === 'run_completed') {
            setResult(event.result);
            setView('results');
            return;
          } else if (event.type === 'run_failed') {
            setError({ stage: event.stage, message: event.message });
            setView('error');
            return;
          }
        }
      }
    } catch (err) {
      setError({ stage: 'stream', message: err instanceof Error ? err.message : String(err) });
      setView('error');
    }
  }, []);

  const handleLoadDemo = useCallback(async () => {
    setIsLoadingDemo(true);
    try {
      const res = await fetch('/demo/ringsight-benchmark-result.json');
      if (!res.ok) throw new Error(`Demo data not found (${res.status})`);
      const data = (await res.json()) as FullAnalysisResult;
      setResult(data);
      setView('results');
    } catch (err) {
      setError({
        stage: 'demo',
        message: err instanceof Error ? err.message : 'Failed to load demo data',
      });
      setView('error');
    } finally {
      setIsLoadingDemo(false);
    }
  }, []);

  if (view === 'upload') {
    return (
      <UploadPanel
        onAnalyze={handleAnalyze}
        onLoadDemo={handleLoadDemo}
        isLoadingDemo={isLoadingDemo}
      />
    );
  }

  if (view === 'processing') {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <div className="bg-white border-b border-zinc-200 px-6 py-3">
          <span className="font-bold text-zinc-900 text-lg">RingSight</span>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <AnalysisProgress runId={runId} events={events} rowCount={rowCount} />
        </div>
      </div>
    );
  }

  if (view === 'error' && error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <div className="bg-white border-b border-zinc-200 px-6 py-3">
          <span className="font-bold text-zinc-900 text-lg">RingSight</span>
        </div>
        <ErrorPanel stage={error.stage} message={error.message} onReset={reset} />
      </div>
    );
  }

  if (view === 'results' && result) {
    return <ResultsDashboard result={result} onReset={reset} />;
  }

  return null;
}
