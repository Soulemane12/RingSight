export function formatMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatMoneyFull(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function actionLabel(action: string): string {
  const map: Record<string, string> = {
    MONITOR: 'Monitor',
    INVESTIGATE: 'Investigate',
    ESCALATE: 'Escalate',
    TEMPORARILY_RESTRICT_AND_ESCALATE: 'Restrict & Escalate',
    REQUEST_ENHANCED_REVIEW: 'Enhanced Review',
  };
  return map[action] ?? action;
}

export function severityColor(severity: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (severity) {
    case 'Critical':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' };
    case 'High':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' };
    case 'Medium':
      return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' };
    default:
      return { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', dot: 'bg-zinc-400' };
  }
}

export function riskScoreColor(score: number): string {
  if (score >= 85) return 'text-red-600';
  if (score >= 65) return 'text-orange-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-zinc-500';
}

export function urgencyBadge(urgency: string): string {
  switch (urgency) {
    case 'Immediate': return 'bg-red-100 text-red-700';
    case 'High': return 'bg-orange-100 text-orange-700';
    case 'Medium': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-zinc-100 text-zinc-600';
  }
}
