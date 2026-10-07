import React from 'react';
import type { Analysis } from '../../types';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface VerdictCardProps {
  analysis: Analysis;
  onViewProof?: () => void;
  onInspectEvidence?: () => void;
  onExportAudit?: () => void;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  analysis,
  onViewProof,
  onInspectEvidence,
  onExportAudit
}) => {
  const verdict = analysis.officialVerdict || (
    analysis.verdict === 'VERIFIED' ? 'PROVABLE' :
    analysis.verdict === 'REFUTED' ? 'REFUTED' : 'INCONCLUSIVE'
  );

  const getVerdictStyle = (v: typeof verdict) => {
    switch (v) {
      case 'PROVABLE':
        return {
          badgeText: 'RELEASE GATE: PROVABLE',
          bgBanner: 'bg-[#00296B]',
          border: 'border-emerald-500/40',
          badgeBg: 'bg-emerald-500 text-white',
          icon: ShieldCheck,
          accentText: 'text-emerald-400',
          summaryTitle: 'Claim released after verification'
        };
      case 'REFUTED':
        return {
          badgeText: 'RELEASE GATE: REFUTED',
          bgBanner: 'bg-rose-950',
          border: 'border-rose-500/40',
          badgeBg: 'bg-rose-600 text-white',
          icon: XCircle,
          accentText: 'text-rose-400',
          summaryTitle: 'Claim refuted by adversarial counterexample'
        };
      case 'INCONCLUSIVE':
      default:
        return {
          badgeText: 'RELEASE GATE: INCONCLUSIVE',
          bgBanner: 'bg-amber-950',
          border: 'border-amber-500/40',
          badgeBg: 'bg-amber-500 text-[#00296B]',
          icon: AlertTriangle,
          accentText: 'text-amber-400',
          summaryTitle: 'Evidence insufficient for claim release'
        };
    }
  };

  const style = getVerdictStyle(verdict);

  return (
    <div className={`rounded-2xl border ${style.border} overflow-hidden shadow-md bg-white`}>
      <div className={`${style.bgBanner} p-6 text-white`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-2xs ${style.badgeBg}`}>
              VERDICT: {verdict}
            </span>
            <span className="text-xs text-slate-300 font-mono bg-white/10 px-2.5 py-1 rounded-full">
              Run ID: {analysis.runId || 'RUN-001'}
            </span>
          </div>

          <span className="text-xs text-slate-300 font-mono">
            {analysis.datasetName}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-2">
          "{analysis.answer}"
        </h2>
        <p className="text-xs text-slate-200 font-medium max-w-3xl leading-relaxed">
          {analysis.verdictExplanation}
        </p>
      </div>

      <div className="p-6 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-3">
          Verification Release Conditions
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <CheckCircle2 className={`w-4 h-4 ${analysis.evidenceSlice.sufficiencyStatus === 'SUFFICIENT' ? 'text-emerald-600' : 'text-amber-500'}`} />
            <span>Evidence {analysis.evidenceSlice.sufficiencyStatus.toLowerCase()} ({analysis.evidenceSlice.rowsMatched.toLocaleString()} rows)</span>
          </div>

          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <CheckCircle2 className={`w-4 h-4 ${analysis.recomputation.matchesPrimary ? 'text-emerald-600' : 'text-rose-500'}`} />
            <span>Independent computation {analysis.recomputation.matchesPrimary ? 'agrees' : 'disagrees'}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <CheckCircle2 className={`w-4 h-4 ${analysis.interpretationInvariance.overallResult === 'INVARIANT' ? 'text-emerald-600' : 'text-amber-500'}`} />
            <span>Interpretation {analysis.interpretationInvariance.overallResult.toLowerCase()}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <CheckCircle2 className={`w-4 h-4 ${analysis.stabilityFingerprint.overallStatus === 'STABLE' ? 'text-emerald-600' : 'text-amber-500'}`} />
            <span>Claim stability {analysis.stabilityFingerprint.overallStatus.toLowerCase()}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <CheckCircle2 className={`w-4 h-4 ${analysis.adversarialRefutation.successfulRefutationsCount === 0 ? 'text-emerald-600' : 'text-rose-500'}`} />
            <span>{analysis.adversarialRefutation.successfulRefutationsCount === 0 ? 'No valid counterexample found' : 'Counterexample found'}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <CheckCircle2 className={`w-4 h-4 ${analysis.flipBoundary.available ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Flip boundary {analysis.flipBoundary.available ? `calculated (${analysis.flipBoundary.thresholdPercent || 14}%)` : 'unavailable'}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-slate-200">
          {onViewProof && (
            <Button variant="primary" size="sm" onClick={onViewProof}>
              View Proof
            </Button>
          )}
          {onInspectEvidence && (
            <Button variant="outline" size="sm" onClick={onInspectEvidence}>
              Inspect Evidence
            </Button>
          )}
          {onExportAudit && (
            <Button variant="ghost" size="sm" onClick={onExportAudit}>
              Export Audit Trail
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
