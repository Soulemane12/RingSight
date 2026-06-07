import type { AccountSignal, RelationshipSignal, NetworkComponent, Finding } from './types';

function pad(n: number, width = 5): string {
  return String(n).padStart(width, '0');
}

export function buildFindings(
  accounts: AccountSignal[],
  relationships: RelationshipSignal[],
  components: NetworkComponent[],
): Finding[] {
  const findings: Finding[] = [];
  let aIdx = 1, rIdx = 1, cIdx = 1;

  for (const acc of accounts) {
    if (acc.risk_score < 20) continue;

    findings.push({
      finding_id: `FIND-A-${pad(aIdx++)}`,
      type: 'ACCOUNT',
      subject_id: acc.account_id,
      risk_label: acc.risk_label,
      risk_score: acc.risk_score,
      flags: acc.risk_flags,
      summary: `Account ${acc.account_id} shows ${acc.risk_flags.join(', ')}.`,
    });
  }

  for (const rel of relationships) {
    if (rel.risk_score < 40) continue;
    findings.push({
      finding_id: `FIND-R-${pad(rIdx++)}`,
      type: 'RELATIONSHIP',
      subject_id: rel.edge_id,
      risk_label: rel.risk_label,
      risk_score: rel.risk_score,
      flags: rel.risk_flags,
      summary: `Transfer edge ${rel.sender} → ${rel.receiver} shows ${rel.risk_flags.join(', ')} with ${rel.transaction_count} transactions totalling $${rel.total_exposure.toLocaleString()}.`,
    });
  }

  for (const comp of components) {
    if (comp.risk_score < 40) continue;
    findings.push({
      finding_id: `FIND-C-${pad(cIdx++)}`,
      type: 'COMPONENT',
      subject_id: comp.component_id,
      risk_label: comp.risk_label,
      risk_score: comp.risk_score,
      flags: [],
      summary: `Network ${comp.component_id} contains ${comp.accounts.length} accounts, ${comp.edge_count} suspicious edges, and $${comp.total_exposure.toLocaleString()} total exposure.`,
    });
  }

  // Sort descending by risk_score
  findings.sort((a, b) => b.risk_score - a.risk_score);

  // Re-assign IDs in sorted order per type
  let ai = 1, ri = 1, ci = 1;
  for (const f of findings) {
    if (f.type === 'ACCOUNT')       f.finding_id = `FIND-A-${pad(ai++)}`;
    else if (f.type === 'RELATIONSHIP') f.finding_id = `FIND-R-${pad(ri++)}`;
    else                            f.finding_id = `FIND-C-${pad(ci++)}`;
  }

  return findings;
}
