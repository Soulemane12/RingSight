import type { RawRow, NormalizedRow } from './types';

export function normalizeRows(raw: RawRow[]): NormalizedRow[] {
  const result: NormalizedRow[] = [];

  for (const row of raw) {
    const amount = parseFloat(row.amount);
    if (!isFinite(amount)) {
      console.warn(`[normalize] skipping row ${row.txn_id}: invalid amount "${row.amount}"`);
      continue;
    }

    // Normalize "YYYY-MM-DD HH:MM:SS" to explicit UTC so getUTCHours() is correct
    const tsStr = row.timestamp.includes('T')
      ? row.timestamp
      : row.timestamp.replace(' ', 'T') + 'Z';
    const timestamp_dt = new Date(tsStr);

    // account_open_date is a plain date — treat as UTC midnight
    const account_open_dt = new Date(row.account_open_date + 'T00:00:00Z');

    if (isNaN(timestamp_dt.getTime())) {
      console.warn(`[normalize] skipping row ${row.txn_id}: invalid timestamp "${row.timestamp}"`);
      continue;
    }

    const hour = timestamp_dt.getUTCHours();

    result.push({
      txn_id: row.txn_id,
      account_id: row.account_id,
      counterparty_id: row.counterparty_id,
      amount,
      merchant_category: row.merchant_category,
      device_id: row.device_id,
      ip_region: row.ip_region,
      timestamp_dt,
      account_open_dt,
      hour,
      date: timestamp_dt.toISOString().slice(0, 10),
      is_internal_transfer: row.counterparty_id.startsWith('AC-'),
      is_night: hour === 2 || hour === 3,
      amount_band_400_900: amount >= 400 && amount <= 900,
    });
  }

  return result;
}
