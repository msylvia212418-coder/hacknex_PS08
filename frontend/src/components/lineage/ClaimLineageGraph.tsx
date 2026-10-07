import React, { useState } from 'react';
import type { LineageNodeData } from '../../types';
import { GitBranch, ArrowRight, Database, FileCheck, FileText, Cpu, RefreshCw, Activity, ShieldAlert, Award } from 'lucide-react';

interface ClaimLineageGraphProps {
  nodes: LineageNodeData[];
}

export const ClaimLineageGraph: React.FC<ClaimLineageGraphProps> = ({ nodes }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNodeData = nodes.find(n => n.id === selectedNodeId);

  const getCategoryIcon = (cat: LineageNodeData['category']) => {
    switch (cat) {
      case 'dataset': return Database;
      case 'evidence': return FileCheck;
      case 'claim': return FileText;
      case 'obligation': return FileCheck;
      case 'computation': return Cpu;
      case 'verification': return RefreshCw;
      case 'stability': return Activity;
      case 'counterexample': return ShieldAlert;
      case 'verdict': return Award;
      default: return GitBranch;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#00296B]" /> CLAIM LINEAGE GRAPH
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic lineage chain tracing verdict back to original raw dataset rows
          </p>
        </div>
        <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded font-bold text-slate-700">
          Trace ID: LIN-{nodes[0]?.id || 'D001'}
        </span>
      </div>

      <div className="overflow-x-auto py-2">
        <div className="flex items-center justify-between min-w-[850px] gap-2 px-1">
          {nodes.map((node, index) => {
            const Icon = getCategoryIcon(node.category);
            const isLast = index === nodes.length - 1;

            return (
              <React.Fragment key={node.id}>
                <div
                  onClick={() => setSelectedNodeId(node.id)}
                  className="flex-1 min-w-[105px] bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-[#00509D] rounded-xl p-3 text-center cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs group"
                >
                  <span className="font-mono text-[10px] font-bold text-[#00509D] block mb-1">
                    {node.id}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#00296B] text-white flex items-center justify-center mx-auto mb-1.5 shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-slate-900 text-[11px] truncate group-hover:text-[#00509D]">
                    {node.label}
                  </div>
                </div>

                {!isLast && (
                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {selectedNodeData && (
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[#00296B] font-mono">{selectedNodeData.id}: {selectedNodeData.label}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {selectedNodeData.status}
            </span>
          </div>
          <p className="text-slate-700">{selectedNodeData.summary}</p>
        </div>
      )}
    </div>
  );
};
