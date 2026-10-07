export type VerificationVerdict = 'PROVABLE' | 'INCONCLUSIVE' | 'AMBIGUOUS';

export interface StructuredClaim {
  claim_text: string;
  claim_type: string;
  subject: string | null;
  metric: string | null;
  aggregation: string | null;
  distinct: boolean;
  cancellation_filter: string | null;
  pre_aggregation: { aggregation: string; group_by: string } | null;
  operation: string | null;
  group_by: string | null;
  direction: string | null;
  comparison_target: string | null;
  comparison_baseline: string | null;
  required_evidence: string[];
}

export interface ProofObligation {
  type: string;
  column: string | null;
  aggregation: string | null;
  distinct: boolean;
  group_by: string | null;
  direction: string | null;
  operation: string | null;
  target: string | null;
  baseline: string | null;
  filter: string | null;
}

export interface ComputationResult {
  status: 'SUCCESS' | 'INCONCLUSIVE';
  operation: string | null;
  group_by: string | null;
  metric: string | null;
  aggregation: string | null;
  winner: string | null;
  value: number | null;
  group_count: number;
  rows_processed: number;
  grouped_results: { group: string; value: number }[];
  comparison_result: boolean | null;
  target_value: number | null;
  baseline_value: number | null;
  verification: IndependentVerification | null;
  reason: string | null;
}

export interface IndependentVerification {
  verified: boolean;
  primary_result: Record<string, string | number | null> | null;
  independent_result: Record<string, string | number | null> | null;
  match: boolean | null;
  reason: string | null;
}

export interface ReleaseCheck {
  name: string;
  passed: boolean;
  reason: string | null;
}

export interface ReleaseDecision {
  verdict: VerificationVerdict;
  claim: string;
  reason: string;
  checks: ReleaseCheck[];
}

export interface VerificationResponse {
  verdict: VerificationVerdict;
  dataset_id: string;
  question: string;
  claim_status: 'VALID' | 'INVALID' | 'AMBIGUOUS';
  claim: StructuredClaim | null;
  proof_obligations: ProofObligation[];
  computation: ComputationResult | null;
  verification: IndependentVerification | null;
  release: ReleaseDecision;
}

export interface DatasetDetail {
  id: string;
  project_id: string;
  name: string;
  original_filename: string;
  status: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  profile: {
    row_count: number;
    column_count: number;
    columns: { name: string; type: string; null_count: number; non_null_count: number }[];
  } | null;
}
