'use client';

import { CheckCircle, Loader, XCircle, Clock } from 'lucide-react';

type AgentStatus = 'waiting' | 'running' | 'completed' | 'failed';

interface AgentStepCardProps {
  label: string;
  subtitle: string;
  status: AgentStatus;
  summary?: string;
  cogneeRead?: boolean;
  cogneeWrite?: boolean;
  cogneeReadLabel?: string;
  ticker?: React.ReactNode;
  extraContent?: React.ReactNode;
}

export function AgentStepCard({
  label,
  subtitle,
  status,
  summary,
  cogneeRead,
  cogneeWrite,
  cogneeReadLabel,
  ticker,
  extraContent,
}: AgentStepCardProps) {
  return (
    <div className={`rounded-xl border transition-all ${
      status === 'completed' ? 'bg-white border-green-200' :
      status === 'running'   ? 'bg-zinc-900 border-zinc-700' :
      status === 'failed'    ? 'bg-red-50 border-red-200' :
      'bg-zinc-50 border-zinc-200 opacity-40'
    }`}>
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 shrink-0">
          {status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {status === 'running'   && <Loader className="w-5 h-5 text-emerald-400 animate-spin" />}
          {status === 'failed'    && <XCircle  className="w-5 h-5 text-red-500" />}
          {status === 'waiting'   && <Clock    className="w-5 h-5 text-zinc-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm ${status === 'running' ? 'text-white' : 'text-zinc-900'}`}>
            {label}
          </div>
          <div className={`text-xs mt-0.5 ${status === 'running' ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {subtitle}
          </div>
        </div>
      </div>

      {/* Running: show terminal ticker */}
      {status === 'running' && ticker && (
        <div className="px-4 pb-4">
          {ticker}
        </div>
      )}

      {/* Completed: summary + badges + extra */}
      {status === 'completed' && summary && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs font-medium text-zinc-700">{summary}</p>
          <div className="flex gap-2 flex-wrap">
            {cogneeRead !== undefined && (
              <CogneeBadge label={cogneeReadLabel ?? 'Read from Cognee'} active={cogneeRead} />
            )}
            {cogneeWrite !== undefined && (
              <CogneeBadge label="Wrote to Cognee" active={cogneeWrite} />
            )}
          </div>
          {extraContent && (
            <div className="pt-2 border-t border-zinc-100">
              {extraContent}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CogneeBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
      active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-400'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-zinc-300'}`} />
      {label}
    </span>
  );
}
