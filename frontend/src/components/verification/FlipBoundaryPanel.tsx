import React from 'react';
import type { FlipBoundary } from '../../types';
import { Activity } from 'lucide-react';

interface FlipBoundaryPanelProps {
  flipBoundary?: FlipBoundary;
}

export const FlipBoundaryPanel: React.FC<FlipBoundaryPanelProps> = ({ flipBoundary }) => {
  if (!flipBoundary || !flipBoundary.available) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
          <Activity className="w-4 h-4 text-amber-500" /> WHAT WOULD CHANGE MY ANSWER?
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Notice: </span>
          {flipBoundary?.explanation || 'Flip boundary unavailable for this analysis due to qualitative or unranked claim structure.'}
        </div>
      </div>
    );
  }

  const threshold = flipBoundary.thresholdPercent || 15;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00509D]" /> WHAT WOULD CHANGE MY ANSWER? (FLIP BOUNDARY)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Calculates minimum perturbation threshold required to invalidate current ranking or conclusion
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#00509D] border border-blue-200">
          Flip Point: {threshold}%
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 text-xs">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Baseline Winner (#1)</div>
          <div className="font-extrabold text-slate-900 text-sm mt-0.5">{flipBoundary.baselineWinner}</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Runner-Up Candidate (#2)</div>
          <div className="font-extrabold text-slate-700 text-sm mt-0.5">{flipBoundary.runnerUp}</div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Baseline Dominance Margin</div>
          <div className="font-extrabold text-emerald-600 text-sm mt-0.5">{flipBoundary.baselineMargin}</div>
        </div>
      </div>

      <div className="p-5 bg-slate-900 text-white rounded-xl space-y-4 mb-4 border border-slate-800">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Perturbation Boundary Gauge</span>
          <span className="text-amber-400">Threshold: {threshold}%</span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div>
            <div className="flex justify-between text-[11px] mb-1 text-slate-300">
              <span>Winner: {flipBoundary.baselineWinner}</span>
              <span>100%</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden relative">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85%' }} />
              <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10" style={{ left: `${100 - threshold}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1 text-slate-400">
              <span>Runner-Up: {flipBoundary.runnerUp}</span>
              <span>{Math.max(5, 100 - threshold)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden relative">
              <div className="bg-[#00509D] h-full rounded-full" style={{ width: `${Math.max(5, 100 - threshold)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-[#00296B] font-medium leading-relaxed">
        <span className="font-bold">Minimum Change Required: </span>
        {flipBoundary.minChangeRequired}. {flipBoundary.explanation}
      </div>
    </div>
  );
};
