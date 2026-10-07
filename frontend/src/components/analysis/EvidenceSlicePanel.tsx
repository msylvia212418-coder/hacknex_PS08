import React from 'react';
import type { MinimumEvidenceSlice } from '../../types';
import { FileCheck } from 'lucide-react';

interface EvidenceSlicePanelProps {
  slice: MinimumEvidenceSlice;
}

export const EvidenceSlicePanel: React.FC<EvidenceSlicePanelProps> = ({ slice }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#00509D]" /> Minimum Evidence Slice
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Minimal subset of rows and columns strictly required to prove/disprove claim
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          {slice.sufficiencyStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Rows Examined</div>
          <div className="text-lg font-extrabold text-slate-900">{slice.rowsExamined.toLocaleString()}</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Rows Sliced</div>
          <div className="text-lg font-extrabold text-[#00509D]">{slice.rowsMatched.toLocaleString()}</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Columns Required</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {slice.columnsRequired.map((col) => (
              <span key={col} className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-mono font-bold text-[10px]">
                {col}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5 text-xs text-slate-700 leading-relaxed">
        <span className="font-bold text-slate-900">Slice Reasoning: </span>
        {slice.reasoning}
      </div>

      {slice.sampleRows && slice.sampleRows.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">
            Extracted Evidence Records
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  {Object.keys(slice.sampleRows[0]).map((key) => (
                    <th key={key} className="py-2.5 px-3 whitespace-nowrap">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slice.sampleRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {Object.keys(row).map((key) => (
                      <td key={key} className="py-2 px-3 whitespace-nowrap text-slate-800">
                        {String(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
