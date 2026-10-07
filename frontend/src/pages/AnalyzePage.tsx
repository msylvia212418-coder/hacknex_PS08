import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CircleHelp,
  Database,
  FileCheck2,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { verificationApi } from '../services/api/verificationApi';
import type { DatasetDetail, ProofObligation, VerificationResponse } from '../types/verification';

const suggestedQuestions = [
  'Which country generated the highest total revenue?',
  'Which country performed best?',
  'Which country has the highest customer satisfaction?',
];

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value);
}

function obligationDetails(obligation: ProofObligation): string[] {
  return [
    obligation.column ? `Column: ${obligation.column}` : null,
    obligation.aggregation ? `Aggregation: ${obligation.aggregation}` : null,
    obligation.distinct ? 'Distinct values' : null,
    obligation.group_by ? `Grouped by: ${obligation.group_by}` : null,
    obligation.direction ? `Direction: ${obligation.direction}` : null,
    obligation.operation ? `Operation: ${obligation.operation}` : null,
    obligation.filter ? `Filter: ${obligation.filter}` : null,
    obligation.target ? `Target: ${obligation.target}` : null,
    obligation.baseline ? `Baseline: ${obligation.baseline}` : null,
  ].filter((value): value is string => value !== null);
}

function verdictStyle(verdict: VerificationResponse['verdict']): string {
  if (verdict === 'PROVABLE') return 'border-emerald-300 bg-emerald-50 text-emerald-950';
  if (verdict === 'AMBIGUOUS') return 'border-amber-300 bg-amber-50 text-amber-950';
  return 'border-slate-300 bg-slate-100 text-slate-950';
}

export function AnalyzePage() {
  const [datasetIdInput, setDatasetIdInput] = useState(() =>
    new URLSearchParams(window.location.search).get('dataset')
      || window.localStorage.getItem('VERIPROOF_LAST_DATASET_ID')
      || '',
  );
  const [dataset, setDataset] = useState<DatasetDetail | null>(null);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const loadDataset = useCallback(async (requestedId: string) => {
    const normalizedId = requestedId.trim();
    if (!normalizedId) {
      setDatasetError('Enter a dataset ID to load its saved profile.');
      return;
    }
    setDatasetError(null);
    setDatasetLoading(true);
    setDataset(null);
    setResult(null);
    try {
      const loaded = await verificationApi.getDataset(normalizedId);
      if (loaded.status !== 'READY') {
        throw new Error(`This dataset is ${loaded.status}; only READY datasets can be verified.`);
      }
      if (!loaded.profile) throw new Error('This dataset has no available profile.');
      setDataset(loaded);
      setDatasetIdInput(loaded.id);
      window.localStorage.setItem('VERIPROOF_LAST_DATASET_ID', loaded.id);
    } catch (cause) {
      setDatasetError(cause instanceof Error ? cause.message : 'Could not load this dataset.');
    } finally {
      setDatasetLoading(false);
    }
  }, []);

  const handleLoadDataset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadDataset(datasetIdInput);
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dataset || !question.trim()) return;
    setIsVerifying(true);
    setRequestError(null);
    setResult(null);
    try {
      const verification = await verificationApi.verify(dataset.id, question.trim());
      setResult(verification);
    } catch (cause) {
      setRequestError(cause instanceof Error ? cause.message : 'Verification request failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const resetQuestion = () => {
    setResult(null);
    setRequestError(null);
    setQuestion('');
  };

  const actualReason = result?.claim_status === 'AMBIGUOUS'
    ? result.release.reason
    : result?.computation?.reason || result?.release.reason;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Select a READY dataset</h2>
            <p className="mt-1 text-sm text-slate-500">Load a dataset by ID. VERIPROOF checks its stored profile before enabling verification.</p>
          </div>
        </div>

        <form onSubmit={handleLoadDataset} className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="dataset-id">Dataset ID</label>
          <input
            id="dataset-id"
            value={datasetIdInput}
            onChange={(event) => {
              setDatasetIdInput(event.target.value);
              setDataset(null);
              setResult(null);
              setDatasetError(null);
            }}
            placeholder="Paste dataset UUID"
            aria-describedby={datasetError ? 'dataset-error' : undefined}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <Button type="submit" isLoading={datasetLoading} icon={Database} className="py-3">
            Load dataset
          </Button>
        </form>

        {datasetError && <p id="dataset-error" role="alert" className="mt-3 text-sm text-rose-700">{datasetError}</p>}
        {dataset && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div>
              <div className="font-bold text-slate-900">{dataset.name}</div>
              <div className="mt-1 font-mono text-xs text-slate-500">{dataset.id}</div>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span>{dataset.profile?.row_count.toLocaleString()} rows</span>
              <span>{dataset.profile?.column_count} columns</span>
              <span className="rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-emerald-800">{dataset.status}</span>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">Evidence-bound verification</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Ask a question about the data</h1>
          <p className="mt-2 text-sm text-slate-500">The answer and verdict come from the dataset and deterministic verification pipeline.</p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {suggestedQuestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setQuestion(prompt)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <label className="sr-only" htmlFor="verification-question">Question</label>
          <textarea
            id="verification-question"
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Enter an analytical question…"
            className="w-full resize-y rounded-2xl border border-slate-300 p-4 text-base font-medium text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Claim → obligations → computation → independent verification → release gate</p>
            <Button type="submit" isLoading={isVerifying} icon={ShieldCheck} disabled={!dataset || !question.trim()} className="px-7 py-3">
              Verify claim
            </Button>
          </div>
        </form>

        {isVerifying && (
          <div role="status" className="mt-5 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-950">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Running claim validation, deterministic computation, and independent verification…
          </div>
        )}
        {requestError && (
          <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div><div className="font-bold">Verification request failed</div><p className="mt-1">{requestError}</p></div>
          </div>
        )}
      </section>

      {result && (
        <section aria-live="polite" className="space-y-5">
          <div className={`rounded-3xl border p-6 shadow-sm sm:p-8 ${verdictStyle(result.verdict)}`}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Final verdict</p>
                <h2 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{result.verdict}</h2>
              </div>
              {result.verdict === 'PROVABLE'
                ? <CheckCircle2 className="h-12 w-12" />
                : result.verdict === 'AMBIGUOUS'
                  ? <CircleHelp className="h-12 w-12" />
                  : <AlertCircle className="h-12 w-12" />}
            </div>
            {actualReason && <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed">{actualReason}</p>}
            {result.computation?.status === 'SUCCESS' && result.computation.winner && (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Metric label="Winning group" value={result.computation.winner} />
                <Metric label="Computed value" value={formatNumber(result.computation.value)} />
                <Metric label="Rows processed" value={formatNumber(result.computation.rows_processed)} />
              </div>
            )}
          </div>

          {result.claim && (
            <ResultSection title="Structured claim" icon={<FileCheck2 className="h-4 w-4" />}>
              <p className="text-base font-bold text-slate-900">{result.claim.claim_text}</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Type" value={result.claim.claim_type} />
                <Detail label="Metric" value={result.claim.metric} />
                <Detail label="Aggregation" value={result.claim.aggregation} />
                <Detail label="Group by" value={result.claim.group_by} />
                <Detail label="Operation" value={result.claim.operation} />
                <Detail label="Direction" value={result.claim.direction} />
              </dl>
            </ResultSection>
          )}

          <ResultSection title="Proof obligations" icon={<FileCheck2 className="h-4 w-4" />}>
            {result.proof_obligations.length ? (
              <ul className="space-y-2">
                {result.proof_obligations.map((obligation, index) => {
                  const details = obligationDetails(obligation);
                  return (
                    <li key={`${obligation.type}-${index}`} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="font-mono text-xs font-bold text-blue-700">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{obligation.type}</div>
                        {details.length > 0 && <p className="mt-1 text-xs text-slate-600">{details.join(' · ')}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-slate-500">No proof plan was compiled for this claim.</p>}
          </ResultSection>

          {result.computation && (
            <ResultSection title="Deterministic computation" icon={<Database className="h-4 w-4" />}>
              {result.computation.status === 'SUCCESS' ? (
                <>
                  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Status" value={result.computation.status} />
                    <Detail label="Operation" value={result.computation.operation} />
                    <Detail label="Group count" value={formatNumber(result.computation.group_count)} />
                    <Detail label="Rows processed" value={formatNumber(result.computation.rows_processed)} />
                  </dl>
                  {result.computation.grouped_results.length > 0 && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                      <div className="grid grid-cols-[1fr_auto] bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500"><span>Group</span><span>Value</span></div>
                      {result.computation.grouped_results.map((group) => (
                        <div key={group.group} className="grid grid-cols-[1fr_auto] border-t border-slate-100 px-4 py-2.5 text-sm"><span>{group.group}</span><span className="font-mono">{formatNumber(group.value)}</span></div>
                      ))}
                    </div>
                  )}
                </>
              ) : <p className="text-sm font-medium text-amber-900">{result.computation.reason || 'The computation could not establish this claim.'}</p>}
            </ResultSection>
          )}

          {result.verification && (
            <ResultSection title="Independent verification" icon={<ShieldCheck className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-2">
                <StatusPill label="Verified" value={result.verification.verified} />
                <StatusPill label="Results match" value={result.verification.match} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <JsonResult title="Primary result" value={result.verification.primary_result} />
                <JsonResult title="Independent result" value={result.verification.independent_result} />
              </div>
              {result.verification.reason && <p className="mt-3 text-sm text-slate-600">{result.verification.reason}</p>}
            </ResultSection>
          )}

          <ResultSection title="Release gate checks" icon={<ShieldCheck className="h-4 w-4" />}>
            <ul className="space-y-2">
              {result.release.checks.map((check) => (
                <li key={check.name} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                  {check.passed
                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
                  <div className="min-w-0">
                    <div className="text-sm font-bold capitalize text-slate-900">{check.name.replaceAll('_', ' ')}</div>
                    {check.reason && <p className="mt-1 break-words text-xs text-slate-600">{check.reason}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-medium text-slate-700">{result.release.reason}</p>
          </ResultSection>

          <div className="flex justify-end">
            <Button type="button" variant="outline" icon={RotateCcw} onClick={resetQuestion}>Ask another question</Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-current/10 bg-white/70 p-4"><div className="text-[11px] font-bold uppercase tracking-wide opacity-65">{label}</div><div className="mt-1 break-words text-xl font-black">{value}</div></div>;
}

function ResultSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h3 className="mb-4 flex items-center gap-2 text-base font-extrabold text-slate-900">{icon}{title}</h3>{children}</section>;
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value || '—'}</dd></div>;
}

function StatusPill({ label, value }: { label: string; value: boolean | null }) {
  const passed = value === true;
  return <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${passed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{label}: {value === null ? 'Not established' : passed ? 'Yes' : 'No'}</span>;
}

function JsonResult({ title, value }: { title: string; value: Record<string, string | number | null> | null }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 text-xs font-bold text-slate-700">{title}</div><pre className="overflow-x-auto text-xs text-slate-700">{value ? JSON.stringify(value, null, 2) : 'Not available'}</pre></div>;
}
