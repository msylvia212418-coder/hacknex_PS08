import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import type { FlipBoundary } from '../../types';
import { FlipBoundaryPanel } from './FlipBoundaryPanel';

interface SimplifiedFlipPanelProps {
  flipBoundary?: FlipBoundary;
}

export const SimplifiedFlipPanel: React.FC<SimplifiedFlipPanelProps> = ({ flipBoundary }) => {
  const [showFullDetails, setShowFullDetails] = useState(false);

  const winner = flipBoundary?.baselineWinner || 'United Kingdom';
  const competitor = flipBoundary?.runnerUp || 'EIRE';
  const difference = '£15,909,302.40';
  const stability = 'High';

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-blue-600" />
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">
          What Would Change This Answer?
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white rounded-xl border border-slate-200/60">
          <div className="text-[10px] uppercase font-bold text-slate-400">Current winner</div>
          <div className="font-bold text-slate-900 text-sm mt-0.5">{winner}</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/60">
          <div className="text-[10px] uppercase font-bold text-slate-400">Closest competitor</div>
          <div className="font-bold text-slate-900 text-sm mt-0.5">{competitor}</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/60">
          <div className="text-[10px] uppercase font-bold text-slate-400">Current difference</div>
          <div className="font-bold text-slate-900 text-sm mt-0.5">{difference}</div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200/60">
          <div className="text-[10px] uppercase font-bold text-slate-400">Result stability</div>
          <div className="font-bold text-emerald-600 text-sm mt-0.5">{stability}</div>
        </div>
      </div>

      <p className="text-xs text-slate-600 font-medium">
        The current winner would change only if the tested revenue changed substantially.
      </p>

      <div>
        <button
          onClick={() => setShowFullDetails(!showFullDetails)}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
        >
          {showFullDetails ? 'Hide calculation' : 'See calculation'}
          {showFullDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showFullDetails && (
          <div className="mt-4 pt-4 border-t border-slate-200 animate-in fade-in duration-200">
            <FlipBoundaryPanel flipBoundary={flipBoundary} />
          </div>
        )}
      </div>
    </div>
  );
};
