import type { NormalizedRow, AccountSignal, RelationshipSignal, RelationshipFlag } from './types';

function modeOf(values: number[]): number {
  if (values.length === 0) return 0;
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  let best = 0;
  let bestCount = 0;
  for (const [v, c] of freq) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
}

function modeOfStr(values: string[]): { value: string | null; pct: number } {
  if (values.length === 0) return { value: null, pct: 0 };
  const freq = new Map<string, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  let best = '';
  let bestCount = 0;
  for (const [v, c] of freq) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return { value: best, pct: bestCount / values.length };
}

function computeCadence(rows: NormalizedRow[]): {
  most_common_day_gap: number;
  cadence_strength: number;
} {
  // Deduplicate dates and sort as epoch-day integers
  const uniqueDays = [...new Set(rows.map(r => r.date))]
    .map(d => new Date(d + 'T00:00:00Z').getTime())
    .sort((a, b) => a - b);

  if (uniqueDays.length < 2) {
    return { most_common_day_gap: 0, cadence_strength: 0 };
  }

  const MS_PER_DAY = 86_400_000;
  const gaps: number[] = [];
  for (let i = 1; i < uniqueDays.length; i++) {
    gaps.push(Math.round((uniqueDays[i] - uniqueDays[i - 1]) / MS_PER_DAY));
  }

  const mode = modeOf(gaps);
  const within = gaps.filter(g => Math.abs(g - mode) <= 1).length;
  const cadence_strength = within / gaps.length;

  return {
    most_common_day_gap: mode,
    cadence_strength: Math.round(cadence_strength * 10000) / 10000,
  };
}

export function computeRelationshipSignals(
  internalTransfers: NormalizedRow[],
  accountSignals: Map<string, AccountSignal>,
): Omit<RelationshipSignal, 'risk_score' | 'risk_label'>[] {
  // Group by "sender→receiver"
  const groups = new Map<string, NormalizedRow[]>();
  for (const row of internalTransfers) {
    const key = `${row.account_id}__${row.counterparty_id}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const results: Omit<RelationshipSignal, 'risk_score' | 'risk_label'>[] = [];

  for (const [key, rows] of groups) {
    const sender = rows[0].account_id;
    const receiver = rows[0].counterparty_id;

    const transaction_count = rows.length;
    const total_exposure = rows.reduce((s, r) => s + r.amount, 0);
    const avg_amount = total_exposure / transaction_count;
    const min_amount = Math.min(...rows.map(r => r.amount));
    const max_amount = Math.max(...rows.map(r => r.amount));

    const sorted = [...rows].sort(
      (a, b) => a.timestamp_dt.getTime() - b.timestamp_dt.getTime(),
    );
    const first_txn = sorted[0].timestamp_dt.toISOString();
    const last_txn = sorted[sorted.length - 1].timestamp_dt.toISOString();

    const night_count = rows.filter(r => r.is_night).length;
    const night_pct = night_count / transaction_count;

    const band_count = rows.filter(r => r.amount_band_400_900).length;
    const amount_band_400_900_pct = band_count / transaction_count;

    const { value: top_category, pct: top_category_pct } = modeOfStr(
      rows.map(r => r.merchant_category),
    );

    const active_day_count = new Set(rows.map(r => r.date)).size;
    const { most_common_day_gap, cadence_strength } = computeCadence(rows);

    // Determine LOW_DEVICE_REGION_VARIANCE from sender account (used in scoring)
    const senderAccount = accountSignals.get(sender);
    const senderHasLowVariance = senderAccount?.risk_flags.includes('LOW_DEVICE_REGION_VARIANCE') ?? false;

    const risk_flags: RelationshipFlag[] = [];
    if (transaction_count >= 10)          risk_flags.push('REPEATED_EDGE');
    if (total_exposure >= 10_000)         risk_flags.push('HIGH_EDGE_EXPOSURE');
    if (night_pct >= 0.70)               risk_flags.push('NIGHT_TRANSFER_PATTERN');
    if (amount_band_400_900_pct >= 0.80) risk_flags.push('STRUCTURED_SMALL_AMOUNTS');
    if (most_common_day_gap >= 5 && most_common_day_gap <= 7 && cadence_strength >= 0.60)
      risk_flags.push('SIX_DAY_CADENCE');
    if (top_category_pct >= 0.80)        risk_flags.push('CATEGORY_LOCKED');

    // Store LOW_DEVICE_REGION_VARIANCE context on the edge for use in scoring
    void senderHasLowVariance; // accessed in scoring.ts via accountSignals map

    results.push({
      edge_id: key,
      sender,
      receiver,
      transaction_count,
      total_exposure: Math.round(total_exposure * 100) / 100,
      avg_amount: Math.round(avg_amount * 100) / 100,
      min_amount: Math.round(min_amount * 100) / 100,
      max_amount: Math.round(max_amount * 100) / 100,
      first_txn,
      last_txn,
      night_pct: Math.round(night_pct * 10000) / 10000,
      amount_band_400_900_pct: Math.round(amount_band_400_900_pct * 10000) / 10000,
      top_category,
      top_category_pct: Math.round(top_category_pct * 10000) / 10000,
      active_day_count,
      most_common_day_gap,
      cadence_strength,
      risk_flags,
    });
  }

  return results;
}
