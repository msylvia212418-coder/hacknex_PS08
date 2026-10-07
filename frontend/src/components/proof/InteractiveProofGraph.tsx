import React, { useState } from 'react';
import type { ProofGraph, ProofNode } from '../../types';
import { ProofNodeModal } from './ProofNodeModal';
import { GitBranch, HelpCircle, FileText, FileCheck, Cpu, RefreshCw, Activity, ShieldAlert, Award, ArrowRight } from 'lucide-react';

interface InteractiveProofGraphProps {
  proofGraph: ProofGraph;
}

export const InteractiveProofGraph: React.FC<InteractiveProofGraphProps> = ({ proofGraph }) => {
  const [selectedNode, setSelectedNode] = useState<ProofNode | null>(null);

  const getNodeIcon = (type: ProofNode['type']) => {
    switch (type) {
      case 'question': return HelpCircle;
      case 'claim': return FileText;
      case 'evidence': return FileCheck;
      case 'computation': return Cpu;
      case 'recomputation': return RefreshCw;
      case 'stability': return Activity;
      case 'refutation': return ShieldAlert;
      case 'verdict': return Award;
      default: return GitBranch;
    }
  };

  const getNodeBadgeClass = (status: ProofNode['status']) => {
    switch (status) {
      case 'passed': return 'bg-emerald-500 text-white shadow-emerald-200';
      case 'warning': return 'bg-amber-500 text-white shadow-amber-200';
      case 'failed': return 'bg-rose-500 text-white shadow-rose-200';
      default: return 'bg-[#00509D] text-white shadow-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#00296B]" /> Auditable Visual Proof Graph
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any node in the verification graph to inspect cryptographic proof payloads and evidence slices
          </p>
        </div>
        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">
          {proofGraph.nodes.length} Connected Nodes
        </span>
      </div>

      <div className="relative py-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[900px] gap-3 px-2">
          {proofGraph.nodes.map((node, index) => {
            const Icon = getNodeIcon(node.type);
            const isLast = index === proofGraph.nodes.length - 1;

            return (
              <React.Fragment key={node.id}>
                <div
                  onClick={() => setSelectedNode(node)}
                  className="flex-1 min-w-[110px] bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-[#00509D] rounded-xl p-3 text-center cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md group relative"
                >
                  <div className={`w-9 h-9 rounded-xl mx-auto flex items-center justify-center font-bold mb-2 shadow-sm ${getNodeBadgeClass(node.status)}`}>
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div className="font-extrabold text-slate-900 text-xs truncate group-hover:text-[#00296B]">
                    {node.label}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                    {node.summary}
                  </div>
                </div>

                {!isLast && (
                  <div className="flex items-center justify-center text-slate-300 shrink-0">
                    <ArrowRight className="w-4 h-4 stroke-[2]" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Passed
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2" /> Warning / Partial
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ml-2" /> Refuted
        </span>
        <span className="font-mono text-[11px] text-slate-400">Click node for deep audit drawer</span>
      </div>

      <ProofNodeModal node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
};
