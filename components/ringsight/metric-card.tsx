'use client';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
}

export function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-zinc-900">{value}</span>
      {sub && <span className="text-xs text-zinc-400">{sub}</span>}
    </div>
  );
}
