import type { NormalizedRow } from './types';

export function partitionRows(rows: NormalizedRow[]): {
  internalTransfers: NormalizedRow[];
  merchantTransactions: NormalizedRow[];
} {
  const internalTransfers: NormalizedRow[] = [];
  const merchantTransactions: NormalizedRow[] = [];

  for (const row of rows) {
    if (row.is_internal_transfer) {
      internalTransfers.push(row);
    } else {
      merchantTransactions.push(row);
    }
  }

  return { internalTransfers, merchantTransactions };
}
