'use client';

import { XCircle } from 'lucide-react';

interface ErrorPanelProps {
  stage: string;
  message: string;
  onReset: () => void;
}

export function ErrorPanel({ stage, message, onReset }: ErrorPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8">
      <XCircle className="w-12 h-12 text-red-400" />
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Analysis failed</h2>
        <p className="text-sm text-zinc-500 mb-1 uppercase tracking-wide font-medium">Stage: {stage}</p>
        <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mt-2 font-mono break-all">{message}</p>
      </div>
      <button
        onClick={onReset}
        className="px-5 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
      >
        Start over
      </button>
    </div>
  );
}
