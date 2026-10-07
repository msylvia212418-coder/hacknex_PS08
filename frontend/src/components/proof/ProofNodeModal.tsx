import React from 'react';
import type { ProofNode } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ProofNodeModalProps {
  node: ProofNode | null;
  onClose: () => void;
}

export const ProofNodeModal: React.FC<ProofNodeModalProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <Modal
      isOpen={!!node}
      onClose={onClose}
      title={`Audit Payload: ${node.label}`}
      subtitle={`Node ID: ${node.id} • Type: ${node.type.toUpperCase()}`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        <div className={`p-3 rounded-xl border flex items-center gap-3 ${
          node.status === 'passed' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          node.status === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {node.status === 'passed' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          {node.status === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />}
          {node.status === 'failed' && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <div>
            <div className="font-bold">{node.summary}</div>
            <div className="text-[11px] opacity-80 mt-0.5">Verified by VERIPROOF execution kernel</div>
          </div>
        </div>

        <div>
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
            Node Internal State & Evidence Parameters
          </span>
          <pre className="bg-slate-900 text-amber-400 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
            {JSON.stringify(node.details, null, 2)}
          </pre>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Inspection
          </Button>
        </div>
      </div>
    </Modal>
  );
};
