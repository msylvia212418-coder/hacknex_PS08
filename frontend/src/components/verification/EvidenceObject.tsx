import React, { useState } from 'react';
import type { DatasetProfile } from '../../types';
import { Copy, Check, ShieldCheck, FileText, Layers } from 'lucide-react';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

interface EvidenceObjectProps {
  datasetName: string;
  datasetId: string;
  profile: DatasetProfile;
}

export const EvidenceObject: React.FC<EvidenceObjectProps> = ({ datasetName, datasetId, profile }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(profile.sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00296B] text-amber-400 flex items-center justify-center font-mono font-bold text-sm shadow-2xs">
            EV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm tracking-tight uppercase">IMMUTABLE EVIDENCE OBJECT</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                READY
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">ID: EV-OBJ-{profile.sha256.slice(0, 8)}</p>
          </div>
        </div>

        <Button size="sm" variant="outline" icon={copied ? Check : Copy} onClick={handleCopyHash}>
          {copied ? 'Copied Hash' : 'Copy Fingerprint'}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Dataset File</div>
          <div className="font-mono font-bold text-slate-900 truncate mt-0.5">{datasetName}</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Total Records</div>
          <div className="font-mono font-extrabold text-[#00509D] text-sm mt-0.5">{profile.rowCount.toLocaleString()}</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Schema Fields</div>
          <div className="font-mono font-bold text-slate-900 mt-0.5">{profile.columnCount} attributes</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-[10px] uppercase font-bold text-slate-400">Encoding / Version</div>
          <div className="font-mono font-bold text-slate-900 mt-0.5">{profile.encoding} • v1.0</div>
        </div>
      </div>

      <div className="p-3.5 bg-slate-900 text-amber-400 rounded-xl font-mono text-[11px] flex items-center justify-between border border-slate-800 mb-4">
        <div className="truncate mr-3">
          <span className="text-slate-500 mr-2">SHA-256:</span>
          <span>{profile.sha256}</span>
        </div>
        <button onClick={handleCopyHash} className="p-1 text-slate-400 hover:text-white transition-colors" title="Copy full SHA-256 hash">
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <Link to={`/datasets/${datasetId}`}>
          <Button size="sm" variant="outline" icon={Layers}>
            View Schema Profile
          </Button>
        </Link>
        <Link to={`/datasets/${datasetId}`}>
          <Button size="sm" variant="outline" icon={ShieldCheck}>
            View Quality Profile
          </Button>
        </Link>
        <Link to={`/datasets/${datasetId}`}>
          <Button size="sm" variant="outline" icon={FileText}>
            View Dataset Records
          </Button>
        </Link>
      </div>
    </div>
  );
};
