'use client';

import { useEffect, useRef, useState } from 'react';

export interface TickerLine {
  text: string;
  type?: 'normal' | 'flag' | 'critical' | 'system' | 'dim';
}

const HEARTBEATS: TickerLine[] = [
  { text: 'Awaiting model response…', type: 'dim' },
  { text: 'Processing with gpt-4o…', type: 'dim' },
  { text: 'Structuring output…', type: 'dim' },
  { text: 'Validating results…', type: 'dim' },
  { text: 'Almost there…', type: 'dim' },
];

interface RunningTickerProps {
  lines: TickerLine[];
  revealMs?: number;
}

export function RunningTicker({ lines, revealMs = 750 }: RunningTickerProps) {
  const [revealed, setRevealed] = useState(0);
  const [heartbeatIdx, setHeartbeatIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reveal lines one-by-one
  useEffect(() => {
    setRevealed(0);
  }, [lines]);

  useEffect(() => {
    if (revealed >= lines.length) return;
    const t = setTimeout(() => setRevealed(r => r + 1), revealMs);
    return () => clearTimeout(t);
  }, [revealed, lines.length, revealMs]);

  // Once all lines shown, cycle heartbeat
  const allRevealed = revealed >= lines.length;
  useEffect(() => {
    if (!allRevealed) return;
    const t = setInterval(() => setHeartbeatIdx(i => (i + 1) % HEARTBEATS.length), 3200);
    return () => clearInterval(t);
  }, [allRevealed]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [revealed, heartbeatIdx]);

  const visible = lines.slice(0, revealed);

  return (
    <div
      ref={containerRef}
      className="font-mono text-[11px] leading-5 bg-zinc-950 rounded-lg px-3 py-2.5 overflow-y-auto"
      style={{ height: 156 }}
    >
      {visible.map((line, i) => {
        const isLast = i === visible.length - 1 && !allRevealed;
        return (
          <LogLine key={i} line={line} showCursor={isLast} />
        );
      })}
      {allRevealed && (
        <LogLine line={HEARTBEATS[heartbeatIdx]} showCursor />
      )}
    </div>
  );
}

function LogLine({ line, showCursor }: { line: TickerLine; showCursor: boolean }) {
  const color =
    line.type === 'critical' ? 'text-red-400' :
    line.type === 'flag'     ? 'text-amber-400' :
    line.type === 'system'   ? 'text-sky-400' :
    line.type === 'dim'      ? 'text-zinc-500' :
    'text-emerald-400';

  const prefix =
    line.type === 'critical' ? '✕' :
    line.type === 'flag'     ? '⚑' :
    line.type === 'system'   ? '◈' :
    line.type === 'dim'      ? '·' :
    '›';

  const prefixColor =
    line.type === 'critical' ? 'text-red-600' :
    line.type === 'flag'     ? 'text-amber-600' :
    line.type === 'system'   ? 'text-sky-600' :
    'text-zinc-600';

  return (
    <div className={`flex items-start gap-1.5 ${color}`}>
      <span className={`shrink-0 ${prefixColor}`}>{prefix}</span>
      <span className="break-all">{line.text}</span>
      {showCursor && (
        <span className="shrink-0 animate-pulse text-emerald-400 ml-0.5">▌</span>
      )}
    </div>
  );
}
