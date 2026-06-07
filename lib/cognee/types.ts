export interface CogneeStoreResult {
  success: boolean;
  dataset_name: string;
  error?: string;
}

export interface CogneeRecallResult {
  recalled: boolean;
  dataset_name: string;
  query: string;
  result_count: number;
  raw_results: unknown[];
  error?: string;
}
