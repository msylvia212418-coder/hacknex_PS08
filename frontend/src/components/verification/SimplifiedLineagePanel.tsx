import React, { useState } from 'react';
import { GitBranch, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import type { LineageNodeData, ProofGraph } from '../../types';
import { ClaimLineageGraph } from '../lineage/ClaimLineageGraph';
import { InteractiveProofGraph } from '../proof/InteractiveProofGraph';

interface SimplifiedLineagePanelProps {
  lineageNodes?: LineageNodeData[];
  proofGraph?: ProofGraph;
}

export const SimplifiedLineagePanel: React.FC<SimplifiedLineagePanelProps> = ({ lineageNodes, proofGraph }) => {
  const [showTechnicalGraph, setShowTechnicalGraph] = useState(false);

  const lineageSteps = [
    { name: 'Dataset', detail: 'veriproof_combined_retail.csv (1,048,575 rows)' },
    { name: 'Evidence', detail: 'Revenue & Country columns isolated' },
    { name: 'Computation', detail: 'Sum aggregated by country ranking' },
    { name: 'Claim', detail: 'United Kingdom #1 by total revenue' },
    { name: 'Verification', detail: 'Dual solver agreement & refutation passed' },
    { name: 'Verdict', detail: 'PROVABLE / VERIFIED' },
  ];

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">
            Claim Lineage Trace
          </h3>
        </div>
      </div>

      <div className="space-y-2 max-w-md mx-auto py-2">
        {lineageSteps.map((step, idx) => {
          const isLast = idx === lineageSteps.length - 1;
          return (
            <React.Fragment key={idx}>
              <div className="bg-white p-3 rounded-xl border border-slate-200/70 text-xs flex items-center justify-between shadow-2xs">
                <span className="font-extrabold text-slate-900">{step.name}</span>
                <span className="text-slate-500 font-medium text-[11px] truncate max-w-[200px]">{step.detail}</span>
              </div>
              {!isLast && (
                <div className="flex justify-center -my-1">
                  <ArrowDown className="w-3.5 h-3.5 text-slate-300" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div>
        <button
          onClick={() => setShowTechnicalGraph(!showTechnicalGraph)}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
        >
          {showTechnicalGraph ? 'Hide technical graph' : 'View technical graph'}
          {showTechnicalGraph ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showTechnicalGraph && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-6 animate-in fade-in duration-200">
            {lineageNodes && <ClaimLineageGraph nodes={lineageNodes} />}
            {proofGraph && <InteractiveProofGraph proofGraph={proofGraph} />}
          </div>
        )}
      </div>
    </div>
  );
};
