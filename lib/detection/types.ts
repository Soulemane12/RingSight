export interface RawRow {
  txn_id: string;
  account_id: string;
  counterparty_id: string;
  amount: string;
  timestamp: string;
  merchant_category: string;
  device_id: string;
  ip_region: string;
  account_open_date: string;
}

export interface NormalizedRow {
  txn_id: string;
  account_id: string;
  counterparty_id: string;
  amount: number;
  merchant_category: string;
  device_id: string;
  ip_region: string;
  timestamp_dt: Date;
  account_open_dt: Date;
  hour: number;
  date: string;
  is_internal_transfer: boolean;
  is_night: boolean;
  amount_band_400_900: boolean;
}

export type AccountFlag =
  | 'HIGH_INTERNAL_TRANSFER_RATIO'
  | 'NIGHT_ACTIVITY_CONCENTRATION'
  | 'STRUCTURED_AMOUNT_RANGE'
  | 'SINGLE_CATEGORY_CONCENTRATION'
  | 'NEW_ACCOUNT_ACTIVITY'
  | 'LOW_DEVICE_REGION_VARIANCE';

export interface AccountSignal {
  account_id: string;
  total_txns: number;
  internal_sent_count: number;
  internal_sent_amount: number;
  internal_sent_pct: number;
  unique_internal_receivers: number;
  night_txn_pct: number;
  amount_band_400_900_pct: number;
  top_merchant_category: string | null;
  top_category_pct: number;
  device_count: number;
  ip_region_count: number;
  account_open_date: string;
  first_txn_date: string;
  account_age_days_at_first_txn: number;
  risk_flags: AccountFlag[];
  risk_score: number;
  risk_label: RiskLabel;
}

export type RelationshipFlag =
  | 'REPEATED_EDGE'
  | 'HIGH_EDGE_EXPOSURE'
  | 'NIGHT_TRANSFER_PATTERN'
  | 'STRUCTURED_SMALL_AMOUNTS'
  | 'SIX_DAY_CADENCE'
  | 'CATEGORY_LOCKED';

export interface RelationshipSignal {
  edge_id: string;
  sender: string;
  receiver: string;
  transaction_count: number;
  total_exposure: number;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
  first_txn: string;
  last_txn: string;
  night_pct: number;
  amount_band_400_900_pct: number;
  top_category: string | null;
  top_category_pct: number;
  active_day_count: number;
  most_common_day_gap: number;
  cadence_strength: number;
  risk_flags: RelationshipFlag[];
  risk_score: number;
  risk_label: RiskLabel;
}

export interface NetworkComponent {
  component_id: string;
  accounts: string[];
  edge_count: number;
  transaction_count: number;
  total_exposure: number;
  avg_edge_score: number;
  hub_accounts: string[];
  chains: string[][];
  cycles: string[][];
  risk_score: number;
  risk_label: RiskLabel;
}

export type RiskLabel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Finding {
  finding_id: string;
  type: 'ACCOUNT' | 'RELATIONSHIP' | 'COMPONENT';
  subject_id: string;
  risk_label: RiskLabel;
  risk_score: number;
  flags: string[];
  summary: string;
}

export interface EngineOutput {
  run_id: string;
  metrics: {
    row_count: number;
    account_count: number;
    internal_transfer_count: number;
    date_range: { start: string; end: string };
  };
  accounts: AccountSignal[];
  relationships: RelationshipSignal[];
  network_components: NetworkComponent[];
  findings: Finding[];
  transactions: NormalizedRow[];
}
