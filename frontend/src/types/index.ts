export type VerdictType =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'UNVERIFIED'
  | 'REFUTED'
  | 'INSUFFICIENT_EVIDENCE';

export type OfficialReleaseVerdict = 'PROVABLE' | 'INCONCLUSIVE' | 'REFUTED';

export type PipelineStageState = 'NOT_STARTED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED' | 'INCONCLUSIVE';

export interface PipelineStage {
  id: string;
  number: string;
  name: string;
  description: string;
  status: 'queued' | 'running' | 'passed' | 'warning' | 'failed';
  stageState?: PipelineStageState;
  durationMs?: number;
  log?: string;
  detailMessage?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'draft';
  datasetCount: number;
  analysisCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnProfile {
  name: string;
  type: 'integer' | 'numeric' | 'string' | 'datetime' | 'boolean';
  nonNullCount: number;
  nullCount: number;
  distinctCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  stdDev?: number;
  sampleValues: (string | number)[];
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  fileSizeBytes: number;
  sha256: string;
  encoding: string;
  uploadedAt: string;
  columns: ColumnProfile[];
  qualityScore: number;
  duplicateRowCount: number;
}

export interface Dataset {
  id: string;
  name: string;
  projectId?: string;
  status: 'READY' | 'PROFILING' | 'UPLOADING' | 'FAILED';
  profile: DatasetProfile;
  previewRows: Record<string, any>[];
  createdAt: string;
}

export interface MinimumEvidenceSlice {
  rowsExamined: number;
  rowsMatched: number;
  columnsRequired: string[];
  sufficiencyStatus: 'SUFFICIENT' | 'INSUFFICIENT' | 'PARTIAL';
  sampleRows: Record<string, any>[];
  reasoning: string;
}

export interface ProofObligation {
  id: string;
  title: string;
  satisfied: boolean;
  description: string;
  evidenceUsed?: string;
  computation?: string;
  result?: string;
  executionMetadata?: string;
  requiredFields?: string[];
}

export interface FlipBoundary {
  available: boolean;
  baselineWinner: string;
  baselineRank: number;
  runnerUp: string;
  runnerUpRank: number;
  baselineMargin: string;
  minChangeRequired: string;
  explanation: string;
  thresholdPercent?: number;
}

export interface ClaimStabilityFingerprint {
  overallStatus: 'STABLE' | 'SENSITIVE' | 'UNSTABLE';
  samplingStability: boolean;
  thresholdStability: boolean;
  rowPerturbation: boolean;
  columnPerturbation: boolean;
  metrics: {
    name: string;
    score: number;
    passed: boolean;
    detail: string;
  }[];
  explanation: string;
}

export interface InterpretationTest {
  id: string;
  label: string;
  formula: string;
  result: string | number;
  isConsistent: boolean;
  notes: string;
  metricUsed?: string;
  winner?: string;
}

export interface InterpretationInvariance {
  overallResult: 'INVARIANT' | 'VARIANT' | 'AMBIGUOUS';
  interpretations: InterpretationTest[];
  summary: string;
}

export interface AdversarialTest {
  id: string;
  hypothesis: string;
  testPerformed: string;
  counterExampleFound: boolean;
  details: string;
  status: 'PASSED' | 'FAILED' | 'INCONCLUSIVE';
}

export interface AdversarialRefutation {
  searchStatus: 'SEARCHING' | 'COMPLETE';
  attemptsCount: number;
  successfulRefutationsCount: number;
  verdict: string;
  tests: AdversarialTest[];
}

export interface LineageNodeData {
  id: string; // D001, E001, C001, A001, V001, R001, X001
  label: string;
  category: 'dataset' | 'evidence' | 'claim' | 'obligation' | 'computation' | 'verification' | 'stability' | 'counterexample' | 'verdict';
  status: 'PASSED' | 'FAILED' | 'INCONCLUSIVE' | 'READY';
  summary: string;
  details: Record<string, any>;
}

export interface AuditEvent {
  timestamp: string;
  timeFormatted: string;
  stage: string;
  message: string;
  objectId?: string;
  status: 'PASSED' | 'FAILED' | 'INFO' | 'RUNNING';
}

export interface ProofNode {
  id: string;
  label: string;
  type: 'question' | 'claim' | 'evidence' | 'computation' | 'recomputation' | 'stability' | 'refutation' | 'verdict';
  status: 'passed' | 'warning' | 'failed' | 'info';
  summary: string;
  details: Record<string, any>;
}

export interface ProofEdge {
  from: string;
  to: string;
  label?: string;
}

export interface ProofGraph {
  nodes: ProofNode[];
  edges: ProofEdge[];
}

export interface AnalystComputation {
  primaryResult: string | number;
  unit?: string;
  sqlQuery?: string;
  pythonSnippet?: string;
  executionTimeMs: number;
  matchingRecordsCount: number;
}

export interface IndependentRecomputation {
  recomputedResult: string | number;
  matchesPrimary: boolean;
  discrepancyDelta: number;
  recomputationEngine: string;
  verifiedAt: string;
  methodsAgree: boolean;
}

export interface Analysis {
  id: string;
  runId?: string;
  projectId?: string;
  datasetId: string;
  datasetName: string;
  question: string;
  claim: string;
  intent: string;
  answer: string;
  confidence: number;
  verdict: VerdictType;
  officialVerdict: OfficialReleaseVerdict;
  verdictExplanation: string;
  evidenceSlice: MinimumEvidenceSlice;
  proofObligations: ProofObligation[];
  computation: AnalystComputation;
  recomputation: IndependentRecomputation;
  stabilityFingerprint: ClaimStabilityFingerprint;
  interpretationInvariance: InterpretationInvariance;
  adversarialRefutation: AdversarialRefutation;
  flipBoundary: FlipBoundary;
  lineageNodes: LineageNodeData[];
  auditTimeline: AuditEvent[];
  proofGraph: ProofGraph;
  createdAt: string;
  executionPipeline?: PipelineStage[];
  inconclusiveReason?: string;
  inconclusiveImpact?: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'unavailable';
  mode: 'demo' | 'api';
  apiConnected: boolean;
  dbConnected: boolean;
  version: string;
  timestamp: string;
}

export interface SystemSettings {
  demoMode: boolean;
  apiBaseUrl: string;
  autoValidateUploads: boolean;
  simulatedDelayMs: number;
}
