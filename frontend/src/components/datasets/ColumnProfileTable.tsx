import React from 'react';
import type { ColumnProfile } from '../../types';

interface ColumnProfileTableProps {
  columns: ColumnProfile[];
}

export const ColumnProfileTable: React.FC<ColumnProfileTableProps> = ({ columns }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4">Column Name</th>
              <th className="py-3 px-4">Data Type</th>
              <th className="py-3 px-4">Non-Null Count</th>
              <th className="py-3 px-4">Null Count</th>
              <th className="py-3 px-4">Distinct Count</th>
              <th className="py-3 px-4">Min / Max</th>
              <th className="py-3 px-4">Sample Values</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {columns.map((col, idx) => {
              const nullRatio = (col.nullCount / (col.nonNullCount + col.nullCount)) * 100;
              return (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                    {col.name}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {col.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {col.nonNullCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    {col.nullCount > 0 ? (
                      <span className="text-amber-700 font-semibold flex items-center gap-1">
                        {col.nullCount.toLocaleString()}
                        <span className="text-[10px] text-amber-600">({nullRatio.toFixed(1)}%)</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">0 (0%)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-semibold">
                    {col.distinctCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {col.min !== undefined && col.max !== undefined ? (
                      <span>
                        [{String(col.min)} ... {String(col.max)}]
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-slate-500 font-mono text-[11px]">
                    {col.sampleValues.slice(0, 3).join(', ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
