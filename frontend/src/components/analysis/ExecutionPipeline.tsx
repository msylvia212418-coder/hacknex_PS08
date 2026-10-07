import React from 'react';
import type { PipelineStage } from '../../types';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Clock, MinusCircle } from 'lucide-react';

interface ExecutionPipelineProps {
  stages: PipelineStage[];
}

export const ExecutionPipeline: React.FC<ExecutionPipelineProps> = ({ stages }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
            Verification Pipeline Execution Trace
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sequential 9-stage auditable proof compilation & release gate
          </p>
        </div>
        <div className="text-xs font-mono bg-blue-50 text-[#00509D] px-2.5 py-1 rounded font-bold border border-blue-100">
          Auditable Kernel v1.2
        </div>
      </div>

      <div className="space-y-2">
        {stages.map((stage) => {
          const isNotStarted = stage.stageState === 'NOT_STARTED' || stage.status === 'queued';
          const isRunning = stage.stageState === 'RUNNING' || stage.status === 'running';
          const isPassed = stage.stageState === 'PASSED' || stage.status === 'passed';
          const isFailed = stage.stageState === 'FAILED' || stage.status === 'failed';
          const isSkipped = stage.stageState === 'SKIPPED';
          const isInconclusive = stage.stageState === 'INCONCLUSIVE' || stage.status === 'warning';

          return (
            <div
              key={stage.id}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                isRunning
                  ? 'bg-blue-50/70 border-[#00509D] ring-1 ring-[#00509D]'
                  : isPassed
                  ? 'bg-slate-50/80 border-slate-200'
                  : isInconclusive
                  ? 'bg-amber-50/60 border-amber-300'
                  : isFailed
                  ? 'bg-rose-50/60 border-rose-300'
                  : 'bg-white border-slate-100 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-bold w-6 text-center ${isRunning ? 'text-[#00509D]' : 'text-slate-400'}`}>
                  {stage.number}
                </span>

                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {isRunning && <Loader2 className="w-4 h-4 text-[#00509D] animate-spin" />}
                  {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {isInconclusive && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  {isFailed && <XCircle className="w-4 h-4 text-rose-600" />}
                  {isSkipped && <MinusCircle className="w-4 h-4 text-slate-400" />}
                  {isNotStarted && <Clock className="w-4 h-4 text-slate-300" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${isRunning ? 'text-[#00296B]' : isPassed ? 'text-slate-900' : 'text-slate-500'}`}>
                      {stage.name}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                      isPassed ? 'bg-emerald-100 text-emerald-800' :
                      isRunning ? 'bg-blue-100 text-blue-800' :
                      isInconclusive ? 'bg-amber-100 text-amber-900' :
                      isFailed ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {stage.stageState || stage.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                    {isRunning && stage.detailMessage ? stage.detailMessage : stage.description}
                  </div>
                </div>
              </div>

              {stage.durationMs !== undefined && (
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {stage.durationMs}ms
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
