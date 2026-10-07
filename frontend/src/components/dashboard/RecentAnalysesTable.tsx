import React from 'react';
import { Link } from 'react-router-dom';
import type { Analysis } from '../../types';
import { VerdictBadge } from '../ui/VerdictBadge';
import { ArrowRight, Sparkles, Clock } from 'lucide-react';

interface RecentAnalysesTableProps {
  analyses: Analysis[];
}

export const RecentAnalysesTable: React.FC<RecentAnalysesTableProps> = ({ analyses }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00509D]" /> Recent Verification Activity
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Latest proof-carrying data analysis runs</p>
        </div>
        <Link
          to="/history"
          className="text-xs font-semibold text-[#00509D] hover:text-[#00296B] flex items-center gap-1 hover:underline"
        >
          View all history <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <th className="py-3 px-4">Question</th>
              <th className="py-3 px-4">Dataset</th>
              <th className="py-3 px-4">Verdict</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {analyses.slice(0, 5).map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                  {item.question}
                </td>
                <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                  {item.datasetName}
                </td>
                <td className="py-3 px-4">
                  <VerdictBadge verdict={item.verdict} size="sm" />
                </td>
                <td className="py-3 px-4 font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.confidence >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${item.confidence}%` }}
                      />
                    </div>
                    <span>{item.confidence}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <Link
                    to={`/analysis/${item.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#00509D]/10 text-[#00509D] hover:bg-[#00509D] hover:text-white transition-colors"
                  >
                    View Report
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
