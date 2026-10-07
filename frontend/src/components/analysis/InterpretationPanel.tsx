import React from 'react';
import type { InterpretationInvariance } from '../../types';
import { Layers, CheckCircle2, AlertTriangle } from 'lucide-react';

interface InterpretationPanelProps {
  invariance: InterpretationInvariance;
}

export const InterpretationPanel: React.FC<InterpretationPanelProps> = ({ invariance }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00509D]" /> Interpretation-Invariance Testing
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tests whether different plausible business formulas or edge-case definitions alter the claim
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
          invariance.overallResult === 'INVARIANT'
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-amber-100 text-amber-800 border border-amber-300'
        }`}>
          {invariance.overallResult}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        {invariance.interpretations.map((interp) => (
          <div key={interp.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-900 text-sm">{interp.label}</span>
              {interp.isConsistent ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> CONSISTENT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" /> VARIANT
                </span>
              )}
            </div>

            <div className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 my-2">
              Formula: <span className="font-bold text-[#00296B]">{interp.formula}</span> → Result: <span className="font-bold text-slate-900">{interp.result}</span>
            </div>

            <p className="text-slate-500 text-[11px]">{interp.notes}</p>
          </div>
        ))}
      </div>

      <div className="p-3 bg-[#00296B]/5 rounded-xl border border-[#00296B]/20 text-xs text-slate-700 font-medium">
        <span className="font-bold text-[#00296B]">Interpretation Summary: </span>
        {invariance.summary}
      </div>
    </div>
  );
};
