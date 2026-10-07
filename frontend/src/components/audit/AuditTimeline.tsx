import React from 'react';
import type { AuditEvent } from '../../types';
import { Clock } from 'lucide-react';

interface AuditTimelineProps {
  events: AuditEvent[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00509D]" /> EXECUTION AUDIT TIMELINE
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable chronological log trace of data ingestion, predicate evaluations, and gate checks
          </p>
        </div>
        <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded font-bold text-slate-700">
          {events.length} Audit Events
        </span>
      </div>

      <div className="relative border-l-2 border-slate-200 ml-3 pl-5 space-y-4 text-xs">
        {events.map((evt, idx) => (
          <div key={idx} className="relative group">
            <div className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-2 ${
              evt.status === 'PASSED' ? 'bg-emerald-500 ring-emerald-100' :
              evt.status === 'FAILED' ? 'bg-rose-500 ring-rose-100' : 'bg-[#00509D] ring-blue-100'
            }`} />

            <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">{evt.stage}</span>
                {evt.objectId && (
                  <span className="font-mono text-[10px] text-[#00509D] bg-blue-50 px-1.5 py-0.5 rounded font-bold border border-blue-100">
                    {evt.objectId}
                  </span>
                )}
              </div>

              <span className="font-mono text-[11px] text-slate-400">
                {evt.timeFormatted}
              </span>
            </div>

            <p className="text-slate-600 leading-relaxed font-mono text-[11px]">
              {evt.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
