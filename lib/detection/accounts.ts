import type { NormalizedRow, AccountSignal, AccountFlag } from './types';

function modeOf(values: string[]): { value: string | null; pct: number } {
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

export function computeAccountSignals(
  allRows: NormalizedRow[],
  internalTransfers: NormalizedRow[],
): AccountSignal[] {
  // Group all rows by account_id
  const byAccount = new Map<string, NormalizedRow[]>();
  for (const row of allRows) {
    const list = byAccount.get(row.account_id);
    if (list) list.push(row);
    else byAccount.set(row.account_id, [row]);
  }

  // Group outbound internal transfers by sender account_id
  const outboundInternal = new Map<string, NormalizedRow[]>();
  for (const row of internalTransfers) {
    const list = outboundInternal.get(row.account_id);
    if (list) list.push(row);
    else outboundInternal.set(row.account_id, [row]);
  }

  const signals: AccountSignal[] = [];

  for (const [account_id, rows] of byAccount) {
    const outbound = outboundInternal.get(account_id) ?? [];
    const merchantRows = rows.filter(r => !r.is_internal_transfer);

    const total_txns = rows.length;
    const internal_sent_count = outbound.length;
    const internal_sent_amount = outbound.reduce((s, r) => s + r.amount, 0);
    const internal_sent_pct = total_txns > 0 ? internal_sent_count / total_txns : 0;
    const unique_internal_receivers = new Set(outbound.map(r => r.counterparty_id)).size;

    const night_txn_count = rows.filter(r => r.is_night).length;
    const night_txn_pct = total_txns > 0 ? night_txn_count / total_txns : 0;

    const band_count = rows.filter(r => r.amount_band_400_900).length;
    const amount_band_400_900_pct = total_txns > 0 ? band_count / total_txns : 0;

    const { value: top_merchant_category, pct: top_category_pct } = modeOf(
      merchantRows.map(r => r.merchant_category),
    );

    const device_count = new Set(rows.map(r => r.device_id)).size;
    const ip_region_count = new Set(rows.map(r => r.ip_region)).size;

    // account_open_date: use first row's value (same for all rows of the account)
    const account_open_dt = rows[0].account_open_dt;
    const account_open_date = account_open_dt.toISOString().slice(0, 10);

    const sorted = [...rows].sort(
      (a, b) => a.timestamp_dt.getTime() - b.timestamp_dt.getTime(),
    );
    const firstTxnDt = sorted[0].timestamp_dt;
    const first_txn_date = firstTxnDt.toISOString().slice(0, 10);

    const account_age_days_at_first_txn = Math.floor(
      (firstTxnDt.getTime() - account_open_dt.getTime()) / 86_400_000,
    );

    const risk_flags: AccountFlag[] = [];
    if (internal_sent_pct >= 0.60) risk_flags.push('HIGH_INTERNAL_TRANSFER_RATIO');
    if (night_txn_pct >= 0.70)     risk_flags.push('NIGHT_ACTIVITY_CONCENTRATION');
    if (amount_band_400_900_pct >= 0.80) risk_flags.push('STRUCTURED_AMOUNT_RANGE');
    if (top_category_pct >= 0.80)  risk_flags.push('SINGLE_CATEGORY_CONCENTRATION');
    if (account_age_days_at_first_txn >= 0 && account_age_days_at_first_txn <= 45)
      risk_flags.push('NEW_ACCOUNT_ACTIVITY');
    if (device_count <= 2 && ip_region_count <= 2)
      risk_flags.push('LOW_DEVICE_REGION_VARIANCE');

    const FLAG_POINTS: Record<AccountFlag, number> = {
      HIGH_INTERNAL_TRANSFER_RATIO: 25,
      NIGHT_ACTIVITY_CONCENTRATION: 20,
      STRUCTURED_AMOUNT_RANGE: 20,
      NEW_ACCOUNT_ACTIVITY: 15,
      SINGLE_CATEGORY_CONCENTRATION: 10,
      LOW_DEVICE_REGION_VARIANCE: 10,
    };
    const risk_score = Math.min(100, risk_flags.reduce((s, f) => s + FLAG_POINTS[f], 0));
    const risk_label =
      risk_score >= 85 ? 'Critical'
      : risk_score >= 65 ? 'High'
      : risk_score >= 40 ? 'Medium'
      : 'Low';

    signals.push({
      account_id,
      total_txns,
      internal_sent_count,
      internal_sent_amount: Math.round(internal_sent_amount * 100) / 100,
      internal_sent_pct: Math.round(internal_sent_pct * 10000) / 10000,
      unique_internal_receivers,
      night_txn_pct: Math.round(night_txn_pct * 10000) / 10000,
      amount_band_400_900_pct: Math.round(amount_band_400_900_pct * 10000) / 10000,
      top_merchant_category,
      top_category_pct: Math.round(top_category_pct * 10000) / 10000,
      device_count,
      ip_region_count,
      account_open_date,
      first_txn_date,
      account_age_days_at_first_txn,
      risk_flags,
      risk_score,
      risk_label,
    });
  }

  return signals;
}
