import type { Agent1Input } from './types';

export const SYSTEM_PROMPT = `You are a senior financial crime analyst specializing in transaction fraud detection. You receive pre-filtered signals from a deterministic fraud detection engine and your job is to identify coordinated fraud patterns across accounts and transaction networks.

Fraud patterns to detect:
- CIRCULAR_FLOW: funds loop between accounts (A→B→C→A), obscuring origin
- LAYERING_CHAIN: sequential chain (A→B→C→D) rapidly moving funds to distance from source
- TIMING_CLUSTER: multiple accounts transacting in a tight time window (coordinated bursts)
- STRUCTURED_SMURFING: repeated transactions just under reporting thresholds ($400–$900 band)
- MULE_NETWORK: new accounts rapidly receiving and forwarding funds, often used as buffers
- HIGH_VELOCITY_PASS_THROUGH: account receives and re-sends funds within hours, minimal retention
- NEW_ACCOUNT_BURST: newly opened accounts showing abnormal volume in the first 45 days

For each finding you report:
1. Ground every evidence item in the measured signals provided — never fabricate metrics
2. Report only what the data shows; do not invent transaction IDs not in the input
3. Use engine_risk_score and engine_risk_label directly from the input data; do not recalculate
4. Include all account IDs and relationship IDs that are part of the pattern
5. Estimate monetary exposure as the sum of relevant relationship total_exposure values
6. Be specific and concise — investigators will act on your findings within 3 minutes per case`;

export function buildUserPrompt(input: Agent1Input): string {
  const sections: string[] = [];

  sections.push(`# Fraud Analysis Request
Run ID: ${input.run_id}
Date range: ${input.metrics.date_range.start} to ${input.metrics.date_range.end}
Total rows: ${input.metrics.row_count} | Accounts: ${input.metrics.account_count} | Internal transfers: ${input.metrics.internal_transfer_count}
`);

  if (input.candidate_accounts.length > 0) {
    sections.push(`## High-Risk Accounts (${input.candidate_accounts.length})\n`);
    for (const acc of input.candidate_accounts) {
      sections.push(
        `### ${acc.account_id} [${acc.risk_label} | score=${acc.risk_score}]
Flags: ${acc.risk_flags.join(', ')}
Transactions: ${acc.total_txns} | Internal sent: ${acc.internal_sent_count} (${(acc.internal_sent_pct * 100).toFixed(1)}%) | Receivers: ${acc.unique_internal_receivers}
Night pct: ${(acc.night_txn_pct * 100).toFixed(1)}% | Amount band 400-900 pct: ${(acc.amount_band_400_900_pct * 100).toFixed(1)}%
Top category: ${acc.top_merchant_category ?? 'N/A'} (${(acc.top_category_pct * 100).toFixed(1)}%)
Devices: ${acc.device_count} | IP regions: ${acc.ip_region_count}
Account opened: ${acc.account_open_date} | First txn: ${acc.first_txn_date} | Age at first txn: ${acc.account_age_days_at_first_txn} days
`,
      );
    }
  }

  if (input.candidate_relationships.length > 0) {
    sections.push(`## High-Risk Relationships (${input.candidate_relationships.length})\n`);
    for (const rel of input.candidate_relationships) {
      sections.push(
        `### ${rel.edge_id}: ${rel.sender} → ${rel.receiver} [${rel.risk_label} | score=${rel.risk_score}]
Flags: ${rel.risk_flags.join(', ')}
Transactions: ${rel.transaction_count} | Exposure: $${rel.total_exposure.toLocaleString()}
Avg amount: $${rel.avg_amount.toFixed(2)} | Min: $${rel.min_amount.toFixed(2)} | Max: $${rel.max_amount.toFixed(2)}
Night pct: ${(rel.night_pct * 100).toFixed(1)}% | Amount band 400-900 pct: ${(rel.amount_band_400_900_pct * 100).toFixed(1)}%
Active days: ${rel.active_day_count} | Most common gap: ${rel.most_common_day_gap} days | Cadence strength: ${(rel.cadence_strength * 100).toFixed(1)}%
Supporting txn IDs: ${rel.supporting_transaction_ids.join(', ')}
`,
      );
    }
  }

  if (input.candidate_components.length > 0) {
    sections.push(`## Network Components (${input.candidate_components.length})\n`);
    for (const comp of input.candidate_components) {
      const cycleStr = comp.cycles.length > 0
        ? comp.cycles.map(c => c.join('→')).join('; ')
        : 'none';
      const chainStr = comp.chains.length > 0
        ? comp.chains.map(c => c.join('→')).join('; ')
        : 'none';
      sections.push(
        `### ${comp.component_id} [${comp.risk_label} | score=${comp.risk_score}]
Accounts (${comp.accounts.length}): ${comp.accounts.join(', ')}
Hub accounts: ${comp.hub_accounts.length > 0 ? comp.hub_accounts.join(', ') : 'none'}
Edges: ${comp.edge_count} | Transactions: ${comp.transaction_count} | Exposure: $${comp.total_exposure.toLocaleString()}
Avg edge score: ${comp.avg_edge_score}
Chains: ${chainStr}
Cycles: ${cycleStr}
`,
      );
    }
  }

  sections.push(`## Task
Analyze the signals above and call the \`report_fraud_patterns\` tool with your findings.
- Report every distinct fraud pattern you can substantiate from the data
- Each finding must reference real entity IDs from this input
- Prioritize findings with the highest combined risk and exposure
- Include a brief overall summary paragraph`);

  return sections.join('\n');
}
