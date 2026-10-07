import React from 'react';
import type { ClaimStabilityFingerprint } from '../../types';
import { Activity, CheckCircle2, XCircle } from 'lucide-react';

interface StabilityPanelProps {
  fingerprint: ClaimStabilityFingerprint;
}

export const StabilityPanel: React.FC<StabilityPanelProps> = ({ fingerprint }) => {
  const dimensions = [
    { label: 'Sampling Stability', passed: fingerprint.samplingStability, desc: '10,000 bootstrap iterations' },
    { label: 'Threshold Stability', passed: fingerprint.thresholdStability, desc: 'Filter boundary perturbation (+/- 5%)' },
    { label: 'Row Perturbation', passed: fingerprint.rowPerturbation, desc: 'Random 20% row deletion stress test' },
    { label: 'Column Jittering', passed: fingerprint.columnPerturbation, desc: 'Noise addition to continuous metrics' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00509D]" /> Claim Stability Fingerprint
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluates claim invariant under data perturbation, noise, and sampling jitter
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
          fingerprint.overallStatus === 'STABLE'
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-amber-100 text-amber-800 border border-amber-300'
        }`}>
          {fingerprint.overallStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {dimensions.map((dim, idx) => (
          <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 text-xs">{dim.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{dim.desc}</div>
            </div>
            {dim.passed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
          Perturbation Stress Metrics
        </div>
        {fingerprint.metrics.map((metric, idx) => (
          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-800">{metric.name}</div>
              <div className="text-[11px] text-slate-500">{metric.detail}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${metric.score > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${metric.score}%` }}
                />
              </div>
              <span className="font-mono font-bold text-slate-900 w-10 text-right">{metric.score}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
        <span className="font-bold text-slate-900">Summary: </span>
        {fingerprint.explanation}
      </div>
    </div>
  );
};
