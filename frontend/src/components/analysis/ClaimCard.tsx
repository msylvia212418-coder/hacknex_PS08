import React from 'react';
import type { Analysis } from '../../types';
import { VerdictBadge } from '../ui/VerdictBadge';
import { ShieldCheck, Layers, Activity, ShieldAlert, Database } from 'lucide-react';

interface ClaimCardProps {
  analysis: Analysis;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({ analysis }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="bg-gradient-to-r from-[#00296B] to-[#00509D] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <VerdictBadge verdict={analysis.verdict} size="lg" />
            <span className="text-xs font-semibold text-slate-200 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
              Confidence: {analysis.confidence}%
            </span>
          </div>

          <div className="text-xs text-slate-300 font-mono flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>{analysis.datasetName}</span>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-2">
          "{analysis.answer}"
        </h2>
        <p className="text-xs text-slate-200 font-medium max-w-3xl">
          {analysis.verdictExplanation}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Evidence Slice</div>
            <div className="font-extrabold text-slate-900">{analysis.evidenceSlice.sufficiencyStatus}</div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-[#00509D]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Claim Stability</div>
            <div className="font-extrabold text-slate-900">{analysis.stabilityFingerprint.overallStatus}</div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Interpretation</div>
            <div className="font-extrabold text-slate-900">{analysis.interpretationInvariance.overallResult}</div>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Adversarial Test</div>
            <div className="font-extrabold text-slate-900">
              {analysis.adversarialRefutation.successfulRefutationsCount === 0 ? 'PASSED' : 'COUNTEREXAMPLE'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4 text-xs">
        <div>
          <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block mb-1">
            Formal Deconstructed Claim
          </span>
          <p className="font-mono text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
            {analysis.claim}
          </p>
        </div>

        <div>
          <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block mb-1">
            Analytical Question Intent
          </span>
          <p className="text-slate-700 leading-relaxed">
            {analysis.intent}
          </p>
        </div>
      </div>
    </div>
  );
};
