import Papa from 'papaparse';
import type { RawRow, EngineOutput } from './types';
import { normalizeRows } from './normalize';
import { partitionRows } from './partition';
import { computeAccountSignals } from './accounts';
import { computeRelationshipSignals } from './relationships';
import { scoreRelationship, scoreComponent } from './scoring';
import { buildNetworkComponents } from './graph';
import { buildFindings } from './findings';

function generateRunId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `RUN-${date}-${seq}`;
}

export function runEngine(csvText: string): EngineOutput {
  // 1. Parse CSV
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    console.warn('[engine] CSV parse warnings:', parsed.errors.slice(0, 5));
  }

  const rawRows: RawRow[] = parsed.data;

  // 2. Normalize
  const rows = normalizeRows(rawRows);

  // 3. Partition
  const { internalTransfers } = partitionRows(rows);

  // 4. Account signals
  const accountSignalList = computeAccountSignals(rows, internalTransfers);
  const accountMap = new Map(accountSignalList.map(a => [a.account_id, a]));

  // 5. Relationship signals (unscored)
  const relSignalsRaw = computeRelationshipSignals(internalTransfers, accountMap);

  // 6. Score relationships
  const relationships = relSignalsRaw.map(rel => {
    const { risk_score, risk_label } = scoreRelationship(rel, accountMap.get(rel.sender));
    return { ...rel, risk_score, risk_label };
  });

  // 7. Build network components (unscored)
  const rawComponents = buildNetworkComponents(relationships, accountMap);

  // 8. Score components
  const network_components = rawComponents.map(comp => {
    const accountSet = new Set(comp.accounts);
    const compRels = relationships.filter(
      r => accountSet.has(r.sender) && accountSet.has(r.receiver),
    );
    const { risk_score, risk_label } = scoreComponent(comp, compRels);
    return { ...comp, risk_score, risk_label };
  });

  // 9. Findings
  const findings = buildFindings(accountSignalList, relationships, network_components);

  // 10. Metrics
  const sortedByDate = [...rows].sort(
    (a, b) => a.timestamp_dt.getTime() - b.timestamp_dt.getTime(),
  );
  const dateStart = sortedByDate[0]?.timestamp_dt.toISOString().slice(0, 10) ?? '';
  const dateEnd = sortedByDate[sortedByDate.length - 1]?.timestamp_dt.toISOString().slice(0, 10) ?? '';

  return {
    run_id: generateRunId(),
    metrics: {
      row_count: rows.length,
      account_count: accountSignalList.length,
      internal_transfer_count: internalTransfers.length,
      date_range: { start: dateStart, end: dateEnd },
    },
    accounts: accountSignalList,
    relationships,
    network_components,
    findings,
    transactions: rows,
  };
}
