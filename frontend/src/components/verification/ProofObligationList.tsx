import React, { useState } from 'react';
import type { ProofObligation } from '../../types';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, FileCheck, Code, Database } from 'lucide-react';

interface ProofObligationListProps {
  obligations: ProofObligation[];
}

export const ProofObligationList: React.FC<ProofObligationListProps> = ({ obligations }) => {
  const [expandedId, setExpandedId] = useState<string | null>(obligations[0]?.id || null);

  const satisfiedCount = obligations.filter(o => o.satisfied).length;
  const totalCount = obligations.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#00509D]" /> Proof Obligations Trace
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Formal checklist of mathematical and structural predicates required to release verdict
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
          satisfiedCount === totalCount
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-amber-100 text-amber-900 border border-amber-300'
        }`}>
          {satisfiedCount} / {totalCount} satisfied
        </span>
      </div>

      <div className="space-y-2">
        {obligations.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="border border-slate-200 rounded-xl overflow-hidden text-xs transition-all"
            >
              {/* Obligation Header Bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="p-3.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  {item.satisfied ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-bold text-slate-900">{item.title}</span>
                </div>

                <div className="flex items-center gap-3 text-slate-400">
                  {item.result && (
                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {item.result}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Expandable Details */}
              {isExpanded && (
                <div className="p-4 bg-white border-t border-slate-100 space-y-3 text-slate-700">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-900">Description: </span>
                    {item.description}
                  </p>

                  {item.evidenceUsed && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <Database className="w-3.5 h-3.5 text-[#00509D]" />
                      <span className="font-semibold text-slate-800">Evidence Used:</span>
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{item.evidenceUsed}</span>
                    </div>
                  )}

                  {item.computation && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <Code className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-semibold text-slate-800">Predicate Formula:</span>
                      <code className="font-mono bg-slate-900 text-amber-400 px-2 py-0.5 rounded">{item.computation}</code>
                    </div>
                  )}

                  {item.executionMetadata && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      Execution metadata: {item.executionMetadata}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
